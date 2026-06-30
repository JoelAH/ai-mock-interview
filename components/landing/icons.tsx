// Inline SVG icon set — one consistent visual language (1.6px rounded stroke,
// currentColor) so nothing looks like clip-art bolted on. No emoji anywhere.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21M8.5 21h7" />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </Svg>
  );
}

export function BranchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <path d="M6 8.2v3.3a3 3 0 0 0 3 3h6.8M18 8.2c0 4-2 6.3-4.5 6.3" />
    </Svg>
  );
}

export function BracketsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 4.5 4 12l4.5 7.5M15.5 4.5 20 12l-4.5 7.5M13.5 8l-3 8" />
    </Svg>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 15a8.5 8.5 0 1 1 17 0" />
      <path d="M12 15l4-4.5" />
      <circle cx="12" cy="15" r="1.4" />
    </Svg>
  );
}

export function TrendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19V5M4 19h16" />
      <path d="M7.5 15.5 11 11l2.5 2.5L19 7" />
      <path d="M19 7h-3M19 7v3" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </Svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5c.6 4.4 1.6 5.4 6 6-4.4.6-5.4 1.6-6 6-.6-4.4-1.6-5.4-6-6 4.4-.6 5.4-1.6 6-6Z" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 5 5.5v5c0 4.5 3 7.7 7 9.5 4-1.8 7-5 7-9.5v-5L12 3Z" />
      <path d="m9 11.5 2 2 4-4" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

// Brand mark: a soundwave seated inside a rounded "seat" — voice + the hot seat.
export function Logo(props: IconProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      width="28"
      height="28"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect
        x="1.5"
        y="1.5"
        width="25"
        height="25"
        rx="8"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
        <path d="M8 14v0" />
        <path d="M11.3 10v8" />
        <path d="M14.7 6.5v15" />
        <path d="M18 9v10" />
        <path d="M21 12.5v3" />
      </g>
    </svg>
  );
}

export const featureIcons: Record<string, (props: IconProps) => React.ReactElement> = {
  mic: MicIcon,
  target: TargetIcon,
  branch: BranchIcon,
  brackets: BracketsIcon,
  gauge: GaugeIcon,
  trend: TrendIcon,
};
