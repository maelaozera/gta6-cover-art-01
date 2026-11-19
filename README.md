# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/maelaozera/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/maelaozera/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your own photos into a Vice City-style multi-panel cover, right in the
browser — offline, no upload, no watermark. **Vice Coast Cover Studio** is a
single-page web app for the make.fun bounty `gta6-cover-art-01`.

## What it does

- **5 cover layouts** — 9-panel grid (3×3), Hero + 3, 4-panel, full-bleed, and
  tilted polaroid snapshots. Switch from the editor in one click.
- **Any photo, per panel** — upload many photos (file picker or drag-and-drop),
  fill several panels from one photo or from different photos, and crop each
  panel by dragging the photo inside it or with the zoom slider / mouse wheel.
  Two sample photos (boulevard, pier) load with one click.
- **5 gradient-map colour grades** — Sunset, Neon, Vice, Dusk, Mono — with an
  intensity slider, plus film grain, vignette, halftone dots and ink panel
  borders for the printed-poster look.
- **Genre lettering** — a big Anton title with outline and gradient fill, a
  Pacifico script subtitle, an editable badge ribbon and a 5-star heat meter.
  Both fonts are vendored under `app/fonts/` under the SIL Open Font License.
  Everything is original work: no Rockstar logo, artwork or font.
- **One-click PNG export** — 1080×1080, 1080×1350, 1920×1080 and 1080×1920
  (story), each saved with a clear file name.
- **Polish** — live preview canvas, undo/redo (Ctrl+Z / Ctrl+Y), a randomize
  button, and a clean two-column editor (controls left, preview right).

## Run it

```sh
node serve.ts
```

Then open http://127.0.0.1:8080/ in a desktop browser. No build step, no
network request while it runs — every script, font and sample photo is a file
under `app/`.

## Screenshot scenes

The app supports `?shot=` scenes for screenshots: `?shot=cover` (landscape
cover, full-frame), `?shot=editor` (editor with the sample photos loaded),
`?shot=portrait` (1080×1350 cover) and `?shot=square` (1080×1080 cover).
`?photo=` picks the sample photo and `?caption=` the title.

## Hand in

```sh
MAKEFUN_OUTPUT_DIR=/tmp/gta6-cover-out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

## Referral

make.fun referral code: **02gvsh14**

## License

MIT — see [LICENSE](LICENSE). Fonts under `app/fonts/` are licensed under the
SIL Open Font License 1.1 (see `app/fonts/OFL.txt`).
