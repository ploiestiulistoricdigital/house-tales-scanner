import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function BeforeAfterSlider({
  beforeSrc,
  beforeLabel,
  beforeCaption,
  afterSrc,
  afterLabel,
  afterCaption,
  afterPlaceholder,
}: {
  beforeSrc: string;
  beforeLabel: string;
  beforeCaption?: string | null;
  afterSrc?: string;
  afterLabel: string;
  afterCaption?: string | null;
  afterPlaceholder?: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
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
        <div className="absolute bottom-3 right-3 max-w-[70%] rounded-sm bg-background/90 backdrop-blur px-2.5 py-1 text-right text-foreground border border-border/60">
          <span className="block text-xs font-semibold uppercase tracking-widest">{afterLabel}</span>
          {afterCaption && <span className="block text-xs italic mt-0.5">{afterCaption}</span>}
        </div>
      </div>

      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={beforeSrc} alt={beforeLabel} className="h-full w-full object-cover sepia-[0.15]" draggable={false} />
        <div className="absolute bottom-3 left-3 max-w-[70%] rounded-sm bg-background/90 backdrop-blur px-2.5 py-1 text-foreground border border-border/60">
          <span className="block text-xs font-semibold uppercase tracking-widest">{beforeLabel}</span>
          {beforeCaption && <span className="block text-xs italic mt-0.5">{beforeCaption}</span>}
        </div>
      </div>

      <div
        className="absolute inset-y-0 w-0.5 bg-background/90"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background border border-border shadow-[var(--shadow-warm)] flex items-center justify-center text-foreground">
          <ChevronLeft className="h-3.5 w-3.5 -mr-1" />
          <ChevronRight className="h-3.5 w-3.5 -ml-1" />
        </div>
      </div>
    </div>
  );
}
