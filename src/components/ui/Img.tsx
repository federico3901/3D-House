"use client";

import { asset } from "@/lib/paths";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string; alt: string; priority?: boolean };

/** An image from public/. Lazy unless `priority`. */
export function Img({ src, alt, priority, ...rest }: Props) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset(src)} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" {...rest} />;
}
