# Gobliins 2 — DOS floppy browser test

A separate mobile-friendly test player for **Gobliins 2: The Prince Buffoon (English US, floppy v1.03)**. This does not change or deploy to either Goblins 3 website.

Import your legally acquired, assembled game files as a ZIP or folder. No proprietary game data, floppy images, prepared ZIP, or saves are distributed in this repository or uploaded by the importer. This first test validates the three STK archives against the tested release. It does not yet support CD releases or raw 7z/disk images.

## Run locally

With Node 22 or newer: `npm install`, `npm run build`, `npm test`, then `npm run dev`. Open the printed local URL. GitHub Pages serves the checked-in `docs/` folder on `main`.

## Controls and storage

- Drag to move the pointer; tap to left-click; two-finger tap to right-click. Uses ScummVM's native mouse touch mode, not a gamepad.
- Move the pointer to the top edge for the game menu and saves. Mouse/keyboard are also supported.
- Safari Add to Home Screen + landscape is the recommended iPhone display mode. Tap Sound to resume audio after an interruption.
- Local game database: `goblins2-floppy-library`. ScummVM HOME and IDBFS save mount: `/home/goblins2-floppy`. Both are isolated from the Goblins 3 player, including on the shared GitHub Pages origin.
- No service worker is installed. Offline startup is not guaranteed. Browser storage can be evicted; private browsing is not persistent.

## Engine and licensing

ScummVM is GPL-licensed; see `COPYING`. The exact tested JavaScript/WebAssembly pair is bundled under `docs/engine/7eeac96190be191e/`, together with `BUILD.txt`, the source revision, build recipe and `SOURCE.patch`. The proven iOS audio queue and timer-service fix from the separate Goblins 3 audio test are retained without rebuilding or changing the engine. Web MIDI hardware is not needed; floppy music uses software AdLib.

The frontend is GPL-3.0-or-later. fflate is MIT-licensed; its license ships alongside the vendored module. `docs/data/` contains ScummVM's runtime support assets, not commercial Gobliins game data. Art and game trademarks belong to their respective owners. This is an independent fan project, not an official release.

Game data layout/detection reference: https://github.com/scummvm/scummvm/blob/master/engines/gob/detection/tables_gob2.h
