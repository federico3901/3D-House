"use client";

import { useEffect, useRef, useState } from "react";

/** Renders `children` once the spot comes near the screen; `placeholder` until then. Keeps heavy parts (three.js,
    large textures) out of the first load of a long page. */
export function LazyMount({ children, placeholder, margin = "600px" }: { children: React.ReactNode; placeholder: React.ReactNode; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [near, margin]);
  return <div ref={ref}>{near ? children : placeholder}</div>;
}
