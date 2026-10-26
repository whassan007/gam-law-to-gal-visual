/**
 * Shared helpers for fetching authoritative legal texts from their original
 * publishers and reducing them to plain text with provenance.
 */
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';

export const UA = 'Mozilla/5.0 (compatible; law-source-fetch/1.0; +https://law.wael.bot)';

const lastHit = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Polite fetch: >=900 ms between requests to the same host, retries with backoff. */
export async function politeFetch(url, { accept = 'text/html,application/xml;q=0.9,*/*;q=0.8', headers = {}, tries = 3, timeoutMs = 90_000 } = {}) {
  const host = new URL(url).host;
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    const wait = (lastHit.get(host) ?? 0) + 900 - Date.now();
    if (wait > 0) await sleep(wait);
    lastHit.set(host, Date.now());
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': UA, Accept: accept, 'Accept-Encoding': 'gzip, deflate, br', ...headers },
      });
      const buf = Buffer.from(await res.arrayBuffer());
      if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status}`);
      return { status: res.status, buf, type: res.headers.get('content-type') ?? '', finalUrl: res.url };
    } catch (e) {
      lastErr = e;
      await sleep(1500 * attempt);
    }
  }
  throw lastErr;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', sect: '§', para: '¶', deg: '°', hellip: '…', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', ecirc: 'ê' };
export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}

export function tidy(text) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

const XML_INLINE = new Set(['Emphasis', 'I', 'E', 'B', 'SU', 'SUP', 'SUB', 'sup', 'sub', 'em', 'i', 'b', 'a', 'span', 'Language', 'XRefExternal', 'XRefInternal', 'DefinedTermEn', 'DefinedTermFr', 'DefinedTermEnFr', 'FTREF', 'Link', 'Repealed', 'Cite']);
const XML_SPACE = new Set(['Label', 'SECTNO', 'MarginalNoteTitle']);

/** Reduce an XML legal document (Justice Laws, eCFR, ...) to line-oriented text. */
export function xmlToText(xml) {
  const body = xml
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([A-Za-z][\w:.-]*)(\s[^>]*)?>/g, (m, name) => {
      if (XML_INLINE.has(name)) return '';
      if (XML_SPACE.has(name)) return ' ';
      return '\n';
    });
  return tidy(decodeEntities(body));
}

const SKIP = 'script,style,noscript,nav,header,footer,form,svg,iframe,button,.wb-inv,.noprint,.skip,#wb-bar,.breadcrumb';
const BLOCK = new Set(['P', 'DIV', 'LI', 'UL', 'OL', 'TR', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'PRE', 'BR', 'DT', 'DD', 'DL', 'TD', 'TH', 'CAPTION', 'HR']);

/** Reduce an HTML/XHTML page to text, optionally limited to a CSS selector. */
export function htmlToText(html, { selector, drop } = {}) {
  const dom = new JSDOM(html.replace(/<!--[\s\S]*?-->/g, ''), { contentType: 'text/html' });
  const doc = dom.window.document;
  doc.querySelectorAll(SKIP + (drop ? ',' + drop : '')).forEach((n) => n.remove());
  const root = (selector && doc.querySelector(selector)) || doc.querySelector('main') || doc.body;
  const walker = doc.createTreeWalker(root, 1);
  const els = [];
  for (let n = walker.currentNode; n; n = walker.nextNode()) if (BLOCK.has(n.tagName)) els.push(n);
  for (const el of els) {
    el.before(doc.createTextNode('\n'));
    el.after(doc.createTextNode('\n'));
  }
  root.querySelectorAll('td,th').forEach((c) => c.after(doc.createTextNode(' | ')));
  const text = root.textContent ?? '';
  dom.window.close();
  return tidy(text);
}

export async function pdfToText(buf) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return tidy(Array.isArray(text) ? text.join('\n') : text);
}

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/** Case-insensitive check that every expected phrase appears in the text. */
export function contentCheck(text, expect = []) {
  if (!expect.length) return { result: 'unchecked', missing: [] };
  const flat = text.replace(/\s+/g, ' ');
  const missing = expect.filter((p) => !new RegExp(p, 'i').test(flat));
  return { result: missing.length ? 'mismatch' : 'match', missing };
}
