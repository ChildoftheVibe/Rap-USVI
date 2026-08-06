import Link from "next/link";

export function DonateButton({ className }: { className?: string }) {
  return (
    <Link href="/donate" className={className ?? "btn btn-sm btn-gold"}>
      Donate
    </Link>
  );
}
