import { describe, it, expect } from 'vitest';
import S from '../../js/shared.js';

describe('esc — HTML escaping', () => {
  it('escapes dangerous HTML characters', () => {
    expect(S.esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(S.esc('a"b')).toBe('a&quot;b');
    expect(S.esc("o'brien")).toBe('o&#39;brien');
    expect(S.esc('a&b')).toBe('a&amp;b');
  });

  it('handles null, undefined and numbers', () => {
    expect(S.esc(null)).toBe('');
    expect(S.esc(undefined)).toBe('');
    expect(S.esc(123)).toBe('123');
  });
});

describe('formatPrice — price formatting', () => {
  it('formats numeric prices with euro sign and pt thousands separator', () => {
    expect(S.formatPrice(24499)).toBe('€24.499');
    expect(S.formatPrice(15000)).toBe('€15.000');
  });

  it('returns dash for invalid or missing price', () => {
    expect(S.formatPrice(null)).toBe('—');
    expect(S.formatPrice(undefined)).toBe('—');
    expect(S.formatPrice('abc')).toBe('—');
  });
});

describe('formatSource — source portal capitalization', () => {
  it('capitalizes the first letter of source name', () => {
    expect(S.formatSource('standvirtual')).toBe('Standvirtual');
    expect(S.formatSource('olx')).toBe('Olx');
  });

  it('returns empty string for missing input', () => {
    expect(S.formatSource('')).toBe('');
    expect(S.formatSource(null)).toBe('');
  });
});

describe('formatKm — mileage formatting', () => {
  it('formats mileage with pt thousands separator and km suffix', () => {
    expect(S.formatKm(62000)).toBe('62.000 km');
    expect(S.formatKm('42000')).toBe('42.000 km');
  });

  it('returns empty string for missing or invalid mileage', () => {
    expect(S.formatKm(null)).toBe('');
    expect(S.formatKm(undefined)).toBe('');
    expect(S.formatKm('abc')).toBe('');
  });
});

describe('renderTags — badge tags rendering', () => {
  it('renders archived tag', () => {
    const html = S.renderTags({ archived: 1 });
    expect(html).toContain('Archived');
  });

  it('returns empty string if no flags active', () => {
    expect(S.renderTags({ archived: 0 })).toBe('');
  });

  it('handles null/undefined gracefully', () => {
    expect(S.renderTags(null)).toBe('');
  });
});

describe('safeImageUrl — only https images allowed', () => {
  it('accepts https URLs', () => {
    expect(S.safeImageUrl('https://images.example.com/car.jpg'))
      .toBe('https://images.example.com/car.jpg');
  });

  it('rejects http and invalid URLs', () => {
    expect(S.safeImageUrl('http://images.example.com/car.jpg')).toBe('');
    expect(S.safeImageUrl('javascript:alert(1)')).toBe('');
    expect(S.safeImageUrl('')).toBe('');
    expect(S.safeImageUrl(null)).toBe('');
  });
});

describe('renderCard — listing card', () => {
  const base = {
    url: 'https://www.standvirtual.com/carros/anuncio/x-ID1.html',
    title: 'Jaguar I-Pace EV400 AWD SE',
    source: 'Standvirtual',
    price: 24499,
    brand: 'jaguar',
    model: 'i-pace',
    variant: 'EV400 SE',
    year: 2020,
    mileage: 62000,
    location: 'Silvares (Porto)',
    sent_date: '2026-09-26',
    image_url: 'https://images.example.com/ipace1.jpg',
    archived: 0
  };

  it('mostra o descritivo "localidade (cidade)" quando a API envia a cidade', () => {
    const html = S.renderCard({ ...base, location: 'Charneca de Caparica e Sobreda (Setúbal)', locality: 'Charneca de Caparica e Sobreda', city: 'Almada' });
    expect(html).toContain('Charneca de Caparica e Sobreda (Almada)');
    const bare = S.renderCard({ ...base, location: 'Braga', locality: 'Braga', city: 'Braga' });
    expect(bare).toContain('Braga (Braga)');
  });

  it('renders brand, model, price, meta and link', () => {
    const html = S.renderCard(base);
    expect(html).toContain('Jaguar i-pace');
    expect(html).toContain('€24.499');
    expect(html).toContain('Silvares (Porto)');
    expect(html).toContain('62.000 km');
    expect(html).toContain('2020');
    expect(html).toContain(base.url);
    expect(html).toContain('<img');
  });

  it('renders "Sem foto" placeholder when no image_url', () => {
    const html = S.renderCard({ ...base, image_url: '' });
    expect(html).toContain('Sem foto');
    expect(html).not.toContain('<img');
  });

  it('escapes malicious title content', () => {
    const html = S.renderCard({ ...base, title: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
