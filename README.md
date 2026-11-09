# Blush Booth

A pink, game-style photo booth for you and your online friends. Built with Next.js.

## Features

- **Intro animation.** Watch a short animated intro or skip it. You can replay it from the menu.
- **Arcade title screen.** Pick a mode with the arrow keys or your mouse. The hi-score shows your real total of smiles snapped and strips made, saved in your browser.
- **Background music.** Four original chiptune songs made live in the browser: Bubblegum Pop, Lo-fi Blush, Arcade Crush, and Sakura Dream. Change the song, pause, or set the volume from the music box in the corner.
- **Solo mode.** Just you and your camera.
- **Friends mode.** Create a booth, share the 5-letter code or invite link, and up to 4 people join. Everyone sees each other live, and one SNAP gives everyone the same countdown.
- **6 themes.** Bubblegum, Y2K Glitter, Cherry Blossom, Retro Arcade, Strawberry Milk, and Midnight Kiss. Each theme restyles the whole booth: page colours, camera filter, animated effects on the live camera, frame style, and the stickers on your strip. Themes sync across the room.
- **Face filters.** Blushy, Kitty, Bunny, Heart Eyes, Princess, and Angel. They track your face live and show up in your photos. Each friend picks their own, and everyone sees each other's filters.
- **Timer.** Off, 3, 5, or 10 seconds.
- **Shots.** 1, 3, or 4 photos per strip.
- **Photo strips.** Download as PNG, or get a share link that opens a page with your strip. Links show a preview of the strip in iMessage, WhatsApp, Discord, and X. Your strips from this visit stay in a gallery on the side.
- Retro sound effects with a mute button. Press space to snap.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Your browser asks for camera access the first time.

## How friends mode works

Video goes straight between browsers with WebRTC through [PeerJS](https://peerjs.com). The free PeerJS cloud server only introduces the browsers to each other. No photos or video go through a server, and this app needs no backend or database.

Each person's browser builds its own copy of the strip from the videos it sees.

Some strict networks (some school or office Wi-Fi) block direct peer connections. Friends mode needs a TURN server to work there.

## Turn on share links

Share links save strips with [Vercel Blob](https://vercel.com/docs/vercel-blob). To switch them on:

1. Open your project on Vercel and go to **Storage**.
2. Create a **Blob** store and connect it to this project. Vercel adds the `BLOB_READ_WRITE_TOKEN` variable for you.
3. Redeploy.

To use share links locally, copy that variable into a `.env.local` file. Without it, everything else still works and the share button explains that links aren't on yet.

## Face filters

Face tracking uses [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) and runs fully in the browser. No video leaves your device for this. The model file lives in `public/mediapipe/`, and `npm install` copies the runtime there too.

## Deploy

The app is fully static, so it runs on Vercel or any Next.js host. Camera access needs HTTPS, which Vercel gives you by default.

## Project layout

- `app/` holds the page, layout, and styles.
- `components/` holds the screens: `Cinematic`, `Intro`, `Lobby`, `Booth`, `Result`, plus `MusicPlayer`, `ThemeFX`, and `FaceLayer`.
- `app/api/share/` saves strips, and `app/s/[id]/` shows a shared strip.
- `lib/themes.ts` defines the themes. Add your own there.
- `lib/canvas.ts` draws frames, stickers, and the final strip.
- `lib/useRoom.ts` handles the friends room.
- `lib/sound.ts` makes the sound effects, and `lib/music.ts` plays the songs, both with the Web Audio API.
- `lib/faces.ts` tracks faces and draws the face filters.
- `lib/stats.ts` keeps your hi-score.
