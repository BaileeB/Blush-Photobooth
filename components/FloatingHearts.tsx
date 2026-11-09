"use client";

import { useEffect, useState } from "react";

type Bit = { left: number; size: number; delay: number; dur: number; kind: number };

/** Hearts and sparkles drifting up behind every screen. */
export default function FloatingHearts() {
  const [bits, setBits] = useState<Bit[]>([]);

  // generated on the client only, so server and client markup match
  useEffect(() => {
    setBits(
      Array.from({ length: 22 }, () => ({
        left: Math.random() * 100,
        size: 12 + Math.random() * 26,
        delay: -Math.random() * 18,
        dur: 12 + Math.random() * 14,
        kind: Math.floor(Math.random() * 3),
      })),
    );
  }, []);

  return (
    <div className="floaters" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className={`floater floater-${b.kind}`}
          style={{
            left: `${b.left}%`,
            fontSize: b.size,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
          }}
        >
          {b.kind === 0 ? "♥" : b.kind === 1 ? "✦" : "♡"}
        </span>
      ))}
    </div>
  );
}
