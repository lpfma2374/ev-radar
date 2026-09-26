import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi } from 'vitest';

const root = resolve(__dirname, '../..');
export const fixtureListings = JSON.parse(
  readFileSync(`${root}/e2e/fixtures/listings.json`, 'utf8')
);

const bodyHtml = readFileSync(`${root}/index.html`, 'utf8')
  .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
  .replace(/<script[^>]*>\s*<\/script>/g, '');

export async function boot(listingsResponse = fixtureListings, { failApi = false } = {}) {
  document.body.innerHTML = bodyHtml;
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: !failApi,
    json: async () => (failApi ? { ok: false, error: 'D1 error' } : listingsResponse),
  })));
  await import('../../js/shared.js');
  
  const scriptMatch = readFileSync(`${root}/index.html`, 'utf8')
    .match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatch) {
    eval(scriptMatch[1]);
  }
  await new Promise((r) => setTimeout(r, 20));
  return { document, Event, fetch: global.fetch };
}
