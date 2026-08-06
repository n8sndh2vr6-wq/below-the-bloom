/*
 * directives.js — the one list of reserved `TAG:` words.
 *
 * Both renderers and the build step read this, so a tag only has to be
 * declared once and can never leak onto the page as stray text.
 *
 *   figure   drawn as a picture (with a placeholder when the file is absent)
 *   sound    drawn as a sound effect
 *   slug     drawn as a heading inside a scene
 *   record   never drawn — it exists for the dials and the index only
 *
 * Anything not on this list is left alone, which is what keeps `CHIP: …`
 * a line of dialogue rather than a directive.
 *
 * To add a tag the pages should ignore, put it here with `record`. Nothing
 * else needs changing.
 */

export const DIRECTIVES = {
  IMAGE: 'figure',
  SOUND: 'sound',
  SCENE: 'slug',

  KILL: 'record',
  PLACE: 'record',
  CAST: 'record',
  NOTE: 'record',
  TODO: 'record',
  REF: 'record',
  TAG: 'record',
  META: 'record',
};

const PATTERN = /^([A-Z][A-Z0-9_]{1,15})\s*:\s*([\s\S]*)$/;

/**
 * Read the directive off the front of a block.
 * Returns `null` when the block does not open with a reserved tag.
 */
export function directiveOf(block) {
  const match = PATTERN.exec(String(block).trim());
  if (!match) return null;

  const tag = match[1].toUpperCase();
  const kind = DIRECTIVES[tag];
  if (!kind) return null;

  return { tag, kind, value: match[2].trim() };
}

/** True when a block should produce no output at all. */
export const isRecord = (block) => directiveOf(block)?.kind === 'record';
