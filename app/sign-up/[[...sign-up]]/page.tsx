import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: '1rem',
      }}
    >
      <SignUp />
      <p
        style={{
          maxWidth: '360px',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted, #79839a)',
          lineHeight: 1.5,
        }}
      >
        By signing up, you agree to our{' '}
        <a href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Privacy Policy
        </a>.
      </p>
    </div>
  );
}
