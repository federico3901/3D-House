"use client";

import { useEffect, useRef, useState } from "react";
import {
  LinearFilter,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { Icon } from "@/components/ui/Icon";
import { tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { asset } from "@/lib/paths";
import type { PanoramaScene } from "@/lib/types";

/* An equirectangular panorama on the inside of a sphere. A point on the image at (x, y), both 0–1 from the top-left
   corner, sits at longitude 360·x and latitude 90 − 180·y, so hotspots and start views are given in image
   coordinates and can be read straight off the photo. */

const FOV = { min: 32, max: 90, start: 75 };

function direction(lon: number, lat: number, out = new Vector3()) {
  const phi = MathUtils.degToRad(90 - lat);
  const theta = MathUtils.degToRad(lon);
  return out.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
}

export interface ViewerHandle {
  zoom: (delta: number) => void;
}

export function PanoramaViewer({
  scenes,
  sceneId,
  onSceneChange,
  autoRotate,
  handleRef,
  className = "",
}: {
  scenes: PanoramaScene[];
  sceneId: string;
  onSceneChange: (id: string) => void;
  autoRotate: boolean;
  handleRef?: React.RefObject<ViewerHandle | null>;
  className?: string;
}) {
  const { locale, t } = useLocale();
  const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0];

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hotspotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const view = useRef({ lon: scene.startX * 360, lat: 0, fov: FOV.start, lastInput: 0 });
  const autoRotateRef = useRef(autoRotate);
  /** Rotation pauses while the pointer is on a hotspot, so it holds still to be clicked. */
  const onHotspot = useRef(false);
  const hotspotsRef = useRef(scene.hotspots);
  /** Set when a frame must be drawn even off screen (resize, new panorama), so the canvas never shows a stale view. */
  const dirty = useRef(true);
  const gl = useRef<{
    renderer: WebGLRenderer;
    camera: PerspectiveCamera;
    material: MeshBasicMaterial;
    textures: Map<string, Texture>;
    loader: TextureLoader;
  } | null>(null);

  const [unsupported, setUnsupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Renderer, camera, sphere, input and the frame loop: set up once.
  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- WebGL support is only known once a context is requested
      setUnsupported(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;

    const camera = new PerspectiveCamera(FOV.start, 1, 1, 1100);
    const world = new Scene();
    const geometry = new SphereGeometry(500, 72, 48);
    geometry.scale(-1, 1, 1);
    const material = new MeshBasicMaterial({ color: 0xffffff });
    world.add(new Mesh(geometry, material));
    gl.current = { renderer, camera, material, textures: new Map(), loader: new TextureLoader() };

    const resize = () => {
      const { width, height } = box.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      dirty.current = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    // Drag to look, pinch or wheel to zoom.
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; lon: number; lat: number } | null = null;
    let pinch: { dist: number; fov: number } | null = null;
    const v = view.current;
    const touch = () => {
      v.lastInput = performance.now();
      setTouched(true);
    };
    const pinchDist = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-hotspot]")) return;
      box.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, lon: v.lon, lat: v.lat };
      if (pointers.size === 2) {
        drag = null;
        pinch = { dist: pinchDist(), fov: v.fov };
      }
      touch();
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        v.fov = MathUtils.clamp((pinch.fov * pinch.dist) / Math.max(pinchDist(), 1), FOV.min, FOV.max);
      } else if (drag) {
        const k = (v.fov / FOV.start) * 0.13;
        v.lon = drag.lon - (e.clientX - drag.x) * k;
        v.lat = MathUtils.clamp(drag.lat + (e.clientY - drag.y) * k, -85, 85);
      }
      touch();
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      v.fov = MathUtils.clamp(v.fov + e.deltaY * 0.04, FOV.min, FOV.max);
      touch();
    };
    const onKey = (e: KeyboardEvent) => {
      const step = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] }[e.key];
      if (step) {
        e.preventDefault();
        v.lon += step[0];
        v.lat = MathUtils.clamp(v.lat + step[1], -85, 85);
      } else if (e.key === "+" || e.key === "=") v.fov = MathUtils.clamp(v.fov - 6, FOV.min, FOV.max);
      else if (e.key === "-") v.fov = MathUtils.clamp(v.fov + 6, FOV.min, FOV.max);
      else return;
      touch();
    };
    box.addEventListener("pointerdown", onDown);
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerup", onUp);
    box.addEventListener("pointercancel", onUp);
    box.addEventListener("wheel", onWheel, { passive: false });
    box.addEventListener("keydown", onKey);

    if (handleRef) {
      handleRef.current = {
        zoom: (delta) => {
          v.fov = MathUtils.clamp(v.fov + delta, FOV.min, FOV.max);
          touch();
        },
      };
    }

    // Draw only while on screen.
    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(box);

    const target = new Vector3();
    const spot = new Vector3();
    const look = new Vector3();
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(now - last, 100);
      last = now;
      if (!visible && !dirty.current) return;
      dirty.current = false;
      if (autoRotateRef.current && !drag && !pinch && !onHotspot.current && now - v.lastInput > 2500) v.lon += dt * 0.006;
      camera.fov += (v.fov - camera.fov) * 0.2;
      camera.updateProjectionMatrix();
      direction(v.lon, v.lat, target);
      camera.lookAt(target);
      renderer.render(world, camera);

      // Place the hotspot buttons over their spot on the panorama.
      const { width, height } = renderer.domElement.getBoundingClientRect();
      camera.getWorldDirection(look);
      hotspotsRef.current.forEach((h, i) => {
        const el = hotspotRefs.current[i];
        if (!el) return;
        direction(h.x * 360, 90 - h.y * 180, spot);
        const facing = spot.dot(look) > 0.15;
        spot.multiplyScalar(400).project(camera);
        const inView = facing && Math.abs(spot.x) < 1.2 && Math.abs(spot.y) < 1.2;
        el.style.opacity = inView ? "1" : "0";
        el.style.pointerEvents = inView ? "auto" : "none";
        el.style.transform = `translate(${((spot.x + 1) / 2) * width}px, ${((1 - spot.y) / 2) * height}px) translate(-50%, -50%)`;
      });
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
      box.removeEventListener("wheel", onWheel);
      box.removeEventListener("keydown", onKey);
      gl.current?.textures.forEach((tex) => tex.dispose());
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      gl.current = null;
      if (handleRef) handleRef.current = null;
    };
  }, [handleRef]);

  // Load the scene's panorama (cached), fade across, and point the camera at the scene's start view.
  useEffect(() => {
    const g = gl.current;
    if (!g) return;
    let cancelled = false;
    hotspotsRef.current = [];
    const show = (tex: Texture) => {
      if (cancelled) return;
      g.material.map = tex;
      g.material.needsUpdate = true;
      view.current.lon = scene.startX * 360;
      view.current.lat = 0;
      hotspotsRef.current = scene.hotspots;
      dirty.current = true;
      setLoading(false);
      requestAnimationFrame(() => !cancelled && setFading(false));
    };
    setFading(true);
    const cached = g.textures.get(scene.image);
    if (cached) {
      const id = window.setTimeout(() => show(cached), 180);
      return () => {
        cancelled = true;
        window.clearTimeout(id);
      };
    }
    setLoading(true);
    g.loader.load(
      asset(scene.image),
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.minFilter = LinearFilter;
        tex.generateMipmaps = false;
        tex.anisotropy = g.renderer.capabilities.getMaxAnisotropy();
        g.textures.set(scene.image, tex);
        show(tex);
      },
      undefined,
      () => !cancelled && setLoading(false),
    );
    return () => {
      cancelled = true;
    };
  }, [scene]);

  if (unsupported) {
    return (
      <div className={`grid place-items-center bg-night p-6 text-center text-night-mute ${className}`}>
        <p>{t.tour.unsupported}</p>
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      role="application"
      aria-label={`${tr(scene.title, locale)}. ${t.tour.hint}`}
      className={`relative cursor-grab touch-none select-none overflow-hidden bg-night outline-none active:cursor-grabbing ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute inset-0">
        {scene.hotspots.map((h, i) => (
          <button
            key={`${scene.id}-${h.target}-${i}`}
            ref={(el) => {
              hotspotRefs.current[i] = el;
            }}
            type="button"
            data-hotspot
            onClick={() => {
              onHotspot.current = false;
              onSceneChange(h.target);
            }}
            onPointerEnter={() => (onHotspot.current = true)}
            onPointerLeave={() => (onHotspot.current = false)}
            className="group absolute left-0 top-0 flex items-center gap-2 opacity-0 transition-opacity duration-200"
          >
            <span className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-white/90 bg-black/35 text-white backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-brand group-hover:text-brand-ink">
              <span className="absolute inset-0 animate-ping rounded-full border-2 border-white/50 [animation-duration:2.2s]" />
              <Icon name="arrow" size={18} />
            </span>
            <span className="whitespace-nowrap rounded-[3px] bg-black/60 px-2 py-1 text-[0.8rem] font-semibold text-white backdrop-blur-sm">
              {tr(h.label, locale)}
            </span>
          </button>
        ))}
      </div>

      <div
        className={`pointer-events-none absolute inset-0 bg-night transition-opacity duration-300 ${fading ? "opacity-100" : "opacity-0"}`}
      />

      {loading && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="label rounded-[3px] bg-black/50 px-3 py-2 text-white">{t.tour.loading}</span>
        </div>
      )}

      {!touched && !loading && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-[0.85rem] font-medium text-white backdrop-blur-sm">
            <Icon name="pano" size={18} />
            {t.tour.hint}
          </span>
        </div>
      )}
    </div>
  );
}
