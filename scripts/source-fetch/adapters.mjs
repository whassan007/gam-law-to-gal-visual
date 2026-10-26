import { politeFetch, xmlToText, htmlToText, pdfToText } from './lib.mjs';

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

  /** EU: Publications Office (Cellar) XHTML, English. */
  async cellar({ celex }) {
    const url = `https://publications.europa.eu/resource/celex/${celex}`;
    return cached(url, async () => {
      const page = `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`;
      const x = await politeFetch(url, { accept: 'application/xhtml+xml', headers: { 'Accept-Language': 'eng' } });
      if (x.status === 200 && x.buf.length > 400) return { text: htmlToText(x.buf.toString('utf8')), url: page };
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
      return { text: xmlToText(r.buf.toString('utf8')), url: `https://www.ecfr.gov/current/title-${title}/part-${part}` };
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

  /** Generic HTML page. */
  async html({ url, selector, drop }) {
    return cached(url + '|' + selector, async () => {
      const r = ok(await politeFetch(url), url);
      return { text: htmlToText(r.buf.toString('utf8'), { selector, drop }), url };
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
  async pdf({ url }) {
    return cached(url, async () => {
      const r = ok(await politeFetch(url, { accept: 'application/pdf,*/*;q=0.8' }), url);
      if (!r.buf.subarray(0, 5).toString().startsWith('%PDF')) throw new Error(`${url}: not a PDF (${r.type})`);
      return { text: await pdfToText(r.buf), url };
    });
  },
};
