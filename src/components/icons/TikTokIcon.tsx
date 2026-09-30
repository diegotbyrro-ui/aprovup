type TikTokIconProps = {
  size?: number;
  className?: string;
};

export function TikTokIcon({
  size = 20,
  className,
}: TikTokIconProps) {
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
        d="M15.3 3c.4 2.1 1.6 3.4 3.7 4v3.2a8.1 8.1 0 0 1-3.7-1.1v6.2a5.7 5.7 0 1 1-4.9-5.6v3.3a2.5 2.5 0 1 0 1.7 2.3V3h3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}