import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { TurnChunk } from '../api/types';
import { useSTT } from '../hooks/useSTT';
import { useTTS } from '../hooks/useTTS';
import './InterviewSession.css';

type Phase = 'loading' | 'asking' | 'listening' | 'thinking' | 'done';

interface QuestionState {
  text: string;
  type: string;
  isFollowUp: boolean;
  order: number;
}

export default function InterviewSession() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState<QuestionState | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimText, setInterimText] = useState('');

  const hasStartedRef = useRef(false);
  const tts = useTTS();

  const stt = useSTT({
    onInterimTranscript: (text) => setInterimText(text),
    onFinalTranscript: (text) => setLiveTranscript(text),
    onUtteranceEnd: () => {
      // User stopped speaking — we could auto-submit but let them click "Done"
    },
  });

  // --- Start the session ---
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSession() {
    setPhase('loading');
    try {
      const stream = await api.sessionTurn({
        sessionId,
        transcript: '__START__',
      });
      await processStream(stream);
    } catch (err) {
      console.error('[Interview] Start failed:', err);
    }
  }

  async function processStream(stream: AsyncGenerator<TurnChunk, void, undefined>) {
    let newQuestion: QuestionState | null = null;

    for await (const chunk of stream) {
      switch (chunk.type) {
        case 'decision':
          if (chunk.action === 'end') {
            setPhase('done');
            return;
          }
          break;

        case 'question':
          newQuestion = {
            text: chunk.text,
            type: chunk.questionType,
            isFollowUp: chunk.isFollowUp,
            order: question?.order ?? 0,
          };
          break;

        case 'done':
          if (newQuestion) {
            newQuestion.order = chunk.questionOrder;
          }
          break;

        case 'error':
          console.error('[Interview] Stream error:', chunk.message);
          break;
      }
    }

    if (newQuestion) {
      setQuestion(newQuestion);
      setPhase('asking');

      // Play question audio via TTS
      await tts.play(newQuestion.text);

      // After TTS finishes, start listening
      beginListening();
    }
  }

  function beginListening() {
    setPhase('listening');
    setLiveTranscript('');
    setInterimText('');
    stt.reset();
    stt.start();
  }

  const handleDoneAnswering = useCallback(async () => {
    // Stop STT
    stt.stop();

    const finalTranscript = stt.transcript.trim() || liveTranscript.trim();
    if (!finalTranscript) {
      // No speech detected — go back to listening
      beginListening();
      return;
    }

    // Send the transcript as a turn
    setPhase('thinking');
    setInterimText('');

    try {
      const stream = await api.sessionTurn({
        sessionId,
        transcript: finalTranscript,
      });
      await processStream(stream);
    } catch (err) {
      console.error('[Interview] Turn failed:', err);
      setPhase('done');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt, liveTranscript, sessionId]);

  async function handleEndInterview() {
    stt.stop();
    tts.stop();

    try {
      await api.sessionTurn({
        sessionId,
        transcript: '__ABANDON__',
      });
    } catch {
      // Best effort
    }

    window.location.hash = '#/dashboard';
  }

  function handleViewFeedback() {
    window.location.hash = `#/interview/feedback?sessionId=${sessionId}`;
  }

  // --- Done state ---
  if (phase === 'done') {
    return (
      <div className="interview-session">
        <div className="interview-topbar" />
        <div className="interview-main">
          <div className="interview-complete">
            <div className="interview-complete-icon">🎉</div>
            <h1 className="interview-complete-title">Interview Complete</h1>
            <p className="interview-complete-desc">
              Great work! Let's see how you did.
            </p>
            <button
              className="interview-complete-btn"
              onClick={handleViewFeedback}
            >
              View Feedback
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-session">
      {/* Top bar */}
      <div className="interview-topbar">
        <div className="interview-topbar-left">
          <span className="interview-phase-chip">{phase}</span>
          {question && (
            <span className="interview-question-count">
              Question {question.order}
            </span>
          )}
        </div>
        <div className="interview-topbar-right">
          <button className="interview-end-btn" onClick={handleEndInterview}>
            End Interview
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="interview-main">
        {/* Loading */}
        {phase === 'loading' && (
          <div className="interview-loading">
            <div className="interview-loading-spinner" />
            <p className="interview-loading-text">Preparing your interview…</p>
          </div>
        )}

        {/* Asking — show question + TTS playing */}
        {phase === 'asking' && question && (
          <>
            <div className="interview-question">
              <p className="interview-question-type">
                {question.type}{question.isFollowUp ? ' · follow-up' : ''}
              </p>
              <p className="interview-question-text">{question.text}</p>
            </div>
            {tts.isPlaying && (
              <div className="interview-phase-indicator">
                <div className="interview-listening-bars">
                  <div className="interview-listening-bar" />
                  <div className="interview-listening-bar" />
                  <div className="interview-listening-bar" />
                  <div className="interview-listening-bar" />
                  <div className="interview-listening-bar" />
                </div>
                <span className="interview-listening-text">Speaking…</span>
              </div>
            )}
          </>
        )}

        {/* Listening — show question + live transcript */}
        {phase === 'listening' && question && (
          <>
            <div className="interview-question">
              <p className="interview-question-type">
                {question.type}{question.isFollowUp ? ' · follow-up' : ''}
              </p>
              <p className="interview-question-text">{question.text}</p>
            </div>

            <div className="interview-listening-indicator">
              <div className="interview-listening-bars">
                <div className="interview-listening-bar" />
                <div className="interview-listening-bar" />
                <div className="interview-listening-bar" />
                <div className="interview-listening-bar" />
                <div className="interview-listening-bar" />
              </div>
              <span className="interview-listening-text">Listening…</span>
            </div>

            <div className="interview-transcript">
              <p className="interview-transcript-text">
                {liveTranscript}
                {interimText && (
                  <span className="interview-transcript-interim">
                    {' '}{interimText}
                  </span>
                )}
              </p>
            </div>
          </>
        )}

        {/* Thinking */}
        {phase === 'thinking' && (
          <div className="interview-phase-indicator">
            <div className="interview-thinking-dot" />
            <span className="interview-thinking-text">Thinking…</span>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="interview-controls">
        {phase === 'listening' && (
          <button
            className="interview-done-btn"
            onClick={handleDoneAnswering}
            disabled={!liveTranscript.trim() && !stt.transcript.trim()}
          >
            Done Answering
          </button>
        )}
      </div>
    </div>
  );
}
