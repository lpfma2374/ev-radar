# EV Radar

Dashboard de carros elétricos usados no corredor **Porto–Braga**.
Frontend vanilla HTML/JS/CSS + serverless function Vercel (`/api/listings`) com
acesso ao **Cloudflare D1** (base de dados `ev-seeker`).

## Critérios (definidos pelo agente EV_Seeker)

- 100% elétricos, €15.000–€25.000, corredor Porto–Braga
- Polestar 2 (só Standard Range Single Motor), BYD Seal, Jaguar I-Pace, Tesla Model 3 (só SR+) — 2019–2024
- Renault Mégane E-Tech — 2022–2024 · Peugeot E-2008, Citroën ë-C4/ë-C4 X — 2020–2024
- Excepções (lançamentos recentes, qualquer ano): Volvo EX30, XPeng G6, XPeng G9

## Arquitectura

```
index.html  ─ fetch ─▶  /api/listings (Vercel serverless)  ─ HTTPS ─▶  Cloudflare D1
```

- A actualização dos dados é feita todos os dias às 8h pelo agente EV_Seeker
  (10 portais; dedup por URL; arquivo mensal a 28).
- Sem emails: os anúncios são consultados nesta página.

## CI/CD (custo zero)

- **Vitest** — testes unitários (escaping, formatação, render de cartões)
- **Playwright** — E2E com fixtures locais (mock da API)
- **OWASP ZAP Baseline** + **Lighthouse CI** — DAST e performance
- **gitleaks** + **Semgrep** — segredos e SAST
- **Deploy Vercel** via GitHub Actions (`main` → produção, PR → preview)
- **Data Quality** noturna contra a API de produção (regras declarativas)

## Desenvolvimento

```bash
npm install
npm run dev          # vercel dev (precisa de env: CLOUDFLARE_*)
npm test             # unitários
npm run e2e          # funcionais
```

Variáveis de ambiente (Vercel / local):

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_API_TOKEN`
