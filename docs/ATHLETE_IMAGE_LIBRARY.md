# Winter Sports Hub — Athlete Image Library

Version: 1.0 · 2026-10-04

## Purpose
Build and maintain a persistent library of real athlete photographs for Winter Sports Hub. The library is used for homepage heroes, article/stage cards, subtle background layers, historical stories and editorial graphics.

Target: ~200 priority athletes, with at least one reviewed real photograph per athlete. The seed roster is split into current international cross-country (25 men + 25 women), current Russian cross-country (25 + 25), current international biathlon (20 + 20), current Russian biathlon (20 + 20), and 20 historical stars.

## Non-negotiable identity rule
1. A named real athlete must be represented by a real source photograph. Do not publish an AI-generated lookalike, reconstructed face, face swap or a synthetic body presented as the athlete.
2. Preserve the source face and identity. No reshaping of eyes, nose, mouth, skin, hairline, age, body, uniform, skis, rifle or sponsor marks.
3. Allowed: whole-image resize/re-encode, responsive crop, opacity, masks, gradients, shadows, blur applied to the background layer as a whole, duotone/monochrome treatment that does not alter identity, and typography placed around/over the image.
4. Never AI-upscale a low-resolution identity image into a fake high-resolution portrait. If the source is small, keep it small and use typography/graphics for scale.
5. Generated imagery is allowed only for non-person decorative backgrounds, snow, abstract shapes, maps or objects. It must not create/replace the face/body of a real named athlete.

## Rights and provenance
The user's permission to build the library does not replace copyright permission from a photographer/rightsholder. For public website use, only one of these is accepted:
- CC BY / CC BY-SA / CC0 / Public Domain with source and author metadata;
- official federation/athlete/media-kit asset whose terms explicitly allow editorial reuse;
- project-owned/user-owned photo with clear permission.

If a photo is useful as a reference but public reuse rights are unclear, store only its URL/metadata in `90_PENDING_RIGHTS`; do not copy it into the public website asset bundle and do not treat it as deployable.

## Source priority
1. Wikimedia Commons with explicit licence.
2. Official federation or event media kits with explicit reuse terms.
3. Athlete/photographer-provided images with permission.
4. Other internet images only as research references; not deployable until rights are resolved.

Official ranking sources define the priority roster. FIS/IBU standings and FLGR/SBR rankings outrank social/media popularity. Historical stars are selected by major World Cup/Olympic/World Championship achievements.

## Folder structure in ChatGPT Library
`/Зимний спорт/Athlete Media Library/`
- `00_INSTRUCTIONS/` — this document.
- `01_XC_RUSSIA/`
- `02_XC_WORLD/`
- `03_BIATHLON_RUSSIA/`
- `04_BIATHLON_WORLD/`
- `05_LEGENDS/`
- `80_IDENTITY_REVIEW/` — rights-cleared candidate bytes waiting for visual identity confirmation; never deploy directly.
- `90_PENDING_RIGHTS/` — URL/metadata only when reuse is unclear.
- `99_MANIFEST/` — roster, provenance and review status.

## File naming
Deployable source photo:
`{sport}_{scope}_{sex}_{slug}_{year}_{source}.{ext}`
Example: `xc_world_m_klaebo-johannes_2019_commons.jpg`.

Do not rename a file in a way that implies a wrong athlete or date.

## Required metadata per photo
- athlete_id / canonical name;
- sport, sex, current/legend, Russia/world;
- source page URL and direct original URL;
- photographer/author;
- licence name and licence URL;
- original width/height;
- capture date/event when known;
- SHA-256 of source bytes when copied;
- review state: `candidate`, `identity_reviewed`, `rights_reviewed`, `deployable`, `rejected`;
- notes about crop/derivative processing.

A file cannot be `deployable` unless both identity and rights are reviewed.

## Visual selection
Prefer, in order:
1. action photo with visible face and authentic competition equipment;
2. podium/finish/emotion photo;
3. clean portrait from competition venue;
4. only if necessary, a small archival portrait used at intrinsic size.

For homepage/background use prefer >=1600 px on the long side. For cards prefer >=800 px. Smaller originals may still be archived but must not be enlarged above source dimensions.

## Website usage
- Homepage hero: real photo layers only; large typography, dark navy masks/gradients and responsive crops are allowed.
- Article cards: if a reviewed photo exists for the primary athlete, use it with visible credit path. If not, keep a typographic/metric card; never invent a face.
- Long-form articles: use 1–3 relevant source photos with credits, not decorative unrelated athletes.
- Backgrounds: opacity/masks are allowed; preserve face and equipment. Avoid placing text across the eyes/face where possible.
- Historical pages: label archival date/context so an old photo is not mistaken for 2026/27 participation.

## Collection workflow
1. Refresh priority roster from official standings/rankings.
2. Search approved/reviewable sources by canonical and transliterated names.
3. Record candidates and licence metadata before downloading.
4. Download rights-cleared but not-yet-identified candidate bytes only into `80_IDENTITY_REVIEW`; never into public website assets.
5. Verify visually that the image is actually the named athlete. After identity review, move it to the appropriate sport folder.
6. Verify byte hash, dimensions and licence.
7. Mark deployable and create web derivatives without enlarging the source.
8. Add visible attribution route on the site.
9. Run mobile/desktop visual QA and regression tests before merge/deploy.

## Current ranking anchors for this roster
- FIS Cross-Country 2025/26 final overall standings (men/women).
- FLGR Cup of Russia 2026 / FLGR rating 2025/26.
- IBU World Cup 2025/26 final Total Score.
- SBR Technonicol Rating 2025/26 final men/women.

The roster file stores which entries are exact ranking selections versus a curated elite/historical pool. Do not silently label a curated entry as an exact rank.

## Maintenance
- Review the roster before each winter season and after major retirements/returns.
- Keep historical stars even after retirement, but move them to `05_LEGENDS`.
- Do not delete an older licensed photo merely because a newer one appears; keep the best source and provenance history.
- If rights change or provenance becomes uncertain, remove it from deployable assets first and keep only metadata pending review.
