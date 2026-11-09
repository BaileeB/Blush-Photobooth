"use client";

import { useState } from "react";
import { sfx } from "@/lib/sound";

type Props = {
  initialName: string;
  initialCode: string;
  onBack: () => void;
  onCreate: (name: string) => void;
  onJoin: (name: string, code: string) => void;
};

export default function Lobby({ initialName, initialCode, onBack, onCreate, onJoin }: Props) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState(initialCode);
  const [nameError, setNameError] = useState(false);

  const needName = () => {
    if (name.trim()) return false;
    setNameError(true);
    sfx.move();
    return true;
  };

  return (
    <section className="lobby">
      <button className="btn btn-ghost back" onClick={onBack}>
        ← MENU
      </button>
      <h2 className="pixel lobby-title">PLAYER SELECT</h2>

      <label className="field">
        <span className="pixel field-label">ENTER YOUR NAME</span>
        <input
          className={`input ${nameError ? "input-error" : ""}`}
          value={name}
          maxLength={12}
          placeholder="your name"
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setNameError(false);
          }}
        />
        {nameError && <span className="field-error">Type a name so your friends know it's you.</span>}
      </label>

      <div className="lobby-cards">
        <div className={`lobby-card ${initialCode ? "" : "lobby-card-main"}`}>
          <h3 className="pixel">CREATE A BOOTH</h3>
          <p>Start a new booth and get a code. Send it to up to 3 friends.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (needName()) return;
              sfx.select();
              onCreate(name.trim());
            }}
          >
            CREATE
          </button>
        </div>

        <div className={`lobby-card ${initialCode ? "lobby-card-main" : ""}`}>
          <h3 className="pixel">JOIN A BOOTH</h3>
          <p>Got a code from a friend? Pop it in here.</p>
          <form
            className="join-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (needName()) return;
              if (code.trim().length < 5) return;
              sfx.select();
              onJoin(name.trim(), code.trim().toUpperCase());
            }}
          >
            <input
              className="input input-code"
              value={code}
              maxLength={5}
              placeholder="CODE"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            />
            <button className="btn btn-primary" disabled={code.trim().length < 5}>
              JOIN
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
