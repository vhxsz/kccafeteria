import Link from "next/link";
import { Leaf } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Nourish home">
      <span className="grid h-9 w-9 rotate-3 place-items-center rounded-xl bg-tomato text-white shadow-sm">
        <Leaf size={19} fill="currentColor" strokeWidth={1.5} />
      </span>
      {!compact && <span className="text-xl font-bold tracking-[-0.04em]">nourish</span>}
    </Link>
  );
}
