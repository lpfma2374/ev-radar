const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_DB_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const BRANDS = ["polestar", "byd", "jaguar", "tesla", "volvo", "xpeng", "renault", "peugeot", "citroen"];

// Filtro "Cidade": apenas os concelhos pesquisados pelo scraper.
// A localizacao vem como "localidade (distrito)"; as freguesias de Almada
// chegam marcadas como (Setúbal), por isso sao reclassificadas aqui.
const CITIES = ["Porto", "Braga", "Almada", "Setúbal"];
const ALMADA_TERMS = ["Almada", "Caparica", "Sobreda", "Trafaria", "Laranjeiro", "Feijó", "Cova da Piedade", "Pragal", "Cacilhas"];
const CITY_EXPR = `CASE
  WHEN (location LIKE '%(Setúbal)' OR location = 'Almada')
       AND (${ALMADA_TERMS.map(t => `location LIKE '%${t}%'`).join(" OR ")}) THEN 'Almada'
  WHEN location LIKE '%(Porto)' OR location = 'Porto' THEN 'Porto'
  WHEN location LIKE '%(Braga)' OR location = 'Braga' THEN 'Braga'
  WHEN location LIKE '%(Setúbal)' OR location = 'Setúbal' THEN 'Setúbal'
  ELSE NULL END`;

// "Custóias, Leça do Balio e Guifões (Porto)" -> "Custóias, Leça do Balio e Guifões"
const localityOf = (loc) => String(loc || "").replace(/\s*\([^()]*\)\s*$/, "").trim();

// Uma unica query D1 por pedido (antes eram 5 sequenciais). A tabela e pequena
// e so muda uma vez por dia, por isso a filtragem/estatisticas fazem-se em memoria.
const ALL_SQL = `SELECT url, title, source, price, brand, model, variant, year, mileage, location,
  (${CITY_EXPR}) AS city, sent_date, image_url, archived, archived_date
  FROM sent_listings ORDER BY sent_date DESC, price ASC`;

// Cache em memoria da instancia quente da funcao (evita ida ao D1 em pedidos seguidos)
const MEM_TTL_MS = 30_000;
let memCache = { at: 0, rows: null };

async function d1(sql, params = []) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sql, params })
    }
  );
  const j = await r.json();
  if (!j.success) throw new Error((j.errors && j.errors[0] && j.errors[0].message) || "D1 query failed");
  return (j.result && j.result[0] && j.result[0].results) || [];
}

async function allRows() {
  if (memCache.rows && Date.now() - memCache.at < MEM_TTL_MS) return { rows: memCache.rows, hit: true };
  const rows = (await d1(ALL_SQL)).map((x) => ({ ...x, locality: localityOf(x.location) || x.city || "" }));
  memCache = { at: Date.now(), rows };
  return { rows, hit: false };
}

const SORTS = {
  date: (a, b) => String(b.sent_date || "").localeCompare(String(a.sent_date || "")) || (a.price - b.price),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  try {
    const t0 = Date.now();
    const { rows, hit } = await allRows();
    const tD1 = Date.now() - t0;
    const sp = new URL(req.url, `https://${req.headers.host || "localhost"}`).searchParams;

    // CDN da Vercel serve a resposta durante 60s e revalida em background ate 5 min
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
    res.setHeader("Server-Timing", `d1;dur=${tD1};desc="${hit ? "mem-hit" : "d1"}"`);

    const sources = [...new Set(rows.map((r) => r.source).filter(Boolean))].sort();
    const archivedTotal = rows.filter((r) => r.archived === 1).length;

    // Modo usado pelo frontend: devolve o dataset completo, filtros aplicados no browser
    if (sp.get("all") === "1") {
      return res.status(200).json({ ok: true, cities: CITIES, sources, count: rows.length, listings: rows });
    }

    // Modo compativel (data-quality, integracoes): mesma semantica dos filtros anteriores
    const min = Math.max(0, parseInt(sp.get("min") || "12000", 10) || 12000);
    const max = Math.min(100000, parseInt(sp.get("max") || "30000", 10) || 30000);
bca069 (Intervalo de preco 12.000-30.000 EUR por defeito (frontend + API))
    const brand = BRANDS.includes(sp.get("brand")) ? sp.get("brand") : "all";
    const source = sp.get("source") || "all";
    const showArchived = sp.get("archived") === "1";
    const sort = SORTS[sp.get("sort")] ? sp.get("sort") : "date";
    const limit = Math.min(parseInt(sp.get("limit") || "200", 10) || 200, 500);
    const city = CITIES.includes((sp.get("city") || "").trim()) ? sp.get("city").trim() : "all";

    const filtered = rows.filter((x) =>
      x.price >= min && x.price <= max && x.archived === (showArchived ? 1 : 0) &&
      (brand === "all" || x.brand === brand) &&
      (source === "all" || x.source === source) &&
      (city === "all" || x.city === city)
    ).sort(SORTS[sort]);

    const prices = filtered.map((x) => x.price);
    const brandCount = {};
    for (const x of filtered) brandCount[x.brand] = (brandCount[x.brand] || 0) + 1;

    return res.status(200).json({
      ok: true,
      cities: CITIES,
      count: Math.min(filtered.length, limit),
      listings: filtered.slice(0, limit),
      stats: {
        total: filtered.length,
        avg_price: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
        min_price: prices.length ? Math.min(...prices) : 0,
        avg_year: filtered.length ? Math.round(filtered.reduce((a, x) => a + (x.year || 0), 0) / filtered.length) : 0,
        archived: archivedTotal
      },
      brands: Object.entries(brandCount).sort((a, b) => b[1] - a[1]).map(([b, n]) => ({ brand: b, n })),
      sources
    });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}
