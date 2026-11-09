"use client";

import { useState, useSyncExternalStore } from "react";
import { music, TRACKS } from "@/lib/music";

/** Little floating music box, available on every screen. */
export default function MusicPlayer() {
  const state = useSyncExternalStore(music.subscribe, music.getSnapshot, music.getSnapshot);
  const [open, setOpen] = useState(false);
  const track = TRACKS[state.trackIndex];

  return (
    <div className={`music ${open ? "open" : ""} ${state.playing ? "playing" : ""}`}>
      <button
        className="music-toggle"
        onClick={() => music.toggle()}
        aria-label={state.playing ? "Pause music" : "Play music"}
        title={state.playing ? "Pause music" : "Play music"}
      >
        <span className="eq" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </button>
      <button className="music-label" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="pixel music-now">{state.playing ? "NOW PLAYING" : "MUSIC OFF"}</span>
        <span className="music-name">{track.name}</span>
      </button>

      {open && (
        <div className="music-panel">
          <div className="music-tracks">
            {TRACKS.map((t, i) => (
              <button
                key={t.id}
                className={`music-track ${i === state.trackIndex ? "active" : ""}`}
                onClick={() => music.setTrack(i)}
              >
                <b>{t.name}</b>
                <small>{t.mood}</small>
              </button>
            ))}
          </div>
          <label className="music-vol">
            <span className="pixel">VOL</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.volume}
              onChange={(e) => music.setVolume(Number(e.target.value))}
            />
          </label>
          <div className="music-buttons">
            <button className="btn btn-small" onClick={() => music.prev()}>
              ◀ PREV
            </button>
            <button className="btn btn-small btn-primary" onClick={() => music.toggle()}>
              {state.playing ? "PAUSE" : "PLAY"}
            </button>
            <button className="btn btn-small" onClick={() => music.next()}>
              NEXT ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
