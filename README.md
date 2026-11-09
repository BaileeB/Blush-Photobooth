# Blush Booth

A pink, game-style photo booth for you and your online friends. Built with Next.js.

## Features

- **Arcade intro screen.** Press start, then pick a mode with the arrow keys or your mouse.
- **Solo mode.** Just you and your camera.
- **Friends mode.** Create a booth, share the 5-letter code or invite link, and up to 4 people join. Everyone sees each other live, and one SNAP gives everyone the same countdown.
- **6 themes.** Bubblegum, Y2K Glitter, Cherry Blossom, Retro Arcade, Strawberry Milk, and Midnight Kiss. Each theme changes the camera filter, strip colours, and stickers. Themes sync across the room.
- **Timer.** Off, 3, 5, or 10 seconds.
- **Shots.** 1, 3, or 4 photos per strip.
- **Photo strips.** Download as PNG or share from your phone. Your strips from this visit stay in a gallery on the side.
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

## Deploy

The app is fully static, so it runs on Vercel or any Next.js host. Camera access needs HTTPS, which Vercel gives you by default.

## Project layout

- `app/` holds the page, layout, and styles.
- `components/` holds the screens: `Intro`, `Lobby`, `Booth`, `Result`.
- `lib/themes.ts` defines the themes. Add your own there.
- `lib/canvas.ts` draws frames, stickers, and the final strip.
- `lib/useRoom.ts` handles the friends room.
- `lib/sound.ts` makes the sound effects with the Web Audio API.
