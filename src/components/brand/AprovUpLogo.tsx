type AprovUpLogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  center?: boolean;
  light?: boolean;
  showTagline?: boolean;
  className?: string;
};


export function AprovUpLogo({
  size = "md",
  center = false,
  light = false,
  className = "",
}: AprovUpLogoProps) {

  const widths = {
    sm:
      160,

    md:
      260,

    lg:
      430,

    xl:
      620,
  };


  return (

    <div
      className={[
        "inline-flex items-center",
        center
          ? "justify-center"
          : "justify-start",

        light
          ? "rounded-2xl bg-white px-4 py-3"
          : "",

        className,
      ].join(" ")}
    >

      <img
        src="/brand/aprovup-logo-new.png"
        alt="AprovUp"
        width={widths[size]}
        height="auto"
        className="block h-auto max-w-full object-contain"
      />

    </div>
  );
}