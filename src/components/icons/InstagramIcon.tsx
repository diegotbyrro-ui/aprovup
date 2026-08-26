import type {
  SVGProps,
} from 'react';

type InstagramIconProps =
  SVGProps<SVGSVGElement> & {
    size?: number;
  };

export function InstagramIcon({
  size = 24,
  ...props
}: InstagramIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        ry="5"
      />

      <circle
        cx="12"
        cy="12"
        r="4"
      />

      <circle
        cx="17.5"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
