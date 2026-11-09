import type { Deco, Theme } from "./themes";

export const FRAME_W = 800;
export const FRAME_H = 600;

/** Small seeded random generator so decorations look the same for a given strip. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws a video into a box, cropped to fill it, optionally mirrored like a selfie cam. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
  mirror = true,
) {
  const vw = video.videoWidth || w;
  const vh = video.videoHeight || h;
  const scale = Math.max(w / vw, h / vh);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (mirror) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  } else {
    ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
  }
  ctx.restore();
}

/** Grid cells for 1 to 4 people inside one frame. */
export function gridCells(count: number, W: number, H: number) {
  if (count <= 1) return [{ x: 0, y: 0, w: W, h: H }];
  if (count === 2)
    return [
      { x: 0, y: 0, w: W / 2, h: H },
      { x: W / 2, y: 0, w: W / 2, h: H },
    ];
  if (count === 3)
    return [
      { x: 0, y: 0, w: W / 2, h: H / 2 },
      { x: W / 2, y: 0, w: W / 2, h: H / 2 },
      { x: 0, y: H / 2, w: W, h: H / 2 },
    ];
  return [
    { x: 0, y: 0, w: W / 2, h: H / 2 },
    { x: W / 2, y: 0, w: W / 2, h: H / 2 },
    { x: 0, y: H / 2, w: W / 2, h: H / 2 },
    { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
  ];
}

/** Captures one frame with everyone in the booth, using the theme filter. */
export function captureFrame(videos: HTMLVideoElement[], theme: Theme): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = FRAME_W;
  c.height = FRAME_H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = theme.bg[1];
  ctx.fillRect(0, 0, FRAME_W, FRAME_H);
  ctx.filter = theme.filter;
  const cells = gridCells(videos.length, FRAME_W, FRAME_H);
  videos.forEach((v, i) => {
    const cell = cells[i];
    if (cell) drawCover(ctx, v, cell.x, cell.y, cell.w, cell.h, true);
  });
  ctx.filter = "none";
  // thin dividers between friends
  if (videos.length > 1) {
    ctx.strokeStyle = theme.frame;
    ctx.lineWidth = 6;
    cells.slice(0, videos.length).forEach((cell) => ctx.strokeRect(cell.x, cell.y, cell.w, cell.h));
  }
  return c;
}

// ---------- decorations ----------

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s / 2 : s / 5;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const r = s / 2;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function petal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.ellipse(0, 0, s / 2, s / 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function pixel(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const p = Math.max(4, Math.round(s / 5));
  // tiny pixel heart
  const map = ["01010", "11111", "11111", "01110", "00100"];
  map.forEach((row, ry) =>
    [...row].forEach((cell, rx) => {
      if (cell === "1") ctx.fillRect(x + rx * p - p * 2.5, y + ry * p - p * 2.5, p, p);
    }),
  );
}

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.arc(x, y, s / 2, 0, Math.PI * 2);
  ctx.globalAlpha *= 0.55;
  ctx.fill();
  ctx.globalAlpha /= 0.55;
  ctx.beginPath();
  ctx.arc(x - s / 6, y - s / 6, s / 8, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

export function drawDeco(
  ctx: CanvasRenderingContext2D,
  kind: Deco,
  color: string,
  x: number,
  y: number,
  s: number,
  rot: number,
) {
  ctx.fillStyle = color;
  switch (kind) {
    case "hearts":
      return heart(ctx, x, y - s / 2, s);
    case "stars":
      return star(ctx, x, y, s);
    case "sparkles":
      return sparkle(ctx, x, y, s);
    case "petals":
      return petal(ctx, x, y, s, rot);
    case "pixels":
      return pixel(ctx, x, y, s);
    case "bubbles":
      return bubble(ctx, x, y, s);
  }
}

// ---------- strip ----------

export type StripOptions = {
  frames: HTMLCanvasElement[];
  theme: Theme;
  names: string[];
  titleFont: string;
  bodyFont: string;
};

export function buildStrip({ frames, theme, names, titleFont, bodyFont }: StripOptions): string {
  const PW = 720;
  const PH = 540;
  const PAD = 44;
  const GAP = 26;
  const FOOTER = 170;
  const W = PW + PAD * 2;
  const H = PAD + frames.length * PH + (frames.length - 1) * GAP + FOOTER;

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, theme.bg[0]);
  g.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const rand = rng(Date.now());

  // background decorations
  for (let i = 0; i < 26 * frames.length; i++) {
    ctx.globalAlpha = 0.35 + rand() * 0.5;
    drawDeco(
      ctx,
      theme.deco,
      theme.decoColors[i % theme.decoColors.length],
      rand() * W,
      rand() * H,
      14 + rand() * 30,
      rand() * Math.PI,
    );
  }
  ctx.globalAlpha = 1;

  // photos
  frames.forEach((f, i) => {
    const x = PAD;
    const y = PAD + i * (PH + GAP);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = theme.frame;
    ctx.fillRect(x - 10, y - 10, PW + 20, PH + 20);
    ctx.restore();
    ctx.drawImage(f, x, y, PW, PH);
  });

  // a few decorations that overlap photo corners, like stickers
  frames.forEach((_, i) => {
    const y = PAD + i * (PH + GAP);
    const corners = [
      [PAD - 6, y - 6],
      [PAD + PW + 6, y + PH + 6],
    ];
    corners.forEach(([cx, cy], k) => {
      ctx.globalAlpha = 1;
      drawDeco(ctx, theme.deco, theme.decoColors[(i + k) % theme.decoColors.length], cx, cy, 52, 0.6);
    });
  });

  // footer
  const fy = H - FOOTER;
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.font = `34px ${titleFont}`;
  ctx.fillText("BLUSH BOOTH", W / 2, fy + 66);
  ctx.font = `600 26px ${bodyFont}`;
  const who = names.filter(Boolean).join("  +  ");
  const date = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  ctx.fillText(who ? `${who}  ·  ${date}` : date, W / 2, fy + 112);
  ctx.font = `500 20px ${bodyFont}`;
  ctx.globalAlpha = 0.75;
  ctx.fillText(`${theme.name} edition`, W / 2, fy + 146);
  ctx.globalAlpha = 1;

  return c.toDataURL("image/png");
}
