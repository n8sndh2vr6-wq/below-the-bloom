/*
 * markdown.js — a small, dependency-free Markdown renderer.
 *
 * It covers exactly what the wiki source files in content/wiki/ use:
 * front matter, headings, paragraphs, lists (with wrapped continuation
 * lines), blockquotes, tables, rules, fenced code and inline formatting.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Split `---\nkey: value\n---` front matter off the top of a document. */
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

/* ---------------------------------------------------------------- inline */

function inline(text) {
  const codeSpans = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code);
    return `\u0000${codeSpans.length - 1}\u0000`;
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

  return out.replace(/\u0000(\d+)\u0000/g, (_, index) =>
    `<code>${escapeHtml(codeSpans[Number(index)])}</code>`);
}

/* ----------------------------------------------------------------- block */

const BULLET = /^\s*([*+-])\s+(.*)$/;
const NUMBER = /^\s*(\d+)[.)]\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_DIVIDER = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

function renderListItems(items, ordered, start) {
  const body = items
    .map((item) => `<li>${inline(item.join(' ').trim())}</li>`)
    .join('');
  if (!ordered) return `<ul>${body}</ul>`;
  const startAttr = start > 1 ? ` start="${start}"` : '';
  return `<ol${startAttr}>${body}</ol>`;
}

function renderTable(rows) {
  const cells = (row) =>
    row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((cell) => cell.trim());

  const head = cells(rows[0]);
  const body = rows.slice(2).map(cells);

  const thead = `<thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`;
  const tbody = body
    .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`)
    .join('');

  return `<div class="table-scroll"><table>${thead}<tbody>${tbody}</tbody></table></div>`;
}

/**
 * Render Markdown to an HTML string.
 * Returns `{ html, headings }` so the reader can build a contents rail.
 */
export function renderMarkdown(source) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  const headings = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) { index += 1; continue; }

    // Fenced code
    if (/^\s*```/.test(line)) {
      const buffer = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        buffer.push(lines[index]);
        index += 1;
      }
      index += 1;
      html.push(`<pre><code>${escapeHtml(buffer.join('\n'))}</code></pre>`);
      continue;
    }

    if (RULE.test(line)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

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

    // Table: a header row followed by a divider row.
    if (line.includes('|') && TABLE_DIVIDER.test(lines[index + 1] || '')) {
      const rows = [];
      while (index < lines.length && lines[index].includes('|')) {
        rows.push(lines[index]);
        index += 1;
      }
      html.push(renderTable(rows));
      continue;
    }

    // Blockquote — gather the run, strip markers, recurse.
    if (/^\s*>/.test(line)) {
      const buffer = [];
      while (index < lines.length && (/^\s*>/.test(lines[index]) || (buffer.length && lines[index].trim()))) {
        buffer.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote>${renderMarkdown(buffer.join('\n')).html}</blockquote>`);
      continue;
    }

    // Lists — continuation lines that are indented join the current item.
    if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = !BULLET.test(line);
      const start = ordered ? Number(NUMBER.exec(line)[1]) : 1;
      const items = [];

      while (index < lines.length) {
        const current = lines[index];
        const bullet = BULLET.exec(current);
        const number = NUMBER.exec(current);
        const matchesKind = ordered ? number : bullet;

        if (matchesKind) {
          items.push([matchesKind[2]]);
          index += 1;
          continue;
        }
        // A wrapped line belonging to the previous item.
        if (items.length && current.trim() && /^\s{2,}/.test(current) && !bullet && !number) {
          items[items.length - 1].push(current.trim());
          index += 1;
          continue;
        }
        break;
      }

      html.push(renderListItems(items, ordered, start));
      continue;
    }

    // Paragraph
    const paragraph = [];
    while (index < lines.length && lines[index].trim()
      && !HEADING.test(lines[index]) && !RULE.test(lines[index])
      && !/^\s*>/.test(lines[index]) && !/^\s*```/.test(lines[index])
      && !BULLET.test(lines[index]) && !NUMBER.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }

  return { html: html.join('\n'), headings };
}
