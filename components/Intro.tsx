"use client";

import { useCallback, useEffect, useState } from "react";
import { sfx } from "@/lib/sound";
import { getStats, type Stats } from "@/lib/stats";

type Props = {
  hasInvite: boolean;
  onSolo: () => void;
  onFriends: () => void;
  onReplay: () => void;
};

const ITEMS = ["SOLO MODE", "PLAY WITH FRIENDS", "HOW TO PLAY", "WATCH INTRO"] as const;

export default function Intro({ hasInvite, onSolo, onFriends, onReplay }: Props) {
  // the intro gate already counts as pressing start
  const [started, setStarted] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => setStats(getStats()), []);
  const [cursor, setCursor] = useState(0);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (hasInvite) setCursor(1);
  }, [hasInvite]);

  const choose = useCallback(
    (i: number) => {
      sfx.select();
      if (i === 0) onSolo();
      if (i === 1) onFriends();
      if (i === 2) setHelp(true);
      if (i === 3) onReplay();
    },
    [onSolo, onFriends, onReplay],
  );

  const start = useCallback(() => {
    sfx.start();
    setStarted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (help) {
        if (["Escape", "Enter", " "].includes(e.key)) {
          e.preventDefault();
          setHelp(false);
        }
        return;
      }
      if (!started) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        sfx.move();
        setCursor((c) => (c + 1) % ITEMS.length);
      } else if (e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        sfx.move();
        setCursor((c) => (c + ITEMS.length - 1) % ITEMS.length);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose(cursor);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, cursor, help, start, choose]);

  return (
    <section className="intro">
      <div className="arcade">
        <div className="scanlines" aria-hidden />
        <div className="hud">
          <span>{hasInvite ? "INVITE FOUND" : "1P READY"}</span>
          <span>
            HI-SCORE <b className="hud-score">{String(stats?.smiles ?? 0).padStart(4, "0")}</b> SMILES
          </span>
          <span>STRIPS {String(stats?.strips ?? 0).padStart(2, "0")}</span>
        </div>

        <div className="logo">
          <span className="logo-small">welcome to</span>
          <h1 className="logo-title">
            <span>BLUSH</span>
            <span>BOOTH</span>
          </h1>
          <p className="logo-sub">a photo booth for you and your online friends</p>
        </div>

        {!started ? (
          <button className="press-start" onClick={start}>
            PRESS START
          </button>
        ) : (
          <ul className="menu" role="menu">
            {ITEMS.map((item, i) => (
              <li key={item}>
                <button
                  role="menuitem"
                  className={`menu-item ${cursor === i ? "active" : ""}`}
                  onMouseEnter={() => {
                    if (cursor !== i) sfx.move();
                    setCursor(i);
                  }}
                  onClick={() => choose(i)}
                >
                  <span className="menu-cursor" aria-hidden>
                    ♥
                  </span>
                  {item}
                  {i === 1 && hasInvite && <span className="menu-badge">INVITED!</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="intro-hint">
          {started ? "use ↑ ↓ and ENTER, or just click" : "press ENTER or click to begin"}
        </p>
        <footer className="intro-foot">© 2026 BLUSH BOOTH · INSERT SMILE TO CONTINUE</footer>
      </div>

      {help && (
        <div className="modal" onClick={() => setHelp(false)}>
          <div className="modal-card how" onClick={(e) => e.stopPropagation()}>
            <h2 className="pixel">HOW TO PLAY</h2>
            <ol>
              <li>
                <b>Pick a mode.</b> Solo is just you. Friends mode gives you a booth code to share with up to 3
                friends.
              </li>
              <li>
                <b>Choose a theme and a face filter.</b> Themes change the whole booth, the colours, and the
                stickers on your strip. Face filters follow your face, like kitty ears or heart eyes.
              </li>
              <li>
                <b>Set the timer.</b> Off, 3, 5, or 10 seconds. Pick how many shots you want in the strip.
              </li>
              <li>
                <b>Hit SNAP</b> (or press space). Everyone in the booth gets the same countdown.
              </li>
              <li>
                <b>Get a share link</b> or download your strip and post it everywhere.
              </li>
            </ol>
            <button className="btn btn-primary" onClick={() => setHelp(false)}>
              GOT IT
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
