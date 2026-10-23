"use client";

import NextLink from "next/link";
import { isPortable, pageHref } from "@/lib/paths";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

/** Pages that load three.js: not prefetched just because a link to them is on screen. */
const HEAVY = /\/(tour|3d)\/(#.*)?$/;

/** A link to a page of the site. Client-side navigation normally; a plain link in a portable build. */
export function AppLink({ href, ...rest }: Props) {
  if (isPortable) return <a href={pageHref(href)} {...rest} />;
  return <NextLink href={href} prefetch={HEAVY.test(href) ? false : undefined} {...rest} />;
}
