import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { useI18n } from "@/lib/i18n";

export function ImageGalleryField({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const { t } = useI18n();

  function move(index: number, delta: -1 | 1) {
    const next = [...images];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }

  return (
    <fieldset className="rounded-md border border-border/70 bg-muted/20 p-3 sm:p-4">
      <legend className="px-1 text-base font-medium">{t("heritageItems.field.images")}</legend>
      <ImageUploader label={t("heritageItems.field.imagesAdd")} onUploaded={(url) => onChange([...images, url])} />
      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((url, i) => (
            <li key={url} className="rounded border bg-background p-2">
              <img src={url} alt="" className="h-28 w-full rounded object-cover" />
              <div className="mt-2 flex items-center justify-between gap-1">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label={t("heritageItems.field.imageMoveUp")}
                  className="p-2 rounded hover:bg-accent disabled:opacity-40"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={i === images.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={t("heritageItems.field.imageMoveDown")}
                  className="p-2 rounded hover:bg-accent disabled:opacity-40"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(images.filter((_, j) => j !== i))}
                  aria-label={t("heritageItems.field.imageRemove")}
                  className="p-2 rounded hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
