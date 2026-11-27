# KataGo measuring tools

**Never part of the app.** These programs run only on a developer's or cloud computer, to measure Go Coach's computer and (later) to build and grade problems. Go Coach itself stays free of neural networks; only results (measurements, problems, difficulty levels) go into the app. The folder is listed in `.vercelignore`, so it is never published.

## KataGo
In cloud sessions on the **go-coach** environment, its setup script installs KataGo 1.15.3 (CPU version), the human-style model `b18c384nbt-humanv0.bin.gz` and two older libraries it needs into `/opt/katago`. Elsewhere, set `KATAGO_DIR` to a folder holding the same files (and a `lib` folder with `libzip.so.5` and `libssl.so.1.1`/`libcrypto.so.1.1` on Linux).

## match.js
Plays one game: Go Coach's computer (engine.js) against KataGo imitating a human rank (its human-style model, `rank_20k` to `rank_1k`).

    node tools/katago/match.js <easy|medium|hard> <rank e.g. 15k> <b|w: Go Coach's colour> <handicap> <size>

Prints one line of JSON. Settings: area scoring, simple ko, no extra handicap points, komi as Go Coach uses it (6.5 even, 0.5 with handicap). KataGo runs with light search (8 visits, one symmetry) to be fast enough without a graphics card; its moves still come from the human-style model. About 1 to 4 minutes per 9×9 game.

To run many games, three at a time (a four-core computer), from a list with one game per line:

    xargs -P3 -L1 sh -c 'node tools/katago/match.js "$0" "$1" "$2" "$3" "$4" >> results.jsonl' < jobs.txt

## summarise.js
    node tools/katago/summarise.js tools/katago/results/<file>.jsonl

## results/
Raw results, one game per line. What they mean is written up in `docs/decisions.md` (Engine).

## On the laptop (27 Nov 2026)
KataGo v1.18.1 (OpenCL build, runs on the Intel Arc graphics), the b11c768 transformer net and the human-style model are in tools/katago/bin (ignored by git, never published). On this laptop KataGo needs -override-config homeDataDir=<tools/katago/bin/data> or it cannot create its tuning folder. The first run tunes the graphics for several minutes.
