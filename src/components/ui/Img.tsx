"use client";

import { preload } from "react-dom";
import { asset } from "@/lib/paths";
import manifest from "@/lib/media-manifest.json";

type Entry = { w: number; h: number; base: string; widths: number[] };
const media = manifest as Record<string, Entry>;

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  alt: string;
  /** Above the fold: loaded first, and preloaded from the page's head. */
  priority?: boolean;
  /** How wide the image is drawn, as for the sizes attribute; the browser picks the file from it. */
  sizes?: string;
};

/** AVIF widths of a public/ image, as a srcset (empty when the image has none). */
export function avifSrcSet(src: string) {
  const m = media[src];
  return m ? m.widths.map((w) => `${asset(`${m.base}-${w}.avif`)} ${w}w`).join(", ") : "";
}

/** An image from public/: AVIF in the width the layout needs, the original JPEG for browsers without AVIF. */
export function Img({ src, alt, priority, sizes = "100vw", ...rest }: Props) {
  const m = media[src];
  const srcSet = avifSrcSet(src);
  if (priority && srcSet) preload(asset(src), { as: "image", imageSrcSet: srcSet, imageSizes: sizes, fetchPriority: "high", type: "image/avif" });
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(src)}
      alt={alt}
      width={m?.w}
      height={m?.h}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      {...rest}
    />
  );
  if (!srcSet) return img;
  return (
    <picture style={{ display: "contents" }}>
      <source type="image/avif" srcSet={srcSet} sizes={sizes} />
      {img}
    </picture>
  );
}
