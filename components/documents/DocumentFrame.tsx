import Link from "next/link";
import { PrintButton } from "@/components/documents/PrintButton";

export function DocumentFrame({ back, children }: { back: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#e7eef3] py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-between px-2">
        <Link href={back} className="text-sm text-[#102a43] underline">
          Back
        </Link>
        <PrintButton />
      </div>
      {children}
    </div>
  );
}
