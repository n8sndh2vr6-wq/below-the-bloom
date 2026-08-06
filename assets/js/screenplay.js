/*
 * screenplay.js — turns the raw script files in scripts/ into structured HTML.
 *
 * The sources are plain screenplay text, not Markdown, so they get their own
 * parser: sluglines, character cues, parentheticals, dialogue, action,
 * transitions, sound effects and montage beats.
 */

import { escapeHtml } from './markdown.js';

const SLUGLINE = /^(INT\.|EXT\.|INT\/EXT|I\/E|SCENE\s*[:.]|MONTAGE\b)/i;
const TRANSITION = /^(FADE (IN|OUT|TO BLACK)|CUT TO|CUT TO BLACK|SMASH CUT|DISSOLVE TO|MATCH CUT|THE END)\b/i;
const BEAT = /^\s*[*–—-]\s+(.*)$/;
const CUE = /^([A-Z0-9][A-Z0-9 .'’‘\-#]{1,34}?)\s*(?:\((.+)\))?\s*$/;
const PARENTHETICAL = /^\(.*\)$/;
const WRAPPED_QUOTES = /^[“"](.*)[”"]$/;

/** A cue name is upper-case throughout and short enough to be a name. */
function cueName(line) {
  const match = CUE.exec(line.trim());
  if (!match) return null;

  const name = match[1].trim();
  if (name.length < 2) return null;
  if (/[a-z]/.test(name)) return null;
  if (SLUGLINE.test(name) || TRANSITION.test(name)) return null;
  // "THUMP." and friends are sound effects, not people.
  if (/\.$/.test(name) && !/\b(DR|MR|MRS|MS|SGT|LT|CAPT)\.$/.test(name)) return null;

  return { name, parenthetical: match[2] ? match[2].trim() : '' };
}

function stripQuotes(line) {
  const match = WRAPPED_QUOTES.exec(line.trim());
  return match ? match[1] : line.trim();
}

/** Highlight shouted words and sound effects inside action lines. */
function emphasiseAction(text) {
  return escapeHtml(text).replace(/\b([A-Z][A-Z'’]{2,})\b/g, '<b class="cap">$1</b>');
}

function splitChunks(text) {
  const chunks = [];
  let current = [];

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (raw.trim()) {
      current.push(raw.trim());
    } else if (current.length) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * Parse a screenplay file.
 * Returns `{ slugline, html, stats }` where stats feed the scene header.
 */
export function renderScreenplay(source) {
  const chunks = splitChunks(source);
  if (!chunks.length) return { slugline: '', html: '', stats: { cues: [], lines: 0 } };

  // First pass: learn every character name, so a lone cue line later on
  // isn't mistaken for a sound effect.
  const known = new Set();
  for (const chunk of chunks) {
    if (chunk.length < 2) continue;
    const cue = cueName(chunk[0]);
    if (cue) known.add(cue.name.replace(/\s*\((V\.O\.|O\.S\.|CONT'D|CONT’D)\)\s*/i, ''));
  }

  const slugline = chunks[0].join(' ');
  const html = [];
  const cues = [];
  let spokenLines = 0;

  chunks.slice(1).forEach((chunk) => {
    const [first, ...rest] = chunk;

    if (chunk.length === 1 && TRANSITION.test(first)) {
      html.push(`<p class="sp-transition">${escapeHtml(first)}</p>`);
      return;
    }

    if (chunk.every((line) => BEAT.test(line))) {
      const items = chunk
        .map((line) => `<li>${emphasiseAction(BEAT.exec(line)[1])}</li>`)
        .join('');
      html.push(`<ul class="sp-beats">${items}</ul>`);
      return;
    }

    const cue = cueName(first);

    if (cue && rest.length) {
      const speaker = cue.name.replace(/\s+\((V\.O\.|O\.S\.|CONT'D|CONT’D)\)$/i, '');
      cues.push(speaker);

      const parts = [`<p class="sp-cue">${escapeHtml(cue.name)}</p>`];
      if (cue.parenthetical) {
        parts.push(`<p class="sp-paren">(${escapeHtml(cue.parenthetical)})</p>`);
      }

      for (const line of rest) {
        if (PARENTHETICAL.test(line)) {
          parts.push(`<p class="sp-paren">${escapeHtml(line)}</p>`);
        } else {
          spokenLines += 1;
          parts.push(`<p class="sp-line">${escapeHtml(stripQuotes(line))}</p>`);
        }
      }

      html.push(`<div class="sp-dialogue" data-speaker="${escapeHtml(speaker)}">${parts.join('')}</div>`);
      return;
    }

    // A lone all-caps line: either a bare cue we recognise, or a sound.
    if (chunk.length === 1 && !/[a-z]/.test(first)) {
      if (cue && known.has(cue.name)) {
        html.push(`<div class="sp-dialogue"><p class="sp-cue">${escapeHtml(first)}</p></div>`);
      } else {
        html.push(`<p class="sp-sfx">${escapeHtml(first)}</p>`);
      }
      return;
    }

    for (const line of chunk) {
      html.push(`<p class="sp-action">${emphasiseAction(line)}</p>`);
    }
  });

  const roster = [...new Set(cues)];
  return {
    slugline,
    html: html.join('\n'),
    stats: { cues: roster, lines: spokenLines },
  };
}
