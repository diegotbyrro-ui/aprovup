type YouTubeIconProps = {
  size?: number;
  className?: string;
};

export function YouTubeIcon({
  size = 20,
  className,
}: YouTubeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M21.58 7.19a2.97 2.97 0 0 0-2.09-2.1C17.65 4.6 12 4.6 12 4.6s-5.65 0-7.49.49a2.97 2.97 0 0 0-2.09 2.1C1.93 9.03 1.93 12 1.93 12s0 2.97.49 4.81a2.97 2.97 0 0 0 2.09 2.1c1.84.49 7.49.49 7.49.49s5.65 0 7.49-.49a2.97 2.97 0 0 0 2.09-2.1c.49-1.84.49-4.81.49-4.81s0-2.97-.49-4.81Z"
        fill="white"
      />
      <path
        d="M10.15 8.9 15.4 12l-5.25 3.1V8.9Z"
        fill="#dc2626"
      />
    </svg>
  );
}