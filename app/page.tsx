"use client";

import { useEffect, useState } from "react";
import Intro from "@/components/Intro";
import Lobby from "@/components/Lobby";
import Booth, { type BoothMode } from "@/components/Booth";
import FloatingHearts from "@/components/FloatingHearts";
import MusicPlayer from "@/components/MusicPlayer";
import Cinematic, { IntroGate } from "@/components/Cinematic";
import { music } from "@/lib/music";
import { sfx } from "@/lib/sound";

type Screen =
  | { kind: "gate" }
  | { kind: "cinematic" }
  | { kind: "intro" }
  | { kind: "lobby" }
  | { kind: "booth"; mode: BoothMode; name: string; code?: string };

export default function Home() {
  const [screen, setScreen] = useState<Screen>({ kind: "gate" });
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) setInviteCode(room.toUpperCase());
    setName(localStorage.getItem("blush-name") ?? "");
  }, []);

  const saveName = (n: string) => {
    setName(n);
    localStorage.setItem("blush-name", n);
  };

  const toMenu = () => {
    if (inviteCode) {
      // the invite was used, clear it from the address bar
      window.history.replaceState(null, "", window.location.pathname);
      setInviteCode("");
    }
    setScreen({ kind: "intro" });
  };

  return (
    <main className="app">
      <FloatingHearts />
      {screen.kind === "gate" && (
        <IntroGate
          onWatch={() => {
            music.autoStart();
            setScreen({ kind: "cinematic" });
          }}
          onSkip={() => {
            music.autoStart();
            sfx.start();
            setScreen({ kind: "intro" });
          }}
        />
      )}
      {screen.kind === "cinematic" && <Cinematic onDone={() => setScreen({ kind: "intro" })} />}
      {screen.kind !== "gate" && <MusicPlayer />}
      {screen.kind === "intro" && (
        <Intro
          hasInvite={!!inviteCode}
          onSolo={() => setScreen({ kind: "booth", mode: "solo", name })}
          onFriends={() => setScreen({ kind: "lobby" })}
          onReplay={() => setScreen({ kind: "cinematic" })}
        />
      )}
      {screen.kind === "lobby" && (
        <Lobby
          initialName={name}
          initialCode={inviteCode}
          onBack={toMenu}
          onCreate={(n) => {
            saveName(n);
            setScreen({ kind: "booth", mode: "host", name: n });
          }}
          onJoin={(n, code) => {
            saveName(n);
            setScreen({ kind: "booth", mode: "join", name: n, code });
          }}
        />
      )}
      {screen.kind === "booth" && (
        <Booth mode={screen.mode} name={screen.name} joinCode={screen.code} onExit={toMenu} />
      )}
    </main>
  );
}
