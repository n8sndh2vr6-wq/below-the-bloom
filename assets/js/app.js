/*
 * app.js — the archive shell: routing, content loading and view rendering.
 *
 * Every page on this site is rendered at runtime from a Markdown or script
 * source file in the repository. Nothing here duplicates that content; it is
 * fetched, parsed and styled on demand.
 */

import { renderMarkdown, parseFrontMatter, escapeHtml } from './markdown.js';
import { renderScreenplay } from './screenplay.js';

const view = document.getElementById('view');
const topbar = document.getElementById('topbar');
const progress = document.getElementById('progress');
const tabs = [...document.querySelectorAll('.tab')];

const cache = new Map();
let manifest = null;
let searchIndex = null;
let indexing = null;

/* ------------------------------------------------------------- utilities */

async function loadText(path) {
  if (cache.has(path)) return cache.get(path);
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not read ${path} (${response.status})`);
  const text = await response.text();
  cache.set(path, text);
  return text;
}

function chapter(id) {
  return manifest.chapters.find((entry) => entry.id === id) || manifest.chapters[0];
}

function sceneAt(chapterId, slug) {
  const book = chapter(chapterId);
  const position = book.scenes.findIndex((entry) => entry.slug === slug);
  return { book, position, scene: book.scenes[position] };
}

function remember(route, label) {
  try {
    localStorage.setItem('btb:last', JSON.stringify({ route, label }));
  } catch (error) { /* private mode — not important enough to surface */ }
}

function recall() {
  try {
    return JSON.parse(localStorage.getItem('btb:last') || 'null');
  } catch (error) {
    return null;
  }
}

/* ------------------------------------------------------------ view chrome */

function setChrome({ title, subtitle, back }) {
  topbar.innerHTML = `
    ${back ? `<a class="icon-button" href="${back}" aria-label="Back">‹</a>` : '<span class="icon-button ghost" aria-hidden="true">◈</span>'}
    <div class="topbar-title">
      <strong>${escapeHtml(title)}</strong>
      ${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ''}
    </div>
  `;
}

function paint(html) {
  view.innerHTML = html;
  view.scrollTop = 0;
  window.scrollTo(0, 0);
  view.classList.remove('entering');
  void view.offsetWidth;
  view.classList.add('entering');
  observeReveals();
  updateProgress();
}

let revealObserver = null;
function observeReveals() {
  if (!('IntersectionObserver' in window)) return;
  if (revealObserver) revealObserver.disconnect();

  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('shown');
        revealObserver.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  view.querySelectorAll('.reveal').forEach((node) => revealObserver.observe(node));
}

function updateProgress() {
  const height = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = height > 20 ? Math.min(1, window.scrollY / height) : 0;
  progress.style.transform = `scaleX(${ratio})`;
  document.body.classList.toggle('scrolled', window.scrollY > 12);
}

function setActiveTab(name) {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
}

function loading(message = 'Reading the archive…') {
  paint(`<div class="loader"><span class="pulse"></span><p>${escapeHtml(message)}</p></div>`);
}

function failure(error) {
  paint(`
    <section class="page">
      <h1>Signal lost</h1>
      <p class="muted">${escapeHtml(error.message || String(error))}</p>
      <a class="button" href="#/">Return to the surface</a>
    </section>
  `);
}

/* ------------------------------------------------------------------ views */

function homeView() {
  const book = manifest.chapters[0];
  const last = recall();

  const wikiCards = manifest.wiki.map((entry, i) => `
    <a class="card reveal" style="--i:${i}" href="#/wiki/${entry.slug}">
      <span class="glyph">${entry.glyph}</span>
      <strong>${escapeHtml(entry.title)}</strong>
      <small>${escapeHtml(entry.summary)}</small>
    </a>
  `).join('');

  const arcs = book.arcs.map((arc, i) => {
    const scenes = book.scenes.filter((scene) => scene.arc === arc.id);
    return `
      <a class="arc-row reveal" style="--i:${i}" href="#/script/${book.id}/${scenes[0].slug}">
        <span class="arc-title">${escapeHtml(arc.title)}</span>
        <span class="arc-note">${escapeHtml(arc.note)}</span>
        <span class="arc-count">${scenes.length} scenes</span>
      </a>
    `;
  }).join('');

  setChrome({ title: manifest.site.title, subtitle: manifest.site.subtitle });
  setActiveTab('home');

  paint(`
    <section class="hero">
      <p class="eyebrow">${escapeHtml(manifest.site.subtitle)}</p>
      <h1 class="display">Below<span>the</span>Bloom</h1>
      <p class="lede">A teenage survivor and a sarcastic AI fall into a classified ocean planet, and everything below the surface already knows their names.</p>
      <div class="hero-actions">
        <a class="button primary" href="#/script/${book.id}/${book.scenes[0].slug}">Begin the descent</a>
        ${last ? `<a class="button" href="${last.route}">Resume · ${escapeHtml(last.label)}</a>` : `<a class="button" href="#/wiki">Open the wiki</a>`}
      </div>
      <div class="depth-gauge" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    </section>

    <section class="page">
      <h2 class="section-title reveal">Chapter One</h2>
      <p class="muted reveal">${escapeHtml(book.blurb)}</p>
      <div class="arc-list">${arcs}</div>
    </section>

    <section class="page">
      <h2 class="section-title reveal">The wiki</h2>
      <div class="card-grid">${wikiCards}</div>
    </section>
  `);
}

function scriptIndexView() {
  const book = manifest.chapters[0];
  setChrome({ title: book.title, subtitle: `${book.scenes.length} scenes` });
  setActiveTab('script');

  const groups = book.arcs.map((arc) => {
    const scenes = book.scenes.filter((scene) => scene.arc === arc.id);
    const rows = scenes.map((scene, i) => `
      <a class="scene-row reveal" style="--i:${i}" href="#/script/${book.id}/${scene.slug}">
        <span class="scene-n">${String(scene.n).padStart(2, '0')}</span>
        <span class="scene-body">
          <strong>${escapeHtml(scene.title)}</strong>
          <small>${escapeHtml(scene.location)}</small>
          <em>${escapeHtml(scene.synopsis)}</em>
        </span>
      </a>
    `).join('');

    return `
      <div class="arc-block">
        <h2 class="arc-heading">${escapeHtml(arc.title)}<small>${escapeHtml(arc.note)}</small></h2>
        ${rows}
      </div>
    `;
  }).join('');

  paint(`
    <section class="page">
      <p class="eyebrow">${escapeHtml(book.subtitle)}</p>
      <h1>${escapeHtml(book.title)}</h1>
      <p class="muted">${escapeHtml(book.blurb)}</p>
      ${groups}
    </section>
  `);
}

async function sceneView(chapterId, slug) {
  const { book, position, scene } = sceneAt(chapterId, slug);
  if (!scene) throw new Error(`No scene called "${slug}" in ${book.title}.`);

  setActiveTab('script');
  setChrome({
    title: `Scene ${String(scene.n).padStart(2, '0')}`,
    subtitle: scene.title,
    back: `#/script/${book.id}`,
  });
  loading('Surfacing the scene…');

  const source = await loadText(scene.file);
  const { html, stats } = renderScreenplay(source);

  const arc = book.arcs.find((entry) => entry.id === scene.arc);
  const previous = book.scenes[position - 1];
  const next = book.scenes[position + 1];

  const roster = stats.cues.length
    ? `<div class="roster">${stats.cues.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>`
    : '';

  const depth = Math.round((scene.n / book.scenes.length) * 100);

  paint(`
    <article class="page scene">
      <header class="scene-head reveal">
        <p class="eyebrow">${escapeHtml(arc ? arc.title : book.title)}</p>
        <h1>${escapeHtml(scene.title)}</h1>
        <p class="slug">${escapeHtml(scene.location)}</p>
        <p class="muted">${escapeHtml(scene.synopsis)}</p>
        ${roster}
        <div class="depth-meter" role="img" aria-label="Scene ${scene.n} of ${book.scenes.length}">
          <span style="width:${depth}%"></span>
          <small>Scene ${scene.n} / ${book.scenes.length}</small>
        </div>
      </header>

      <div class="screenplay reveal">${html}</div>

      <nav class="scene-nav">
        ${previous ? `<a class="button" href="#/script/${book.id}/${previous.slug}">‹ ${escapeHtml(previous.title)}</a>` : '<span></span>'}
        ${next ? `<a class="button primary" href="#/script/${book.id}/${next.slug}">${escapeHtml(next.title)} ›</a>` : `<a class="button primary" href="#/wiki/timeline">End of chapter · Timeline</a>`}
      </nav>
    </article>
  `);

  remember(`#/script/${book.id}/${scene.slug}`, `Scene ${scene.n}`);
}

function wikiIndexView() {
  setChrome({ title: 'The Wiki', subtitle: 'Everything the archive knows' });
  setActiveTab('wiki');

  const cards = manifest.wiki.map((entry, i) => `
    <a class="card wide reveal" style="--i:${i}" href="#/wiki/${entry.slug}">
      <span class="glyph">${entry.glyph}</span>
      <strong>${escapeHtml(entry.title)}</strong>
      <small>${escapeHtml(entry.summary)}</small>
    </a>
  `).join('');

  paint(`
    <section class="page">
      <p class="eyebrow">Planet (Redacted)</p>
      <h1>The Wiki</h1>
      <p class="muted">Characters, kingdoms, locations and gear — all written up from the scripts themselves.</p>
      <div class="card-grid">${cards}</div>
    </section>
  `);
}

async function wikiPageView(slug) {
  const entry = manifest.wiki.find((item) => item.slug === slug);
  if (!entry) throw new Error(`There is no wiki page called "${slug}".`);

  setActiveTab('wiki');
  setChrome({ title: entry.title, subtitle: 'Wiki', back: '#/wiki' });
  loading();

  const source = await loadText(entry.file);
  const { data, body } = parseFrontMatter(source);

  // The page title lives in the header card, so drop the leading H1.
  const heading = /^\s*#\s+(.+)$/m.exec(body);
  const title = heading ? heading[1].trim() : (data.title || entry.title);
  const { html, headings } = renderMarkdown(heading ? body.replace(heading[0], '') : body);

  const contents = headings.filter((heading) => heading.level === 2);
  const rail = contents.length > 2
    ? `<nav class="contents reveal"><p>On this page</p>${contents
        .map((heading) => `<button type="button" data-jump="${heading.id}">${escapeHtml(heading.text)}</button>`)
        .join('')}</nav>`
    : '';

  paint(`
    <article class="page wiki">
      <header class="wiki-head reveal">
        <span class="glyph big">${data.glyph || entry.glyph}</span>
        <p class="eyebrow">Archive entry</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="muted">${escapeHtml(data.summary || entry.summary)}</p>
      </header>
      ${rail}
      <div class="prose reveal">${html}</div>
    </article>
  `);

  view.querySelectorAll('[data-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.jump);
      if (!target) return;
      const offset = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    });
  });

  remember(`#/wiki/${slug}`, entry.title);
}

/* ----------------------------------------------------------------- search */

async function buildSearchIndex(onProgress) {
  if (searchIndex) return searchIndex;
  if (indexing) return indexing;

  const book = manifest.chapters[0];
  const documents = [
    ...manifest.wiki.map((entry) => ({
      kind: 'wiki',
      route: `#/wiki/${entry.slug}`,
      title: entry.title,
      context: 'Wiki',
      file: entry.file,
    })),
    ...book.scenes.map((scene) => ({
      kind: 'scene',
      route: `#/script/${book.id}/${scene.slug}`,
      title: `${String(scene.n).padStart(2, '0')} · ${scene.title}`,
      context: scene.location,
      extra: scene.synopsis,
      file: scene.file,
    })),
  ];

  indexing = (async () => {
    let done = 0;
    const queue = [...documents];

    const worker = async () => {
      while (queue.length) {
        const document = queue.shift();
        try {
          document.text = await loadText(document.file);
        } catch (error) {
          document.text = '';
        }
        done += 1;
        if (onProgress) onProgress(done, documents.length);
      }
    };

    await Promise.all(Array.from({ length: 5 }, worker));
    searchIndex = documents;
    indexing = null;
    return documents;
  })();

  return indexing;
}

function snippet(text, term) {
  const at = text.toLowerCase().indexOf(term);
  if (at < 0) return '';
  const from = Math.max(0, at - 60);
  const slice = text.slice(from, at + term.length + 90).replace(/\s+/g, ' ').trim();
  const marked = escapeHtml(slice).replace(
    new RegExp(escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'),
    (hit) => `<mark>${hit}</mark>`,
  );
  return `${from > 0 ? '…' : ''}${marked}…`;
}

function searchView(query = '') {
  setChrome({ title: 'Search', subtitle: 'Scripts and wiki' });
  setActiveTab('search');

  paint(`
    <section class="page">
      <h1>Search the archive</h1>
      <div class="search-field">
        <input id="q" type="search" inputmode="search" autocomplete="off"
               placeholder="Froststalker, the Bloom, prosthetic…" value="${escapeHtml(query)}">
      </div>
      <div id="results" class="results"><p class="muted">Every scene and every wiki page, full text.</p></div>
    </section>
  `);

  const input = document.getElementById('q');
  const results = document.getElementById('results');
  let timer = null;

  const run = async (term) => {
    const needle = term.trim().toLowerCase();
    if (needle.length < 2) {
      results.innerHTML = '<p class="muted">Type at least two characters.</p>';
      return;
    }

    results.innerHTML = '<p class="muted">Indexing the deep…</p>';
    const documents = await buildSearchIndex((done, total) => {
      if (!searchIndex) results.innerHTML = `<p class="muted">Indexing the deep… ${done}/${total}</p>`;
    });

    const hits = [];
    for (const document of documents) {
      const haystack = `${document.title} ${document.context} ${document.extra || ''}`.toLowerCase();
      const inMeta = haystack.includes(needle);
      const body = document.text || '';
      const inBody = body.toLowerCase().includes(needle);
      if (!inMeta && !inBody) continue;

      const occurrences = body.toLowerCase().split(needle).length - 1;
      hits.push({
        document,
        score: (inMeta ? 100 : 0) + occurrences,
        snippet: inBody ? snippet(body, needle) : escapeHtml(document.extra || document.context),
        occurrences,
      });
    }

    hits.sort((a, b) => b.score - a.score);

    if (!hits.length) {
      results.innerHTML = `<p class="muted">Nothing in the archive matches “${escapeHtml(term)}”.</p>`;
      return;
    }

    results.innerHTML = hits.slice(0, 40).map((hit, i) => `
      <a class="result reveal" style="--i:${Math.min(i, 12)}" href="${hit.document.route}">
        <span class="tag ${hit.document.kind}">${hit.document.kind === 'wiki' ? 'Wiki' : 'Scene'}</span>
        <strong>${escapeHtml(hit.document.title)}</strong>
        <small>${hit.snippet}</small>
        ${hit.occurrences > 1 ? `<em>${hit.occurrences} mentions</em>` : ''}
      </a>
    `).join('');
    observeReveals();
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const value = input.value;
    timer = setTimeout(() => {
      const hash = value.trim() ? `#/search?q=${encodeURIComponent(value.trim())}` : '#/search';
      history.replaceState(null, '', hash);
      run(value);
    }, 220);
  });

  if (query) run(query);
  if (window.matchMedia('(min-width: 900px)').matches) input.focus();
}

/* ----------------------------------------------------------------- router */

async function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, queryString] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(queryString || '');

  try {
    if (!parts.length) return homeView();
    if (parts[0] === 'script') {
      if (parts.length >= 3) return await sceneView(parts[1], parts[2]);
      return scriptIndexView();
    }
    if (parts[0] === 'wiki') {
      if (parts.length >= 2) return await wikiPageView(parts[1]);
      return wikiIndexView();
    }
    if (parts[0] === 'search') return searchView(params.get('q') || '');
    throw new Error('That page is not in the archive.');
  } catch (error) {
    failure(error);
  }
}

/* -------------------------------------------------------------- ambience */

function ambience() {
  const canvas = document.getElementById('motes');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!canvas || reduced.matches) return;

  const context = canvas.getContext('2d');
  let particles = [];
  let frame = null;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = window.innerWidth < 640 ? 26 : 48;
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.8 + 0.4,
      drift: (Math.random() - 0.5) * 0.16,
      rise: Math.random() * 0.28 + 0.06,
      hue: Math.random() > 0.65 ? 282 : 190,
      alpha: Math.random() * 0.4 + 0.12,
    }));
  };

  const tick = () => {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      p.y -= p.rise;
      p.x += p.drift;
      if (p.y < -10) { p.y = window.innerHeight + 10; p.x = Math.random() * window.innerWidth; }
      if (p.x < -10) p.x = window.innerWidth + 10;
      if (p.x > window.innerWidth + 10) p.x = -10;

      context.beginPath();
      context.fillStyle = `hsla(${p.hue}, 90%, 72%, ${p.alpha})`;
      context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      context.fill();
    }
    frame = requestAnimationFrame(tick);
  };

  const start = () => { if (!frame) frame = requestAnimationFrame(tick); };
  const stop = () => { if (frame) { cancelAnimationFrame(frame); frame = null; } };

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  resize();
  start();
}

/* -------------------------------------------------------------- bootstrap */

async function start() {
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('hashchange', route);
  ambience();

  try {
    manifest = await fetch('content/manifest.json', { cache: 'no-cache' }).then((response) => {
      if (!response.ok) throw new Error('The archive manifest could not be read.');
      return response.json();
    });
  } catch (error) {
    failure(error);
    return;
  }

  document.title = `${manifest.site.title} · ${manifest.site.subtitle}`;
  document.body.classList.add('ready');
  route();
}

start();
