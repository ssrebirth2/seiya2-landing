# Monitor Netlify — Saint Seiya Mirrors

Landing page que verifica se os mirrors Netlify estão **no ar** ou **pausados** por limite de uso (créditos/bandwidth).

Monitora por padrão:

- https://ssrb2.netlify.app/
- https://seiya2.netlify.app/
- https://seiyaex.netlify.app/

## Estados

| Estado   | Significado                                      |
|----------|--------------------------------------------------|
| `active` | Site entrega o conteúdo real                     |
| `paused` | Página de pausa/limit do Netlify detectada       |
| `error`  | Timeout, rede ou HTTP 5xx                        |

A checagem roda **ao abrir a página** e no botão **Verificar novamente** (sem polling automático).

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abra a URL que o Netlify CLI mostrar (geralmente `http://localhost:8888`).

Testar o classificador de pausa:

```bash
npm run test:detector
```

## Adicionar outro site

Edite [`config/sites.json`](config/sites.json):

```json
{
  "id": "novo",
  "label": "Meu Site",
  "url": "https://exemplo.netlify.app/",
  "expectInBody": ["texto único da home"]
}
```

`expectInBody` ajuda a distinguir o app real da página de erro do Netlify.

## Deploy no Netlify

1. Crie um repositório no GitHub e envie este projeto.
2. No [Netlify](https://app.netlify.com): **Add new site** → **Import an existing project**.
3. O [`netlify.toml`](netlify.toml) já define:
   - `publish = public`
   - `functions = netlify/functions`
   - redirect `/api/status` → function
4. Deploy. A API fica em `https://SEU-SITE.netlify.app/api/status`.

## Estrutura

```
config/sites.json          # URLs monitoradas
netlify/functions/status.js  # API de checagem
netlify/functions/lib/detectPaused.js  # Detecção de pausa Netlify
public/                    # Landing page (PT + EN)
```

## API

`GET /api/status`

Resposta exemplo:

```json
{
  "checkedAt": "2026-05-15T12:00:00.000Z",
  "sites": [
    {
      "id": "ssrb2",
      "label": "SSR B2",
      "url": "https://ssrb2.netlify.app/",
      "state": "active",
      "httpStatus": 200,
      "latencyMs": 340,
      "reason": "ok",
      "messagePt": "Site no ar",
      "messageEn": "Site is serving content"
    }
  ]
}
```
