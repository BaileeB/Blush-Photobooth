"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { FRAME_H, FRAME_W, gridCells } from "@/lib/canvas";
import { detectFaces, drawFaceFilters, loadFaceTracker } from "@/lib/faces";

/**
 * Tracks faces in every camera on the stage and draws the chosen face filters
 * live. Only loads the face tracker once someone picks a filter.
 */
export default function FaceLayer({
  stageRef,
  active,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  useEffect(() => {
    if (!active || status !== "idle") return;
    setStatus("loading");
    loadFaceTracker().then((t) => setStatus(t ? "ready" : "failed"));
  }, [active, status]);

  useEffect(() => {
    if (status !== "ready") return;
    let raf = 0;
    let last = 0;
    let stopped = false;
    const loop = async () => {
      const tracker = await loadFaceTracker();
      if (stopped || !tracker) return;
      const run = (now: number) => {
        if (stopped) return;
        const c = canvasRef.current;
        const videos = Array.from(stageRef.current?.querySelectorAll<HTMLVideoElement>("video[data-cam]") ?? []);
        // about 20 face checks a second keeps phones cool
        if (now - last > 50) {
          last = now;
          videos.forEach((v) => {
            if (v.dataset.face && v.dataset.face !== "none") detectFaces(tracker, v);
          });
        }
        if (c) {
          const ctx = c.getContext("2d")!;
          ctx.clearRect(0, 0, FRAME_W, FRAME_H);
          drawFaceFilters(ctx, videos, gridCells(videos.length, FRAME_W, FRAME_H));
        }
        raf = requestAnimationFrame(run);
      };
      raf = requestAnimationFrame(run);
    };
    loop();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [status, stageRef]);

  return (
    <>
      <canvas ref={canvasRef} width={FRAME_W} height={FRAME_H} className="face-layer" aria-hidden />
      {active && status === "loading" && <div className="face-status pixel">LOADING FACE MAGIC…</div>}
      {active && status === "failed" && <div className="face-status pixel">FACE FILTERS NOT SUPPORTED HERE</div>}
    </>
  );
}
