import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock SCSS module
vi.mock('@/components/interview/setup.module.scss', () => ({
  default: new Proxy({}, { get: (_, prop) => prop }),
}));

import JdInput from '@/components/interview/JdInput';
import SetupReview from '@/components/interview/SetupReview';

beforeEach(() => {
  mockPush.mockClear();
  sessionStorage.clear();
});

// ---------------------------------------------------------------------------
// JdInput — Form validation
// ---------------------------------------------------------------------------
describe('JdInput', () => {
  it('renders the heading and mode toggle', () => {
    render(<JdInput />);
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Start a new interview');
    expect(screen.getByLabelText('Input mode')).toBeInTheDocument();
  });

  it('shows error when submitting empty paste textarea', () => {
    render(<JdInput />);
    fireEvent.click(screen.getByRole('button', { name: /review setup/i }));
    expect(screen.getByText(/please paste a job description/i)).toBeInTheDocument();
  });

  it('shows error when paste text is too short', () => {
    render(<JdInput />);
    const textarea = screen.getByRole('textbox', { name: /job description text/i });
    fireEvent.change(textarea, { target: { value: 'Too short' } });
    fireEvent.click(screen.getByRole('button', { name: /review setup/i }));
    expect(screen.getByText(/seems too short/i)).toBeInTheDocument();
  });

  it('navigates to setup on valid paste submission', () => {
    render(<JdInput />);
    const textarea = screen.getByRole('textbox', { name: /job description text/i });
    const longText = 'A'.repeat(60);
    fireEvent.change(textarea, { target: { value: longText } });
    fireEvent.click(screen.getByRole('button', { name: /review setup/i }));
    expect(mockPush).toHaveBeenCalledWith('/interview/setup');
  });

  it('stores JD input in sessionStorage on submit', () => {
    render(<JdInput />);
    const textarea = screen.getByRole('textbox', { name: /job description text/i });
    const longText = 'Senior Software Engineer role at a payments company. ' + 'A'.repeat(50);
    fireEvent.change(textarea, { target: { value: longText } });
    fireEvent.click(screen.getByRole('button', { name: /review setup/i }));

    const stored = JSON.parse(sessionStorage.getItem('jd-input')!);
    expect(stored.sourceType).toBe('paste');
    expect(stored.jdText).toBe(longText.trim());
  });

  it('switches to preset mode and shows role chips', () => {
    render(<JdInput />);
    fireEvent.click(screen.getByLabelText('Select role preset'));
    expect(screen.getByRole('group', { name: /role presets/i })).toBeInTheDocument();
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Staff Backend Engineer')).toBeInTheDocument();
  });

  it('shows error when no preset is selected and submit is clicked', () => {
    render(<JdInput />);
    fireEvent.click(screen.getByLabelText('Select role preset'));
    fireEvent.click(screen.getByRole('button', { name: /review setup/i }));
    expect(screen.getByText(/please select a role preset/i)).toBeInTheDocument();
  });

  it('navigates on valid preset selection', () => {
    render(<JdInput />);
    fireEvent.click(screen.getByLabelText('Select role preset'));
    fireEvent.click(screen.getByText('Engineering Manager'));
    fireEvent.click(screen.getByRole('button', { name: /review setup/i }));
    expect(mockPush).toHaveBeenCalledWith('/interview/setup');
  });
});

// ---------------------------------------------------------------------------
// SetupReview — Renders mock signals
// ---------------------------------------------------------------------------
describe('SetupReview', () => {
  it('renders the heading', () => {
    render(<SetupReview />);
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Interview setup');
  });

  it('displays the parsed role', () => {
    render(<SetupReview />);
    expect(screen.getByText('Senior Software Engineer — Payments Platform')).toBeInTheDocument();
  });

  it('displays seniority', () => {
    render(<SetupReview />);
    expect(screen.getByText('Senior (5+ years)')).toBeInTheDocument();
  });

  it('displays tech stack chips', () => {
    render(<SetupReview />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('Kafka')).toBeInTheDocument();
  });

  it('displays culture signals', () => {
    render(<SetupReview />);
    expect(screen.getByText('ownership')).toBeInTheDocument();
    expect(screen.getByText('remote-first')).toBeInTheDocument();
  });

  it('displays interview type and duration', () => {
    render(<SetupReview />);
    expect(screen.getByText(/mixed/i)).toBeInTheDocument();
    expect(screen.getByText(/25 minutes/i)).toBeInTheDocument();
  });

  it('displays focus areas', () => {
    render(<SetupReview />);
    expect(screen.getByText('distributed systems')).toBeInTheDocument();
    expect(screen.getByText('event-driven architectures')).toBeInTheDocument();
  });

  it('has a Start interview button', () => {
    render(<SetupReview />);
    expect(screen.getByRole('button', { name: /start interview/i })).toBeInTheDocument();
  });

  it('navigates to mic-check when Start is clicked', () => {
    render(<SetupReview />);
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    expect(mockPush).toHaveBeenCalledWith('/mic-check');
  });

  it('has a Back button that navigates to /interview/new', () => {
    render(<SetupReview />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(mockPush).toHaveBeenCalledWith('/interview/new');
  });
});
