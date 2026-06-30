import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function HelloWorld() {
  return <h1>Hello, Mock Interview</h1>;
}

describe('Smoke test', () => {
  it('renders a heading', () => {
    render(<HelloWorld />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello, Mock Interview');
  });
});
