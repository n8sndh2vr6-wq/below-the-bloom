# Below the Bloom

The official wiki for **Below the Bloom** — a cinematic sci-fi survival story
about Oyster, a stranded sixteen-year-old, and Chip, his sarcastic AI companion,
descending through a classified alien ocean after a violet electromagnetic event
drops their research vessel into it.

**You only ever edit two things: Markdown files, and images.** Everything else is
generated.

---

## The three rules

Every file in `content/` works the same way.

**1. A header at the top, between two `---` lines.**

```
---
title: Oyster
role: Survivor, sixteen
---
```

**2. A blank line between every block.** That is how the site knows where one
paragraph, line of dialogue or picture ends and the next begins.

**3. To place a picture, write `IMAGE:` and the name of the file.**

```
IMAGE: froststalker-king
IMAGE: froststalker-king | He finds his children alive
```

The name is just the filename without `.jpg`. Put the picture anywhere under
`assets/img/` and it will be found. Anything after the `|` becomes the caption.
If the picture is not there yet, the page shows a labelled gap instead of
breaking.

---

## Writing a scene

`content/scripts/chapter-1/scene-12.md`

```
---
title: Deep Cavern Chamber
scene: INT. FROSTSTALKER KINGDOM – DEEP CAVERN CHAMBER – NIGHT
act: frost
number: 12
summary: The King finds his cubs alive behind two strangers.
---

Silence settles over the room. Then—

SOUND: ROARS. Deep, thunderous, echoing.

CHIP (tight whisper): Uh… Oyster, I think we woke something up.

Heavy steps echo as the Froststalker King bursts through the tunnel.

IMAGE: froststalker-king | He finds his children alive

KING FROSTSTALKER: You… you saved them.

FADE OUT
```

That is the whole format:

| Write this | You get |
| --- | --- |
| `NAME: words` | a line of dialogue |
| `NAME (quietly): words` | dialogue with a direction |
| `SOUND: THUMP.` | a sound effect |
| `SCENE: INT. CAVE – NIGHT` | a heading inside the scene |
| `IMAGE: slug \| caption` | a picture |
| `- something` | a montage beat |
| `FADE OUT` | a transition |
| anything else | action |

One line per line of dialogue — no indenting, no guessing. The site lays it out
as a proper screenplay when it renders.

`act:` must be one of the acts listed in
`content/scripts/chapter-1/_index.md`.

---

## Writing an article

`content/characters/oyster.md`

```
---
title: Oyster
role: Survivor, sixteen
order: 1
image: oyster
tags: Human, Chapter One
aliases: OYSTER
kills: 7
---

Ordinary Markdown from here down.

## A heading

> A quote from the script.

IMAGE: oyster-hand | The prosthetic, moments after it syncs
```

Header fields, all optional except `title`:

| Field | Does what |
| --- | --- |
| `role` | the line under the name |
| `order` | position in its index |
| `image` | the picture, by name |
| `tags` | the little pills under the title |
| `aliases` | names to search the scripts for, for the Appearances dial |
| `kills` | the Kills dial (characters) |
| `depth` | how deep it sits, 0–10 (creatures, locations) |
| `scenes` | which scenes it appears in (locations) |

To link somewhere else in the wiki, use its address:

```markdown
[Scene 12](#/story/chapter-1/scene-12)
[The Maw King](#/characters/maw-king)
[Purple Paradise](#/locations/purple-paradise)
```

Links are two-way: anything you link to grows a **Referenced by** list pointing
back at you.

---

## After you edit

```sh
node tools/build.mjs
```

That reads every file, works out the dial readings, finds the cross-references,
maps the pictures, and writes `content/index.json`. It also lists any picture a
page is expecting but has not got.

Run it after adding or renaming a file, or after dropping in a picture. Editing
words inside a file that already exists does not need it.

---

## Adding a picture

Drop the file into `assets/img/`, run the build, done. These are the names the
pages are already waiting for:

```
assets/img/characters/  oyster · chip · froststalker-king · maw-king
                        emergent-king · deadwake-queen · the-bloom
                        squid · lena-voss · mariq-levi
assets/img/creatures/   froststalkers · maws · emergents · deadwakes
```

Portraits read best around 1200 × 1600 (3:4); pictures inside an article suit
16:10. `.webp`, `.jpg`, `.png` and `.avif` all work.

---

## Layout

```text
index.html                    the shell, icon sprite and splash
assets/css/styles.css         all styling
assets/css/fonts.css          self-hosted @font-face rules
assets/fonts/                 Cinzel, Cormorant Garamond, Courier Prime
assets/img/                   key art, characters, creatures
assets/js/app.js              routing, dials, views
assets/js/markdown.js         Markdown → HTML
assets/js/script.js           scene files → screenplay
content/index.json            generated — do not edit
content/*/_index.md           one per section: its name, colour, icon, order
content/lore|characters|creatures|locations/
content/scripts/chapter-1/    the screenplay, one file per scene
tools/build.mjs               the build
```

## Reading it locally

```sh
python3 -m http.server 8000
```

Then open the address it prints. Opening `index.html` off the disk will not
work — browsers block a page from reading its neighbouring files that way.

## Credits

Type is [Cinzel](https://fonts.google.com/specimen/Cinzel),
[Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and
[Courier Prime](https://fonts.google.com/specimen/Courier+Prime), all under the
SIL Open Font License 1.1 and served from `assets/fonts/`. Interface icons are
[Lucide](https://lucide.dev) (ISC), inlined as a sprite in `index.html`.
