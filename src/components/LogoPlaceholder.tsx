interface LogoPlaceholderProps {
  name: string;
  className?: string;
}

export function LogoPlaceholder({ name, className = "" }: LogoPlaceholderProps) {
  return (
    <div
      className={`flex h-16 w-32 sm:h-20 sm:w-40 items-center justify-center rounded-sm border border-dashed border-border/70 bg-card/40 px-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground ${className}`}
      title={name}
    >
      {name}
    </div>
  );
}
