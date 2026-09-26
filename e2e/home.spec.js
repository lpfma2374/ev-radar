const { test, expect } = require('@playwright/test');
const { FIXTURE_DATA, mockApi } = require('./helpers');

test.describe('EV Radar (index.html) — testes de leitura E2E', () => {
  test('carrega anúncios e estatísticas da API', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('.item')).toHaveCount(10);
    await expect(page.locator('#s-total')).toHaveText('10');
    await expect(page.locator('#s-min')).toContainText('17.500');
    await expect(page.locator('#count-sub')).toContainText('10 anúncios correspondem');
  });

  test('popula os portais de origem no filtro a partir da API', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    const srcOptions = await page.locator('#f-src option').allTextContents();
    expect(srcOptions.join()).toContain('Standvirtual');
    expect(srcOptions.join()).toContain('OLX');
  });

  test('renderiza cartões com marca, modelo, preço e localização', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('.item .src').first()).toContainText('Jaguar i-pace');
    await expect(page.locator('.item .price').first()).toContainText('€24.499');
    await expect(page.locator('.item .meta').first()).toContainText('Porto');
  });

  test('mostra "Sem foto" para anúncios sem imagem', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('.item .photo-empty')).toHaveCount(4);
  });

  test('exibe mensagem de estado vazio quando não há anúncios', async ({ page }) => {
    await mockApi(page, { body: { ...FIXTURE_DATA, count: 0, listings: [] } });
    await page.goto('/');
    await expect(page.locator('.item')).toHaveCount(0);
    await expect(page.locator('.empty')).toBeVisible();
    await expect(page.locator('.empty')).toContainText('Nenhum anúncio corresponde');
  });

  test('exibe mensagem de erro se a API falhar', async ({ page }) => {
    await mockApi(page, { status: 500, body: { ok: false, error: 'Erro de ligação D1' } });
    await page.goto('/');
    await expect(page.locator('#count-sub')).toContainText('Erro ao carregar dados');
  });

  test('XSS: previne injeção de HTML no título do anúncio', async ({ page }) => {
    const malicious = {
      ...FIXTURE_DATA,
      listings: [
        { ...FIXTURE_DATA.listings[0], title: '<script>alert("xss")</script>' }
      ]
    };
    await mockApi(page, { body: malicious });
    await page.goto('/');
    await expect(page.locator('.item .title').first()).toContainText('<script>alert("xss")</script>');
    const innerHTML = await page.locator('#list').innerHTML();
    expect(innerHTML).toContain('&lt;script&gt;');
  });
});
