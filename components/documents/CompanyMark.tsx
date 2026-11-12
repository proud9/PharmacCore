type PharmacyMark = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  tpin: string | null;
  logoPath: string | null;
};

export function CompanyMark({ pharmacy, eyebrow }: { pharmacy: PharmacyMark; eyebrow: string }) {
  const phoneEmail = [pharmacy.phone, pharmacy.email].filter(Boolean).join(" | ");
  const web = [pharmacy.website, pharmacy.tpin ? `TPIN ${pharmacy.tpin}` : null].filter(Boolean).join(" | ");

  return (
    <section className="rounded-md border border-[#c7d2de] bg-[#f4f7fa] p-3">
      <div className="flex gap-3">
        {pharmacy.logoPath ? (
          <img src="/api/pharmacy/logo" alt="" className="h-14 w-14 shrink-0 rounded border border-[#c7d2de] bg-white object-contain" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-[#c7d2de] bg-white text-[10px] font-semibold tracking-wide text-[#627d98]">
            LOGO
          </div>
        )}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#627d98]">{eyebrow}</p>
          <p className="font-display text-lg leading-tight text-[#102a43]">{pharmacy.name}</p>
          <p className="mt-1 text-xs">{pharmacy.address}</p>
          <p className="text-xs">{phoneEmail}</p>
          <p className="text-xs">{web}</p>
        </div>
      </div>
    </section>
  );
}
