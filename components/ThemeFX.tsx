"use client";

import { useEffect, useMemo, useState } from "react";
import type { Theme } from "@/lib/themes";

const GLYPH: Record<Theme["deco"], string[]> = {
  hearts: ["♥", "♡", "♥"],
  sparkles: ["✦", "✧", "⋆"],
  petals: ["❀", "✿", "•"],
  pixels: ["■", "▪", "◆"],
  bubbles: ["○", "◦", "●"],
  stars: ["★", "☆", "✦"],
};

/** Moving particles and a frame style for each theme, drawn over the live camera. */
export default function ThemeFX({ theme }: { theme: Theme }) {
  const [seed, setSeed] = useState(0);
  useEffect(() => setSeed(Math.random()), [theme.id]);

  const bits = useMemo(() => {
    let s = Math.floor(seed * 1e6) || 1;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 16 }, (_, i) => ({
      left: r() * 100,
      top: r() * 100,
      size: 12 + r() * 20,
      delay: -r() * 8,
      dur: 5 + r() * 6,
      glyph: GLYPH[theme.deco][i % 3],
      color: theme.decoColors[i % theme.decoColors.length],
    }));
  }, [seed, theme]);

  if (!seed) return null;

  return (
    <div className={`fx fx-${theme.deco} fx-theme-${theme.id}`} aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="fx-bit"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            fontSize: b.size,
            color: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
          }}
        >
          {b.glyph}
        </span>
      ))}
    </div>
  );
}

/** Big name card that pops up when you switch themes. */
export function ThemeBanner({ theme }: { theme: Theme }) {
  const [shown, setShown] = useState<string | null>(null);
  const [first, setFirst] = useState(true);

  useEffect(() => {
    if (first) {
      setFirst(false);
      return;
    }
    setShown(theme.id);
    const t = setTimeout(() => setShown(null), 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.id]);

  if (shown !== theme.id) return null;
  return (
    <div className="theme-banner" key={theme.id}>
      <span className="pixel theme-banner-name" style={{ color: theme.ui.accent }}>
        {theme.name.toUpperCase()}
      </span>
      <span className="theme-banner-tag">{theme.tagline}</span>
    </div>
  );
}
