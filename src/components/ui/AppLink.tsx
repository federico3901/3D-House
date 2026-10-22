"use client";

import NextLink from "next/link";
import { isPortable, pageHref } from "@/lib/paths";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

/** A link to a page of the site. Client-side navigation normally; a plain link in a portable build. */
export function AppLink({ href, ...rest }: Props) {
  if (isPortable) return <a href={pageHref(href)} {...rest} />;
  return <NextLink href={href} {...rest} />;
}
