# Mirror check — Saint Seiya Rebirth 2 (EX)

Landing page que verifica se cada mirror está **no ar** ou **pausado** por limite de uso do host (Netlify, Vercel, etc.).

Monitor configurado em [`public/config/sites.json`](public/config/sites.json).

## Estados

| Estado   | Significado                                      |
|----------|--------------------------------------------------|
| `active` | Site entrega o conteúdo esperado                 |
| `paused` | Página de pausa/limite do host detectada         |
| `error`  | Timeout, rede ou HTTP 5xx                        |

## Desenvolvimento local

**Netlify (API + static):**

```bash
npm install
npm run dev
```

**Vercel:**

```bash
npm install
npx vercel dev
```

Testar o classificador:

```bash
npm run test:detector
```

## Adicionar outro mirror

Edite [`public/config/sites.json`](public/config/sites.json):

```json
{
  "id": "seiya2-vercel",
  "label": "Seiya 2 (Vercel)",
  "url": "https://seiya2.vercel.app/",
  "platform": "vercel",
  "expectInBody": ["Saint Seiya", "Rebirth"]
}
```

| Campo | Descrição |
|-------|-----------|
| `platform` | `netlify`, `vercel` ou `generic` — regras de detecção de pausa |
| `expectInBody` | Textos que devem aparecer na home quando o site está no ar |

Se `platform` for omitido, é inferido pelo domínio (`.netlify.app`, `.vercel.app`).

## Deploy

### Vercel (recomendado para esta landing)

1. Importe o repositório no [Vercel](https://vercel.com).
2. O [`vercel.json`](vercel.json) define `outputDirectory: public` e a function em `api/status.js`.
3. API: `https://SEU-PROJETO.vercel.app/api/status`

### Netlify

1. Importe no [Netlify](https://app.netlify.com).
2. O [`netlify.toml`](netlify.toml) define `publish = public`, functions e redirect `/api/status`.

## Estrutura

```
public/config/sites.json   # mirrors monitorados
public/                    # landing
api/status.js              # API (Vercel)
netlify/functions/status.js
lib/checkSites.js          # checagem compartilhada
lib/classifySite.js        # detecção por plataforma
```

## API

`GET /api/status`
