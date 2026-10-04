# Real-person visual policy

Applies to Winter Sports Hub production UI, editorial cards, article images, stage graphics and athlete scenes.

## Identity rule

A real named person is shown only through a real source photograph or user-owned/reference asset whose publication rights are established. The production UI must not replace a missing photo with an AI-generated lookalike, reconstructed face, synthetic “same person” portrait or face swap.

When a source photograph is used, facial geometry, eyes, eyebrows, nose, lips, skin, hairline, expression, race equipment and visible uniform are source content. We may resize the whole image, encode it to a web format, crop responsively, place non-destructive layout overlays above it and add typography around it. We do not retouch the face, repaint equipment, remove sponsor marks, fabricate a different body, or claim a generated composite is the photograph.

No AI upscaling is used to make a low-resolution identity source look high-resolution. If the only rights-cleared source is small, the layout keeps the photograph within its intrinsic dimensions and relies on typography/graphics for scale.

## Provenance

Every public named-person photograph has:
- stable source/original URL;
- author/credit and reuse licence or explicit project-owned rights;
- source dimensions and cryptographic source hash;
- a visible path to attribution/licensing information;
- a note describing the derivative processing.

If provenance is incomplete, production uses a non-person graphic fallback, not a guessed face. User-provided references can guide identity review but are not published merely because they were uploaded.

## Cards and articles

Cards may reuse an already reviewed photograph only when the first named subject of the article matches that photo registry key. The crop can change by viewport; the image itself receives no CSS filter or transform. A visible card caption links to /photo-credits.

Multi-person or unsupported stories keep the existing metric/typographic visual rather than selecting an unrelated face.

## Generation

Image generation may be used for non-person backgrounds, abstract winter graphics, maps or decorative objects. It must not be used to produce the face/body of a real athlete for production when the output could be interpreted as that athlete.

## Review gates

Tests must fail if a person photo comes from an external runtime URL, lacks a reviewed registry entry, is larger than its original source dimensions, receives a visual filter/transform, or loses its attribution path. Current application and database write permissions are separate from image rights and must not be broadened to implement visual features.
