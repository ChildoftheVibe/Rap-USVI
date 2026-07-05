const GRADIENTS = {
  primary: "linear-gradient(135deg, #001946 0%, #0047ab 55%, #0088ce 100%)",
  sand: "linear-gradient(135deg, #822800 0%, #b22234 45%, #e5b80b 100%)",
  teal: "linear-gradient(135deg, #002020 0%, #006a6a 55%, #0088ce 100%)",
} as const;

type PlaceholderImageProps = {
  label: string;
  variant?: keyof typeof GRADIENTS;
  className?: string;
};

/**
 * Stand-in for real photography. Renders as a labeled gradient panel so the
 * layout, aspect ratios, and accessibility semantics are all real; swap for a
 * next/image <Image> once actual photos are supplied, no callers need to change.
 */
export function PlaceholderImage({
  label,
  variant = "primary",
  className = "",
}: PlaceholderImageProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative flex items-end justify-start overflow-hidden ${className}`}
      style={{ background: GRADIENTS[variant] }}
    >
      <span className="m-4 rounded-md bg-black/30 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-white/80">
        Photo placeholder — {label}
      </span>
    </div>
  );
}
