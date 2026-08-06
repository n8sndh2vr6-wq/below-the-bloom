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
| `KILL: Oyster > Maw \| how` | records a death — see below |
| `SCENE: INT. CAVE – NIGHT` | a heading inside the scene |
| `IMAGE: slug \| caption` | a picture |
| `- something` | a montage beat |
| `FADE OUT` | a transition |
| anything else | action |

One line per line of dialogue — no indenting, no guessing. The site lays it out
as a proper screenplay when it renders.

`act:` must be one of the acts listed in
`content/scripts/chapter-1/_index.md`. `place:` is the name of a file in
`content/locations/`, and is what fills in that location's Scenes dial.

### Recording a death

Put a `KILL:` line where it happens. It does **not** appear in the scene — it
is what the Kills dials are counted from.

```
KILL: Oyster > Berserker Froststalker | blade driven up into its throat
KILL: The Froststalker King > Deadwake invaders x3 | ice-covered claws
```

`killer > victim`, then anything after `|` as a note, and `x3` on the end of
the victim if it was more than one. That single line adds to the killer's
**Kills** dial, the victim's species' **Losses** dial, and the scene's
**Deaths** dial — and every one of them links back here.

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
| `home` | the territory a species holds — it inherits that place's depth |
| `depth` | how deep a location sits, 0 (orbit) to 10 (the castle floor) |

To link somewhere else in the wiki, use its address:

```markdown
[Scene 12](#/story/chapter-1/scene-12)
[The Maw King](#/characters/maw-king)
[Purple Paradise](#/locations/purple-paradise)
```

Links are two-way: anything you link to grows a **Referenced by** list pointing
back at you.

## The dials

The three gauges at the top of a page are read out of the scripts, never typed
in. Tap one and it opens what the number is made of, with every row a link.

| Dial | Comes from |
| --- | --- |
| Appearances | scenes whose text mentions the `title` or an `alias` |
| Lines | how many `NAME:` lines that character has, scene by scene |
| Kills | `KILL:` lines naming them as the killer |
| Losses | `KILL:` lines naming that species as the victim |
| Scenes / First seen | scenes whose `place:` is that location |
| Depth | the location's `depth`, or for a species its `home`'s depth |
| Deaths | `KILL:` lines in that scene |
| Speakers | distinct `NAME:` cues in that scene |

`depth` is the one number written by hand, because there is nothing in the
scripts to work it out from — it is a fact about the world, and it lives in the
location's own file.

Each needle is scaled against the highest value anything else in its group
reaches, so it reads as standing rather than an arbitrary fraction.

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
