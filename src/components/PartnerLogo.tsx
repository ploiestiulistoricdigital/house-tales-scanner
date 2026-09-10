interface PartnerLogoProps {
  name: string;
  src: string;
  href?: string;
  className?: string;
}

export function PartnerLogo({ name, src, href, className = "" }: PartnerLogoProps) {
  const logoBox = (
    <div className="flex h-16 w-32 sm:h-20 sm:w-40 items-center justify-center rounded-sm border border-border/70 bg-transparent p-3 transition duration-200 ease-out group-hover:border-primary/60 group-hover:shadow-md">
      <img src={src} alt={name} className="max-h-full max-w-full object-contain mix-blend-multiply" loading="lazy" />
    </div>
  );

  const caption = (
    <span className="text-center text-xs font-medium uppercase tracking-wide leading-snug text-muted-foreground transition-colors duration-200 group-hover:text-primary">
      {name}
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex flex-col items-center gap-2 w-32 sm:w-40 ${className}`}
      >
        {logoBox}
        {caption}
      </a>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 w-32 sm:w-40 ${className}`}>
      {logoBox}
      {caption}
    </div>
  );
}
