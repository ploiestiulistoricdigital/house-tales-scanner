import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function BeforeAfterSlider({
  beforeSrc,
  beforeLabel,
  afterSrc,
  afterLabel,
  afterPlaceholder,
  onHandleClick,
  switchLabel,
}: {
  beforeSrc: string;
  beforeLabel: string;
  afterSrc?: string;
  afterLabel: string;
  afterPlaceholder?: string;
  onHandleClick?: () => void;
  switchLabel: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    movedRef.current = false;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    movedRef.current = true;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  const handleHandleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (movedRef.current) return;
    onHandleClick?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/10] sm:aspect-[16/9] w-full select-none overflow-hidden rounded-md border border-border/70 shadow-[var(--shadow-warm)] touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="absolute inset-0">
        {afterSrc ? (
          <img src={afterSrc} alt={afterLabel} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-secondary text-muted-foreground text-sm italic px-6 text-center">
            {afterPlaceholder}
          </div>
        )}
        <span className="absolute bottom-3 right-3 rounded-sm bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-foreground border border-border/60">
          {afterLabel}
        </span>
      </div>

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={beforeSrc} alt={beforeLabel} className="h-full w-full object-cover sepia-[0.15]" draggable={false} />
        <span className="absolute bottom-3 left-3 rounded-sm bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-foreground border border-border/60">
          {beforeLabel}
        </span>
      </div>

      <div
        className="absolute inset-y-0 w-0.5 bg-background/90"
        style={{ left: `${position}%` }}
      >
        <button
          type="button"
          onClick={handleHandleClick}
          aria-label={switchLabel}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background border border-border shadow-[var(--shadow-warm)] flex items-center justify-center text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5 -mr-1" />
          <ChevronRight className="h-3.5 w-3.5 -ml-1" />
        </button>
      </div>
    </div>
  );
}
