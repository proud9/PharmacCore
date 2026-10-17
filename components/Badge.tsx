import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "brass";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "neutral" && "bg-sage-100 text-pine-800",
        tone === "good" && "bg-emerald-100 text-emerald-800",
        tone === "warn" && "bg-amber-100 text-amber-800",
        tone === "bad" && "bg-rose-100 text-rose-800",
        tone === "brass" && "bg-brass/20 text-pine-900",
      )}
    >
      {children}
    </span>
  );
}
