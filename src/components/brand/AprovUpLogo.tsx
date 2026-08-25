type AprovUpLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
  light?: boolean;
  showTagline?: boolean;
  className?: string;
};

export function AprovUpLogo({
  size = 'md',
  center = false,
  light = false,
  className = '',
}: AprovUpLogoProps) {
  const widths = {
    sm: 170,
    md: 260,
    lg: 430,
    xl: 620,
  };

  const imageClass =
    'aprovup-logo-image h-auto max-w-full object-contain';

  return (
    <div
      className={[
        'flex',
        center ? 'justify-center' : 'justify-start',
        light
          ? 'rounded-3xl bg-white/95 px-4 py-3 shadow-xl shadow-black/10'
          : '',
        className,
      ].join(' ')}
    >
      <img
        src="/brand/aprovup-logo-oficial.png"
        alt="AprovUp"
        width={widths[size]}
        className={`${imageClass} aprovup-logo-image-default`}
      />

      <img
        src="/brand/aprovup-logo-white.png"
        alt="AprovUp"
        width={widths[size]}
        className={`${imageClass} aprovup-logo-image-dark`}
      />
    </div>
  );
}