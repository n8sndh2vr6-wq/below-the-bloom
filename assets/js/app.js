/*
 * app.js — the wiki shell.
 *
 * Every page is built at request time from a Markdown or screenplay file in
 * this repository. content/manifest.json is the table of contents; nothing
 * here holds a copy of the writing itself.
 */

import { renderMarkdown, parseFrontMatter, escapeHtml } from './markdown.js';
import { renderScreenplay } from './screenplay.js';

const view = document.getElementById('view');
const mastheadTitle = document.getElementById('masthead-title');
const progress = document.getElementById('progress');
const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');

const files = new Map();
let site = null;
let corpus = null;
let indexing = null;

/* ------------------------------------------------------------- plumbing -- */

async function read(path) {
  if (files.has(path)) return files.get(path);
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Missing file: ${path}`);
  const text = await response.text();
  files.set(path, text);
  return text;
}

const section = (slug) => site.sections.find((s) => s.slug === slug);
const chapter = (id) => site.chapters.find((c) => c.id === id) || site.chapters[0];

function icon(name, className = 'icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="#${name}"/></svg>`;
}

function plate(image, alt, extra = '') {
  if (!image) return `<div class="plate empty ${extra}"></div>`;
  return `<div class="plate ${extra}"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></div>`;
}

function ornament(violet = false) {
  return `<div class="orn ${violet ? 'violet' : ''}" aria-hidden="true"><i></i></div>`;
}

/* ---------------------------------------------------------------- chrome -- */

function setMasthead(label, href = '#/') {
  mastheadTitle.textContent = label || '';
  mastheadTitle.href = href;
  mastheadTitle.hidden = !label;
}

let watcher = null;
function watchFades() {
  if (!('IntersectionObserver' in window)) return;
  if (watcher) watcher.disconnect();
  watcher = new IntersectionObserver((rows) => {
    for (const row of rows) {
      if (!row.isIntersecting) continue;
      row.target.classList.add('seen');
      watcher.unobserve(row.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
  view.querySelectorAll('.fade').forEach((node) => watcher.observe(node));
}

function paint(html) {
  view.innerHTML = html;
  window.scrollTo(0, 0);
  view.classList.remove('enter');
  void view.offsetWidth;
  view.classList.add('enter');
  watchFades();
  trackScroll();
}

function trackScroll() {
  const span = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${span > 24 ? Math.min(1, window.scrollY / span) : 0})`;
  document.body.classList.toggle('scrolled', window.scrollY > 40);
}

function waiting(label = 'Sounding the depth') {
  paint(`<div class="waiting"><i></i><p>${escapeHtml(label)}</p></div>`);
}

function lost(error) {
  setMasthead('Below the Bloom');
  paint(`
    <div class="shell">
      <header class="head">
        <p class="kicker">Signal lost</p>
        <h1 class="title">Nothing here</h1>
        ${ornament()}
        <p class="standfirst">${escapeHtml(error.message || String(error))}</p>
      </header>
      <div class="ledger">
        <a class="ledger-row" href="#/"><span><b class="ledger-name">Return to the surface</b></span>${icon('i-chevron-right', 'icon chev')}</a>
      </div>
    </div>
  `);
}

/* ---------------------------------------------------------------- drawer -- */

function buildDrawer() {
  document.getElementById('drawer-links').innerHTML = `
    <a href="#/" data-route="#/">${icon('i-home')}<span>Home</span></a>
    ${site.sections.map((s) => `
      <a href="#/${s.slug}" data-route="#/${s.slug}">${icon(s.icon)}<span>${escapeHtml(s.title)}</span></a>
    `).join('')}
    <a href="#/search" data-route="#/search">${icon('i-search')}<span>Search</span></a>
  `;
}

function toggleDrawer(open) {
  const button = document.getElementById('menu-open');
  drawer.hidden = false;
  scrim.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
  });
  document.body.classList.toggle('locked', open);
  button.setAttribute('aria-expanded', String(open));
  if (open) {
    drawer.querySelector('a')?.focus();
  } else {
    setTimeout(() => {
      if (!drawer.classList.contains('open')) { drawer.hidden = true; scrim.hidden = true; }
    }, 440);
  }
}

function markDrawer() {
  const base = `#/${location.hash.replace(/^#\/?/, '').split('/')[0].split('?')[0]}`;
  drawer.querySelectorAll('[data-route]').forEach((link) => {
    link.classList.toggle('current', link.dataset.route === base);
  });
}

/* ----------------------------------------------------------------- views -- */

function home() {
  setMasthead('');
  document.body.classList.remove('scrolled');

  const gateways = site.sections.map((s) => `
    <a class="gateway" href="#/${s.slug}">
      ${icon(s.icon)}
      <span>${escapeHtml(s.title)}</span>
      ${icon('i-chevron-right', 'icon chev')}
    </a>
  `).join('');

  paint(`
    <div class="portal-stage" style="--art:url('${escapeHtml(site.site.art)}')">
      <div class="portal-art">
        <img src="${escapeHtml(site.site.art)}" alt="${escapeHtml(site.site.artAlt)}" fetchpriority="high">
      </div>
    </div>
    <div class="portal-body shell">
      <p class="banner">${escapeHtml(site.site.banner)}</p>
      <p class="creed">${site.site.creed.map(escapeHtml).join('<br>')}</p>
      ${ornament()}
      <nav class="gateways" aria-label="Wiki sections">${gateways}</nav>
      <p class="epitaph">“${escapeHtml(site.site.epitaph)}”</p>
      ${ornament(true)}
    </div>
  `);
}

function rosterIndex(entry) {
  const cards = entry.entries.map((item, i) => `
    <a class="entry fade" style="--i:${Math.min(i, 10)}" href="#/${entry.slug}/${item.slug}">
      ${plate(item.image, item.name)}
      <p class="entry-name">${escapeHtml(item.name)}</p>
      <p class="entry-role">${escapeHtml(item.role)}</p>
    </a>
  `).join('');
  return `<div class="roster">${cards}</div>`;
}

function ledgerIndex(entry) {
  const rows = entry.entries.map((item, i) => `
    <a class="ledger-row fade" style="--i:${Math.min(i, 10)}" href="#/${entry.slug}/${item.slug}">
      <span>
        <b class="ledger-name">${escapeHtml(item.name)}</b>
        <small class="ledger-note">${escapeHtml(item.role)}</small>
      </span>
      ${icon('i-chevron-right', 'icon chev')}
    </a>
  `).join('');
  return `<div class="ledger">${rows}</div>`;
}

function galleryIndex() {
  const plates = site.sections
    .filter((s) => s.entries)
    .flatMap((s) => s.entries
      .filter((item) => item.image)
      .map((item) => ({ ...item, section: s.slug })));

  if (!plates.length) {
    return `<p class="note" style="margin-top:30px">
      No plates have been added to the archive yet. Drop images into
      <code>assets/img/</code> and reference them from
      <code>content/manifest.json</code> and they will appear here.
    </p>`;
  }

  return `<div class="gallery">${plates.map((item, i) => `
    <a class="fade" style="--i:${Math.min(i, 12)}" href="#/${item.section}/${item.slug}">
      <figure>
        ${plate(item.image, item.name)}
        <figcaption>${escapeHtml(item.name)}</figcaption>
      </figure>
    </a>
  `).join('')}</div>`;
}

function storyIndex() {
  const book = site.chapters[0];
  const groups = book.arcs.map((arc) => {
    const scenes = book.scenes.filter((s) => s.arc === arc.id);
    const rows = scenes.map((scene, i) => `
      <a class="ledger-row fade" style="--i:${Math.min(i, 8)}" href="#/story/${book.id}/${scene.slug}">
        <span>
          <b class="ledger-name"><span class="ledger-index">${String(scene.n).padStart(2, '0')}</span> &nbsp;${escapeHtml(scene.title)}</b>
          <small class="ledger-note">${escapeHtml(scene.synopsis)}</small>
        </span>
        ${icon('i-chevron-right', 'icon chev')}
      </a>
    `).join('');
    return `<h2 class="act">${escapeHtml(arc.title)}<small>${escapeHtml(arc.note)}</small></h2><div class="ledger">${rows}</div>`;
  }).join('');

  return `
    <div class="ledger" style="margin-top:26px">
      <a class="ledger-row fade" href="#/lore/timeline">
        <span>
          <b class="ledger-name">Chapter One — Timeline</b>
          <small class="ledger-note">The whole descent in order, beat by beat.</small>
        </span>
        ${icon('i-chevron-right', 'icon chev')}
      </a>
    </div>
    ${groups}
  `;
}

function sectionView(slug) {
  const entry = section(slug);
  if (!entry) throw new Error(`There is no “${slug}” section in this wiki.`);

  setMasthead(entry.title, `#/${slug}`);

  let body;
  if (entry.kind === 'roster') body = rosterIndex(entry);
  else if (entry.kind === 'ledger') body = ledgerIndex(entry);
  else if (entry.kind === 'story') body = storyIndex();
  else body = galleryIndex();

  paint(`
    <div class="shell${entry.kind === 'roster' || entry.kind === 'gallery' ? '-wide' : ''}">
      <header class="head">
        <p class="kicker">Below the Bloom</p>
        <h1 class="title">${escapeHtml(entry.title)}</h1>
        ${ornament()}
        <p class="standfirst">${escapeHtml(entry.standfirst)}</p>
      </header>
      ${body}
    </div>
  `);
}

async function entryView(sectionSlug, entrySlug) {
  const parent = section(sectionSlug);
  if (!parent || !parent.entries) throw new Error(`There is no “${sectionSlug}” section in this wiki.`);

  const item = parent.entries.find((e) => e.slug === entrySlug);
  if (!item) throw new Error(`“${entrySlug}” is not in ${parent.title}.`);

  setMasthead(item.name, `#/${sectionSlug}`);
  waiting();

  const source = await read(item.file);
  const { data, body } = parseFrontMatter(source);
  const stripped = body.replace(/^\s*#\s+.+$/m, '');
  const { html } = renderMarkdown(stripped);

  const tags = (item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  const position = parent.entries.indexOf(item);
  const previous = parent.entries[position - 1];
  const next = parent.entries[position + 1];

  paint(`
    <article>
      ${item.image
        ? `<div class="dossier-art"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" fetchpriority="high"></div>`
        : '<div class="dossier-art empty plate"></div>'}
      <div class="shell">
        <header class="dossier-head">
          <p class="kicker">${escapeHtml(parent.title)}</p>
          <h1 class="title">${escapeHtml(item.name)}</h1>
          <p class="title-sub">${escapeHtml(data.role || item.role)}</p>
          ${tags ? `<div class="tagset">${tags}</div>` : ''}
          ${ornament()}
        </header>
        <div class="prose fade">${html}</div>
        ${pager(
          previous && { href: `#/${sectionSlug}/${previous.slug}`, label: 'Previous', name: previous.name },
          next && { href: `#/${sectionSlug}/${next.slug}`, label: 'Next', name: next.name },
        )}
      </div>
    </article>
  `);
}

function pager(previous, next) {
  if (!previous && !next) return '';
  return `
    <nav class="pager">
      ${previous
        ? `<a href="${previous.href}">${icon('i-arrow-left')}<span><b>${escapeHtml(previous.label)}</b><i>${escapeHtml(previous.name)}</i></span></a>`
        : '<span></span>'}
      ${next
        ? `<a class="next" href="${next.href}"><span><b>${escapeHtml(next.label)}</b><i>${escapeHtml(next.name)}</i></span>${icon('i-arrow-right')}</a>`
        : '<span></span>'}
    </nav>
  `;
}

async function sceneView(chapterId, slug) {
  const book = chapter(chapterId);
  const position = book.scenes.findIndex((s) => s.slug === slug);
  const scene = book.scenes[position];
  if (!scene) throw new Error(`${book.title} has no scene called “${slug}”.`);

  setMasthead(`Scene ${String(scene.n).padStart(2, '0')}`, '#/story');
  waiting('Surfacing the scene');

  const { html, stats } = renderScreenplay(await read(scene.file));
  const arc = book.arcs.find((a) => a.id === scene.arc);
  const previous = book.scenes[position - 1];
  const next = book.scenes[position + 1];
  const depth = Math.round((scene.n / book.scenes.length) * 100);

  const cast = stats.cues.length
    ? `<div class="tagset">${stats.cues.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>`
    : '';

  paint(`
    <article class="shell">
      <header class="head" style="text-align:left">
        <p class="kicker">${escapeHtml(arc ? arc.title : book.title)}</p>
        <h1 class="title">${escapeHtml(scene.title)}</h1>
        <p class="scene-meta">${escapeHtml(scene.location)}</p>
        <p class="standfirst" style="text-align:left;margin-inline:0">${escapeHtml(scene.synopsis)}</p>
        ${cast}
        <div class="sounding"><span style="width:${depth}%"></span><small>Scene ${scene.n} of ${book.scenes.length}</small></div>
      </header>
      <div class="screenplay fade">${html}</div>
      ${pager(
        previous && { href: `#/story/${book.id}/${previous.slug}`, label: `Scene ${previous.n}`, name: previous.title },
        next
          ? { href: `#/story/${book.id}/${next.slug}`, label: `Scene ${next.n}`, name: next.title }
          : { href: '#/lore/timeline', label: 'End of chapter', name: 'The timeline' },
      )}
    </article>
  `);
}

/* ---------------------------------------------------------------- search -- */

async function buildCorpus(onTick) {
  if (corpus) return corpus;
  if (indexing) return indexing;

  const documents = [];
  for (const s of site.sections) {
    for (const item of s.entries || []) {
      documents.push({ kind: s.title, route: `#/${s.slug}/${item.slug}`, name: item.name, note: item.role, file: item.file });
    }
  }
  for (const book of site.chapters) {
    for (const scene of book.scenes) {
      documents.push({
        kind: 'Scene',
        route: `#/story/${book.id}/${scene.slug}`,
        name: `${String(scene.n).padStart(2, '0')} · ${scene.title}`,
        note: scene.synopsis,
        file: scene.file,
      });
    }
  }

  indexing = (async () => {
    let done = 0;
    const queue = [...documents];
    const worker = async () => {
      while (queue.length) {
        const document = queue.shift();
        try { document.text = await read(document.file); } catch { document.text = ''; }
        done += 1;
        onTick?.(done, documents.length);
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));
    corpus = documents;
    indexing = null;
    return documents;
  })();

  return indexing;
}

function excerpt(text, term) {
  const at = text.toLowerCase().indexOf(term);
  if (at < 0) return '';
  const from = Math.max(0, at - 55);
  const slice = text.slice(from, at + term.length + 95).replace(/\s+/g, ' ').trim();
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `${from ? '…' : ''}${escapeHtml(slice).replace(new RegExp(safe, 'ig'), (hit) => `<mark>${hit}</mark>`)}…`;
}

function searchView(query) {
  setMasthead('Search', '#/search');

  paint(`
    <div class="shell">
      <header class="head">
        <p class="kicker">Below the Bloom</p>
        <h1 class="title">Search</h1>
        ${ornament()}
        <p class="standfirst">Every article and all forty-eight scenes, in full.</p>
      </header>
      <div class="search-shell">
        <div class="search-field">
          ${icon('i-search')}
          <input id="q" type="search" inputmode="search" autocomplete="off" spellcheck="false"
                 placeholder="Froststalker, the crown, prosthetic…" value="${escapeHtml(query)}"
                 aria-label="Search the wiki">
        </div>
        <div id="hits" class="hits"><p class="note" style="padding-top:18px">Type at least two letters.</p></div>
      </div>
    </div>
  `);

  const input = document.getElementById('q');
  const hits = document.getElementById('hits');
  let timer;

  const run = async (raw) => {
    const term = raw.trim().toLowerCase();
    if (term.length < 2) {
      hits.innerHTML = '<p class="note" style="padding-top:18px">Type at least two letters.</p>';
      return;
    }

    hits.innerHTML = '<p class="note" style="padding-top:18px">Reading the archive…</p>';
    const documents = await buildCorpus((done, total) => {
      if (!corpus) hits.innerHTML = `<p class="note" style="padding-top:18px">Reading the archive… ${done}/${total}</p>`;
    });

    const found = [];
    for (const document of documents) {
      const meta = `${document.name} ${document.note}`.toLowerCase();
      const body = document.text || '';
      const inMeta = meta.includes(term);
      const count = body.toLowerCase().split(term).length - 1;
      if (!inMeta && !count) continue;
      found.push({
        document,
        score: (inMeta ? 500 : 0) + count,
        snippet: count ? excerpt(body, term) : escapeHtml(document.note),
      });
    }
    found.sort((a, b) => b.score - a.score);

    if (!found.length) {
      hits.innerHTML = `<p class="note" style="padding-top:18px">The archive holds nothing for “${escapeHtml(raw)}”.</p>`;
      return;
    }

    hits.innerHTML = found.slice(0, 40).map((hit) => `
      <a class="hit" href="${hit.document.route}">
        <span class="hit-kind">${escapeHtml(hit.document.kind)}</span>
        <b class="hit-name">${escapeHtml(hit.document.name)}</b>
        <span class="hit-snip">${hit.snippet}</span>
      </a>
    `).join('');
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const value = input.value;
    timer = setTimeout(() => {
      history.replaceState(null, '', value.trim() ? `#/search?q=${encodeURIComponent(value.trim())}` : '#/search');
      run(value);
    }, 200);
  });

  if (query) run(query);
  if (matchMedia('(min-width: 1000px)').matches) input.focus();
}

/* ---------------------------------------------------------------- router -- */

const KNOWN_SECTIONS = new Set(['lore', 'characters', 'creatures', 'locations', 'story', 'gallery']);

async function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, search] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(search || '');

  if (drawer.classList.contains('open')) toggleDrawer(false);

  try {
    if (!parts.length) home();
    else if (parts[0] === 'search') searchView(params.get('q') || '');
    else if (parts[0] === 'story' && parts.length >= 3) await sceneView(parts[1], parts[2]);
    else if (KNOWN_SECTIONS.has(parts[0]) && parts.length >= 2) await entryView(parts[0], parts[1]);
    else if (KNOWN_SECTIONS.has(parts[0])) sectionView(parts[0]);
    else throw new Error('That page is not part of this archive.');
  } catch (error) {
    lost(error);
  }

  markDrawer();
}

/* -------------------------------------------------------------- ambience -- */

function drift() {
  const canvas = document.getElementById('drift');
  if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const context = canvas.getContext('2d');
  let motes = [];
  let frame = null;

  const size = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio;
    canvas.height = innerHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    motes = Array.from({ length: innerWidth < 640 ? 22 : 40 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 1.4 + 0.3,
      up: Math.random() * 0.22 + 0.04,
      sway: (Math.random() - 0.5) * 0.12,
      warm: Math.random() > 0.7,
      a: Math.random() * 0.3 + 0.07,
    }));
  };

  const tick = () => {
    context.clearRect(0, 0, innerWidth, innerHeight);
    for (const m of motes) {
      m.y -= m.up;
      m.x += m.sway;
      if (m.y < -8) { m.y = innerHeight + 8; m.x = Math.random() * innerWidth; }
      if (m.x < -8) m.x = innerWidth + 8;
      if (m.x > innerWidth + 8) m.x = -8;
      context.beginPath();
      context.fillStyle = m.warm ? `rgba(165,108,255,${m.a})` : `rgba(140,220,235,${m.a})`;
      context.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      context.fill();
    }
    frame = requestAnimationFrame(tick);
  };

  const play = () => { if (!frame) frame = requestAnimationFrame(tick); };
  const pause = () => { if (frame) { cancelAnimationFrame(frame); frame = null; } };

  addEventListener('resize', size, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  size();
  play();
}

/* ------------------------------------------------------------- bootstrap -- */

async function start() {
  addEventListener('scroll', trackScroll, { passive: true });
  addEventListener('hashchange', route);

  document.getElementById('menu-open').addEventListener('click', () => toggleDrawer(true));
  document.getElementById('menu-close').addEventListener('click', () => toggleDrawer(false));
  scrim.addEventListener('click', () => toggleDrawer(false));
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('open')) toggleDrawer(false);
  });

  // A plate whose image is missing falls back to the sigil rather than a
  // broken frame — images arrive after the pages that reference them.
  document.addEventListener('error', (event) => {
    const image = event.target;
    if (image.tagName !== 'IMG') return;
    const frame = image.closest('.plate, .dossier-art, .portal-art');
    if (frame) { frame.classList.add('empty', 'plate'); image.remove(); }
  }, true);

  drift();

  try {
    site = await fetch('content/manifest.json', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) throw new Error('The archive index could not be read.');
        return response.json();
      });
  } catch (error) {
    lost(error);
    return;
  }

  buildDrawer();
  route();
}

start();
