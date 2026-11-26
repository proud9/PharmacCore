import Link from "next/link";
import { PrintButton } from "@/components/documents/PrintButton";

export function DocumentFrame({ back, children }: { back: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-between px-2">
        <Link href={back} className="text-sm text-pine-700 underline-offset-2 hover:text-pine-900 hover:underline">
          Back
        </Link>
        <PrintButton />
      </div>
      {children}
    </div>
  );
}
