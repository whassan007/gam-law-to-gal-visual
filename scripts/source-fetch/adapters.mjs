import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { inflateRawSync } from 'node:zlib';
import { politeFetch, xmlToText, htmlToText, pdfToText, UA } from './lib.mjs';

const execFileAsync = promisify(execFile);

let ecfrDates;
async function ecfrDate(title) {
  if (!ecfrDates) {
    const r = await politeFetch('https://www.ecfr.gov/api/versioner/v1/titles.json', { accept: 'application/json' });
    ecfrDates = Object.fromEntries(JSON.parse(r.buf.toString('utf8')).titles.map((t) => [t.number, t.up_to_date_as_of]));
  }
  return ecfrDates[title];
}

const pageCache = new Map();
async function cached(key, fn) {
  if (!pageCache.has(key)) pageCache.set(key, fn());
  return pageCache.get(key);
}

const ok = (r, what) => {
  if (r.status !== 200 || r.buf.length < 400) throw new Error(`${what}: HTTP ${r.status}, ${r.buf.length} bytes`);
  return r;
};

const CA_PUBINFO_URL = 'https://downloads.leginfo.legislature.ca.gov/pubinfo_2025.zip';
let caPubinfoPromise;

async function fetchRange(url, start, end) {
  const r = await politeFetch(url, { accept: '*/*', headers: { Range: `bytes=${start}-${end}` }, timeoutMs: 120_000 });
  if (r.status !== 206 && r.status !== 200) throw new Error(`${url}: Range HTTP ${r.status}`);
  return r.buf;
}

async function getCaPubinfoIndex() {
  if (!caPubinfoPromise) {
    caPubinfoPromise = (async () => {
      const head = await fetch(CA_PUBINFO_URL, { method: 'HEAD', headers: { 'User-Agent': UA } });
      const totalSize = Number(head.headers.get('content-length'));
      const tailBuf = await fetchRange(CA_PUBINFO_URL, totalSize - 65536, totalSize - 1);
      let cdSize = 0;
      let cdOffset = 0;
      for (let i = tailBuf.length - 22; i >= 0; i--) {
        if (tailBuf.readUInt32LE(i) === 0x06054b50) {
          cdSize = tailBuf.readUInt32LE(i + 12);
          cdOffset = tailBuf.readUInt32LE(i + 16);
          break;
        }
      }
      if (!cdOffset) throw new Error('CA pubinfo zip: EOCD not found');
      const cdBuf = await fetchRange(CA_PUBINFO_URL, cdOffset, cdOffset + cdSize - 1);
      const entries = new Map();
      let pos = 0;
      while (pos < cdBuf.length - 46) {
        if (cdBuf.readUInt32LE(pos) === 0x02014b50) {
          const compSize = cdBuf.readUInt32LE(pos + 20);
          const nameLen = cdBuf.readUInt16LE(pos + 28);
          const extraLen = cdBuf.readUInt16LE(pos + 30);
          const commentLen = cdBuf.readUInt16LE(pos + 32);
          const offset = cdBuf.readUInt32LE(pos + 42);
          const name = cdBuf.subarray(pos + 46, pos + 46 + nameLen).toString('utf8');
          entries.set(name, { offset, compSize });
          pos += 46 + nameLen + extraLen + commentLen;
        } else {
          pos++;
        }
      }
      const secEntry = entries.get('LAW_SECTION_TBL.dat');
      const secRaw = await fetchRange(CA_PUBINFO_URL, secEntry.offset, secEntry.offset + secEntry.compSize + 256);
      const nl = secRaw.readUInt16LE(26);
      const el = secRaw.readUInt16LE(28);
      const secTxt = inflateRawSync(secRaw.subarray(30 + nl + el, 30 + nl + el + secEntry.compSize)).toString('utf8');
      const rows = [];
      for (const line of secTxt.split(/\r?\n/)) {
        if (!line) continue;
        const cols = line.split('\t').map((c) => c.replace(/^`|`$/g, ''));
        if (cols[15] === 'Y') rows.push(cols);
      }
      return { entries, rows };
    })();
  }
  return caPubinfoPromise;
}

/** Each adapter returns { text, url } for one source part. */
export const ADAPTERS = {
  /** Canada: Justice Laws consolidated XML (acts and regulations). */
  async justice({ code }) {
    const url = `https://laws-lois.justice.gc.ca/eng/XML/${code}.xml`;
    return cached(url, async () => {
      const r = ok(await politeFetch(url), url);
      return { text: xmlToText(r.buf.toString('utf8')), url: `https://laws-lois.justice.gc.ca/eng/${code.startsWith('SOR') || code.startsWith('C.R.C') ? 'regulations' : 'acts'}/${code}/` };
    });
  },

  /** Canada: A2AJ Canadian Legal Data API (statutes and regulations). */
  async a2aj({ citation }) {
    const apiUrl = `https://api.a2aj.ca/fetch?doc_type=laws&output_language=en&citation=${encodeURIComponent(citation)}`;
    return cached(apiUrl, async () => {
      const r = ok(await politeFetch(apiUrl, { accept: 'application/json' }), apiUrl);
      const doc = JSON.parse(r.buf.toString('utf8')).results?.[0];
      const text = doc?.unofficial_text_en || doc?.unofficial_text_fr;
      if (!text || text.length < 400) throw new Error(`${citation}: no text in A2AJ response`);
      return { text: text.trim() + '\n', url: doc.source_url_en || doc.source_url_fr || apiUrl };
    });
  },

  /** Canada: Ontario e-Laws official JSON API. */
  async ontario({ code }) {
    const apiUrl = `https://www.ontario.ca/laws/api/v2/legislation/en/doc-search/statute/${code}`;
    return cached(apiUrl, async () => {
      const r = ok(await politeFetch(apiUrl, { accept: 'application/json' }), apiUrl);
      const doc = JSON.parse(r.buf.toString('utf8'));
      if (!doc?.content) throw new Error(`${code}: no content in Ontario e-Laws response`);
      const header = doc.title ? `${doc.title}\n\n` : '';
      return { text: header + htmlToText(doc.content), url: `https://www.ontario.ca/laws/statute/${code}` };
    });
  },

  /** EU: Publications Office (Cellar) XHTML, English. */
  async cellar({ celex }) {
    const url = `https://publications.europa.eu/resource/celex/${encodeURIComponent(celex)}`;
    return cached(url, async () => {
      const page = `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`;
      const x = await politeFetch(url, { accept: 'application/xhtml+xml,text/html;q=0.9', headers: { 'Accept-Language': 'eng' } });
      if (x.status === 200 && x.buf.length > 400) return { text: htmlToText(x.buf.toString('utf8')), url: page };
      if (x.status === 300) {
        const body = x.buf.toString('utf8');
        const docUrl = body.match(/https?:\/\/publications\.europa\.eu\/resource\/cellar\/[^\s"<>()]+\/DOC_1/)?.[0]?.replace(/^http:/, 'https:');
        if (docUrl) {
          const d = ok(await politeFetch(docUrl, { accept: 'text/html,application/xhtml+xml,*/*' }), docUrl);
          return { text: htmlToText(d.buf.toString('utf8')), url: page };
        }
      }
      // Older acts have no XHTML manifestation; the Official Journal PDF is the authentic form.
      const p = ok(await politeFetch(url, { accept: 'application/pdf', headers: { 'Accept-Language': 'eng' } }), url);
      return { text: await pdfToText(p.buf), url: page };
    });
  },

  /** US: eCFR current text of a part (optionally a single section). */
  async ecfr({ title, part, section }) {
    const date = await ecfrDate(title);
    const qs = section ? `section=${encodeURIComponent(section)}` : `part=${part}`;
    const url = `https://www.ecfr.gov/api/versioner/v1/full/${date}/title-${title}.xml?${qs}`;
    return cached(url, async () => {
      const r = ok(await politeFetch(url, { accept: 'application/xml' }), url);
      const canonicalUrl = section
        ? `https://www.ecfr.gov/current/title-${title}/section-${section}`
        : `https://www.ecfr.gov/current/title-${title}/part-${part}`;
      return {
        text: xmlToText(r.buf.toString('utf8')),
        url: canonicalUrl,
        requestedUrl: url,
        finalUrl: r.finalUrl,
        versionDate: date,
      };
    });
  },

  /** US: one U.S. Code section via the GPO's govinfo link service. */
  async usc({ title, section }) {
    const url = `https://www.govinfo.gov/link/uscode/${title}/${section}?type=usc&year=mostrecent&link-type=html`;
    return cached(url, async () => {
      const r = ok(await politeFetch(url, { accept: 'text/html' }), url);
      return { text: htmlToText(r.buf.toString('utf8')), url: `https://www.govinfo.gov/link/uscode/${title}/${section}` };
    });
  },

  /** US: a Public Law as published by GPO. */
  async plaw({ congress, number }) {
    const id = `PLAW-${congress}publ${number}`;
    const url = `https://www.govinfo.gov/content/pkg/${id}/html/${id}.htm`;
    return cached(url, async () => {
      const r = ok(await politeFetch(url, { accept: 'text/html' }), url);
      return { text: htmlToText(r.buf.toString('utf8')), url };
    });
  },

  /** US: California Legislative Information bulk database (downloads.leginfo.legislature.ca.gov). */
  async caLeg({ code, pattern, article, officialUrl }) {
    const re = new RegExp(pattern);
    const key = `caLeg:${code}:${pattern}:${article ?? ''}`;
    return cached(key, async () => {
      const { entries, rows } = await getCaPubinfoIndex();
      const matched = rows
        .filter((r) => r[1] === code && re.test(r[2].replace(/\.$/, '')) && (!article || r[12] === article))
        .sort((a, b) => a[2].localeCompare(b[2], undefined, { numeric: true }));
      if (!matched.length) throw new Error(`${key}: no sections matched in pubinfo_2025.zip`);
      const parts = [];
      for (const r of matched) {
        const lobName = r[14];
        const e = entries.get(lobName);
        if (!e) continue;
        const raw = await fetchRange(CA_PUBINFO_URL, e.offset, e.offset + e.compSize + 128);
        const nl = raw.readUInt16LE(26);
        const el = raw.readUInt16LE(28);
        const xml = inflateRawSync(raw.subarray(30 + nl + el, 30 + nl + el + e.compSize)).toString('utf8');
        parts.push(`§ ${r[2].replace(/\.$/, '')} (${r[1]})\n${htmlToText(xml)}\n[${r[13]}]`);
      }
      return { text: parts.join('\n\n'), url: officialUrl || CA_PUBINFO_URL };
    });
  },

  /** Russia: Official Internet Portal of Legal Information (actual.pravo.gov.ru). */
  async pravoRu({ redid, officialUrl }) {
    const apiUrl = `http://actual.pravo.gov.ru:8000/api/ebpi/redtext?bpa=ebpi&t=${redid}&ttl=1`;
    return cached(apiUrl, async () => {
      const r = ok(await politeFetch(apiUrl, { accept: 'application/json' }), apiUrl);
      const doc = JSON.parse(r.buf.toString('utf8'));
      if (!doc?.redtext) throw new Error(`pravoRu ${redid}: no redtext`);
      return { text: htmlToText(doc.redtext), url: officialUrl || apiUrl };
    });
  },

  /** Generic XML document. */
  async xml({ url, officialUrl }) {
    return cached('xml:' + url, async () => {
      const r = ok(await politeFetch(url, { accept: 'application/xml,text/xml,*/*' }), url);
      return { text: xmlToText(r.buf.toString('utf8')), url: officialUrl || url, requestedUrl: url, finalUrl: r.finalUrl };
    });
  },

  /** Generic HTML page (falls back to system curl when Node lacks an intermediate CA certificate). */
  async html({ url, selector, drop, officialUrl, useSystemCa, encoding }) {
    return cached(url + '|' + selector, async () => {
      let buf;
      let finalUrl;
      if (useSystemCa) {
        const { stdout } = await execFileAsync('curl', ['-sSL', '--max-time', '30', '-A', UA, url], { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 });
        if (stdout.length < 400) throw new Error(`${url}: curl returned ${stdout.length} bytes`);
        buf = stdout;
      } else {
        const r = ok(await politeFetch(url), url);
        buf = r.buf;
        finalUrl = r.finalUrl;
      }
      const rawHtml = encoding ? new TextDecoder(encoding).decode(buf) : buf.toString('utf8');
      return { text: htmlToText(rawHtml, { selector, drop }), url: officialUrl || url, requestedUrl: url, ...(finalUrl ? { finalUrl } : {}) };
    });
  },

  /** Index page whose section links (same directory, .htm) are fetched and concatenated. */
  async crawl({ url, linkPattern = /href="([^"#?]+\.htm)"/gi, max = 80 }) {
    const idx = ok(await politeFetch(url), url);
    const base = new URL(url);
    const html = idx.buf.toString('utf8');
    const links = [...new Set([...html.matchAll(linkPattern)].map((m) => new URL(m[1], base).href))]
      .filter((u) => u !== url && new URL(u).pathname.startsWith(base.pathname.replace(/[^/]*$/, '')))
      .slice(0, max);
    if (!links.length) throw new Error(`${url}: no section links found`);
    const texts = [];
    for (const u of links) {
      const r = ok(await politeFetch(u), u);
      texts.push(htmlToText(r.buf.toString('utf8')));
    }
    return { text: texts.join('\n\n'), url };
  },

  /** PDF document. */
  async pdf({ url, officialUrl }) {
    return cached(url, async () => {
      const r = ok(await politeFetch(url, { accept: 'application/pdf,*/*;q=0.8' }), url);
      if (!r.buf.subarray(0, 5).toString().startsWith('%PDF')) throw new Error(`${url}: not a PDF (${r.type})`);
      return { text: await pdfToText(r.buf), url: officialUrl || url, requestedUrl: url, finalUrl: r.finalUrl };
    });
  },
};
