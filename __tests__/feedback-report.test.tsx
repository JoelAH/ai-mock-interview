import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock SCSS module — return class names as-is for assertions
vi.mock('@/components/interview/feedback.module.scss', () => ({
  default: new Proxy({}, { get: (_, prop) => prop }),
}));

import FeedbackReport from '@/components/interview/FeedbackReport';

describe('FeedbackReport', () => {
  it('renders the overall score', () => {
    render(<FeedbackReport />);
    expect(screen.getByText('76')).toBeInTheDocument();
    expect(screen.getByText('Overall')).toBeInTheDocument();
  });

  it('renders a plain-English diagnosis', () => {
    render(<FeedbackReport />);
    expect(screen.getByText(/solid foundation/i)).toBeInTheDocument();
  });

  it('renders all three sub-scores', () => {
    render(<FeedbackReport />);
    expect(screen.getByText('Technical Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Structure')).toBeInTheDocument();
    // Check sub-scores exist within the sub-scores area
    const subScoresArea = screen.getByLabelText('Sub-scores');
    expect(subScoresArea).toHaveTextContent('82');
    expect(subScoresArea).toHaveTextContent('78');
    expect(subScoresArea).toHaveTextContent('68');
  });

  it('applies correct color class based on score tier', () => {
    const { container } = render(<FeedbackReport />);
    // Overall score 76 → mid tier
    const scoreCircle = container.querySelector('.scoreCircle');
    expect(scoreCircle?.className).toContain('mid');
    // Technical 82 → high tier
    const subScoreCards = container.querySelectorAll('.subScoreCard');
    expect(subScoreCards[0]?.className).toContain('high'); // 82
    expect(subScoreCards[1]?.className).toContain('mid');  // 78
    expect(subScoreCards[2]?.className).toContain('mid');  // 68
  });

  it('renders the synthesized insight', () => {
    render(<FeedbackReport />);
    expect(screen.getByText(/STAR method/i)).toBeInTheDocument();
  });

  it('renders question breakdown items', () => {
    render(<FeedbackReport />);
    // Should have 4 question items (from mock data)
    const expandButtons = screen.getAllByLabelText(/expand|collapse/i);
    expect(expandButtons.length).toBe(4);
  });

  it('question detail is collapsed by default', () => {
    render(<FeedbackReport />);
    // The question header divs have aria-expanded
    const questionHeader = document.querySelector('[aria-controls="question-detail-0"]')!;
    expect(questionHeader).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands a question when clicked and shows transcript', () => {
    render(<FeedbackReport />);
    const questionHeader = document.querySelector('[aria-controls="question-detail-0"]')!;
    fireEvent.click(questionHeader);

    // Now the transcript should be visible
    expect(screen.getByText(/At my previous company, I redesigned/i)).toBeInTheDocument();
  });

  it('shows per-question scores when expanded', () => {
    render(<FeedbackReport />);
    const questionHeader = document.querySelector('[aria-controls="question-detail-0"]')!;
    fireEvent.click(questionHeader);

    // Check within the expanded detail section
    const detail = document.getElementById('question-detail-0')!;
    expect(detail).toHaveTextContent('Relevance');
    expect(detail).toHaveTextContent('Depth');
    expect(detail).toHaveTextContent('Clarity');
  });

  it('shows strong answer notes when expanded', () => {
    render(<FeedbackReport />);
    const questionHeader = document.querySelector('[aria-controls="question-detail-0"]')!;
    fireEvent.click(questionHeader);

    expect(screen.getByText(/Good use of concrete numbers/i)).toBeInTheDocument();
  });

  it('collapses a question when clicked again', () => {
    render(<FeedbackReport />);
    const questionHeader = document.querySelector('[aria-controls="question-detail-0"]')!;
    // Expand
    fireEvent.click(questionHeader);
    expect(questionHeader).toHaveAttribute('aria-expanded', 'true');
    // Collapse
    fireEvent.click(questionHeader);
    expect(questionHeader).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders "Practice this gap again" CTA and navigates', () => {
    render(<FeedbackReport />);
    const btn = screen.getByRole('button', { name: /practice this gap again/i });
    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith('/interview/new');
  });

  it('renders "View all sessions" CTA and navigates to dashboard', () => {
    render(<FeedbackReport />);
    const btn = screen.getByRole('button', { name: /view all sessions/i });
    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
