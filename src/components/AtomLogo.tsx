import { useState } from "react";

interface AtomLogoProps {
  src?: string;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
  size?: "sm" | "md" | "lg" | "hero";
}

const sizeMap: Record<NonNullable<AtomLogoProps["size"]>, string> = {
  sm: "h-7 sm:h-8 text-sm",
  md: "h-8 sm:h-10 text-sm sm:text-base",
  lg: "h-10 sm:h-12 text-base sm:text-lg",
  hero: "h-12 sm:h-16 md:h-20 text-xl sm:text-2xl md:text-3xl",
};


export function AtomLogo({
  src = "/atom-logo.png",
  alt = "ATOM Ploiești",
  className = "",
  placeholderClassName = "",
  size = "md",
}: AtomLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`
          inline-flex items-center justify-center
          ${sizeMap[size]}
          w-auto aspect-[2.5/1]
          rounded-sm border border-border/60
          bg-accent/10 px-2.5 font-display font-semibold uppercase tracking-widest text-foreground
          ${placeholderClassName}
        `}
        aria-label={alt}
        title={alt}
      >
        ATOM
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`w-auto object-contain shrink-0 ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
