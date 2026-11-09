"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string;
  onClose: () => void;
  onAgain: () => void;
};

export default function Result({ src, onClose, onAgain }: Props) {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "canShare" in navigator);
  }, []);

  const fileName = `blush-booth-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;

  const download = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = fileName;
    a.click();
  };

  const share = async () => {
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Blush Booth", text: "our photo strip!" });
      } else {
        download();
      }
    } catch {
      // the user closed the share sheet
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card result" onClick={(e) => e.stopPropagation()}>
        <h2 className="pixel result-title">STRIP COMPLETE!</h2>
        <div className="strip-view">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Your photo strip" />
        </div>
        <div className="result-actions">
          <button className="btn btn-primary" onClick={download}>
            DOWNLOAD
          </button>
          {canShare && (
            <button className="btn" onClick={share}>
              SHARE
            </button>
          )}
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
