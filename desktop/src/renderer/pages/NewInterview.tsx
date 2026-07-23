import React, { useState } from 'react';
import { api } from '../api/client';
import { ApiRequestError } from '../api/client';
import type { JdParseResponse } from '../api/types';
import { useIAP } from '../hooks/useIAP';
import { hasValidConsent } from '../hooks/useConsent';
import SubscriptionOfferings from '../components/SubscriptionOfferings';
import './NewInterview.css';

const JD_MAX_LENGTH = 10_000;

// ---------------------------------------------------------------------------
// Presets — mirrors the web app's JdInput component
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: 'Junior Frontend Engineer', level: 'Junior', role: 'Frontend Engineer' },
  { label: 'Intermediate Frontend Engineer', level: 'Intermediate', role: 'Frontend Engineer' },
  { label: 'Senior Frontend Engineer', level: 'Senior', role: 'Frontend Engineer' },
  { label: 'Junior Backend Engineer', level: 'Junior', role: 'Backend Engineer' },
  { label: 'Intermediate Backend Engineer', level: 'Intermediate', role: 'Backend Engineer' },
  { label: 'Staff Backend Engineer', level: 'Staff', role: 'Backend Engineer' },
  { label: 'Junior Full-Stack Engineer', level: 'Junior', role: 'Full-Stack Engineer' },
  { label: 'Intermediate Full-Stack Engineer', level: 'Intermediate', role: 'Full-Stack Engineer' },
  { label: 'Senior Full-Stack Engineer', level: 'Senior', role: 'Full-Stack Engineer' },
  { label: 'Engineering Manager', level: 'Senior', role: 'Engineering Manager' },
  { label: 'Intermediate DevOps / SRE', level: 'Intermediate', role: 'DevOps / SRE' },
  { label: 'Senior DevOps / SRE', level: 'Senior', role: 'DevOps / SRE' },
  { label: 'Staff Platform Engineer', level: 'Staff', role: 'Platform Engineer' },
  { label: 'Junior QA Engineer', level: 'Junior', role: 'QA Engineer' },
  { label: 'Intermediate QA Engineer', level: 'Intermediate', role: 'QA Engineer' },
  { label: 'Senior QA Engineer', level: 'Senior', role: 'QA Engineer' },
] as const;

// ---------------------------------------------------------------------------
// Preset JD builder — generates a synthetic JD from role/level/tech
// ---------------------------------------------------------------------------

const CULTURE_BY_LEVEL: Record<string, string[]> = {
  Junior: ['structured onboarding', 'growth-oriented', 'collaborative', 'learning culture', 'supportive team'],
  Intermediate: ['ownership', 'collaboration', 'continuous improvement', 'autonomy', 'iterative delivery'],
  Senior: ['technical leadership', 'mentoring others', 'cross-team collaboration', 'high standards', 'ownership'],
  Staff: ['technical vision', 'organizational influence', 'mentoring others', 'strategic thinking', 'driving alignment across teams'],
};

const FOCUS_BY_ROLE: Record<string, string[]> = {
  'Frontend Engineer': ['UI/UX implementation', 'performance optimization', 'accessibility', 'component architecture', 'state management', 'responsive design'],
  'Backend Engineer': ['API design', 'data modeling', 'scalability', 'reliability', 'security', 'concurrency and async patterns'],
  'Full-Stack Engineer': ['end-to-end feature delivery', 'API design', 'frontend architecture', 'database design', 'system integration'],
  'Engineering Manager': ['team leadership', 'project delivery', 'hiring and talent development', 'technical strategy', 'stakeholder management', 'performance management'],
  'DevOps / SRE': ['infrastructure automation', 'observability', 'incident response', 'CI/CD pipelines', 'reliability', 'capacity planning'],
  'Platform Engineer': ['developer experience', 'infrastructure abstraction', 'scalability', 'internal tooling', 'CI/CD', 'platform reliability'],
  'QA Engineer': ['test strategy', 'automation frameworks', 'quality metrics', 'CI integration', 'regression testing', 'risk assessment'],
};

const SENIOR_FOCUS_EXTRAS = ['architecture design', 'technical tradeoffs', 'system design'];
const STAFF_FOCUS_EXTRAS = ['architecture design', 'technical tradeoffs', 'system design', 'technical roadmapping', 'cross-org alignment'];

function buildPresetJdText(role: string, level: string, tech: string[]): string {
  const culture = CULTURE_BY_LEVEL[level] ?? CULTURE_BY_LEVEL['Intermediate'];
  let focusAreas = FOCUS_BY_ROLE[role] ?? ['problem solving', 'code quality', 'collaboration'];

  if (level === 'Staff') {
    focusAreas = [...focusAreas, ...STAFF_FOCUS_EXTRAS.filter((f) => !focusAreas.includes(f))];
  } else if (level === 'Senior') {
    focusAreas = [...focusAreas, ...SENIOR_FOCUS_EXTRAS.filter((f) => !focusAreas.includes(f))];
  }

  const lines = [
    `Role: ${level} ${role}`,
    `Seniority: ${level}`,
    '',
    `We are looking for a ${level} ${role} to join our team.`,
    '',
    `Culture and values: ${culture.join(', ')}.`,
    '',
    `Key focus areas: ${focusAreas.join(', ')}.`,
  ];

  if (tech.length > 0) {
    lines.push('', `Required technologies: ${tech.join(', ')}.`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = 'input' | 'loading' | 'review' | 'cap-reached';
type InputMode = 'paste' | 'preset';

export default function NewInterview() {
  const [step, setStep] = useState<Step>('input');
  const [mode, setMode] = useState<InputMode>('paste');
  const [jdText, setJdText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [techInput, setTechInput] = useState('');
  const [techTags, setTechTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<JdParseResponse | null>(null);
  const { subscription } = useIAP();

  function handleAddTech() {
    const trimmed = techInput.trim();
    if (trimmed && !techTags.includes(trimmed)) {
      setTechTags([...techTags, trimmed]);
    }
    setTechInput('');
  }

  function handleTechKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTech();
    }
  }

  function handleRemoveTech(tag: string) {
    setTechTags(techTags.filter((t) => t !== tag));
  }

  async function handleAnalyze() {
    setError(null);

    let textToSend: string;
    let sourceType: 'paste' | 'preset';

    if (mode === 'paste') {
      if (!jdText.trim()) {
        setError('Please paste a job description to continue.');
        return;
      }
      if (jdText.trim().length < 50) {
        setError('Job description seems too short. Please paste the full text.');
        return;
      }
      textToSend = jdText.trim();
      sourceType = 'paste';
    } else {
      if (selectedPreset === null) {
        setError('Please select a role preset to continue.');
        return;
      }
      const preset = PRESETS[selectedPreset];
      textToSend = buildPresetJdText(preset.role, preset.level, techTags);
      sourceType = 'preset';
    }

    setStep('loading');

    try {
      const result = await api.jdParse({
        jdText: textToSend,
        sourceType,
      });
      setParseResult(result);
      setStep('review');
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        setStep('cap-reached');
        return;
      }
      setError(
        err instanceof Error ? err.message : 'Failed to analyze job description'
      );
      setStep('input');
    }
  }

  function handleConfirm() {
    if (!parseResult) return;
    if (!hasValidConsent()) {
      window.location.hash = `#/interview/consent?sessionId=${parseResult.sessionId}`;
    } else {
      window.location.hash = `#/interview/mic-check?sessionId=${parseResult.sessionId}`;
    }
  }

  function handleBack() {
    setStep('input');
    setParseResult(null);
  }

  // --- Cap reached: show upgrade ---
  if (step === 'cap-reached') {
    return (
      <div className="new-interview">
        <div className="new-interview-cap">
          <h2 className="new-interview-cap-title">Session Limit Reached</h2>
          <p className="new-interview-cap-desc">
            You've used all your interview sessions this month.
            Upgrade your plan for more practice.
          </p>
        </div>
        <SubscriptionOfferings onClose={() => setStep('input')} />
      </div>
    );
  }

  // --- Loading ---
  if (step === 'loading') {
    return (
      <div className="new-interview">
        <div className="new-interview-loading">
          <div className="new-interview-spinner" />
          <p className="new-interview-loading-text">
            Analyzing job description…
          </p>
          <p className="new-interview-loading-hint">
            Extracting role signals and preparing your interview
          </p>
        </div>
      </div>
    );
  }

  // --- Review ---
  if (step === 'review' && parseResult) {
    const { parsedSignals, interviewType, estimatedMinutes } = parseResult;

    return (
      <div className="new-interview">
        <div className="new-interview-header">
          <h1 className="new-interview-title">Interview Setup</h1>
          <p className="new-interview-subtitle">
            Review the extracted signals and confirm to begin
          </p>
        </div>

        <div className="review-signals">
          <div className="review-signal-card">
            <span className="review-signal-label">Role</span>
            <span className="review-signal-value">{parsedSignals.role}</span>
          </div>
          <div className="review-signal-card">
            <span className="review-signal-label">Seniority</span>
            <span className="review-signal-value">{parsedSignals.seniority}</span>
          </div>
          <div className="review-signal-card">
            <span className="review-signal-label">Interview Type</span>
            <span className="review-signal-value review-signal-value--type">
              {interviewType}
            </span>
          </div>
          <div className="review-signal-card">
            <span className="review-signal-label">Estimated Duration</span>
            <span className="review-signal-value">{estimatedMinutes} min</span>
          </div>
        </div>

        {parsedSignals.stack.length > 0 && (
          <div className="review-section">
            <h3 className="review-section-title">Tech Stack</h3>
            <div className="review-tags">
              {parsedSignals.stack.map((item) => (
                <span key={item} className="review-tag">{item}</span>
              ))}
            </div>
          </div>
        )}

        {parsedSignals.focusAreas.length > 0 && (
          <div className="review-section">
            <h3 className="review-section-title">Focus Areas</h3>
            <div className="review-tags">
              {parsedSignals.focusAreas.map((area) => (
                <span key={area} className="review-tag">{area}</span>
              ))}
            </div>
          </div>
        )}

        {parsedSignals.culture.length > 0 && (
          <div className="review-section">
            <h3 className="review-section-title">Culture Signals</h3>
            <div className="review-tags">
              {parsedSignals.culture.map((item) => (
                <span key={item} className="review-tag review-tag--culture">{item}</span>
              ))}
            </div>
          </div>
        )}

        <div className="review-actions">
          <button className="review-btn review-btn--secondary" onClick={handleBack}>
            ← Re-paste
          </button>
          <button className="review-btn review-btn--primary" onClick={handleConfirm}>
            Continue to Mic Check →
          </button>
        </div>
      </div>
    );
  }

  // --- JD Input ---
  return (
    <div className="new-interview">
      <div className="new-interview-header">
        <h1 className="new-interview-title">New Interview</h1>
        <p className="new-interview-subtitle">
          Paste a job description or pick a role preset to start a tailored mock interview
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mode-toggle">
        <button
          className={`mode-toggle-btn ${mode === 'paste' ? 'mode-toggle-btn--active' : ''}`}
          onClick={() => { setMode('paste'); setError(null); }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <rect x="9" y="2" width="6" height="14" rx="2" />
            <path d="M4 10h1M19 10h1M9 16h6" />
          </svg>
          Paste JD
        </button>
        <button
          className={`mode-toggle-btn ${mode === 'preset' ? 'mode-toggle-btn--active' : ''}`}
          onClick={() => { setMode('preset'); setError(null); }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M4 6h16M4 12h10M4 18h14" />
          </svg>
          Quick preset
        </button>
      </div>

      {mode === 'paste' ? (
        /* Paste mode */
        <div className="jd-input-container">
          <textarea
            className="jd-textarea"
            placeholder="Paste the full job description here…"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            maxLength={JD_MAX_LENGTH}
            spellCheck={false}
            autoFocus
          />
          <div className="jd-input-footer">
            <span className={`jd-char-count ${jdText.length > JD_MAX_LENGTH * 0.9 ? 'jd-char-count--warn' : ''}`}>
              {jdText.length.toLocaleString()} / {JD_MAX_LENGTH.toLocaleString()}
            </span>
            <button
              className="jd-analyze-btn"
              onClick={handleAnalyze}
              disabled={!jdText.trim()}
            >
              Analyze →
            </button>
          </div>
        </div>
      ) : (
        /* Preset mode */
        <div className="preset-section">
          <div className="preset-grid" role="group" aria-label="Role presets">
            {PRESETS.map((preset, idx) => (
              <button
                key={preset.label}
                className={`preset-chip ${selectedPreset === idx ? 'preset-chip--selected' : ''}`}
                onClick={() => { setSelectedPreset(idx); setError(null); }}
                aria-pressed={selectedPreset === idx}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {selectedPreset !== null && (
            <div className="tech-section">
              <p className="tech-section-label">
                Add technologies or frameworks (optional)
              </p>
              <div className="tech-input-row">
                <input
                  className="tech-input"
                  type="text"
                  placeholder="e.g. React, TypeScript, AWS…"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={handleTechKeyDown}
                  onBlur={handleAddTech}
                  aria-label="Add technology"
                />
              </div>
              {techTags.length > 0 && (
                <div className="tech-tags" aria-label="Selected technologies">
                  {techTags.map((tag) => (
                    <span key={tag} className="tech-tag">
                      {tag}
                      <button
                        type="button"
                        className="tech-tag-remove"
                        onClick={() => handleRemoveTech(tag)}
                        aria-label={`Remove ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            className="jd-analyze-btn jd-analyze-btn--full"
            onClick={handleAnalyze}
            disabled={selectedPreset === null}
          >
            Start Interview →
          </button>
        </div>
      )}

      {error && (
        <div className="jd-error">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
