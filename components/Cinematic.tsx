"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sound";

/** Scene start times in ms. */
const SCENES = [0, 2400, 5200, 8000, 9600, 13500];
const TOTAL = SCENES[SCENES.length - 1];

const FRIENDS = [
  { name: "you", hair: "#5a2a1a", skin: "#ffd9c2" },
  { name: "bestie", hair: "#f2c14e", skin: "#f6c9a8" },
  { name: "bff", hair: "#2b1b3d", skin: "#c98f6b" },
  { name: "twin", hair: "#ff6fb3", skin: "#ffe1cf" },
];

export function Avatar({ hair, skin, size = 64 }: { hair: string; skin: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, ["--hair" as string]: hair, ["--skin" as string]: skin }}>
      <span className="avatar-hair" />
      <span className="avatar-face">
        <i className="eye l" />
        <i className="eye r" />
        <i className="cheek l" />
        <i className="cheek r" />
        <i className="smile" />
      </span>
    </span>
  );
}

/** The choice screen: watch the intro or skip it. Also the click that unlocks sound. */
export function IntroGate({ onWatch, onSkip }: { onWatch: () => void; onSkip: () => void }) {
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab"].includes(e.key)) {
        e.preventDefault();
        setCursor((c) => 1 - c);
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (cursor === 0) onWatch();
        else onSkip();
      }
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, onWatch, onSkip]);

  return (
    <section className="gate">
      <div className="gate-heart" aria-hidden>
        ♥
      </div>
      <p className="pixel gate-title">BLUSH BOOTH</p>
      <p className="gate-sub">Sound on for the best time. You can change the music anytime.</p>
      <div className="gate-buttons">
        <button
          className={`btn btn-primary gate-btn ${cursor === 0 ? "focus" : ""}`}
          onMouseEnter={() => setCursor(0)}
          onClick={onWatch}
        >
          ▶ WATCH INTRO
        </button>
        <button
          className={`btn gate-btn ${cursor === 1 ? "focus" : ""}`}
          onMouseEnter={() => setCursor(1)}
          onClick={onSkip}
        >
          SKIP INTRO ▶▶
        </button>
      </div>
    </section>
  );
}

/** The intro animation. Friends from all over the internet squeeze into one booth. */
export default function Cinematic({ onDone }: { onDone: () => void }) {
  const [scene, setScene] = useState(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const timers = SCENES.slice(1).map((t, i) =>
      setTimeout(() => {
        if (i + 1 === SCENES.length - 1) finish();
        else setScene(i + 1);
      }, t),
    );
    return () => timers.forEach(clearTimeout);
  }, [finish]);

  // sound cues
  useEffect(() => {
    if (scene === 1) sfx.select();
    if (scene === 3) {
      [0, 400, 800].forEach((d, i) => setTimeout(() => (i === 2 ? sfx.ready() : sfx.tick()), d));
      setTimeout(() => sfx.shutter(), 1250);
    }
    if (scene === 4) setTimeout(() => sfx.done(), 1500);
  }, [scene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  return (
    <section className={`cine scene-${scene}`} aria-label="Intro animation">
      <button className="btn btn-small cine-skip" onClick={finish}>
        SKIP ▶▶
      </button>

      {scene === 0 && (
        <div className="cine-center">
          <p className="pixel type-on">A BLUSH BOOTH PRODUCTION</p>
        </div>
      )}

      {scene === 1 && (
        <div className="cine-center">
          <p className="cine-caption pixel">somewhere on the internet…</p>
          <div className="windows">
            {FRIENDS.map((f, i) => (
              <div className="win" key={f.name} style={{ animationDelay: `${i * 0.25}s` }}>
                <div className="win-bar">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="win-body">
                  <Avatar hair={f.hair} skin={f.skin} />
                  <span className="pixel win-name">{f.name}</span>
                  <span className="wifi" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scene === 2 && (
        <div className="cine-center">
          <p className="cine-caption pixel">…four friends squeeze into one booth</p>
          <div className="booth-art">
            <div className="booth-sign pixel">PHOTOS</div>
            <div className="booth-body">
              <div className="booth-faces">
                {FRIENDS.map((f, i) => (
                  <span key={f.name} className="fly-in" style={{ animationDelay: `${i * 0.2}s`, ["--from" as string]: `${(i - 1.5) * 260}px` }}>
                    <Avatar hair={f.hair} skin={f.skin} size={52} />
                  </span>
                ))}
              </div>
              <div className="curtain" />
            </div>
            <div className="booth-slot" />
          </div>
        </div>
      )}

      {scene === 3 && (
        <div className="cine-center">
          <div className="cine-count pixel">
            <span style={{ animationDelay: "0s" }}>3</span>
            <span style={{ animationDelay: "0.4s" }}>2</span>
            <span style={{ animationDelay: "0.8s" }}>1</span>
          </div>
          <div className="cine-flash" />
        </div>
      )}

      {scene === 4 && (
        <div className="cine-center cine-final">
          <div className="cine-strip">
            {FRIENDS.map((f, i) => (
              <div className="cine-frame" key={f.name} style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
                {FRIENDS.map((g) => (
                  <Avatar key={g.name} hair={g.hair} skin={g.skin} size={30} />
                ))}
                <span className="frame-heart" style={{ left: `${20 + i * 15}%` }}>
                  ♥
                </span>
              </div>
            ))}
          </div>
          <h1 className="cine-title pixel">
            <span>BLUSH</span>
            <span>BOOTH</span>
          </h1>
          <p className="cine-tag">snap together, from anywhere</p>
        </div>
      )}

      <div className="cine-progress" style={{ animationDuration: `${TOTAL}ms` }} />
    </section>
  );
}
