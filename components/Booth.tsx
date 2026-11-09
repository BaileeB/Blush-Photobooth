"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { THEMES, getTheme } from "@/lib/themes";
import { buildStrip, captureFrame } from "@/lib/canvas";
import { setMuted, sfx } from "@/lib/sound";
import { MAX_PLAYERS, useRoom, type RoomMessage } from "@/lib/useRoom";
import { body, pixel } from "@/lib/fonts";
import StageDeco from "./StageDeco";
import Result from "./Result";

export type BoothMode = "solo" | "host" | "join";

type Props = {
  mode: BoothMode;
  name: string;
  joinCode?: string;
  onExit: () => void;
};

const TIMERS = [0, 3, 5, 10];
const SHOTS = [1, 3, 4];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Booth({ mode, name, joinCode, onExit }: Props) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState("");
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [timer, setTimer] = useState(3);
  const [shots, setShots] = useState(3);
  const [count, setCount] = useState<number | null>(null);
  const [shotNo, setShotNo] = useState(0);
  const [shotTotal, setShotTotal] = useState(0);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [strip, setStrip] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [muted, setMute] = useState(false);
  const [copied, setCopied] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const busyRef = useRef(false);
  const themeRef = useRef(themeId);
  themeRef.current = themeId;

  const theme = getTheme(themeId);
  const online = mode !== "solo";

  // ----- running a photo sequence -----
  const remotesRef = useRef<Record<string, { name: string }>>({});

  const runSequence = useCallback(
    async (secs: number, total: number) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setStrip(null);
      setShotTotal(total);
      const frames: HTMLCanvasElement[] = [];
      const current = getTheme(themeRef.current);

      for (let i = 0; i < total; i++) {
        setShotNo(i + 1);
        // with the timer off you still get a short beat between shots to change pose
        const wait = secs > 0 ? secs : i === 0 ? 0 : 2;
        for (let s = wait; s > 0; s--) {
          setCount(s);
          if (s === 1) sfx.ready();
          else sfx.tick();
          await sleep(1000);
        }
        setCount(null);
        setFlash(true);
        sfx.shutter();
        const videos = Array.from(stageRef.current?.querySelectorAll<HTMLVideoElement>("video[data-cam]") ?? []);
        frames.push(captureFrame(videos, current));
        await sleep(220);
        setFlash(false);
        if (i < total - 1) await sleep(500);
      }

      const names = [name, ...Object.values(remotesRef.current).map((r) => r.name)];
      if (document.fonts?.ready) await document.fonts.ready;
      const url = buildStrip({
        frames,
        theme: current,
        names,
        titleFont: pixel.style.fontFamily,
        bodyFont: body.style.fontFamily,
      });
      sfx.done();
      setStrip(url);
      setGallery((g) => [url, ...g].slice(0, 12));
      setShotNo(0);
      busyRef.current = false;
      setBusy(false);
    },
    [name],
  );

  // ----- online room -----
  const onMessage = useCallback(
    (msg: RoomMessage) => {
      if (msg.type === "theme" || msg.type === "welcome") {
        setThemeId(msg.type === "theme" ? msg.id : msg.theme);
      }
      if (msg.type === "shoot") {
        setTimer(msg.timer);
        setShots(msg.shots);
        runSequence(msg.timer, msg.shots);
      }
    },
    [runSequence],
  );

  const room = useRoom({ onMessage, getTheme: () => themeRef.current });
  remotesRef.current = room.remotes;
  const remoteList = Object.values(room.remotes);
  const players = 1 + remoteList.length;

  // ----- camera -----
  const startCamera = useCallback(async () => {
    setCamError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" },
        audio: false,
      });
      // React dev mode can ask twice; keep one camera and release the other
      setStream((prev) => {
        if (prev) {
          s.getTracks().forEach((t) => t.stop());
          return prev;
        }
        return s;
      });
    } catch (e) {
      const err = e as DOMException;
      setCamError(
        err?.name === "NotAllowedError"
          ? "Camera access was blocked. Allow the camera in your browser settings, then try again."
          : err?.name === "NotFoundError"
            ? "No camera found. Plug one in and try again."
            : "Couldn't start your camera. Close other apps using it and try again.",
      );
    }
  }, []);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (localVideo.current && stream) localVideo.current.srcObject = stream;
  }, [stream]);

  // stop the camera when leaving the booth
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  // connect once the camera is on
  const started = useRef(false);
  useEffect(() => {
    if (!stream || !online || started.current) return;
    started.current = true;
    if (mode === "host") room.host(stream, name);
    if (mode === "join" && joinCode) room.join(stream, name, joinCode);
  }, [stream, online, mode, name, joinCode, room]);

  useEffect(() => () => room.leave(), [room.leave]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- actions -----
  const pickTheme = (id: string) => {
    if (busy) return;
    sfx.move();
    setThemeId(id);
    if (online) room.broadcast({ type: "theme", id });
  };

  const shoot = useCallback(() => {
    if (busyRef.current || !stream) return;
    if (online) room.broadcast({ type: "shoot", timer, shots });
    runSequence(timer, shots);
  }, [stream, online, room, timer, shots, runSequence]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === " " && !strip) {
        e.preventDefault();
        shoot();
      }
      if (e.key === "Escape" && strip) setStrip(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shoot, strip]);

  const inviteLink = typeof window !== "undefined" && room.code ? `${window.location.origin}${window.location.pathname}?room=${room.code}` : "";

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this invite link:", inviteLink);
    }
  };

  return (
    <section className="booth" style={{ ["--accent" as string]: theme.decoColors[0], ["--bg0" as string]: theme.bg[0], ["--bg1" as string]: theme.bg[1] }}>
      <header className="booth-bar">
        <button className="btn btn-ghost" onClick={onExit} disabled={busy}>
          ← MENU
        </button>
        <div className="booth-title pixel">BLUSH BOOTH</div>
        <div className="bar-right">
          {online && (
            <span className="pill">
              {players}/{MAX_PLAYERS} PLAYERS
            </span>
          )}
          <button
            className="btn btn-ghost icon"
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            onClick={() => {
              setMuted(!muted);
              setMute(!muted);
            }}
          >
            {muted ? "SOUND OFF" : "SOUND ON"}
          </button>
        </div>
      </header>

      {online && (
        <div className={`room-banner ${room.status}`}>
          {room.status === "connecting" && <span>Opening your booth…</span>}
          {room.status === "ready" && room.isHost && (
            <>
              <span>
                BOOTH CODE <b className="code pixel">{room.code}</b>
              </span>
              <button className="btn btn-small" onClick={copyInvite}>
                {copied ? "COPIED!" : "COPY INVITE LINK"}
              </button>
              {remoteList.length === 0 && <span className="muted">Waiting for friends to join…</span>}
            </>
          )}
          {room.status === "ready" && !room.isHost && (
            <span>
              In booth <b className="code pixel">{room.code}</b>
              {remoteList.length === 0 && <span className="muted"> · connecting to your friend…</span>}
            </span>
          )}
          {room.status === "error" && (
            <>
              <span>{room.error}</span>
              <button className="btn btn-small" onClick={onExit}>
                BACK TO MENU
              </button>
            </>
          )}
        </div>
      )}

      <div className="booth-main">
        <div className="stage-wrap">
          <div ref={stageRef} className={`stage grid-${Math.min(players, 4)}`} style={{ borderColor: theme.frame }}>
            <div className="cam">
              <video
                ref={localVideo}
                data-cam
                autoPlay
                playsInline
                muted
                style={{ filter: theme.filter }}
              />
              <span className="cam-name">{name || "you"}</span>
            </div>
            {remoteList.slice(0, MAX_PLAYERS - 1).map((r) => (
              <RemoteCam key={r.id} stream={r.stream} name={r.name} filter={theme.filter} />
            ))}

            <StageDeco theme={theme} />

            {!stream && (
              <div className="stage-msg">
                {camError ? (
                  <>
                    <p>{camError}</p>
                    <button className="btn btn-primary" onClick={startCamera}>
                      TRY AGAIN
                    </button>
                  </>
                ) : (
                  <p className="pixel blink">WAKING UP THE CAMERA…</p>
                )}
              </div>
            )}

            {count !== null && (
              <div className="countdown" key={count}>
                <span className="pixel">{count}</span>
              </div>
            )}
            {busy && shotTotal > 1 && (
              <div className="shot-counter pixel">
                SHOT {shotNo}/{shotTotal}
              </div>
            )}
            {flash && <div className="flash" />}
          </div>
        </div>

        <aside className="panel">
          <div className="panel-block">
            <h3 className="pixel panel-h">CHOOSE YOUR THEME</h3>
            <div className="themes">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-card ${t.id === themeId ? "active" : ""}`}
                  onClick={() => pickTheme(t.id)}
                  disabled={busy}
                >
                  <span className="swatch" style={{ background: `linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]})` }}>
                    <span style={{ background: t.decoColors[0] }} />
                  </span>
                  <span className="theme-text">
                    <b>{t.name}</b>
                    <small>{t.tagline}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel-row">
            <div className="panel-block">
              <h3 className="pixel panel-h">TIMER</h3>
              <div className="chips">
                {TIMERS.map((t) => (
                  <button
                    key={t}
                    className={`chip ${timer === t ? "active" : ""}`}
                    onClick={() => {
                      sfx.move();
                      setTimer(t);
                    }}
                    disabled={busy}
                  >
                    {t === 0 ? "OFF" : `${t}s`}
                  </button>
                ))}
              </div>
            </div>
            <div className="panel-block">
              <h3 className="pixel panel-h">SHOTS</h3>
              <div className="chips">
                {SHOTS.map((s) => (
                  <button
                    key={s}
                    className={`chip ${shots === s ? "active" : ""}`}
                    onClick={() => {
                      sfx.move();
                      setShots(s);
                    }}
                    disabled={busy}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className="snap" onClick={shoot} disabled={busy || !stream}>
            <span className="pixel">{busy ? "SMILE!" : "SNAP!"}</span>
            <small>{busy ? "hold that pose" : online ? "everyone gets the countdown · space" : "or press space"}</small>
          </button>

          {gallery.length > 0 && (
            <div className="panel-block">
              <h3 className="pixel panel-h">YOUR STRIPS</h3>
              <div className="gallery">
                {gallery.map((g, i) => (
                  <button key={g.slice(-32) + i} className="thumb" onClick={() => setStrip(g)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g} alt={`Photo strip ${gallery.length - i}`} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {strip && <Result src={strip} onClose={() => setStrip(null)} onAgain={() => { setStrip(null); shoot(); }} />}
    </section>
  );
}

function RemoteCam({ stream, name, filter }: { stream?: MediaStream; name: string; filter: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="cam">
      <video ref={ref} data-cam autoPlay playsInline muted style={{ filter }} />
      {!stream && <div className="cam-wait pixel blink">JOINING…</div>}
      <span className="cam-name">{name}</span>
    </div>
  );
}
