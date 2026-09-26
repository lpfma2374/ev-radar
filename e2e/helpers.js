const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const FIXTURE_DATA = JSON.parse(
  readFileSync(resolve(__dirname, 'fixtures/listings.json'), 'utf8')
);

async function mockApi(page, { status = 200, body } = {}) {
  await page.route('**/api/listings*', async (route) => {
    return route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body !== undefined ? body : FIXTURE_DATA),
    });
  });
}

module.exports = { FIXTURE_DATA, mockApi };
