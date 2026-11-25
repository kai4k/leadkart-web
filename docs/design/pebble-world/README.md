# Pebble World: visual reference

`reference.html` is the approved visual reference for the LeadKart design system: Pebble World v8, tab
"world". The owner approved it on 2026-11-25. Open it in a browser; it is one self-contained file.

It is a reference, not code. Nothing imports it and it is not part of the build. The tokens in
`src/styles/` and the catalogue at `/styleguide` are the implementation; when they disagree with this
page, this page is the spec to match (see `docs/superpowers/specs/` for the written rules).

## Rebuild

From the repo root:

```
node .superpowers/brainstorm/universe-src/build.mjs --only=world --out=docs/design/pebble-world/reference.html
```

The file is generated, so it is listed in `.prettierignore` and is never edited or formatted by hand.
