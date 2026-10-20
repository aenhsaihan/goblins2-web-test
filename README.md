# Gobliins 2 — Floppy & CD browser player

A mobile-friendly launcher for **Gobliins 2: The Prince Buffoon**, with the iPhone-tested English US floppy v1.03 and CD v1.000 editions. This does not change or deploy to either Goblins 3 website or the separate CD test address.

Choose Floppy or CD, then import your legally acquired prepared ZIP or extracted folder if it is not already present. No proprietary game data, disc images, prepared ZIPs, audio tracks or saves are distributed or uploaded. Each importer validates its tested release. Raw disc bundles and FLAC need preparation first.

Selecting an edition does not close the running game. Starting/restarting asks for confirmation if a game is running; Return to game resumes it without restarting. Save before switching editions. Each library is checked independently; one unavailable edition cannot block the other. Last choice is remembered when browser preferences are available, with floppy as the default.

## Run locally

With Node 22 or newer: `npm install`, `npm run build`, `npm test`, then `npm run dev`. Open the printed local URL. GitHub Pages serves the checked-in `docs/` folder on `main`.

## Controls and storage

- Drag to move the pointer; tap to left-click; two-finger tap to right-click. Uses ScummVM's native mouse touch mode, not a gamepad.
- Move the pointer to the top edge, then use the floppy-disk icon for Save/Load. The Keyboard button opens ScummVM's virtual keyboard for save names. Mouse/keyboard are also supported.
- Safari Add to Home Screen + landscape is the recommended iPhone display mode. Tap Sound to resume audio after an interruption.
- Existing floppy database `goblins2-floppy-library` and HOME/IDBFS/save mount `/home/goblins2-floppy` are unchanged. CD reuses `goblins2-cd-library` and `/home/goblins2-cd` from the tested CD player. No save migration, replacement, conversion or cross-edition copying is performed. Browser contexts that already have the CD library can use it directly. The original CD test address remains available if an existing app's storage is not visible in another browser context; do not clear its data.
- No service worker is installed. Offline startup is not guaranteed. Browser storage can be evicted; private browsing is not persistent.

## Engine and licensing

ScummVM is GPL-licensed; see `COPYING`. The exact tested JavaScript/WebAssembly pair is bundled under `docs/engine/7eeac96190be191e/`, together with `BUILD.txt`, the source revision, build recipe and `SOURCE.patch`. The proven iOS audio queue and timer-service fix from the separate Goblins 3 audio test are retained without rebuilding or changing the engine. Web MIDI hardware is not needed; floppy music uses software AdLib.

The floppy player/importer sources remain byte-identical to the tested baseline. The CD player/importer are byte-identical snapshots from the tested CD repository at 6beac6f, with runtime support and engine assets under `docs/cd/`. This avoids changing the floppy support catalog or its cached assets. Both engine pairs are identical to the proven audio-fixed binary; there is no new compilation or timing/audio tuning.

The frontend is GPL-3.0-or-later. fflate is MIT-licensed; its license ships alongside the vendored module. `docs/data/` and `docs/cd/data/` contain ScummVM runtime support assets, not commercial Gobliins game data. Art and game trademarks belong to their respective owners. This is an independent fan project, not an official release.

Game data layout/detection reference: https://github.com/scummvm/scummvm/blob/master/engines/gob/detection/tables_gob2.h
