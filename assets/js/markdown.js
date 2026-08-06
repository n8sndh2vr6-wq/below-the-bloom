/*
 * markdown.js — a small, dependency-free Markdown renderer.
 *
 * It covers what the articles in content/ actually use: front matter,
 * headings, paragraphs, lists with wrapped lines, blockquotes, tables, rules,
 * fenced code, inline formatting — and the IMAGE: directive, which is the one
 * addition to plain Markdown:
 *
 *   IMAGE: froststalker-king
 *   IMAGE: froststalker-king | He finds his children alive
 *
 * The slug is just the filename of something under assets/img/, without the
 * extension. tools/build.mjs maps every slug to its file.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const MARK = '\u0000';

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Strip the `---` block off the top of a document. */
export function parseFrontMatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, body: source };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (pair) data[pair[1]] = pair[2].replace(/^["']|["']$/g, '');
  }
  return { data, body: source.slice(match[0].length) };
}

/** Turn `slug | caption` into a figure, or a labelled gap if the file is absent. */
export function renderImage(value, images = {}) {
  const [slug, caption = ''] = String(value).split('|').map((s) => s.trim());
  const src = images[slug];
  const label = caption || slug.replace(/-/g, ' ');

  if (!src) {
    return `<figure class="figure missing">`
      + `<div class="plate empty"></div>`
      + `<figcaption>Awaiting <code>${escapeHtml(slug)}</code></figcaption>`
      + `</figure>`;
  }

  return `<figure class="figure">`
    + `<div class="plate"><img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" loading="lazy" decoding="async"></div>`
    + (caption ? `<figcaption>${inline(caption)}</figcaption>` : '')
    + `</figure>`;
}

/* ---------------------------------------------------------------- inline */

function inline(text) {
  const codeSpans = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code);
    return `${MARK}${codeSpans.length - 1}${MARK}`;
  });

  out = escapeHtml(out);

  // Images before links — the syntax only differs by the leading bang.
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
    `<img src="${src}" alt="${alt}" loading="lazy">`);

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:/i.test(href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${attrs}>${label}</a>`;
  });

  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s.,;:!?)])/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,;:!?)])/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');

  return out.replace(new RegExp(`${MARK}(\\d+)${MARK}`, 'g'), (_, i) =>
    `<code>${escapeHtml(codeSpans[Number(i)])}</code>`);
}

/* ----------------------------------------------------------------- block */

const BULLET = /^\s*([*+-])\s+(.*)$/;
const NUMBER = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_DIVIDER = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;
const IMAGE = /^IMAGE\s*:\s*(.+)$/i;

const slugify = (text) => text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

function renderList(items, ordered, start) {
  const body = items.map((item) => `<li>${inline(item.join(' ').trim())}</li>`).join('');
  if (!ordered) return `<ul>${body}</ul>`;
  return `<ol${start > 1 ? ` start="${start}"` : ''}>${body}</ol>`;
}

function renderTable(rows) {
  const cells = (row) =>
    row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((cell) => cell.trim());

  const head = `<thead><tr>${cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`;
  const body = rows.slice(2)
    .map((row) => `<tr>${cells(row).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
    .join('');

  return `<div class="table-scroll"><table>${head}<tbody>${body}</tbody></table></div>`;
}

/**
 * Render Markdown to HTML.
 * Returns `{ html, headings }`; `images` maps IMAGE: slugs to files.
 */
export function renderMarkdown(source, images = {}) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  const headings = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const picture = IMAGE.exec(line.trim());
    if (picture) {
      html.push(renderImage(picture[1], images));
      index += 1;
      continue;
    }

    if (/^\s*```/.test(line)) {
      const buffer = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) { buffer.push(lines[index]); index += 1; }
      index += 1;
      html.push(`<pre><code>${escapeHtml(buffer.join('\n'))}</code></pre>`);
      continue;
    }

    if (RULE.test(line)) { html.push('<hr>'); index += 1; continue; }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text);
      headings.push({ level, text, id });
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.includes('|') && TABLE_DIVIDER.test(lines[index + 1] || '')) {
      const rows = [];
      while (index < lines.length && lines[index].includes('|')) { rows.push(lines[index]); index += 1; }
      html.push(renderTable(rows));
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buffer = [];
      while (index < lines.length && (/^\s*>/.test(lines[index]) || (buffer.length && lines[index].trim()))) {
        buffer.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote>${renderMarkdown(buffer.join('\n'), images).html}</blockquote>`);
      continue;
    }

    if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = !BULLET.test(line);
      const start = ordered ? Number(NUMBER.exec(line)[1]) : 1;
      const items = [];

      while (index < lines.length) {
        const current = lines[index];
        const bullet = BULLET.exec(current);
        const number = NUMBER.exec(current);
        const match = ordered ? number : bullet;

        if (match) { items.push([match[2]]); index += 1; continue; }
        if (items.length && current.trim() && /^\s{2,}/.test(current) && !bullet && !number) {
          items[items.length - 1].push(current.trim());
          index += 1;
          continue;
        }
        break;
      }

      html.push(renderList(items, ordered, start));
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim()
      && !HEADING.test(lines[index]) && !RULE.test(lines[index])
      && !/^\s*>/.test(lines[index]) && !/^\s*```/.test(lines[index])
      && !IMAGE.test(lines[index].trim())
      && !BULLET.test(lines[index]) && !NUMBER.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }

  return { html: html.join('\n'), headings };
}
