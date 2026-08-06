# Below the Bloom

The official wiki for **Below the Bloom** — a cinematic sci-fi survival story
about Oyster, a stranded sixteen-year-old, and Chip, his sarcastic AI companion,
descending through a classified alien ocean after a violet electromagnetic event
drops their research vessel into it.

This repository *is* the wiki. Every page is rendered at request time from the
Markdown and screenplay files kept here, so editing a file edits the site.

## Layout

```text
.
├── index.html                  # shell, icon sprite, drawer
├── assets/
│   ├── css/
│   │   ├── fonts.css           # self-hosted @font-face rules
│   │   └── styles.css          # everything else
│   ├── fonts/                  # Cinzel, Cormorant Garamond, Courier Prime
│   ├── img/
│   │   ├── hero-abyss.jpg      # key art (carries the wordmark)
│   │   ├── characters/         # one plate per character
│   │   └── creatures/          # one plate per species
│   └── js/
│       ├── app.js              # routing, loading, views
│       ├── markdown.js         # Markdown → HTML
│       └── screenplay.js       # screenplay text → formatted HTML
├── content/
│   ├── manifest.json           # the table of contents
│   ├── lore/                   # Lore & Canon
│   ├── characters/             # Characters
│   ├── creatures/              # Creatures & Species
│   └── locations/              # Worlds & Locations
└── scripts/
    └── chapter-1/              # the screenplay, one file per scene
```

## Adding an image

Drop the file in and it appears — no code change. Entries already point at the
path they expect:

| Entry | Expected file |
| --- | --- |
| Oyster | `assets/img/characters/oyster.jpg` |
| Chip | `assets/img/characters/chip.jpg` |
| The Froststalker King | `assets/img/characters/froststalker-king.jpg` |
| The Maw King | `assets/img/characters/maw-king.jpg` |
| The Emergent King | `assets/img/characters/emergent-king.jpg` |
| The Deadwake Queen | `assets/img/characters/deadwake-queen.jpg` |
| The Bloom | `assets/img/characters/the-bloom.jpg` |
| Squid | `assets/img/characters/squid.jpg` |
| Dr. Lena Voss | `assets/img/characters/lena-voss.jpg` |
| Mariq Levi | `assets/img/characters/mariq-levi.jpg` |
| Froststalkers | `assets/img/creatures/froststalkers.jpg` |
| Maws | `assets/img/creatures/maws.jpg` |
| Emergents | `assets/img/creatures/emergents.jpg` |
| Deadwakes | `assets/img/creatures/deadwakes.jpg` |

Portraits read best around **1200 × 1600** (3:4). Until a file exists the frame
shows a sigil instead of a broken image, and the Gallery lists whatever is
present.

Any other entry can take a picture too — add an `"image"` key to it in
`content/manifest.json` and put the file where it points. Locations have none
yet, which is why that index is a text list.

## Writing

### A scene

Open the matching file in `scripts/chapter-1/` and write plain screenplay text:

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

### An article

Articles are Markdown. Headings, lists, tables, quotes, bold, italics and links
all work. To link somewhere else in the wiki, use its route:

```markdown
[Scene 12](#/story/chapter-1/scene-12)
[The Maw King](#/characters/maw-king)
[Purple Paradise](#/locations/purple-paradise)
```

### A new page

`content/manifest.json` is the table of contents — the site reads it to build
every menu, index and search result. Add the file, then add its entry to the
matching section's `entries` array:

```json
{ "slug": "the-crown", "name": "The Crown",
  "role": "One line shown under the name",
  "image": "assets/img/characters/the-crown.jpg",
  "tags": ["Artefact"],
  "file": "content/lore/the-crown.md" }
```

`image` and `tags` are optional. Scenes go in the chapter's `scenes` array with
a number, slug, act, path, title, location and synopsis — keep it in order.

## Reading it locally

Run any static server from this folder and open the address it prints:

```sh
python3 -m http.server 8000
```

Opening `index.html` straight off the disk will not work — browsers block a page
from reading its neighbouring files that way.

## Credits

Type is [Cinzel](https://fonts.google.com/specimen/Cinzel),
[Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and
[Courier Prime](https://fonts.google.com/specimen/Courier+Prime), all under the
SIL Open Font License 1.1 and served from `assets/fonts/`. Interface icons are
[Lucide](https://lucide.dev) (ISC), inlined as a sprite in `index.html`.
