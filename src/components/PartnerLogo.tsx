interface PartnerLogoProps {
  name: string;
  src: string;
  className?: string;
}

export function PartnerLogo({ name, src, className = "" }: PartnerLogoProps) {
  return (
    <div
      className={`flex h-16 w-32 sm:h-20 sm:w-40 items-center justify-center rounded-sm border border-border/70 bg-card/40 p-3 ${className}`}
    >
      <img src={src} alt={name} className="max-h-full max-w-full object-contain" loading="lazy" />
    </div>
  );
}
