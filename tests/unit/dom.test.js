// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { boot, fixtureListings } from './boot.js';

describe('index.html — boot e interação DOM em jsdom', () => {
  it('arranca com fetch e renderiza estatísticas e lista de anúncios', async () => {
    const w = await boot(fixtureListings);
    expect(w.document.querySelectorAll('.item')).toHaveLength(10);
    expect(w.document.getElementById('s-total').textContent).toBe('10');
    expect(w.document.getElementById('s-avg').textContent).toContain('21.244');
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

  it('popula o filtro de cidade a partir da resposta da API', async () => {
    const w = await boot(fixtureListings);
    const cityOptions = [...w.document.getElementById('f-city').options].map((o) => o.value);
    expect(cityOptions).toEqual(['all', 'Porto', 'Braga', 'Almada', 'Setúbal']);
    expect(w.document.getElementById('f-city').value).toBe('all');
  });

  it('pede o dataset completo uma única vez e filtra em memória', async () => {
    const w = await boot(fixtureListings);
    expect(w.fetch).toHaveBeenCalledTimes(1);
    expect(w.fetch.mock.calls[0][0]).toContain('all=1');
    const sel = w.document.getElementById('f-city');
    sel.value = 'Braga';
    sel.dispatchEvent(new w.Event('change'));
    expect(w.document.querySelectorAll('.item')).toHaveLength(4);
    expect(w.document.getElementById('s-total').textContent).toBe('4');
    const brand = w.document.getElementById('f-brand');
    brand.value = 'byd';
    brand.dispatchEvent(new w.Event('change'));
    expect(w.document.querySelectorAll('.item')).toHaveLength(2);
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });

  it('filtro de preço aplica-se localmente com debounce', async () => {
    const w = await boot(fixtureListings);
    const max = w.document.getElementById('f-max');
    max.value = '20000';
    max.dispatchEvent(new w.Event('input'));
    await w.flush();
    expect(w.document.querySelectorAll('.item')).toHaveLength(4);
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });

  it('toggle de arquivados mostra apenas os arquivados', async () => {
    const w = await boot(fixtureListings);
    const t = w.document.getElementById('f-arch');
    t.checked = true;
    t.dispatchEvent(new w.Event('change'));
    expect(w.document.querySelectorAll('.item')).toHaveLength(1);
    expect(w.document.querySelector('.item').textContent).toContain('Anúncio arquivado');
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
