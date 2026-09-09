interface PartnerLogoProps {
  name: string;
  src: string;
  className?: string;
}

export function PartnerLogo({ name, src, className = "" }: PartnerLogoProps) {
  return (
    <div className={`flex flex-col items-center gap-2 w-32 sm:w-40 ${className}`}>
      <div className="flex h-16 w-32 sm:h-20 sm:w-40 items-center justify-center rounded-sm border border-border/70 bg-transparent p-3">
        <img src={src} alt={name} className="max-h-full max-w-full object-contain mix-blend-multiply" loading="lazy" />
      </div>
      <span className="text-center text-xs font-medium uppercase tracking-wide leading-snug text-muted-foreground">
        {name}
      </span>
    </div>
  );
}
