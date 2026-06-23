# Pokémon Batch Injector

A small .NET console tool that batch‑generates **legal** Pokémon from
[Showdown](https://pokepast.es/syntax) sets and injects them into a save file,
using [PKHeX](https://github.com/kwsch/PKHeX) as the backend and
[Auto Legality Mod](https://github.com/architdate/PKHeX-Plugins) (ALM) for
`ShowdownSet → legal PKM` generation.

> **Only fully legal Pokémon are injected.** Every generated entity is run
> through PKHeX's `LegalityAnalysis` and skipped if it is not 100 % valid.

---

## How it works

For each Showdown set in the input file:

1. **Parse** the set (`PKHeX.Core.ShowdownSet`).
2. **Generate** a `PKM` targeting the loaded save's game/generation via ALM
   (`ITrainerInfo.GetLegalFromSet`). The save is used as the trainer context,
   so the entity is built for that exact game (Scarlet/Violet, Legends Z‑A, …).
3. **Legality check** with `new LegalityAnalysis(pk)`. If `!Valid` → **SKIP**.
4. **Inject** the valid `PKM` into the next free box slot.

The edited save is written to `--out` **only if at least one** Pokémon was
injected. The source save is **never** overwritten.

### Backend APIs used (verified against the pinned versions)

| Purpose | API |
| --- | --- |
| Load save | `SaveUtil.GetVariantSAV(string path)` → `SaveFile?` |
| Parse set | `new ShowdownSet(text)` (implements `IBattleTemplate`) |
| Showdown → legal PKM | `sav.GetLegalFromSet(set)` → `APILegality.AsyncLegalizationResult { Created, Status }` |
| Legality check | `new LegalityAnalysis(pk).Valid` |
| Legality report | `la.Report(verbose: true)` |
| Place in box | `sav.SetBoxSlotAtIndex(pk, box, slot)` / `sav.GetBoxSlotAtIndex` |
| Save to disk | `File.WriteAllBytes(out, sav.Write())` |

---

## Dependencies

- **PKHeX.Core** `24.5.5` (NuGet, by kwsch) — pinned to match ALM.
- **PKHeX.Core.AutoMod** (Auto Legality Mod, by architdate / santacrab2) —
  consumed **from source** as a git submodule under
  [`external/PKHeX-Plugins`](external/PKHeX-Plugins). ALM is not published on
  NuGet, so it is referenced via `ProjectReference`; it brings in
  `PKHeX.Core 24.5.5` transitively.

Target framework: **net8.0** (matches ALM's `Directory.Build.props`).

---

## Build

Requires the **.NET 8 SDK**.

```bash
# 1. Clone with the ALM submodule
git clone <this-repo> AltoTech
cd AltoTech
git submodule update --init --recursive   # fetches external/PKHeX-Plugins

# 2. Build
dotnet build src/PokemonBatchInjector/PokemonBatchInjector.csproj -c Release
```

The output assembly is `pkinject` (e.g.
`src/PokemonBatchInjector/bin/Release/net8.0/pkinject.dll`).

---

## Usage

```bash
dotnet run --project src/PokemonBatchInjector -c Release -- \
  --save  path/to/source.sav \
  --sets  sample/sets.txt \
  --box   0 \
  --out   path/to/output.sav
```

Or run the built DLL directly:

```bash
dotnet src/PokemonBatchInjector/bin/Release/net8.0/pkinject.dll \
  --save source.sav --sets sample/sets.txt --out output.sav
```

### Options

| Flag | Description |
| --- | --- |
| `--save <path>` | Source save file (Scarlet/Violet or Legends Z‑A). **Required.** |
| `--sets <path>` | Text file of Showdown sets, separated by blank lines. **Required.** |
| `--box  <int>`  | Starting box index, 0‑based (default `0`). |
| `--out  <path>` | Output save path. **Required** unless `--dry-run`. Never equal to `--save`. |
| `--dry-run`     | Parse + generate + legality‑check, but **write nothing**. |
| `-h`, `--help`  | Show usage. |

---

## Output

- A **summary table**: `set name | result (INJECTED / FAILED) | box,slot`.
- A **Failure details** section that, for every `FAILED` set, prints the reason
  and — when an entity was generated but rejected — the full
  `LegalityAnalysis.Report(verbose: true)` string so you can fix the set.
- **Box overflow** is handled gracefully: injection spills into the next box,
  and if every box from the start index is full the remaining sets fail cleanly
  (no partial/garbage write).

### Example

```
[info]  Loaded save: SL | OT: TESTER (TID 12345) | boxes: 32 x 30 slots
[info]  Parsed 4 Showdown set(s) from sample/sets.txt

[info]  [INJECTED] Koraidon @ Life Orb -> B1,S1
[info]  [INJECTED] Garchomp @ Rocky Helmet -> B1,S2
...

Summary
================================================
Set                      | Result   | Box,Slot
------------------------------------------------
Koraidon @ Life Orb      | INJECTED | B1,S1
Garchomp @ Rocky Helmet  | INJECTED | B1,S2
------------------------------------------------
Total: 4   Injected: 4   Failed: 0
```

Box/slot in the table are shown **1‑based** (`B1,S1` = box index 0, slot 0).

---

## Sample `sets.txt`

See [`sample/sets.txt`](sample/sets.txt). Sets are separated by **blank lines**:

```
Koraidon @ Life Orb
Ability: Orichalcum Pulse
Tera Type: Fighting
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Collision Course
- Flare Blitz
- Drain Punch
- Swords Dance

Garchomp @ Rocky Helmet
Ability: Rough Skin
Tera Type: Steel
EVs: 252 Atk / 4 Def / 252 Spe
Jolly Nature
- Earthquake
- Dragon Claw
- Stealth Rock
- Spikes
```

> A set is only injected if ALM can build it **and** PKHeX deems it fully legal
> for the loaded save's game. A set for a species/form that doesn't exist in
> that game (e.g. a Gen 9 mon targeted at a Gen 5 save) will be reported as
> `FAILED`.

---

## Project layout

```
src/PokemonBatchInjector/
  Program.cs            # entry point, orchestration, summary + report output
  CliOptions.cs         # argument parsing / validation
  ShowdownSetFile.cs    # split file on blank lines -> ShowdownSet list
  Injector.cs           # per-set pipeline + box-slot cursor (overflow logic)
external/PKHeX-Plugins/  # Auto Legality Mod (git submodule)
sample/sets.txt          # example input
```

---

## Notes & caveats

- Injection legality is **non‑negotiable**: anything PKHeX flags is skipped.
- The source save is never modified on disk; `--out` must differ from `--save`.
- ALM legalization has a per‑set timeout; pathological sets surface as `FAILED`
  rather than hanging the batch.
