import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock SCSS module
vi.mock('@/components/interview/session.module.scss', () => ({
  default: new Proxy({}, { get: (_, prop) => prop }),
}));

import InterviewSession from '@/components/interview/InterviewSession';

beforeEach(() => {
  vi.useFakeTimers();
  mockPush.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('InterviewSession', () => {
  it('starts in the asking phase showing the first question', () => {
    render(<InterviewSession />);
    expect(screen.getByText(/question 1 of/i)).toBeInTheDocument();
    expect(screen.getByText(/interviewer is speaking/i)).toBeInTheDocument();
    // First mock question text should be visible
    expect(screen.getByText(/tell me about a time you designed a system/i)).toBeInTheDocument();
  });

  it('transitions from asking to listening after delay', () => {
    render(<InterviewSession />);
    expect(screen.getByText(/interviewer is speaking/i)).toBeInTheDocument();

    // Advance past the ASKING_DELAY (2000ms)
    act(() => { vi.advanceTimersByTime(2100); });

    expect(screen.getByText(/listening to your answer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /done answering/i })).toBeInTheDocument();
  });

  it('shows live transcript building during listening phase', () => {
    render(<InterviewSession />);

    // Move to listening phase
    act(() => { vi.advanceTimersByTime(2100); });

    // Advance a bit to let transcript build
    act(() => { vi.advanceTimersByTime(200); });

    // Transcript area should exist
    expect(screen.getByLabelText(/your answer transcript/i)).toBeInTheDocument();
  });

  it('transitions to thinking phase when Done answering is clicked', () => {
    render(<InterviewSession />);

    // Move to listening
    act(() => { vi.advanceTimersByTime(2100); });

    // Click done answering
    fireEvent.click(screen.getByRole('button', { name: /done answering/i }));

    expect(screen.getByText(/interviewer is thinking/i)).toBeInTheDocument();
    // Done answering button should be gone
    expect(screen.queryByRole('button', { name: /done answering/i })).not.toBeInTheDocument();
  });

  it('advances to the next question after thinking delay', () => {
    render(<InterviewSession />);

    // Move to listening
    act(() => { vi.advanceTimersByTime(2100); });

    // Click done answering → thinking
    fireEvent.click(screen.getByRole('button', { name: /done answering/i }));

    // Advance past THINKING_DELAY (1500ms) — should go to next question (asking)
    act(() => { vi.advanceTimersByTime(1600); });

    expect(screen.getByText(/question 2 of/i)).toBeInTheDocument();
    expect(screen.getByText(/interviewer is speaking/i)).toBeInTheDocument();
  });

  it('shows done state after all questions are exhausted', () => {
    render(<InterviewSession />);

    // Walk through all 4 questions
    for (let i = 0; i < 4; i++) {
      // asking → listening
      act(() => { vi.advanceTimersByTime(2100); });
      // Click done answering
      fireEvent.click(screen.getByRole('button', { name: /done answering/i }));
      // thinking → next (or done on last)
      act(() => { vi.advanceTimersByTime(1600); });
    }

    expect(screen.getByText(/interview complete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view feedback/i })).toBeInTheDocument();
  });

  it('navigates to feedback when View feedback is clicked', () => {
    render(<InterviewSession />);

    // Fast-forward through all questions
    for (let i = 0; i < 4; i++) {
      act(() => { vi.advanceTimersByTime(2100); });
      fireEvent.click(screen.getByRole('button', { name: /done answering/i }));
      act(() => { vi.advanceTimersByTime(1600); });
    }

    fireEvent.click(screen.getByRole('button', { name: /view feedback/i }));
    expect(mockPush).toHaveBeenCalledWith('/interview/feedback');
  });

  it('shows question type chip', () => {
    render(<InterviewSession />);
    expect(screen.getByText('architectural')).toBeInTheDocument();
  });

  it('does not show Done answering during asking or thinking phases', () => {
    render(<InterviewSession />);

    // In asking phase
    expect(screen.queryByRole('button', { name: /done answering/i })).not.toBeInTheDocument();

    // Move to listening, then click done → thinking
    act(() => { vi.advanceTimersByTime(2100); });
    fireEvent.click(screen.getByRole('button', { name: /done answering/i }));

    // In thinking phase
    expect(screen.queryByRole('button', { name: /done answering/i })).not.toBeInTheDocument();
  });
});
