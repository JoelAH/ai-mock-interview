import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Generated social card, on-brand with the site. Only flexbox + a subset of CSS
// is supported by next/og, so this stays deliberately simple (no grid, no vars).
export default function OpengraphImage() {
  const markBars = [18, 30, 44, 30, 20];
  const footerBars = [16, 30, 48, 28, 40, 22, 34];

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        backgroundColor: '#0b0e14',
        color: '#edf0f6',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '10px',
          backgroundImage: 'linear-gradient(90deg, #ffc06b, #ff8a5b)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          {markBars.map((h, i) => (
            <div
              key={i}
              style={{
                width: '5px',
                height: `${h}px`,
                borderRadius: '999px',
                backgroundColor: i % 2 ? '#5ee0c7' : '#ffb661',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: '34px', fontWeight: 700 }}>{SITE.name}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: '80px',
            fontWeight: 800,
            lineHeight: 1.03,
            letterSpacing: '-3px',
            maxWidth: '1000px',
          }}
        >
          <span>Rehearse the real interview, </span>
          <span style={{ color: '#ffb661' }}>&nbsp;out loud.</span>
        </div>
        <div style={{ display: 'flex', fontSize: '30px', color: '#aeb7ca', maxWidth: '900px' }}>
          Voice-first AI mock interviews with adaptive follow-ups and a scored report.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {footerBars.map((h, i) => (
            <div
              key={i}
              style={{
                width: '7px',
                height: `${h}px`,
                borderRadius: '999px',
                backgroundColor: '#5ee0c7',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: '24px', color: '#79839a' }}>devmockview.app</div>
      </div>
    </div>,
    { ...size },
  );
}
