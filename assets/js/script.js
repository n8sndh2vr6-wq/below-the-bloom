/*
 * script.js — renders a scene file.
 *
 * The format is deliberately small. Blocks are separated by blank lines, and
 * a block is whichever of these it looks like:
 *
 *   NAME: line                  dialogue
 *   NAME (quietly): line        dialogue with a direction
 *   SOUND: THUMP.               a sound
 *   KILL: Oyster > Maw | note   a record — never shown (see directives.js)
 *   SCENE: INT. CAVE – NIGHT    a heading inside the scene
 *   IMAGE: froststalker-king    a picture, optional  | caption
 *   - beat                      a montage beat
 *   FADE OUT                    a transition
 *   anything else               action
 *
 * There is no guessing: every block is decided by its first characters.
 */

import { escapeHtml, renderImage } from './markdown.js';
import { directiveOf } from './directives.js';

const DIALOGUE = /^([A-Z][A-Z0-9 .'’\-]{0,30}?)(?:\s*\(([^)]*)\))?:\s+(\S[\s\S]*)$/;
const BEAT = /^-\s+(.*)$/;
const TRANSITION = /^(FADE IN|FADE OUT|FADE TO BLACK|CUT TO|CUT TO BLACK|SMASH CUT|DISSOLVE TO|MATCH CUT|THE END)\b/i;

/** Shouts and sound words inside action lines get lit up. */
function action(text) {
  return escapeHtml(text).replace(/\b([A-Z][A-Z'’]{2,})\b/g, '<b class="cap">$1</b>');
}

function blocks(body) {
  return body
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/**
 * Render a scene body.
 * Returns `{ html, cast }` — cast feeds the "who is in this" chips.
 */
export function renderScene(body, images = {}) {
  const out = [];
  const cast = [];

  for (const block of blocks(body)) {
    // Reserved tags are handled before anything else, so a record like KILL:
    // can never fall through and be printed as action.
    const directive = directiveOf(block);
    if (directive) {
      const { kind, value } = directive;
      if (kind === 'record') continue;
      if (kind === 'sound') out.push(`<p class="sp-sound">${escapeHtml(value)}</p>`);
      else if (kind === 'slug') out.push(`<p class="sp-slug">${escapeHtml(value)}</p>`);
      else out.push(renderImage(value, images));
      continue;
    }

    if (TRANSITION.test(block) && !block.includes('\n')) {
      out.push(`<p class="sp-transition">${escapeHtml(block)}</p>`);
      continue;
    }

    const lines = block.split('\n');
    if (lines.every((line) => BEAT.test(line.trim()))) {
      const items = lines.map((line) => `<li>${action(BEAT.exec(line.trim())[1])}</li>`).join('');
      out.push(`<ul class="sp-beats">${items}</ul>`);
      continue;
    }

    const speech = DIALOGUE.exec(block);
    if (speech) {
      const [, name, direction, said] = speech;
      if (!cast.includes(name)) cast.push(name);
      out.push(
        `<div class="sp-dialogue">`
        + `<p class="sp-cue">${escapeHtml(name)}</p>`
        + (direction ? `<p class="sp-paren">(${escapeHtml(direction)})</p>` : '')
        + `<p class="sp-line">${escapeHtml(said.replace(/\s*\n\s*/g, ' '))}</p>`
        + `</div>`,
      );
      continue;
    }

    for (const line of lines) out.push(`<p class="sp-action">${action(line.trim())}</p>`);
  }

  return { html: out.join('\n'), cast };
}
