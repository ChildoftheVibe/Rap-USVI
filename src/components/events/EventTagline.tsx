/**
 * An event's tagline (for example "Time to Heal"). It is always set in the
 * tagline display face, bold and italic, so it stands apart from the
 * EB Garamond headlines and Public Sans body text around it.
 */
export function EventTagline({
  text,
  className = "",
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const tagline = text?.trim();
  if (!tagline) return null;

  return (
    <p className={`font-[family-name:var(--font-tagline)] font-extrabold italic leading-tight ${className}`}>
      {tagline}
    </p>
  );
}
