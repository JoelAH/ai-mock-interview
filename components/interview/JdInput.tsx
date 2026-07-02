'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import styles from './setup.module.scss';

const PRESETS = [
  { label: 'Senior Frontend Engineer', level: 'Senior', role: 'Frontend Engineer' },
  { label: 'Staff Backend Engineer', level: 'Staff', role: 'Backend Engineer' },
  { label: 'Senior Full-Stack Engineer', level: 'Senior', role: 'Full-Stack Engineer' },
  { label: 'Engineering Manager', level: 'Senior', role: 'Engineering Manager' },
  { label: 'Senior DevOps / SRE', level: 'Senior', role: 'DevOps / SRE' },
  { label: 'Staff Platform Engineer', level: 'Staff', role: 'Platform Engineer' },
] as const;

export default function JdInput() {
  const router = useRouter();
  const [mode, setMode] = useState<'paste' | 'preset'>('paste');
  const [jdText, setJdText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleModeChange = (_: unknown, newMode: 'paste' | 'preset' | null) => {
    if (newMode) {
      setMode(newMode);
      setError('');
    }
  };

  const handleSubmit = () => {
    if (mode === 'paste') {
      if (!jdText.trim()) {
        setError('Please paste a job description to continue.');
        return;
      }
      if (jdText.trim().length < 50) {
        setError('Job description seems too short. Please paste the full text.');
        return;
      }
    } else {
      if (selectedPreset === null) {
        setError('Please select a role preset to continue.');
        return;
      }
    }

    setError('');
    // Store input in sessionStorage for the review page to pick up
    const payload = mode === 'paste'
      ? { sourceType: 'paste' as const, jdText: jdText.trim() }
      : { sourceType: 'preset' as const, jdText: PRESETS[selectedPreset!].label };

    sessionStorage.setItem('jd-input', JSON.stringify(payload));
    router.push('/interview/setup');
  };

  return (
    <Box className={styles.page}>
      <Paper className={styles.card}>
        <Typography variant="h4" className={styles.heading}>
          Start a new interview
        </Typography>
        <Typography color="text.secondary" className={styles.subheading}>
          Paste a job description or pick a role preset. We&apos;ll tailor the interview to the
          specific signals in the JD.
        </Typography>

        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          className={styles.modeToggle}
          aria-label="Input mode"
        >
          <ToggleButton value="paste" aria-label="Paste job description">
            <ContentPasteIcon sx={{ mr: 0.5 }} fontSize="small" />
            Paste JD
          </ToggleButton>
          <ToggleButton value="preset" aria-label="Select role preset">
            Quick preset
          </ToggleButton>
        </ToggleButtonGroup>

        {mode === 'paste' ? (
          <TextField
            multiline
            minRows={8}
            maxRows={16}
            fullWidth
            placeholder="Paste the full job description here..."
            value={jdText}
            onChange={(e) => {
              setJdText(e.target.value);
              if (error) setError('');
            }}
            error={!!error && mode === 'paste'}
            helperText={mode === 'paste' ? error : ''}
            className={styles.textarea}
            slotProps={{ input: { 'aria-label': 'Job description text' } }}
          />
        ) : (
          <Box className={styles.presetGrid} role="group" aria-label="Role presets">
            {PRESETS.map((preset, idx) => (
              <Chip
                key={preset.label}
                label={preset.label}
                variant={selectedPreset === idx ? 'filled' : 'outlined'}
                color={selectedPreset === idx ? 'primary' : 'default'}
                onClick={() => {
                  setSelectedPreset(idx);
                  if (error) setError('');
                }}
                className={styles.presetChip}
                aria-pressed={selectedPreset === idx}
              />
            ))}
            {error && mode === 'preset' && (
              <Typography color="error" variant="body2" className={styles.errorText}>
                {error}
              </Typography>
            )}
          </Box>
        )}

        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={handleSubmit}
          className={styles.submitBtn}
        >
          Review setup
        </Button>
      </Paper>
    </Box>
  );
}
