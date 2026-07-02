import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock SCSS modules
vi.mock('@/components/interview/interview.module.scss', () => ({
  default: new Proxy({}, { get: (_, prop) => prop }),
}));
vi.mock('@/components/interview/setup.module.scss', () => ({
  default: new Proxy({}, { get: (_, prop) => prop }),
}));

// ---------------------------------------------------------------------------
// Web Audio API mocks
// ---------------------------------------------------------------------------
let mockGetByteFrequencyData: ReturnType<typeof vi.fn>;
let mockGetUserMedia: ReturnType<typeof vi.fn>;
let rafCallbacks: FrameRequestCallback[];

function setupMediaMocks(options?: { deny?: boolean }) {
  mockGetByteFrequencyData = vi.fn((arr: Uint8Array) => {
    // Fill with high values to trigger audio detection
    for (let i = 0; i < arr.length; i++) {
      arr[i] = 180;
    }
  });

  rafCallbacks = [];

  const mockAnalyser = {
    fftSize: 256,
    frequencyBinCount: 128,
    smoothingTimeConstant: 0.7,
    getByteFrequencyData: mockGetByteFrequencyData,
  };

  const mockSource = { connect: vi.fn() };
  const mockTrack = { stop: vi.fn(), kind: 'audio' };
  const mockStream = { getTracks: () => [mockTrack] };

  // Mock AudioContext as a class
  class MockAudioContext {
    createMediaStreamSource() { return mockSource; }
    createAnalyser() { return mockAnalyser; }
    close() {}
  }
  vi.stubGlobal('AudioContext', MockAudioContext);

  // Mock getUserMedia
  mockGetUserMedia = options?.deny
    ? vi.fn().mockRejectedValue(Object.assign(new Error('Not allowed'), { name: 'NotAllowedError' }))
    : vi.fn().mockResolvedValue(mockStream);

  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });

  // Mock requestAnimationFrame to execute callback synchronously once
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
}

function flushRaf() {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach((cb) => cb(performance.now()));
}

import { AudioLevelMeter } from '@/components/interview/AudioLevelMeter';
import { MicCheck } from '@/components/interview/MicCheck';

beforeEach(() => {
  vi.clearAllMocks();
  mockPush.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// AudioLevelMeter tests
// ---------------------------------------------------------------------------
describe('AudioLevelMeter', () => {
  it('calls onAudioDetected when audio exceeds threshold', async () => {
    setupMediaMocks();
    const onDetected = vi.fn();

    await act(async () => {
      render(<AudioLevelMeter onAudioDetected={onDetected} />);
    });

    // Flush the raf to process frequency data
    act(() => flushRaf());

    await waitFor(() => {
      expect(screen.getByText(/audio detected/i)).toBeInTheDocument();
    });
    expect(onDetected).toHaveBeenCalledTimes(1);
  });

  it('shows denied message when mic permission is refused', async () => {
    setupMediaMocks({ deny: true });

    await act(async () => {
      render(<AudioLevelMeter />);
    });

    await waitFor(() => {
      expect(screen.getByText(/microphone access denied/i)).toBeInTheDocument();
    });
  });

  it('shows "Speak to test" message before audio is detected', async () => {
    // Use a mock that returns silence (below threshold)
    setupMediaMocks();
    mockGetByteFrequencyData.mockImplementation((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = 0;
    });

    await act(async () => {
      render(<AudioLevelMeter threshold={0.5} />);
    });

    act(() => flushRaf());

    await waitFor(() => {
      expect(screen.getByText(/speak to test/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// MicCheck integration tests
// ---------------------------------------------------------------------------
describe('MicCheck', () => {
  it('shows consent form first', () => {
    render(<MicCheck />);
    expect(screen.getByText(/before we go live/i)).toBeInTheDocument();
  });

  it('shows mic check UI after consent is given', async () => {
    setupMediaMocks();
    render(<MicCheck />);

    // Check required consent and continue
    const checkbox = screen.getByRole('checkbox', { name: /i consent/i });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: /i agree/i }));

    await waitFor(() => {
      expect(screen.getByText(/test your microphone/i)).toBeInTheDocument();
    });
  });

  it('Continue button is disabled before audio detection', async () => {
    setupMediaMocks();
    // Silence — no detection
    mockGetByteFrequencyData.mockImplementation((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = 0;
    });

    render(<MicCheck />);

    // Give consent
    fireEvent.click(screen.getByRole('checkbox', { name: /i consent/i }));
    fireEvent.click(screen.getByRole('button', { name: /i agree/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue to interview/i })).toBeDisabled();
    });
  });

  it('Continue button enables after audio detection and navigates on click', async () => {
    setupMediaMocks();
    render(<MicCheck />);

    // Give consent
    fireEvent.click(screen.getByRole('checkbox', { name: /i consent/i }));
    fireEvent.click(screen.getByRole('button', { name: /i agree/i }));

    // Wait for meter to mount, then flush raf to trigger detection
    await waitFor(() => {
      expect(screen.getByText(/test your microphone/i)).toBeInTheDocument();
    });

    act(() => flushRaf());

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /continue to interview/i });
      expect(btn).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /continue to interview/i }));
    expect(mockPush).toHaveBeenCalledWith('/interview/session');
  });
});
