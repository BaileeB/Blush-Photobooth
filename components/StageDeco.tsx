"use client";

import { useEffect, useRef } from "react";
import { drawDeco, rng } from "@/lib/canvas";
import type { Theme } from "@/lib/themes";

/** Theme stickers around the edge of the live preview. */
export default function StageDeco({ theme }: { theme: Theme }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const W = (c.width = 800);
    const H = (c.height = 600);
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    const rand = rng(theme.id.length * 9973);
    for (let i = 0; i < 26; i++) {
      // keep stickers near the edges so faces stay clear
      const side = i % 4;
      const t = rand();
      const inset = 10 + rand() * 50;
      const x = side === 0 ? t * W : side === 1 ? W - inset : side === 2 ? t * W : inset;
      const y = side === 0 ? inset : side === 1 ? t * H : side === 2 ? H - inset : t * H;
      ctx.globalAlpha = 0.7 + rand() * 0.3;
      drawDeco(ctx, theme.deco, theme.decoColors[i % theme.decoColors.length], x, y, 16 + rand() * 22, rand() * Math.PI);
    }
  }, [theme]);

  return <canvas ref={ref} className="stage-deco" aria-hidden />;
}
