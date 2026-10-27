import type { CSSProperties, Ref } from "react";

// One opening plate as a <picture> (files from image_gen/prep_plates.py): AVIF, a tall 2:3 crop,
// and a WebP fallback. The browser picks the file, and picks again when a phone turns. `deferred` leaves the URLs in data- attributes until loadPlate() is called, so
// the scroll opening fetches plates just ahead of the reader instead of all at once.

export const TALL_QUERY = "(max-aspect-ratio: 4/5)";

export function Plate({ id, zoom = false, crop = "auto", deferred = false, imgRef, className, style, loading }: {
  id: string;
  /** an Act I zoom level (public/opening/zoom/) */
  zoom?: boolean;
  /**
   * auto: the 2:3 crop on portrait screens, 16:9 elsewhere. tall: always the 2:3 crop (a box that
   * is itself portrait, like the homepage window). wide: always 16:9.
   */
  crop?: "auto" | "tall" | "wide";
  deferred?: boolean;
  imgRef?: Ref<HTMLImageElement>;
  className?: string;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
}) {
  const base = `/opening/${zoom ? "zoom/" : ""}`;
  const at = (url: string) => (deferred ? { "data-srcset": url } : { srcSet: url });
  return (
    <picture>
      {crop === "auto" && <source media={TALL_QUERY} type="image/avif" {...at(`${base}tall/${id}.avif`)} />}
      <source type="image/avif" {...at(crop === "tall" ? `${base}tall/${id}.avif` : `${base}${id}.avif`)} />
      <img
        ref={imgRef}
        className={className}
        style={style}
        alt=""
        decoding="async"
        loading={loading}
        {...(deferred ? { "data-src": `${base}${id}.webp` } : { src: `${base}${id}.webp` })}
      />
    </picture>
  );
}

/**
 * Starts fetching a deferred plate (once); resolves when it has loaded, or failed. `low` marks a
 * background fetch that should not compete with the plates the reader is about to see.
 */
export function loadPlate(img: HTMLImageElement, low = false): Promise<void> {
  if (img.dataset.src) {
    img.fetchPriority = low ? "low" : "high";
    img.parentElement?.querySelectorAll("source").forEach((s) => {
      if (s.dataset.srcset) { s.srcset = s.dataset.srcset; delete s.dataset.srcset; }
    });
    img.src = img.dataset.src;
    delete img.dataset.src;
  }
  if (img.complete && img.currentSrc) return Promise.resolve();
  return new Promise((done) => {
    img.addEventListener("load", () => done(), { once: true });
    img.addEventListener("error", () => done(), { once: true });
  });
}
