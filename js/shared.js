(function (root, factory) {
  const exports = factory();
  if (typeof window !== 'undefined') {
    window.EVShared = exports;
  }
  if (typeof define === 'function' && define.amd) {
    define([], function () { return exports; });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = exports;
  } else {
    root.EVShared = exports;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  const formatPrice = (price) => {
    if (price === null || price === undefined || Number.isNaN(Number(price))) return "—";
    const num = Number(price);
    if (Number.isNaN(num)) return "—";
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "€" + parts.join(",");
  };

  const formatSource = (s) => {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const formatKm = (km) => {
    const num = Number(km);
    if (km === null || km === undefined || km === "" || Number.isNaN(num)) return "";
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(",") + " km";
  };

  const renderTags = (x) => {
    if (!x) return "";
    const tags = [
      x.archived ? '<span class="tag arch">Archived</span>' : ""
    ].filter(Boolean).join("");
    return tags ? `<div class="tags">${tags}</div>` : "";
  };

  const safeImageUrl = (value) => {
    if (!value) return "";
    try {
      const url = new URL(String(value));
      return url.protocol === "https:" ? url.href : "";
    } catch (_) {
      return "";
    }
  };

  const renderCard = (x) => {
    const imageUrl = safeImageUrl(x.image_url);
    const imageHTML = imageUrl
      ? `<a class="photo" href="${esc(x.url)}" target="_blank" rel="noopener" aria-label="Ver anúncio: ${esc(x.title || "carro")}">
          <img src="${esc(imageUrl)}" alt="Foto de ${esc(x.title || "carro")}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.photo').classList.add('photo-error');this.remove()">
        </a>`
      : `<div class="photo photo-empty" aria-hidden="true"><span>Sem foto</span></div>`;
    const tagsHTML = renderTags(x);
    // Descritivo "localidade (cidade)"; sem cidade reconhecida mostra a localizacao original
    const place = x.city ? `${x.locality || x.city} (${x.city})` : x.location;
    const meta = [
      place ? "📍 " + esc(place) : "",
      x.year ? esc(x.year) : "",
      formatKm(x.mileage)
    ].filter(Boolean).join(" · ");
    const cap = (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
    const head = [cap(esc(x.brand)), esc(x.model)].filter(v => v && v.toLowerCase() !== "undefined").join(" ").trim();
    return `<article class="item">
        ${imageHTML}
        <div class="item-copy">
          <div class="src">${esc(x.source)} · ${head} · ${esc(x.sent_date)}</div>
          <div class="title"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || x.url)}</a></div>
          <div class="meta">${meta}</div>
          ${tagsHTML}
        </div>
        <div class="item-action">
          <div class="price">${formatPrice(x.price)}</div>
          <a class="view" href="${esc(x.url)}" target="_blank" rel="noopener">Ver anúncio →</a>
        </div>
      </article>`;
  };

  // Filtragem, ordenacao e estatisticas em memoria (sem ida a rede por filtro)
  const SORTS = {
    date: (a, b) => String(b.sent_date || "").localeCompare(String(a.sent_date || "")) || (a.price - b.price),
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price
  };

  const applyFilters = (rows, f) => {
    const min = Number(f.min) || 0;
    const max = f.max === "" || f.max == null ? Infinity : Number(f.max);
    const arch = f.archived ? 1 : 0;
    return (rows || []).filter((x) =>
      Number(x.price) >= min && Number(x.price) <= max &&
      Number(x.archived || 0) === arch &&
      (!f.brand || f.brand === "all" || x.brand === f.brand) &&
      (!f.source || f.source === "all" || x.source === f.source) &&
      (!f.city || f.city === "all" || x.city === f.city)
    ).sort(SORTS[f.sort] || SORTS.date);
  };

  const computeStats = (filtered, all) => {
    const prices = filtered.map((x) => Number(x.price)).filter((p) => !Number.isNaN(p));
    return {
      total: filtered.length,
      avg_price: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      min_price: prices.length ? Math.min(...prices) : 0,
      archived: (all || []).filter((x) => Number(x.archived) === 1).length
    };
  };

  return {
    applyFilters,
    computeStats,
    esc,
    formatPrice,
    formatSource,
    formatKm,
    renderTags,
    safeImageUrl,
    renderCard
  };
}));
