"use client";

import type { FaceLandmarker } from "@mediapipe/tasks-vision";

/** Face filters that follow your face. */
export const FACE_FILTERS = [
  { id: "none", name: "No filter" },
  { id: "blush", name: "Blushy" },
  { id: "kitty", name: "Kitty" },
  { id: "bunny", name: "Bunny" },
  { id: "hearts", name: "Heart Eyes" },
  { id: "crown", name: "Princess" },
  { id: "halo", name: "Angel" },
] as const;

export type FaceFilterId = (typeof FACE_FILTERS)[number]["id"];

// Landmark indices from the MediaPipe face mesh.
const IDX = {
  eyeA: 468, // iris centre
  eyeB: 473,
  eyeA2: 33, // eye corner fallback
  eyeB2: 263,
  nose: 1,
  forehead: 10,
  chin: 152,
  cheekEdgeA: 234,
  cheekEdgeB: 454,
  cheekA: 205,
  cheekB: 425,
};

type P = { x: number; y: number };
type RawFace = Record<keyof typeof IDX, P>;

// ---------- detector ----------

let loading: Promise<FaceLandmarker | null> | null = null;

export function loadFaceTracker() {
  if (!loading) {
    loading = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const make = (delegate: "GPU" | "CPU") =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate },
          runningMode: "IMAGE",
          numFaces: 3,
        });
      try {
        return await make("GPU");
      } catch {
        return await make("CPU");
      }
    })().catch((e) => {
      console.warn("Face filters unavailable", e);
      return null;
    });
  }
  return loading;
}

/** Latest smoothed faces for each video. */
const cache = new WeakMap<HTMLVideoElement, { faces: RawFace[]; at: number }>();

export function detectFaces(tracker: FaceLandmarker, video: HTMLVideoElement) {
  if (video.readyState < 2 || !video.videoWidth) return;
  let res;
  try {
    res = tracker.detect(video);
  } catch {
    return;
  }
  const prev = cache.get(video)?.faces ?? [];
  const faces: RawFace[] = res.faceLandmarks.map((lm, i) => {
    const pick = (k: keyof typeof IDX): P => {
      const p = lm[IDX[k]] ?? lm[k === "eyeA" ? IDX.eyeA2 : IDX.eyeB2];
      return { x: p.x, y: p.y };
    };
    const face = Object.fromEntries((Object.keys(IDX) as (keyof typeof IDX)[]).map((k) => [k, pick(k)])) as RawFace;
    // smooth jitter against the previous frame
    const old = prev[i];
    if (old) {
      for (const k of Object.keys(face) as (keyof typeof IDX)[]) {
        face[k] = { x: old[k].x + (face[k].x - old[k].x) * 0.6, y: old[k].y + (face[k].y - old[k].y) * 0.6 };
      }
    }
    return face;
  });
  cache.set(video, { faces, at: performance.now() });
}

// ---------- geometry ----------

type Cell = { x: number; y: number; w: number; h: number };

/** Maps a normalized video point into a cropped, mirrored cell. */
function mapPoint(p: P, video: HTMLVideoElement, cell: Cell): P {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.max(cell.w / vw, cell.h / vh);
  const sx = (vw - cell.w / scale) / 2;
  const sy = (vh - cell.h / scale) / 2;
  const px = (p.x * vw - sx) * scale;
  const py = (p.y * vh - sy) * scale;
  return { x: cell.x + cell.w - px, y: cell.y + py };
}

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

type Geo = {
  eyeL: P;
  eyeR: P;
  nose: P;
  top: P;
  cheekL: P;
  cheekR: P;
  width: number;
  angle: number;
};

function geometry(face: RawFace, video: HTMLVideoElement, cell: Cell): Geo {
  const m = (k: keyof typeof IDX) => mapPoint(face[k], video, cell);
  let eyeL = m("eyeA");
  let eyeR = m("eyeB");
  let cheekL = m("cheekA");
  let cheekR = m("cheekB");
  if (eyeL.x > eyeR.x) [eyeL, eyeR] = [eyeR, eyeL];
  if (cheekL.x > cheekR.x) [cheekL, cheekR] = [cheekR, cheekL];
  const forehead = m("forehead");
  const chin = m("chin");
  const width = dist(m("cheekEdgeA"), m("cheekEdgeB"));
  const angle = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);
  const len = dist(forehead, chin) || 1;
  const up = { x: (forehead.x - chin.x) / len, y: (forehead.y - chin.y) / len };
  const top = { x: forehead.x + up.x * width * 0.12, y: forehead.y + up.y * width * 0.12 };
  return { eyeL, eyeR, nose: m("nose"), top, cheekL, cheekR, width, angle };
}

// ---------- drawing ----------

function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
}

function at(ctx: CanvasRenderingContext2D, p: P, angle: number, draw: () => void) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  draw();
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function blush(ctx: CanvasRenderingContext2D, g: Geo, strong = 1) {
  const u = g.width;
  [g.cheekL, g.cheekR].forEach((c) =>
    at(ctx, c, g.angle, () => {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, u * 0.16);
      grad.addColorStop(0, `rgba(255, 92, 150, ${0.55 * strong})`);
      grad.addColorStop(1, "rgba(255, 92, 150, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, u * 0.16, u * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }),
  );
}

function pinkNose(ctx: CanvasRenderingContext2D, g: Geo) {
  const u = g.width;
  at(ctx, g.nose, g.angle, () => {
    ctx.fillStyle = "#ff5c96";
    ctx.beginPath();
    ctx.moveTo(-u * 0.05, -u * 0.02);
    ctx.lineTo(u * 0.05, -u * 0.02);
    ctx.lineTo(0, u * 0.04);
    ctx.closePath();
    ctx.fill();
  });
}

const DRAW: Record<Exclude<FaceFilterId, "none">, (ctx: CanvasRenderingContext2D, g: Geo) => void> = {
  blush(ctx, g) {
    blush(ctx, g, 1.2);
    const u = g.width;
    ctx.fillStyle = "#ffffff";
    [g.cheekL, g.cheekR].forEach((c, i) =>
      at(ctx, c, g.angle, () => {
        sparkle(ctx, (i ? 1 : -1) * u * 0.14, -u * 0.08, u * 0.035);
      }),
    );
    // tiny floating hearts
    at(ctx, g.top, g.angle, () => {
      ctx.fillStyle = "#ff4fa3";
      heartPath(ctx, -u * 0.38, -u * 0.05, u * 0.12);
      ctx.fill();
      ctx.fillStyle = "#ff9bcb";
      heartPath(ctx, u * 0.4, -u * 0.12, u * 0.09);
      ctx.fill();
    });
  },

  kitty(ctx, g) {
    const u = g.width;
    at(ctx, g.top, g.angle, () => {
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(side * u * 0.3, 0);
        ctx.rotate(side * 0.25);
        ctx.fillStyle = "#3a2433";
        ctx.beginPath();
        ctx.moveTo(-u * 0.16, u * 0.04);
        ctx.lineTo(0, -u * 0.36);
        ctx.lineTo(u * 0.16, u * 0.04);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ff8cc6";
        ctx.beginPath();
        ctx.moveTo(-u * 0.09, 0);
        ctx.lineTo(0, -u * 0.24);
        ctx.lineTo(u * 0.09, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    });
    blush(ctx, g, 0.8);
    pinkNose(ctx, g);
    at(ctx, g.nose, g.angle, () => {
      ctx.strokeStyle = "rgba(58, 36, 51, 0.85)";
      ctx.lineWidth = Math.max(1.5, u * 0.008);
      ctx.lineCap = "round";
      [-1, 1].forEach((side) =>
        [-0.03, 0.02, 0.07].forEach((dy, k) => {
          ctx.beginPath();
          ctx.moveTo(side * u * 0.1, u * 0.05 + dy * 0.5);
          ctx.lineTo(side * u * 0.36, u * 0.02 + dy * (k + 0.5));
          ctx.stroke();
        }),
      );
    });
  },

  bunny(ctx, g) {
    const u = g.width;
    at(ctx, g.top, g.angle, () => {
      [-1, 1].forEach((side) => {
        ctx.save();
        ctx.translate(side * u * 0.18, -u * 0.05);
        ctx.rotate(side * 0.18);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#ffc2df";
        ctx.lineWidth = u * 0.015;
        ctx.beginPath();
        ctx.ellipse(0, -u * 0.32, u * 0.1, u * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffb3d1";
        ctx.beginPath();
        ctx.ellipse(0, -u * 0.3, u * 0.05, u * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    });
    blush(ctx, g, 0.9);
    pinkNose(ctx, g);
    at(ctx, g.nose, g.angle, () => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#ffc2df";
      ctx.lineWidth = u * 0.008;
      ctx.beginPath();
      ctx.roundRect(-u * 0.05, u * 0.12, u * 0.048, u * 0.07, u * 0.01);
      ctx.roundRect(u * 0.002, u * 0.12, u * 0.048, u * 0.07, u * 0.01);
      ctx.fill();
      ctx.stroke();
    });
  },

  hearts(ctx, g) {
    const u = g.width;
    const s = u * 0.34;
    [g.eyeL, g.eyeR].forEach((eye) =>
      at(ctx, eye, g.angle, () => {
        heartPath(ctx, 0, -s * 0.55, s);
        ctx.fillStyle = "rgba(255, 46, 136, 0.72)";
        ctx.fill();
        ctx.lineWidth = u * 0.025;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.ellipse(-s * 0.18, -s * 0.18, s * 0.08, s * 0.05, -0.6, 0, Math.PI * 2);
        ctx.fill();
      }),
    );
    // bridge between the hearts
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = u * 0.025;
    ctx.beginPath();
    ctx.moveTo(g.eyeL.x + Math.cos(g.angle) * s * 0.4, g.eyeL.y + Math.sin(g.angle) * s * 0.4);
    ctx.lineTo(g.eyeR.x - Math.cos(g.angle) * s * 0.4, g.eyeR.y - Math.sin(g.angle) * s * 0.4);
    ctx.stroke();
  },

  crown(ctx, g) {
    const u = g.width;
    at(ctx, g.top, g.angle, () => {
      const w = u * 0.62;
      const h = u * 0.3;
      const grad = ctx.createLinearGradient(0, -h, 0, 0);
      grad.addColorStop(0, "#fff3a8");
      grad.addColorStop(1, "#f5b82e");
      ctx.fillStyle = grad;
      ctx.strokeStyle = "#c98a10";
      ctx.lineWidth = u * 0.012;
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(-w / 2, -h * 0.6);
      ctx.lineTo(-w / 4, -h * 0.25);
      ctx.lineTo(0, -h);
      ctx.lineTo(w / 4, -h * 0.25);
      ctx.lineTo(w / 2, -h * 0.6);
      ctx.lineTo(w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff4fa3";
      [-w / 4, 0, w / 4].forEach((x, i) => {
        ctx.beginPath();
        ctx.arc(x, -h * 0.18, u * (i === 1 ? 0.04 : 0.03), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#ffffff";
      sparkle(ctx, w * 0.55, -h * 0.9, u * 0.05);
      sparkle(ctx, -w * 0.6, -h * 0.7, u * 0.035);
    });
    blush(ctx, g, 0.6);
  },

  halo(ctx, g) {
    const u = g.width;
    at(ctx, g.top, g.angle, () => {
      ctx.save();
      ctx.shadowColor = "rgba(255, 236, 140, 0.95)";
      ctx.shadowBlur = u * 0.12;
      ctx.strokeStyle = "#ffe98a";
      ctx.lineWidth = u * 0.05;
      ctx.beginPath();
      ctx.ellipse(0, -u * 0.22, u * 0.3, u * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#ffffff";
      sparkle(ctx, -u * 0.42, -u * 0.08, u * 0.05);
      sparkle(ctx, u * 0.45, -u * 0.3, u * 0.04);
      sparkle(ctx, u * 0.2, -u * 0.45, u * 0.03);
    });
    blush(ctx, g, 0.7);
  },
};

/**
 * Draws face filters for every video in the booth, using the same layout
 * as the captured photo. Each video says which filter it wants in data-face.
 */
export function drawFaceFilters(
  ctx: CanvasRenderingContext2D,
  videos: HTMLVideoElement[],
  cells: Cell[],
) {
  videos.forEach((video, i) => {
    const filter = (video.dataset.face ?? "none") as FaceFilterId;
    const cell = cells[i];
    const entry = cache.get(video);
    if (filter === "none" || !cell || !entry || !video.videoWidth) return;
    // hide stale results if the face left the frame a while ago
    if (performance.now() - entry.at > 1000) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, cell.y, cell.w, cell.h);
    ctx.clip();
    entry.faces.forEach((face) => DRAW[filter](ctx, geometry(face, video, cell)));
    ctx.restore();
  });
}
