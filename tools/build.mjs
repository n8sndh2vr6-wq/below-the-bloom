#!/usr/bin/env node
/*
 * tools/build.mjs — regenerates content/index.json.
 *
 * Nobody edits JSON by hand. Write Markdown, drop images in assets/img/, then
 * run:  node tools/build.mjs
 *
 * It reads the front matter off every file, works out the numbers behind the
 * dials (appearances, spoken lines, depth, first appearance), finds which
 * articles link to which, maps every image slug to its file, and writes one
 * index the site can load in a single request.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const IMAGES = path.join(ROOT, 'assets', 'img');
const SECTION_DIRS = ['lore', 'characters', 'creatures', 'locations', 'story', 'gallery'];
const IMAGE_TYPES = ['.webp', '.jpg', '.jpeg', '.png', '.avif'];

/* ----------------------------------------------------------- front matter */

function readDoc(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const data = {};
  for (const line of match[1].split('\n')) {
    const pair = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    let value = pair[2].trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    data[pair[1]] = value;
  }
  return { data, body: raw.slice(match[0].length) };
}

const list = (value) => (value ? String(value).split(',').map((s) => s.trim()).filter(Boolean) : []);
const numbers = (value) => list(value).map(Number).filter((n) => Number.isFinite(n));

function mdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== '_index.md').sort();
}

/* ------------------------------------------------------------- image map */

function imageMap() {
  const map = {};
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_TYPES.includes(ext)) continue;
      const slug = path.basename(entry.name, ext);
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      // First match wins, so a hand-picked .webp beats a stray .png.
      if (!map[slug] || IMAGE_TYPES.indexOf(ext) < IMAGE_TYPES.indexOf(path.extname(map[slug]).toLowerCase())) {
        map[slug] = rel;
      }
    }
  };
  walk(IMAGES);
  return map;
}

/* ---------------------------------------------------------------- scenes */

const CUE = /^([A-Z][A-Z0-9 .'’\-]{0,30}?)(?:\s*\(([^)]*)\))?:\s+(\S.*)$/;
const KILL = /^KILL\s*:\s*([^>]+?)\s*>\s*([^|]+?)\s*(?:\|\s*(.*))?$/i;

function readScenes() {
  const dir = path.join(CONTENT, 'scripts', 'chapter-1');
  const { data: meta } = readDoc(path.join(dir, '_index.md'));

  const acts = [];
  for (const [key, value] of Object.entries(meta)) {
    if (!key.startsWith('act-')) continue;
    const [title, note = ''] = value.split('|').map((s) => s.trim());
    acts.push({ id: key.slice(4), title, note });
  }

  const scenes = mdFiles(dir).map((file) => {
    const { data, body } = readDoc(path.join(dir, file));
    const speakers = [];
    const spoken = new Map();
    const kills = [];
    let lines = 0;

    for (const block of body.split(/\n\s*\n/)) {
      const first = block.trim().split('\n')[0];

      const kill = KILL.exec(first);
      if (kill) {
        // "KILL: killer > victim x3 | note" — one entry per body.
        const victim = kill[2].trim();
        const many = /\s+x(\d+)$/i.exec(victim);
        kills.push({
          killer: kill[1].trim(),
          victim: many ? victim.slice(0, many.index).trim() : victim,
          count: many ? Number(many[1]) : 1,
          note: (kill[3] || '').trim(),
        });
        continue;
      }

      const cue = CUE.exec(first);
      if (!cue || /^(SOUND|SCENE|IMAGE)$/i.test(cue[1])) continue;
      lines += 1;
      spoken.set(cue[1], (spoken.get(cue[1]) || 0) + 1);
      if (!speakers.includes(cue[1])) speakers.push(cue[1]);
    }

    return {
      slug: path.basename(file, '.md'),
      n: Number(data.number),
      act: data.act,
      place: data.place || null,
      title: data.title,
      location: data.scene,
      synopsis: data.summary,
      file: `content/scripts/chapter-1/${file}`,
      text: body,
      stats: [
        {
          label: 'Speakers', value: speakers.length, max: 6,
          detail: speakers.map((name) => ({ label: name })),
        },
        {
          label: 'Lines', value: lines, max: 40,
          detail: [...spoken.entries()].sort((a, b) => b[1] - a[1])
            .map(([name, n]) => ({ label: name, note: `${n} ${n === 1 ? 'line' : 'lines'}` })),
        },
      ],
      speakers,
      spoken: [...spoken.entries()],
      kills,
    };
  }).sort((a, b) => a.n - b.n);

  return { meta, acts, scenes };
}

/* -------------------------------------------------------------- sections */

function readSections() {
  return SECTION_DIRS.map((slug) => {
    const dir = path.join(CONTENT, slug);
    const { data } = readDoc(path.join(dir, '_index.md'));
    const entries = mdFiles(dir).map((file) => {
      const { data: fm, body } = readDoc(path.join(dir, file));
      return {
        slug: path.basename(file, '.md'),
        name: fm.title,
        role: fm.role || '',
        order: Number(fm.order || 999),
        image: fm.image || null,
        tags: list(fm.tags),
        aliases: list(fm.aliases),
        depth: fm.depth !== undefined ? Number(fm.depth) : null,
        home: fm.home || null,
        scenes: numbers(fm.scenes),
        file: `content/${slug}/${file}`,
        text: body,
      };
    }).sort((a, b) => a.order - b.order);

    return {
      slug,
      title: data.title,
      icon: `i-${data.icon}`,
      accent: data.accent,
      layout: data.layout,
      order: Number(data.order || 99),
      standfirst: data.standfirst || '',
      entries,
    };
  }).sort((a, b) => a.order - b.order);
}

/* ----------------------------------------------------------------- dials */

function mentions(text, aliases, name) {
  const needles = [...aliases, name].filter(Boolean);
  return needles.some((needle) => {
    const safe = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z])${safe}(s|es)?($|[^A-Za-z])`, 'i').test(text);
  });
}

function addDials(sections, scenes) {
  const total = scenes.length;
  const sceneOf = (n) => scenes.find((s) => s.n === n);
  const link = (scene) => ({
    label: `Scene ${scene.n}`,
    note: scene.title,
    route: `#/story/chapter-1/${scene.slug}`,
  });

  // Every kill recorded anywhere in the scripts, with where it happened.
  const ledger = scenes.flatMap((scene) => scene.kills.map((k) => ({ ...k, scene })));

  const named = (entry) => [entry.name, ...entry.aliases]
    .filter(Boolean).map((s) => s.toLowerCase());

  for (const section of sections) {
    for (const entry of section.entries) {
      const seen = scenes.filter((s) => mentions(s.text, entry.aliases, entry.name));
      const names = named(entry);

      if (section.slug === 'characters') {
        const spoken = scenes
          .map((scene) => ({
            scene,
            n: scene.spoken
              .filter(([cue]) => entry.aliases.some((a) => cue === a))
              .reduce((sum, [, n]) => sum + n, 0),
          }))
          .filter((row) => row.n > 0);

        const lines = spoken.reduce((sum, row) => sum + row.n, 0);
        const mine = ledger.filter((k) => names.includes(k.killer.toLowerCase()));
        const kills = mine.reduce((sum, k) => sum + k.count, 0);

        entry.stats = [
          {
            label: 'Appearances', value: seen.length, max: total, suffix: `/${total}`,
            detail: seen.map(link),
          },
          {
            label: 'Lines', value: lines, max: 150,
            detail: spoken.sort((a, b) => b.n - a.n).map(({ scene, n }) => ({
              ...link(scene), note: `${n} ${n === 1 ? 'line' : 'lines'}`,
            })),
          },
          {
            label: 'Kills', value: kills, max: 8,
            detail: mine.map((k) => ({
              label: k.count > 1 ? `${k.victim} ×${k.count}` : k.victim,
              note: [k.note, `Scene ${k.scene.n}`].filter(Boolean).join(' · '),
              route: `#/story/chapter-1/${k.scene.slug}`,
            })),
          },
        ];
      } else if (section.slug === 'creatures') {
        const home = sections.find((s) => s.slug === 'locations')
          ?.entries.find((e) => e.slug === entry.home);
        const died = ledger.filter((k) => names.some((n) =>
          k.victim.toLowerCase().includes(n.replace(/s$/, ''))));

        entry.stats = [
          {
            label: 'Appearances', value: seen.length, max: total, suffix: `/${total}`,
            detail: seen.map(link),
          },
          {
            label: 'Losses', value: died.reduce((sum, k) => sum + k.count, 0), max: 8,
            detail: died.map((k) => ({
              label: k.count > 1 ? `${k.victim} ×${k.count}` : k.victim,
              note: [`killed by ${k.killer}`, `Scene ${k.scene.n}`].join(' · '),
              route: `#/story/chapter-1/${k.scene.slug}`,
            })),
          },
          {
            label: 'Depth', value: home?.depth ?? 0, max: 10,
            detail: home ? [{ label: home.name, note: `Layer ${home.depth} of 10`, route: `#/locations/${home.slug}` }] : [],
          },
        ];
      } else if (section.slug === 'locations') {
        const set = scenes.filter((s) => s.place === entry.slug);
        entry.scenes = set.map((s) => s.n);
        entry.stats = [
          {
            label: 'Scenes', value: set.length, max: total, suffix: `/${total}`,
            detail: set.map(link),
          },
          {
            label: 'First seen', value: set[0]?.n ?? 0, max: total, prefix: 'Sc.',
            detail: set[0] ? [link(set[0])] : [],
          },
          {
            label: 'Depth', value: entry.depth ?? 0, max: 10,
            detail: [{ label: `Layer ${entry.depth ?? 0} of 10`, note: 'Nought is orbit, ten is the castle floor.' }],
          },
        ];
      } else if (section.slug === 'lore') {
        const cited = (prefix) => [...new Set(
          [...entry.text.matchAll(new RegExp(`\\[([^\\]]+)\\]\\(#/${prefix}/([a-z0-9-]+)\\)`, 'g'))]
            .map((m) => `${m[2]}\u0000${m[1]}`),
        )].map((pair) => {
          const [slug, label] = pair.split('\u0000');
          return { label, route: `#/${prefix}/${slug}` };
        });

        const inScenes = cited('story/chapter-1');
        entry.stats = [
          { label: 'Scenes cited', value: inScenes.length, max: total, detail: inScenes },
          { label: 'Characters', value: cited('characters').length, max: 10, detail: cited('characters') },
          { label: 'Locations', value: cited('locations').length, max: 12, detail: cited('locations') },
        ];
      }
    }
  }

  for (const scene of scenes) {
    const killed = scene.kills;
    scene.stats = [
      {
        label: 'Depth', value: Math.round((scene.n / total) * 100), max: 100, suffix: '%',
        detail: [{ label: `Scene ${scene.n} of ${total}`, note: 'How far into the chapter this sits.' }],
      },
      ...scene.stats,
    ];
    // Three readings. A scene with deaths in it trades Speakers for them.
    if (killed.length) {
      scene.stats[1] = {
        label: 'Deaths', value: killed.reduce((sum, k) => sum + k.count, 0), max: 4,
        detail: killed.map((k) => ({
          label: k.count > 1 ? `${k.victim} ×${k.count}` : k.victim,
          note: [`killed by ${k.killer}`, k.note].filter(Boolean).join(' · '),
        })),
      };
    }
    scene.stats = scene.stats.slice(0, 3);
  }

  // Scale each dial against the highest value its own set reaches, so a needle
  // reads as "where this one sits among the rest" rather than against a number
  // picked out of the air.
  const rescale = (rows) => {
    const peaks = new Map();
    for (const row of rows) {
      for (const stat of row.stats || []) {
        peaks.set(stat.label, Math.max(peaks.get(stat.label) ?? 0, stat.value));
      }
    }
    for (const row of rows) {
      for (const stat of row.stats || []) stat.max = Math.max(peaks.get(stat.label) || 1, 1);
    }
  };

  for (const section of sections) rescale(section.entries);
  rescale(scenes);
}

/* ------------------------------------------------------------- backlinks */

function addBacklinks(sections, scenes) {
  const incoming = new Map();
  const note = (route, from) => {
    if (!incoming.has(route)) incoming.set(route, []);
    const bucket = incoming.get(route);
    if (!bucket.some((x) => x.route === from.route)) bucket.push(from);
  };

  const documents = [
    ...sections.flatMap((s) => s.entries.map((e) => ({
      route: `#/${s.slug}/${e.slug}`, name: e.name, kind: s.title, text: e.text,
    }))),
    ...scenes.map((s) => ({
      route: `#/story/chapter-1/${s.slug}`, name: `Scene ${s.n} — ${s.title}`, kind: 'Scene', text: s.text,
    })),
  ];

  for (const doc of documents) {
    for (const [, route] of doc.text.matchAll(/\]\((#\/[a-z0-9/-]+)\)/g)) {
      if (route !== doc.route) note(route, { route: doc.route, name: doc.name, kind: doc.kind });
    }
  }

  for (const section of sections) {
    for (const entry of section.entries) {
      entry.backlinks = (incoming.get(`#/${section.slug}/${entry.slug}`) || []).slice(0, 12);
    }
  }
  for (const scene of scenes) {
    scene.backlinks = (incoming.get(`#/story/chapter-1/${scene.slug}`) || []).slice(0, 12);
  }
}

/* ----------------------------------------------------------------- write */

const { meta: bookMeta, acts, scenes } = readScenes();
const sections = readSections();
const images = imageMap();

addDials(sections, scenes);
addBacklinks(sections, scenes);

const strip = ({ text, aliases, speakers, spoken, kills, ...rest }) => rest;

const index = {
  site: {
    title: 'Below the Bloom',
    banner: 'The Official Wiki',
    creed: ['Explore the world. Uncover the truth.', 'Survive what lies below.'],
    epitaph: 'The deep remembers.',
    art: 'assets/img/hero-abyss.jpg',
    artAlt: 'Below the Bloom — a drowned colossus stands over a violet trench while a serpent and a winged scavenger watch',
  },
  images,
  sections: sections.map((s) => ({ ...s, entries: s.entries.map(strip) })),
  chapters: [{
    id: 'chapter-1',
    title: bookMeta.title,
    subtitle: bookMeta.subtitle,
    acts,
    scenes: scenes.map(strip),
  }],
};

fs.writeFileSync(path.join(CONTENT, 'index.json'), JSON.stringify(index, null, 2) + '\n');

const missing = sections
  .flatMap((s) => s.entries.filter((e) => e.image && !images[e.image]).map((e) => `${s.slug}/${e.slug} → ${e.image}`));

console.log(`content/index.json written`);
console.log(`  ${sections.length} sections, ${sections.reduce((n, s) => n + s.entries.length, 0)} articles, ${scenes.length} scenes`);
console.log(`  ${Object.keys(images).length} images mapped`);
if (missing.length) {
  console.log(`  awaiting artwork (${missing.length}):`);
  for (const m of missing) console.log(`    ${m}`);
}
