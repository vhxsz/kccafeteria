import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="MealUp home">
      <span className="grid h-9 w-9 -rotate-2 place-items-center rounded-xl bg-moss text-white shadow-[0_8px_22px_rgba(120,0,25,.22)]">
        <UtensilsCrossed size={18} strokeWidth={2} />
      </span>
      {!compact && (
        <span className="text-xl font-bold tracking-[-0.05em]">
          Meal<span className="text-tomato">Up</span>
        </span>
      )}
    </Link>
  );
}
