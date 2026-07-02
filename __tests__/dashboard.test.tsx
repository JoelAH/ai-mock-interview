import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock SCSS module
vi.mock('@/components/dashboard/dashboard.module.scss', () => ({
  default: new Proxy({}, { get: (_, prop) => prop }),
}));

// We'll mock the mock data module to test empty vs populated states
const mockDashboard = vi.hoisted(() => ({
  mockDashboardResponse: {
    sessions: [
      {
        sessionId: 'sess_1',
        interviewType: 'mix',
        status: 'completed',
        overallScore: 76,
        createdAt: '2025-06-15T14:30:00.000Z',
        parsedSignals: {
          role: 'Senior Software Engineer',
          seniority: 'Senior',
          stack: ['TypeScript'],
          culture: ['collaborative'],
          focusAreas: ['distributed systems'],
        },
      },
      {
        sessionId: 'sess_2',
        interviewType: 'behavioral',
        status: 'completed',
        overallScore: 82,
        createdAt: '2025-06-10T09:15:00.000Z',
        parsedSignals: {
          role: 'Engineering Manager',
          seniority: 'Senior',
          stack: ['React'],
          culture: ['mentorship'],
          focusAreas: ['leadership'],
        },
      },
    ],
    totalSessions: 2,
    averageScore: 79,
  },
}));

vi.mock('@/lib/mock', () => mockDashboard);

import Dashboard from '@/components/dashboard/Dashboard';
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart';

beforeEach(() => {
  mockPush.mockClear();
});

// ---------------------------------------------------------------------------
// Dashboard — populated state
// ---------------------------------------------------------------------------
describe('Dashboard (populated)', () => {
  it('renders a greeting with user name', () => {
    render(<Dashboard userName="Alice" />);
    expect(screen.getByText(/welcome back, alice/i)).toBeInTheDocument();
  });

  it('shows session count', () => {
    render(<Dashboard />);
    expect(screen.getByText(/2 sessions completed/i)).toBeInTheDocument();
  });

  it('shows average score', () => {
    render(<Dashboard />);
    expect(screen.getByText('79')).toBeInTheDocument();
    expect(screen.getByText('Avg. Score')).toBeInTheDocument();
  });

  it('renders session history list', () => {
    render(<Dashboard />);
    expect(screen.getByLabelText('Session history')).toBeInTheDocument();
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Engineering Manager')).toBeInTheDocument();
  });

  it('shows score for each session', () => {
    render(<Dashboard />);
    expect(screen.getByText('76')).toBeInTheDocument();
    expect(screen.getByText('82')).toBeInTheDocument();
  });

  it('shows interview type chips', () => {
    render(<Dashboard />);
    expect(screen.getByText('Mixed')).toBeInTheDocument();
    expect(screen.getByText('Behavioral')).toBeInTheDocument();
  });

  it('navigates to feedback when a session row is clicked', () => {
    render(<Dashboard />);
    const row = screen.getByLabelText(/view session: senior software engineer/i);
    fireEvent.click(row);
    expect(mockPush).toHaveBeenCalledWith('/interview/feedback');
  });

  it('navigates to new interview when New interview button is clicked', () => {
    render(<Dashboard />);
    fireEvent.click(screen.getByRole('button', { name: /new interview/i }));
    expect(mockPush).toHaveBeenCalledWith('/interview/new');
  });

  it('renders the score trend chart', () => {
    render(<Dashboard />);
    expect(screen.getByText('Score Trend')).toBeInTheDocument();
    expect(screen.getByLabelText('Score trend chart')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Dashboard — empty state
// ---------------------------------------------------------------------------
describe('Dashboard (empty)', () => {
  beforeEach(() => {
    mockDashboard.mockDashboardResponse = {
      sessions: [],
      totalSessions: 0,
      averageScore: null,
    };
  });

  afterEach(() => {
    // Restore for other tests
    mockDashboard.mockDashboardResponse = {
      sessions: [
        {
          sessionId: 'sess_1',
          interviewType: 'mix',
          status: 'completed',
          overallScore: 76,
          createdAt: '2025-06-15T14:30:00.000Z',
          parsedSignals: {
            role: 'Senior Software Engineer',
            seniority: 'Senior',
            stack: ['TypeScript'],
            culture: ['collaborative'],
            focusAreas: ['distributed systems'],
          },
        },
        {
          sessionId: 'sess_2',
          interviewType: 'behavioral',
          status: 'completed',
          overallScore: 82,
          createdAt: '2025-06-10T09:15:00.000Z',
          parsedSignals: {
            role: 'Engineering Manager',
            seniority: 'Senior',
            stack: ['React'],
            culture: ['mentorship'],
            focusAreas: ['leadership'],
          },
        },
      ],
      totalSessions: 2,
      averageScore: 79,
    };
  });

  it('shows empty state message', () => {
    render(<Dashboard />);
    expect(screen.getByRole('heading', { name: /no sessions yet/i })).toBeInTheDocument();
  });

  it('shows CTA to start first interview', () => {
    render(<Dashboard />);
    const btn = screen.getByRole('button', { name: /start your first interview/i });
    fireEvent.click(btn);
    expect(mockPush).toHaveBeenCalledWith('/interview/new');
  });

  it('does not show stats row when empty', () => {
    render(<Dashboard />);
    expect(screen.queryByText('Avg. Score')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ScoreTrendChart
// ---------------------------------------------------------------------------
describe('ScoreTrendChart', () => {
  it('renders sparkline SVG with valid scores', () => {
    render(<ScoreTrendChart scores={[70, 75, 80]} />);
    expect(screen.getByLabelText('Score trend chart')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows message when fewer than 2 scores', () => {
    render(<ScoreTrendChart scores={[80]} />);
    expect(screen.getByText(/complete more sessions/i)).toBeInTheDocument();
  });

  it('handles null scores gracefully', () => {
    render(<ScoreTrendChart scores={[null, 70, null, 85]} />);
    expect(screen.getByLabelText('Score trend chart')).toBeInTheDocument();
  });
});
