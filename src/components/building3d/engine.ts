import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Point } from "@/lib/types";
import type { Palette, RGBA } from "./palette";
import type { Box, Building, Floor, Room, Seg } from "./plan";

/* The imperative side of the 3D view: builds the floors in the «technical drawing» style of the Atlante delle
   Forniture (translucent fills that only show the front-most surface, crisp edges, hidden edges dashed, a glow on the
   selection), eases the explode and focus state every frame, frames the camera on what is shown, and places the DOM
   labels React renders in the overlay. React only feeds it inputs. */

const FOV = 28;
/** Extra metres between floors at full explode, and the extra lift of the floors above a focused one. */
const GAP = 4.2;
const LIFT = 6;
const VIEWS = {
  axo: { az: 36, el: 30 },
  plan: { az: 0, el: 89 },
  front: { az: 0, el: 5 },
};

export type View = keyof typeof VIEWS;
export interface Pads {
  t: number;
  r: number;
  b: number;
  l: number;
}
export interface Focus {
  floor: string | null;
  unit: string | null;
}
export interface Layers {
  labels: boolean;
  dims: boolean;
}
export interface EngineEvents {
  hover(roomId: string | null): void;
  pick(target: Focus): void;
}

interface Tile {
  room: Room;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  hot: number;
  emph: number;
}

interface FloorRT {
  f: Floor;
  group: THREE.Group;
  fill: THREE.MeshLambertMaterial;
  depth: THREE.Mesh;
  edges: LineMaterial;
  hidden: LineMaterial;
  details: LineMaterial;
  railings: LineMaterial;
  tiles: Tile[];
  outlines: Map<string, { line: LineMaterial; halo: LineMaterial; show: number }>;
  y: number;
  dim: number;
  lift: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const approach = (cur: number, tgt: number, dt: number, rate = 9) => cur + (tgt - cur) * (1 - Math.exp(-dt * rate));
const setRGB = (c: THREE.Color, x: RGBA) => c.setRGB(x.r, x.g, x.b, THREE.SRGBColorSpace);

export class BuildingEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 2000);
  private controls: OrbitControls;
  private floors: FloorRT[] = [];
  private lineMats: LineMaterial[] = [];
  private disposables: { dispose(): void }[] = [];
  private depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  private dims: { line: LineMaterial; group: THREE.Group };
  private context: LineMaterial;
  private cx: number;
  private cy: number;
  private size = { w: 1, h: 1 };
  private pads: Pads = { t: 0, r: 0, b: 0, l: 0 };
  private pal: Palette | null = null;
  private explode = 0.6;
  private explodeNow = 0.6;
  private focus: Focus = { floor: null, unit: null };
  private hoverRoom: string | null = null;
  private layers: Layers = { labels: true, dims: false };
  private view: View = "axo";
  /** Direction the camera looks from: the view's preset, or where the visitor last turned it. */
  private orient = { phi: THREE.MathUtils.degToRad(90 - VIEWS.axo.el), theta: THREE.MathUtils.degToRad(VIEWS.axo.az) };
  private anim: { from: THREE.Spherical; to: THREE.Spherical; tFrom: THREE.Vector3; tTo: THREE.Vector3; t: number; dur: number } | null = null;
  private raf = 0;
  private last = performance.now();
  private reduced = false;
  private overlay: HTMLElement;
  private els = {
    leaders: new Map<string, HTMLElement>(),
    lines: new Map<string, SVGLineElement>(),
    tags: new Map<string, HTMLElement>(),
    labels: new Map<string, HTMLElement>(),
    chip: null as HTMLElement | null,
    target: null as HTMLElement | null,
    dims: new Map<string, HTMLElement>(),
    street: null as HTMLElement | null,
  };
  private raycaster = new THREE.Raycaster();
  /** Label sizes, measured once: they only change when the overlay is re-rendered. */
  private sizes = new Map<HTMLElement, { w: number; h: number }>();
  private signal = new THREE.Color();
  private pointer = { x: 0, y: 0, down: null as null | { x: number; y: number }, inside: false };
  private ro: ResizeObserver;
  private host: HTMLElement;

  constructor(
    host: HTMLElement,
    overlay: HTMLElement,
    private b: Building,
    private events: EngineEvents,
  ) {
    this.host = host;
    this.overlay = overlay;
    this.cx = (b.x0 + b.x1) / 2;
    this.cy = (b.y0 + b.y1) / 2;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = "b3d-canvas";
    host.prepend(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(18, 30, 24);
    this.scene.add(sun);

    for (const f of b.floors) this.floors.push(this.buildFloor(f));
    this.dims = this.buildDims();
    this.context = this.buildContext();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 400;
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(92);
    this.controls.addEventListener("start", () => (this.anim = null));
    this.controls.addEventListener("end", () => {
      const sp = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
      this.orient = { phi: sp.phi, theta: sp.theta };
    });

    const el = this.renderer.domElement;
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointerleave", this.onLeave);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.refreshOverlay();
    this.frame(false, 0, true);
    this.raf = requestAnimationFrame(this.tick);
  }

  /* ------------------------------------------------------------ inputs */

  setPalette(p: Palette) {
    this.pal = p;
    setRGB(this.signal, p.signal);
    for (const rt of this.floors) {
      setRGB(rt.fill.color, p.edge);
      rt.fill.emissive.copy(rt.fill.color).multiplyScalar(p.dark ? 0.25 : 0.1);
      setRGB(rt.edges.color, p.edge);
      setRGB(rt.hidden.color, p.edge);
      setRGB(rt.details.color, p.mute);
      setRGB(rt.railings.color, p.mute);
      for (const tile of rt.tiles) setRGB(tile.mat.color, p.group[tile.room.group]);
      for (const o of rt.outlines.values()) {
        setRGB(o.line.color, p.signal);
        setRGB(o.halo.color, p.signal);
      }
    }
    setRGB(this.dims.line.color, p.mute);
    setRGB(this.context.color, p.mute);
  }

  setExplode(v: number) {
    this.explode = v;
    if (this.reduced) this.explodeNow = v;
    this.frame(true, 0.35);
  }

  setView(v: View) {
    this.view = v;
    this.frame(true, 0.8, true);
  }

  setFocus(f: Focus) {
    const changed = f.floor !== this.focus.floor || f.unit !== this.focus.unit;
    this.focus = { ...f };
    if (changed) this.frame(true, 0.7);
  }

  setHover(roomId: string | null) {
    this.hoverRoom = roomId;
  }

  setLayers(l: Layers) {
    this.layers = { ...l };
  }

  setPads(p: Pads) {
    this.pads = p;
    this.resize();
    this.frame(true, 0.3);
  }

  /** Re-reads the label elements React rendered in the overlay. */
  refreshOverlay() {
    const q = <T extends Element>(sel: string) => [...this.overlay.querySelectorAll<T & HTMLElement>(sel)];
    this.els.leaders = new Map(q<HTMLElement>("[data-leader]").map((e) => [e.dataset.leader!, e]));
    this.els.lines = new Map(q<SVGLineElement>("[data-leader-line]").map((e) => [e.dataset.leaderLine!, e as unknown as SVGLineElement]));
    this.els.tags = new Map(q<HTMLElement>("[data-tag]").map((e) => [e.dataset.tag!, e]));
    this.els.labels = new Map(q<HTMLElement>("[data-room]").map((e) => [e.dataset.room!, e]));
    this.els.dims = new Map(q<HTMLElement>("[data-dim]").map((e) => [e.dataset.dim!, e]));
    this.els.chip = this.overlay.querySelector<HTMLElement>("[data-chip]");
    this.els.target = this.overlay.querySelector<HTMLElement>("[data-target]");
    this.els.street = this.overlay.querySelector<HTMLElement>("[data-street]");
    this.sizes.clear();
  }

  private sizeOf(el: HTMLElement) {
    let sz = this.sizes.get(el);
    if (!sz) {
      sz = { w: el.offsetWidth, h: el.offsetHeight };
      this.sizes.set(el, sz);
    }
    return sz;
  }

  /** Back to the starting view. */
  reset() {
    this.view = "axo";
    this.frame(true, 0.8, true);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointerleave", this.onLeave);
    this.controls.dispose();
    for (const d of this.disposables) d.dispose();
    this.depthMat.dispose();
    this.renderer.dispose();
    el.remove();
  }

  /* ------------------------------------------------------------ building */

  /** World position of a plan point at height h above the top of a floor whose group sits at y. */
  private world(x: number, h: number, y: number, floorY = 0) {
    return new THREE.Vector3(x - this.cx, floorY + this.b.plan.slab + h, -(y - this.cy));
  }

  private line(segs: Seg[], opts: { width?: number; dashed?: number; depthFunc?: THREE.DepthModes; depthTest?: boolean; order?: number } = {}) {
    const pos = new Float32Array(segs.length * 6);
    segs.forEach((s, i) => {
      const a = this.world(s[0], s[1], s[2]);
      const b = this.world(s[3], s[4], s[5]);
      pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
    });
    return this.lineFromPositions(pos, opts);
  }

  private lineFromPositions(pos: Float32Array | number[], opts: { width?: number; dashed?: number; depthFunc?: THREE.DepthModes; depthTest?: boolean; order?: number }) {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(pos as Float32Array);
    const mat = new LineMaterial({ linewidth: opts.width ?? 1, transparent: true, depthWrite: false, worldUnits: false });
    if (opts.dashed) {
      mat.dashed = true;
      mat.dashSize = opts.dashed;
      mat.gapSize = opts.dashed * 0.8;
    }
    if (opts.depthFunc !== undefined) mat.depthFunc = opts.depthFunc;
    if (opts.depthTest !== undefined) mat.depthTest = opts.depthTest;
    const obj = new LineSegments2(geo, mat);
    if (opts.dashed) obj.computeLineDistances();
    obj.renderOrder = opts.order ?? 4;
    obj.raycast = () => {};
    this.lineMats.push(mat);
    this.disposables.push(geo, mat);
    return { obj, mat };
  }

  private boxGeometry(bx: Box) {
    const g = new THREE.BoxGeometry(bx.x1 - bx.x0, bx.h1 - bx.h0, bx.y1 - bx.y0);
    const c = this.world((bx.x0 + bx.x1) / 2, (bx.h0 + bx.h1) / 2, (bx.y0 + bx.y1) / 2);
    g.translate(c.x, c.y, c.z);
    return g.toNonIndexed();
  }

  private shape(poly: Point[]) {
    return new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x - this.cx, y - this.cy)));
  }

  private buildFloor(f: Floor): FloorRT {
    const group = new THREE.Group();
    group.name = f.id;
    this.scene.add(group);
    const slab = this.b.plan.slab;

    const parts: THREE.BufferGeometry[] = [];
    for (const s of f.slabs) {
      const g = new THREE.ExtrudeGeometry(this.shape(s.poly), { depth: s.thick, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      g.translate(0, slab - s.thick, 0);
      parts.push(g.toNonIndexed());
    }
    for (const w of [...f.walls, ...f.equipment]) parts.push(this.boxGeometry(w));
    const solid = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
    parts.forEach((g) => g.dispose());
    this.disposables.push(solid);

    const fill = new THREE.MeshLambertMaterial({ transparent: true, depthWrite: false, depthFunc: THREE.LessEqualDepth, side: THREE.FrontSide });
    const fillMesh = new THREE.Mesh(solid, fill);
    fillMesh.renderOrder = 1;
    fillMesh.raycast = () => {};
    const depth = new THREE.Mesh(solid, this.depthMat);
    depth.renderOrder = 0;
    depth.raycast = () => {};
    group.add(depth, fillMesh);
    this.disposables.push(fill);

    const edgePos = new THREE.EdgesGeometry(solid, 25).attributes.position.array as Float32Array;
    const edges = this.lineFromPositions(edgePos, { order: 4 });
    const hidden = this.lineFromPositions(edgePos, { dashed: 0.22, depthFunc: THREE.GreaterDepth, order: 2 });
    group.add(edges.obj, hidden.obj);

    const details = this.line(f.details, { order: 3 });
    const railings = this.line(f.railings, { order: 3 });
    group.add(details.obj, railings.obj);

    const tiles: Tile[] = f.rooms.map((room) => {
      const g = new THREE.ShapeGeometry(this.shape(room.poly));
      g.rotateX(-Math.PI / 2);
      g.translate(0, slab + 0.012, 0);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(g, mat);
      mesh.renderOrder = 1;
      mesh.userData.roomId = room.id;
      group.add(mesh);
      this.disposables.push(g, mat);
      return { room, mesh, mat, hot: 0, emph: 0 };
    });

    const outlines = new Map<string, { line: LineMaterial; halo: LineMaterial; show: number }>();
    for (const u of f.units) {
      const halo = this.line(u.outline, { width: 9, depthTest: false, order: 5 });
      const line = this.line(u.outline, { width: 2.2, depthTest: false, order: 6 });
      group.add(halo.obj, line.obj);
      outlines.set(u.unitId, { line: line.mat, halo: halo.mat, show: 0 });
    }

    return { f, group, fill, depth, edges: edges.mat, hidden: hidden.mat, details: details.mat, railings: railings.mat, tiles, outlines, y: 0, dim: 0, lift: 0 };
  }

  /** Overall dimensions, drawn on the ground floor like the quotes of a drawing. */
  private buildDims() {
    const { x0, x1, y0, y1 } = this.b;
    const o = 2.4;
    const t = 0.35;
    const segs: Seg[] = [
      // width, along the front
      [x0, 0, y0 - o, x1, 0, y0 - o],
      [x0, 0, y0 - 0.6, x0, 0, y0 - o - 0.5],
      [x1, 0, y0 - 0.6, x1, 0, y0 - o - 0.5],
      [x0 - t, 0, y0 - o + t, x0 + t, 0, y0 - o - t],
      [x1 - t, 0, y0 - o + t, x1 + t, 0, y0 - o - t],
      // depth, along the left side
      [x0 - o, 0, y0, x0 - o, 0, y1],
      [x0 - 0.6, 0, y0, x0 - o - 0.5, 0, y0],
      [x0 - 0.6, 0, y1, x0 - o - 0.5, 0, y1],
      [x0 - o - t, 0, y0 - t, x0 - o + t, 0, y0 + t],
      [x0 - o - t, 0, y1 - t, x0 - o + t, 0, y1 + t],
    ];
    const { obj, mat } = this.line(segs, { order: 3 });
    const group = new THREE.Group();
    group.add(obj);
    this.floors[0]?.group.add(group);
    return { line: mat, group };
  }

  /** The street in front of the building. */
  private buildContext() {
    const { x0, x1, y0 } = this.b;
    const segs: Seg[] = [
      [x0 - 10, -0.3, y0 - 4.5, x1 + 10, -0.3, y0 - 4.5],
      [x0 - 10, -0.3, y0 - 11.5, x1 + 10, -0.3, y0 - 11.5],
    ];
    const { obj, mat } = this.line(segs, { dashed: 0.6, order: 2 });
    this.floors[0]?.group.add(obj);
    return mat;
  }

  /* ------------------------------------------------------------ layout */

  /** Height of a floor's group: storeys, explode gap, and the lift of floors above a focused one. */
  private floorY(rt: FloorRT, explode: number, lift: number) {
    return rt.f.level * (this.b.plan.storey + GAP * explode) + lift;
  }

  private targetLift(rt: FloorRT) {
    const sel = this.floors.find((x) => x.f.id === this.focus.floor);
    return sel && rt.f.level > sel.f.level ? LIFT : 0;
  }

  /** Box around what the camera should show, with floors at their target positions. */
  private contentBox() {
    const box = new THREE.Box3();
    const unitRT = this.focus.unit ? this.floors.find((x) => x.f.id === this.focus.floor) : null;
    const unit = unitRT?.f.units.find((u) => u.unitId === this.focus.unit);
    if (unitRT && unit) {
      // The apartment and a margin of its floor around it.
      const y = this.floorY(unitRT, this.explode, this.targetLift(unitRT));
      const [x0, y0, x1, y1] = unit.bounds;
      const m = 1.5;
      box.expandByPoint(this.world(x0 - m, 0, y0 - m, y));
      box.expandByPoint(this.world(x1 + m, this.b.wallHeight, y1 + m, y));
      return box;
    }
    const sel = this.floors.filter((x) => !this.focus.floor || x.f.id === this.focus.floor);
    for (const rt of sel) {
      const y = this.floorY(rt, this.explode, this.targetLift(rt));
      const [bx0, by0, bx1, by1] = rt.f.bounds;
      box.expandByPoint(this.world(bx0, 0, by0, y));
      box.expandByPoint(this.world(bx1, rt.f.roof ? 2.8 : this.b.wallHeight, by1, y));
      box.expandByPoint(this.world(bx1, -this.b.plan.slab, by1, y));
    }
    if (!this.focus.floor && this.layers.dims) {
      box.expandByPoint(this.world(this.b.x0 - 3.2, 0, this.b.y0 - 3.2, 0));
    }
    return box;
  }

  /** Frames the content; `preset` also turns the camera to the current view's direction. */
  private frame(animate: boolean, dur = 0.6, preset = false) {
    const box = this.contentBox();
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const { w, h } = this.size;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const tanV = (tan * Math.max(80, h - this.pads.t - this.pads.b)) / h;
    const tanH = (tan * Math.max(80, w - this.pads.l - this.pads.r)) / h;
    const dist = (radius / Math.min(tanV, tanH)) * 1.08;

    if (preset) {
      const v = VIEWS[this.view];
      this.orient = { phi: THREE.MathUtils.degToRad(90 - v.el), theta: THREE.MathUtils.degToRad(v.az) };
    }
    const to = new THREE.Spherical(dist, this.orient.phi, this.orient.theta);
    if (!animate || this.reduced) {
      this.camera.position.copy(center.clone().add(new THREE.Vector3().setFromSpherical(to)));
      this.controls.target.copy(center);
      this.camera.lookAt(center);
      this.anim = null;
      return;
    }
    const from = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    // Turn the short way round.
    while (to.theta - from.theta > Math.PI) to.theta -= Math.PI * 2;
    while (to.theta - from.theta < -Math.PI) to.theta += Math.PI * 2;
    this.anim = { from, to, tFrom: this.controls.target.clone(), tTo: center, t: 0, dur };
  }

  private resize() {
    const { width, height } = this.host.getBoundingClientRect();
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.size = { w, h };
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.setViewOffset(w, h, -(this.pads.l - this.pads.r) / 2, -(this.pads.t - this.pads.b) / 2, w, h);
    this.camera.updateProjectionMatrix();
    for (const m of this.lineMats) m.resolution.set(w, h);
  }

  /* ------------------------------------------------------------ picking */

  private onDown = (e: PointerEvent) => {
    this.pointer.down = { x: e.clientX, y: e.clientY };
  };

  private onMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    this.pointer.inside = true;
    if (e.pointerType === "mouse" && !e.buttons) {
      const id = this.pick();
      if (id !== this.hoverRoom) {
        this.hoverRoom = id;
        this.events.hover(id);
      }
      this.renderer.domElement.style.cursor = id ? "pointer" : "";
    }
  };

  private onLeave = () => {
    this.pointer.inside = false;
    if (this.hoverRoom) {
      this.hoverRoom = null;
      this.events.hover(null);
    }
  };

  private onUp = (e: PointerEvent) => {
    const d = this.pointer.down;
    this.pointer.down = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    this.onMove(e);
    const id = this.pick();
    if (!id) return this.events.pick({ floor: null, unit: null });
    const rt = this.floors.find((x) => x.tiles.some((t) => t.room.id === id))!;
    const room = rt.tiles.find((t) => t.room.id === id)!.room;
    this.events.pick({ floor: rt.f.id, unit: room.unitId });
  };

  /** The room under the pointer, on the floors in play. */
  private pick(): string | null {
    this.raycaster.setFromCamera(new THREE.Vector2(this.pointer.x, this.pointer.y), this.camera);
    const meshes = this.floors.filter((rt) => rt.dim < 0.5).flatMap((rt) => rt.tiles.map((t) => t.mesh));
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    return (hit?.object.userData.roomId as string | undefined) ?? null;
  }

  /* ------------------------------------------------------------ frame */

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    // Real time, so the easing lasts as long on a slow device as on a fast one.
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    const pal = this.pal;
    if (!pal) return;

    this.explodeNow = this.reduced ? this.explode : approach(this.explodeNow, this.explode, dt);
    const selUnit = this.focus.unit;
    const hoverUnit = this.hoverRoom ? this.floors.flatMap((rt) => rt.tiles).find((t) => t.room.id === this.hoverRoom)?.room.unitId ?? null : null;

    for (const rt of this.floors) {
      const dimT = this.focus.floor && rt.f.id !== this.focus.floor ? 1 : 0;
      rt.dim = this.reduced ? dimT : approach(rt.dim, dimT, dt, 7);
      rt.lift = this.reduced ? this.targetLift(rt) : approach(rt.lift, this.targetLift(rt), dt, 7);
      rt.y = this.floorY(rt, this.explodeNow, rt.lift);
      rt.group.position.y = rt.y;

      const d = rt.dim;
      rt.fill.opacity = THREE.MathUtils.lerp(pal.fillAlpha, pal.dimAlpha, d);
      rt.depth.visible = d < 0.5;
      rt.edges.opacity = THREE.MathUtils.lerp(pal.dark ? 0.62 : 0.7, pal.dark ? 0.06 : 0.09, d);
      rt.hidden.opacity = THREE.MathUtils.lerp(pal.dark ? 0.09 : 0.12, 0, d);
      rt.details.opacity = THREE.MathUtils.lerp(0.75, 0.03, d);
      rt.railings.opacity = THREE.MathUtils.lerp(0.7, 0.03, d);

      for (const t of rt.tiles) {
        const hotT = t.room.id === this.hoverRoom ? 1 : 0;
        const emphT = t.room.unitId && t.room.unitId === selUnit ? 1 : 0;
        t.hot = this.reduced ? hotT : approach(t.hot, hotT, dt, 14);
        t.emph = this.reduced ? emphT : approach(t.emph, emphT, dt, 10);
        setRGB(t.mat.color, pal.group[t.room.group]);
        if (t.emph > 0.001) t.mat.color.lerp(this.signal, t.emph * 0.75);
        const base = pal.tileAlpha * (t.room.outdoor ? 0.7 : 1);
        t.mat.opacity = (base + t.hot * 0.22 + t.emph * 0.16) * (1 - 0.95 * d);
      }
      for (const [unitId, o] of rt.outlines) {
        const showT = unitId === selUnit ? 1 : unitId === hoverUnit ? 0.55 : 0;
        o.show = this.reduced ? showT : approach(o.show, showT, dt, 12);
        o.line.opacity = o.show;
        o.halo.opacity = pal.glow * 0.45 * o.show;
        o.line.visible = o.show > 0.01;
        o.halo.visible = o.halo.opacity > 0.01;
      }
    }
    this.dims.group.visible = this.layers.dims;
    this.dims.line.opacity = 0.8 * (1 - (this.floors[0]?.dim ?? 0));
    this.context.opacity = 0.35 * (1 - (this.floors[0]?.dim ?? 0));

    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.dur);
      const k = ease(a.t);
      const s = new THREE.Spherical(
        THREE.MathUtils.lerp(a.from.radius, a.to.radius, k),
        THREE.MathUtils.lerp(a.from.phi, a.to.phi, k),
        THREE.MathUtils.lerp(a.from.theta, a.to.theta, k),
      );
      this.controls.target.lerpVectors(a.tFrom, a.tTo, k);
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(s));
      if (a.t >= 1) this.anim = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
  };

  private screen(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.size.w, y: ((1 - p.y) / 2) * this.size.h, ok: p.z < 1 && p.z > -1 };
  }

  /** Last state written to each label, so a frame only touches the labels that moved. */
  private written = new WeakMap<HTMLElement, string>();

  private place(el: HTMLElement | null | undefined, show: boolean, x = 0, y = 0) {
    if (!el) return;
    const state = show ? `translate(${Math.round(x)}px, ${Math.round(y)}px)` : "";
    if (this.written.get(el) === state) return;
    this.written.set(el, state);
    el.style.visibility = show ? "visible" : "hidden";
    if (show) el.style.transform = state;
  }

  private placeLabels() {
    const { w } = this.size;
    const narrow = w < 860;
    const sel = this.focus;
    const roomById = new Map(this.floors.flatMap((rt) => rt.tiles.map((t) => [t.room.id, { rt, room: t.room }] as const)));

    // Floor leaders: a column on the right of the building, one label per floor, kept apart vertically.
    const showLeaders = !narrow && this.explodeNow > 0.12 && !sel.unit;
    const anchors = this.floors.map((rt) => ({ rt, p: this.screen(this.world(this.b.x1 + 0.4, this.b.wallHeight * 0.5, this.cy, rt.y)) }));
    // Right of the building, but clear of the right-hand panel.
    const colX = Math.min(Math.max(...anchors.map((a) => a.p.x)) + 44, w - this.pads.r - 190);
    const sorted = [...anchors].sort((a, b) => b.p.y - a.p.y);
    let lastY = Infinity;
    for (const a of sorted) {
      const y = Math.min(a.p.y, lastY - 30);
      lastY = y;
      const el = this.els.leaders.get(a.rt.f.id);
      const ln = this.els.lines.get(a.rt.f.id);
      const show = showLeaders && a.p.ok && a.rt.dim < 0.9;
      this.place(el, show, colX, y);
      if (ln) {
        ln.style.visibility = show ? "visible" : "hidden";
        ln.setAttribute("x1", String(a.p.x));
        ln.setAttribute("y1", String(a.p.y));
        ln.setAttribute("x2", String(colX - 4));
        ln.setAttribute("y2", String(y));
      }
    }

    // Apartment tags (on the focused floor, or for the selected and hovered apartment), then room names, largest
    // rooms first; a label that would overlap one already placed is left out.
    const hoverUnit = this.hoverRoom ? roomById.get(this.hoverRoom)?.room.unitId : null;
    const placed: [number, number, number, number][] = [];
    const fits = (el: HTMLElement, x: number, y: number) => {
      const { w: ew, h: eh } = this.sizeOf(el);
      const r: [number, number, number, number] = [x - ew / 2 - 3, y - eh / 2 - 2, x + ew / 2 + 3, y + eh / 2 + 2];
      if (placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) return false;
      placed.push(r);
      return true;
    };
    const rooms: { rt: FloorRT; r: Room }[] = [];
    for (const rt of this.floors) {
      for (const u of rt.f.units) {
        const el = this.els.tags.get(`${rt.f.id}:${u.unitId}`);
        if (rt.f.roof || !el) continue;
        const show = (sel.floor === rt.f.id && !sel.unit) || sel.unit === u.unitId || hoverUnit === u.unitId;
        const p = this.screen(this.world(u.anchor[0], this.b.wallHeight + 0.4, u.anchor[1], rt.y));
        this.place(el, show && p.ok && fits(el, p.x, p.y), p.x, p.y);
      }
      for (const t of rt.tiles) rooms.push({ rt, r: t.room });
    }
    rooms.sort((a, b) => b.r.area - a.r.area);
    for (const { rt, r } of rooms) {
      const el = this.els.labels.get(r.id);
      if (!el) continue;
      const show = (sel.unit !== null && r.unitId === sel.unit && rt.f.id === sel.floor) || (this.layers.labels && sel.floor === rt.f.id && sel.unit === null);
      const p = show ? this.screen(this.world(r.anchor[0], 0.05, r.anchor[1], rt.y)) : null;
      this.place(el, !!p && p.ok && fits(el, p.x, p.y), p?.x, p?.y);
    }

    // Hover chip.
    const hov = this.hoverRoom ? roomById.get(this.hoverRoom) : null;
    if (hov) {
      const p = this.screen(this.world(hov.room.anchor[0], 0.6, hov.room.anchor[1], hov.rt.y));
      this.place(this.els.chip, p.ok, p.x, p.y);
    } else this.place(this.els.chip, false);

    // Viewfinder brackets around the selected apartment.
    const unitRT = sel.unit ? this.floors.find((rt) => rt.f.id === sel.floor && rt.f.units.some((u) => u.unitId === sel.unit)) : null;
    const unit = unitRT?.f.units.find((u) => u.unitId === sel.unit);
    if (unitRT && unit && this.els.target) {
      const [x0, y0, x1, y1] = unit.bounds;
      const pts = [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [0, this.b.wallHeight].map((h) => this.screen(this.world(x, h, y, unitRT.y)))));
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const pad = 10;
      const bx = Math.min(...xs) - pad;
      const by = Math.min(...ys) - pad;
      this.els.target.style.width = `${Math.max(...xs) - bx + pad}px`;
      this.els.target.style.height = `${Math.max(...ys) - by + pad}px`;
      this.place(this.els.target, pts.every((p) => p.ok), bx, by);
    } else this.place(this.els.target, false);

    // Dimension figures and the street name, on the ground floor.
    const g = this.floors[0];
    if (g) {
      const { x0, x1, y0, y1 } = this.b;
      const showDims = this.layers.dims && g.dim < 0.5;
      const pw = this.screen(this.world((x0 + x1) / 2, 0, y0 - 2.4, g.y));
      const pd = this.screen(this.world(x0 - 2.4, 0, (y0 + y1) / 2, g.y));
      this.place(this.els.dims.get("w"), showDims && pw.ok, pw.x, pw.y);
      this.place(this.els.dims.get("d"), showDims && pd.ok, pd.x, pd.y);
      const ps = this.screen(this.world((x0 + x1) / 2, -0.3, y0 - 8, g.y));
      this.place(this.els.street, g.dim < 0.5 && ps.ok, ps.x, ps.y);
    }
  }
}
