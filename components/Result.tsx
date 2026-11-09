"use client";

import { useState } from "react";
import { sfx } from "@/lib/sound";

type Props = {
  src: string;
  /** A share link made earlier for this same strip. */
  link?: string;
  onLink: (url: string) => void;
  onClose: () => void;
  onAgain: () => void;
};

/** Turns the PNG strip into a smaller JPEG for uploading. */
async function toJpeg(src: string): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.88),
  );
}

export default function Result({ src, link, onLink, onClose, onAgain }: Props) {
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fileName = `blush-booth-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;

  const download = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = fileName;
    a.click();
  };

  const makeLink = async () => {
    setState("uploading");
    setError("");
    try {
      const body = new FormData();
      body.append("file", await toJpeg(src), "strip.jpg");
      const res = await fetch("/api/share", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Couldn't make a link. Try again.");
      sfx.select();
      onLink(data.url);
      setState("idle");
    } catch (e) {
      setError((e as Error).message || "Couldn't make a link. Try again.");
      setState("error");
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy your link:", link);
    }
  };

  const nativeShare = async () => {
    if (!link) return;
    try {
      await navigator.share({ title: "Blush Booth", text: "look at our photo strip!", url: link });
    } catch {
      // the share sheet was closed
    }
  };

  const text = encodeURIComponent("look at our photo strip! ");
  const enc = link ? encodeURIComponent(link) : "";

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card result" onClick={(e) => e.stopPropagation()}>
        <h2 className="pixel result-title">STRIP COMPLETE!</h2>
        <div className="strip-view">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Your photo strip" />
        </div>

        <div className="share-box">
          {!link ? (
            <>
              <button className="btn btn-primary share-main" onClick={makeLink} disabled={state === "uploading"}>
                {state === "uploading" ? "MAKING YOUR LINK…" : "♥ GET SHARE LINK"}
              </button>
              {state === "error" && <p className="share-error">{error}</p>}
            </>
          ) : (
            <>
              <span className="pixel share-label">YOUR LINK</span>
              <div className="share-link-row">
                <input className="input share-link" readOnly value={link} onFocus={(e) => e.target.select()} />
                <button className="btn btn-primary btn-small" onClick={copy}>
                  {copied ? "COPIED!" : "COPY"}
                </button>
              </div>
              <div className="share-apps">
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button className="chip" onClick={nativeShare}>
                    SHARE…
                  </button>
                )}
                <a className="chip" href={`https://wa.me/?text=${text}${enc}`} target="_blank" rel="noreferrer">
                  WHATSAPP
                </a>
                <a
                  className="chip"
                  href={`https://twitter.com/intent/tweet?text=${text}&url=${enc}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  X
                </a>
                <a className="chip" href={`mailto:?subject=Our%20Blush%20Booth%20strip&body=${text}${enc}`}>
                  EMAIL
                </a>
                <a className="chip" href={link} target="_blank" rel="noreferrer">
                  OPEN
                </a>
              </div>
            </>
          )}
        </div>

        <div className="result-actions">
          <button className="btn" onClick={download}>
            DOWNLOAD
          </button>
          <button className="btn" onClick={onAgain}>
            AGAIN!
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
