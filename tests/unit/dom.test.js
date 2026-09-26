// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { boot, fixtureListings } from './boot.js';

describe('index.html — boot e interação DOM em jsdom', () => {
  it('arranca com fetch e renderiza estatísticas e lista de anúncios', async () => {
    const w = await boot(fixtureListings);
    expect(w.document.querySelectorAll('.item')).toHaveLength(10);
    expect(w.document.getElementById('s-total').textContent).toBe('10');
    expect(w.document.getElementById('s-avg').textContent).toContain('20.839');
    expect(w.document.getElementById('s-min').textContent).toContain('17.500');
    expect(w.document.getElementById('s-arch').textContent).toBe('1');
    expect(w.document.getElementById('count-sub').textContent).toContain('10 anúncios correspondem');
  });

  it('popula opções de portais a partir da resposta da API', async () => {
    const w = await boot(fixtureListings);
    const srcOptions = [...w.document.getElementById('f-src').options].map((o) => o.value);
    expect(srcOptions).toContain('Standvirtual');
    expect(srcOptions).toContain('OLX');
  });

  it('renderiza preço e marca/modelo nos cartões', async () => {
    const w = await boot(fixtureListings);
    const first = w.document.querySelector('.item');
    expect(first.textContent).toContain('€24.499');
    expect(first.textContent).toContain('Jaguar i-pace');
  });

  it('exibe mensagem de estado vazio quando não há anúncios', async () => {
    const emptyResponse = { ...fixtureListings, count: 0, listings: [] };
    const w = await boot(emptyResponse);
    expect(w.document.querySelectorAll('.item')).toHaveLength(0);
    expect(w.document.querySelector('.empty').textContent).toContain('Nenhum anúncio corresponde');
  });

  it('exibe mensagem de erro na falha da API', async () => {
    const w = await boot(fixtureListings, { failApi: true });
    expect(w.document.getElementById('count-sub').textContent).toContain('Erro ao carregar dados');
  });

  it('renderiza foto do carro quando image_url é seguro', async () => {
    const w = await boot(fixtureListings);
    const img = w.document.querySelector('.item .photo img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://images.example.com/ipace1.jpg');
    expect(img.getAttribute('loading')).toBe('lazy');
  });
});
