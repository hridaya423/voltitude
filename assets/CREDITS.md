# Asset credits

Every asset below is CC0 1.0 (public domain dedication). No attribution is required; it is given as courtesy. Redistribution inside a game is permitted.

All files were downloaded from Poly Haven (https://polyhaven.com, API https://api.polyhaven.com). License: https://polyhaven.com/license (CC0).

## Sky

Baked by `tools/bake-sky.mjs` from the 8k Poly Haven HDRIs: upper hemisphere, 8192 x 2048, sRGB WebP with a luminance-preserving highlight compression, plus a 256 px PNG used for fog colour and a JSON with the sun direction found in the pixels. The environment for reflections is prefiltered from the WebP at runtime.

| Files | Asset | Author | Source | License |
|---|---|---|---|---|
| `sky/day_sky.webp`, `day_fog.png`, `day_sky.json` | Qwantani Late Afternoon (Pure Sky), 8k HDR | Greg Zaal (photography), Jarod Guest (sky processing) | https://polyhaven.com/a/qwantani_late_afternoon_puresky | CC0 |
| `sky/night_sky.webp`, `night_fog.png`, `night_sky.json` | Qwantani Night (Pure Sky), 8k HDR, a real night capture | Greg Zaal (photography), Jarod Guest (sky processing) | https://polyhaven.com/a/qwantani_night_puresky | CC0 |
| `sky/golden_sky.webp`, `golden_fog.png`, `golden_sky.json` | Kloppenheim 06 (Pure Sky), 8k HDR. Baked, not used by the game yet | Greg Zaal, Jarod Guest | https://polyhaven.com/a/kloppenheim_06_puresky | CC0 |

`sky/env_1k.hdr`, `sky_4k.jpg`, `golden_env_1k.hdr`, `golden_sky_4k.jpg` and `golden_sky_fog.jpg` are the earlier 1k and 4k sky files (Syferfontein 1d Clear and Kloppenheim 06, same authors, CC0). Nothing loads them now.

## Terrain PBR sets (`terrain/<name>/`)

`ground_albedo_2k.webp` is the albedo. `ground_nrm_2k.webp` packs the normal X and Y in red and green and the height in blue. Built by `tools/bake-terrain-textures.mjs` from the 2k maps. Height blending, triplanar rock and macro variation are done in the terrain shader. The scrub cards in `src/render/scrub.js` are drawn procedurally on a canvas, not downloaded.

| Folder | Poly Haven asset | Authors | Source | License |
|---|---|---|---|---|
| `terrain/laterite` | Red Laterite Soil Stones (`red_laterite_soil_stones`) | Amal Kumar | https://polyhaven.com/a/red_laterite_soil_stones | CC0 |
| `terrain/dry_rocks` | Dry Ground Rocks (`dry_ground_rocks`) | Rob Tuytel | https://polyhaven.com/a/dry_ground_rocks | CC0 |
| `terrain/desert_sand` | Gravelly Sand (`gravelly_sand`) | Dario Barresi | https://polyhaven.com/a/gravelly_sand | CC0 |
| `terrain/sandstone_cliff` | Cliff Side (`cliff_side`) | James Ray Cock, Dario Barresi (photography), Jenelle van Heerden (processing) | https://polyhaven.com/a/cliff_side | CC0 |
| `terrain/lakebed` | Mud Cracked Dry 03 (`mud_cracked_dry_03`) | Dimitrios Savva (photography), Dario Barresi (processing) | https://polyhaven.com/a/mud_cracked_dry_03 | CC0 |
| `terrain/runway_asphalt` | Asphalt 01 (`asphalt_01`) | Charlotte Baglioni (photography), Dario Barresi (processing) | https://polyhaven.com/a/asphalt_01 | CC0 |

The `albedo_`, `normal_` and `arm_` files in `desert_sand`, `lakebed` and `sandstone_cliff` are the earlier re-encodes (2k WebP, and a Lanczos 1k copy). Only `runway_asphalt` uses them now.

## Models (`models/`)

Photoscans from the Poly Haven Namaqualand collection. 1k textures, decimated with `@gltf-transform/cli` (`simplify`), textures converted to WebP (`EXT_texture_webp`).

| File | Poly Haven asset | Authors | Source | License |
|---|---|---|---|---|
| `models/desert_boulder_blocky.glb` | Namaqualand Boulder 03 | Dario Barresi (photography), Jenelle van Heerden (modeling) | https://polyhaven.com/a/namaqualand_boulder_03 | CC0 |
| `models/desert_boulder_orange.glb` | Namaqualand Boulder 04 | Jenelle van Heerden | https://polyhaven.com/a/namaqualand_boulder_04 | CC0 |
| `models/desert_boulder_round.glb` | Namaqualand Boulder 05 | Dario Barresi (photography), Jenelle van Heerden (modeling) | https://polyhaven.com/a/namaqualand_boulder_05 | CC0 |
| `models/desert_boulder_brown.glb` | Namaqualand Boulder 06 | Greg Zaal (photography), Jenelle van Heerden (modeling) | https://polyhaven.com/a/namaqualand_boulder_06 | CC0 |
| `models/flora/rooibos.glb`, `rooibos_lod1.glb` | Wild Rooibos Bush (`wild_rooibos_bush`), decimated by `tools/bake-flora.mjs` | James Ray Cock, Jenelle van Heerden | https://polyhaven.com/a/wild_rooibos_bush | CC0 |

## Crowd (`crowd/`)

Baked by `tools/crowd/bake.py` (Blender 5) into vertex animation textures. Licences are CC0 1.0. The pack zips were fetched from the authors' itch.io pages.

| Files | Source | Author | URL | License |
|---|---|---|---|---|
| `crowd/crowd.bin`, `crowd.json`, `vat_pos.bin`, `vat_nrm.bin`, `skin.webp` | Universal Base Characters [Standard]: Superhero Male and Female bodies, hairstyles Hair_Beard, Hair_SimpleParted, Hair_Long, Hair_Buns. Decimated to about 1.5k triangles, 512 px skin atlas. | Quaternius | https://quaternius.itch.io/universal-base-characters | CC0 |
| same | Universal Animation Library [Standard]: `Idle_Loop` motion capture, baked as the idle | Quaternius | https://quaternius.itch.io/universal-animation-library | CC0 |
| same | Universal Animation Library 2 [Standard]: `Idle_FoldArms_Loop` motion capture, baked as the folded-arms idle | Quaternius | https://quaternius.itch.io/universal-animation-library-2 | CC0 |

The cheer, clap, phone-filming, flag-wave and gasp animations are keyed procedurally in `tools/crowd/bake.py` (bone aim poses on the same rig). They are not motion capture. The phone, flag pole and flag cloth are modelled in the same script.

## Audio (`audio/`)

Sound sources, authors and licences are listed in [`audio/CREDITS.md`](audio/CREDITS.md). Crowd recordings added for the broadcast layer (all Freesound, CC0): 480765 craigsmith, 267246 BerlinGameScene, 651645 Krizin, 130568 benfree, 324895 deleted_user_2104797, 439258 dreamstobecome, 777709 Sadiquecat. Team radio lines are macOS `say` (Daniel, en_GB) processed offline; start-light tones are synthesised.

## Type and mark

Archivo (Omnibus-Type) and Martian Mono (Evil Martians) are self-hosted in `fonts/` (latin subsets of the variable files from Google Fonts). Both are under the SIL Open Font License 1.1. The mark (`mark.svg`, `icon.svg`, `src/mark.js`) is drawn for this project.
