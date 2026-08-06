# Below the Bloom

The archive for **Below the Bloom** — a cinematic sci-fi survival story about
Oyster, a stranded sixteen-year-old, and Chip, his sarcastic AI companion,
descending through a classified alien ocean after a violet electromagnetic
event drops their research vessel into it.

This repository *is* the wiki. Every page on the site is rendered at runtime
from the Markdown and script files kept here, so editing a file edits the site.

## What lives where

```text
.
├── index.html                  # the archive shell
├── assets/
│   ├── css/styles.css          # all styling
│   └── js/
│       ├── app.js              # routing, loading, views
│       ├── markdown.js         # Markdown → HTML
│       └── screenplay.js       # script text → formatted screenplay
├── content/
│   ├── manifest.json           # the site's table of contents
│   └── wiki/*.md               # wiki entries
└── scripts/
    └── chapter-1/*.md          # the screenplay, one file per scene
```

## Writing

### Editing a scene

Open the matching file in `scripts/chapter-1/` and write plain screenplay text.
The renderer understands the standard shape:

```text
INT. FROSTSTALKER CAVE – CONTINUOUS        ← slugline (first line of the file)

Blue light moves across the ice.           ← action

OYSTER                                     ← character cue
(quietly)                                  ← parenthetical
We're not turning back.                    ← dialogue

THUMP.                                     ← sound
FADE OUT.                                  ← transition
```

Blank lines separate blocks. Nothing else is required.

### Editing a wiki page

Wiki entries are Markdown files in `content/wiki/` that open with a short
header:

```markdown
---
title: Characters
glyph: 👤
summary: Oyster, Chip, and the god at the bottom.
---

# Characters
…
```

Headings, lists, tables, quotes, bold, italics and links all work. To link to a
scene from anywhere, use its route: `[Scene 12](#/script/chapter-1/scene-12)`.
To link to another wiki page: `[Locations](#/wiki/locations)`.

### Adding a page or a scene

`content/manifest.json` is the table of contents — the site reads it to build
every menu, index and search result.

To add a **wiki page**, drop the Markdown file in `content/wiki/` and add an
entry to the `wiki` array:

```json
{ "slug": "vehicles", "file": "content/wiki/vehicles.md",
  "title": "Vehicles", "glyph": "🚀", "summary": "One sentence." }
```

To add a **scene**, drop the file in `scripts/chapter-1/` and add an entry to
that chapter's `scenes` array, with its number, slug, arc, path, title,
location and a one-line synopsis. Keep the array in scene order.

## Reading it locally

Open a terminal in this folder and run any static server, then visit the
address it prints:

```sh
python3 -m http.server 8000
```

(Opening `index.html` straight off the disk won't work — browsers block a page
from reading its own neighbouring files that way.)
