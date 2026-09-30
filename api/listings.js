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

const ORDER = {
  date: "sent_date DESC, price ASC",
  price_asc: "price ASC",
  price_desc: "price DESC"
};

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  try {
    const sp = new URL(req.url, `https://${req.headers.host || "localhost"}`).searchParams;
    const min = Math.max(0, parseInt(sp.get("min") || "15000", 10) || 15000);
    const max = Math.min(100000, parseInt(sp.get("max") || "25000", 10) || 25000);
    const brand = BRANDS.includes(sp.get("brand")) ? sp.get("brand") : "all";
    const source = sp.get("source") || "all";
    const showArchived = sp.get("archived") === "1";
    const sort = ORDER[sp.get("sort")] ? sp.get("sort") : "date";
    const limit = Math.min(parseInt(sp.get("limit") || "200", 10) || 200, 500);

    const city = CITIES.includes((sp.get("city") || "").trim()) ? sp.get("city").trim() : "all";
    const where = ["price >= ?", "price <= ?", "archived = ?"];
    const params = [min, max, showArchived ? 1 : 0];
    if (brand !== "all") { where.push("brand = ?"); params.push(brand); }
    if (source !== "all") { where.push("source = ?"); params.push(source); }
    const W = where.join(" AND ");
    const Wf = city !== "all"
      ? where.concat([`(${CITY_EXPR}) = ?`]).join(" AND ")
      : W;
    const paramsF = city !== "all" ? params.concat([city]) : params;

    const listings = await d1(
      `SELECT url, title, source, price, brand, model, variant, year, mileage, location, (${CITY_EXPR}) AS city, sent_date, image_url, archived, archived_date
       FROM sent_listings WHERE ${Wf} ORDER BY ${ORDER[sort]} LIMIT ?`,
      [...paramsF, limit]
    );

    const statsRows = await d1(
      `SELECT COUNT(*) AS total, COALESCE(AVG(price),0) AS avg_price,
              COALESCE(MIN(price),0) AS min_price, COALESCE(AVG(year),0) AS avg_year
       FROM sent_listings WHERE ${Wf}`,
      paramsF
    );
    const stats = statsRows[0] || {};

    const brandRows = await d1(
      `SELECT brand, COUNT(*) AS n FROM sent_listings WHERE ${Wf} GROUP BY brand ORDER BY n DESC`,
      paramsF
    );

    const archRows = await d1(
      `SELECT COUNT(*) AS archived FROM sent_listings WHERE archived = 1`
    );
    const archivedTotal = (archRows[0] || {}).archived || 0;

    const sources = await d1(
      `SELECT DISTINCT source FROM sent_listings ORDER BY source`
    );


    return res.status(200).json({
      ok: true,
      cities: CITIES,
      count: listings.length,
      listings: listings.map((x) => ({ ...x, locality: localityOf(x.location) || x.city || "" })),
      stats: {
        total: stats.total || 0,
        avg_price: Math.round(stats.avg_price || 0),
        min_price: stats.min_price || 0,
        avg_year: Math.round(stats.avg_year || 0),
        archived: archivedTotal
      },
      brands: brandRows.map(b => ({ brand: b.brand, n: b.n })),
      sources: sources.map(s => s.source)
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}
