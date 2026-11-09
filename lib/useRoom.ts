"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Peer from "peerjs";
import type { DataConnection, MediaConnection } from "peerjs";

export const MAX_PLAYERS = 4;
const PREFIX = "blushbooth-v1-";
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const makeCode = () =>
  Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");

export type RoomMessage =
  | { type: "welcome"; peers: string[]; theme: string }
  | { type: "full" }
  | { type: "theme"; id: string }
  | { type: "shoot"; timer: number; shots: number }
  | { type: "name"; name: string; face?: string }
  | { type: "face"; id: string };

export type Remote = { id: string; name: string; face?: string; stream?: MediaStream };

export type RoomStatus = "idle" | "connecting" | "ready" | "error";

type Options = {
  onMessage: (msg: RoomMessage, from: string) => void;
  /** Theme the host shares with new friends. */
  getTheme: () => string;
};

/**
 * Peer-to-peer room. The host owns the room code. Guests connect to the host,
 * the host tells them who else is there, and everyone connects to everyone.
 */
export function useRoom({ onMessage, getTheme }: Options) {
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isHost, setIsHost] = useState(false);
  const [remotes, setRemotes] = useState<Record<string, Remote>>({});

  const peerRef = useRef<Peer | null>(null);
  const conns = useRef(new Map<string, DataConnection>());
  const calls = useRef(new Map<string, MediaConnection>());
  const localStream = useRef<MediaStream | null>(null);
  const myName = useRef("");
  const myFace = useRef("none");
  const hostRef = useRef(false);
  const msgRef = useRef(onMessage);
  const themeRef = useRef(getTheme);
  msgRef.current = onMessage;
  themeRef.current = getTheme;

  const upsert = useCallback((id: string, patch: Partial<Remote>) => {
    setRemotes((r) => ({ ...r, [id]: { ...r[id], ...patch, id, name: patch.name ?? r[id]?.name ?? "friend" } }));
  }, []);

  const drop = useCallback((id: string) => {
    conns.current.get(id)?.close();
    calls.current.get(id)?.close();
    conns.current.delete(id);
    calls.current.delete(id);
    setRemotes((r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });
  }, []);

  const wireCall = useCallback(
    (call: MediaConnection) => {
      calls.current.set(call.peer, call);
      const name = (call.metadata as { name?: string } | undefined)?.name;
      if (name) upsert(call.peer, { name });
      call.on("stream", (stream) => upsert(call.peer, { stream }));
      call.on("close", () => drop(call.peer));
      call.on("error", () => drop(call.peer));
    },
    [upsert, drop],
  );

  const wireConn = useCallback(
    (conn: DataConnection) => {
      conn.on("open", () => {
        // the host turns people away once the booth is full
        if (hostRef.current && conns.current.size + 1 >= MAX_PLAYERS && !conns.current.has(conn.peer)) {
          conn.send({ type: "full" } satisfies RoomMessage);
          setTimeout(() => conn.close(), 400);
          return;
        }
        conns.current.set(conn.peer, conn);
        const name = (conn.metadata as { name?: string } | undefined)?.name;
        upsert(conn.peer, name ? { name } : {});
        conn.send({ type: "name", name: myName.current, face: myFace.current } satisfies RoomMessage);
        if (hostRef.current) {
          const others = [...conns.current.keys()].filter((id) => id !== conn.peer);
          conn.send({ type: "welcome", peers: others, theme: themeRef.current() } satisfies RoomMessage);
        }
      });
      conn.on("data", (raw) => {
        const msg = raw as RoomMessage;
        if (msg.type === "name") upsert(conn.peer, { name: msg.name, face: msg.face ?? "none" });
        if (msg.type === "face") upsert(conn.peer, { face: msg.id });
        if (msg.type === "full") {
          setError("That booth is full. Max 4 friends per booth.");
          setStatus("error");
        }
        if (msg.type === "welcome") {
          // connect to everyone else who is already in the booth
          msg.peers.forEach((id) => connectTo(id));
        }
        msgRef.current(msg, conn.peer);
      });
      conn.on("close", () => drop(conn.peer));
      conn.on("error", () => drop(conn.peer));
    },
    // connectTo is defined below and stable through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [upsert, drop],
  );

  const connectTo = useCallback(
    (id: string) => {
      const peer = peerRef.current;
      if (!peer || !localStream.current || conns.current.has(id)) return;
      wireConn(peer.connect(id, { reliable: true, metadata: { name: myName.current } }));
      wireCall(peer.call(id, localStream.current, { metadata: { name: myName.current } }));
    },
    [wireConn, wireCall],
  );

  const makePeer = useCallback(
    async (id?: string) => {
      const { default: PeerCtor } = await import("peerjs");
      const peer = id ? new PeerCtor(id) : new PeerCtor();
      peer.on("connection", wireConn);
      peer.on("call", (call) => {
        if (!localStream.current) return;
        call.answer(localStream.current);
        wireCall(call);
      });
      return peer;
    },
    [wireConn, wireCall],
  );

  const leave = useCallback(() => {
    conns.current.forEach((c) => c.close());
    calls.current.forEach((c) => c.close());
    conns.current.clear();
    calls.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
    hostRef.current = false;
    setRemotes({});
    setStatus("idle");
    setIsHost(false);
    setCode("");
    setError("");
  }, []);

  const host = useCallback(
    async (stream: MediaStream, name: string, attempt = 0) => {
      leave();
      localStream.current = stream;
      myName.current = name;
      hostRef.current = true;
      setIsHost(true);
      setStatus("connecting");
      const newCode = makeCode();
      const peer = await makePeer(PREFIX + newCode);
      peerRef.current = peer;
      peer.on("open", () => {
        setCode(newCode);
        setStatus("ready");
      });
      peer.on("error", (err) => {
        if ((err as { type?: string }).type === "unavailable-id" && attempt < 3) {
          host(stream, name, attempt + 1);
          return;
        }
        setError(friendlyError(err));
        setStatus("error");
      });
    },
    [leave, makePeer],
  );

  const join = useCallback(
    async (stream: MediaStream, name: string, roomCode: string) => {
      leave();
      localStream.current = stream;
      myName.current = name;
      hostRef.current = false;
      setStatus("connecting");
      const clean = roomCode.trim().toUpperCase();
      const peer = await makePeer();
      peerRef.current = peer;
      peer.on("open", () => {
        setCode(clean);
        connectTo(PREFIX + clean);
        setStatus("ready");
      });
      peer.on("error", (err) => {
        setError(friendlyError(err));
        setStatus("error");
      });
    },
    [leave, makePeer, connectTo],
  );

  const broadcast = useCallback((msg: RoomMessage) => {
    conns.current.forEach((c) => {
      if (c.open) c.send(msg);
    });
  }, []);

  /** Tells everyone which face filter you're wearing. */
  const setFace = useCallback(
    (id: string) => {
      myFace.current = id;
      broadcast({ type: "face", id });
    },
    [broadcast],
  );

  useEffect(() => () => peerRef.current?.destroy(), []);

  return { status, code, error, isHost, remotes, host, join, leave, broadcast, setFace };
}

function friendlyError(err: unknown) {
  const type = (err as { type?: string }).type;
  switch (type) {
    case "peer-unavailable":
      return "No booth with that code. Check the code and try again.";
    case "network":
    case "server-error":
    case "socket-error":
      return "Couldn't reach the booth server. Check your connection.";
    case "browser-incompatible":
      return "Your browser doesn't support online booths. Try Chrome, Edge, Firefox, or Safari.";
    default:
      return "Something went wrong connecting. Try again.";
  }
}
