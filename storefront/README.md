# Z&A storefront

The shop's web front end and admin dashboard: Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4.
It talks to the Spring Boot API described in [`../docs/api.md`](../docs/api.md).

## How it fits together

- **Backend for frontend.** Every API call runs on the Next.js server (server components, Server Actions and
  route handlers) through `lib/api.ts`. The browser never sees an access token.
- **Session cookies** (all `httpOnly`, `SameSite=Lax`, `Secure` in production):
  `za_at` access token, `za_rt` refresh token, `za_cart` guest cart id.
- **Token refresh** happens in `proxy.ts` before a page renders. The new token is set on the response and
  forwarded to the current request. Prefetch requests are skipped so they can't race on refresh-token rotation.
- **Caching.** Catalog reads (`/products`, `/categories`, `/brands`) are anonymous and cached for 60–300 s with
  the `catalog` tag. Admin edits expire that tag at once. Cart, account, checkout and admin reads are never cached.
- **Nothing calls the API at build time**, so `npm run build` works without a backend.

## Routes

| Shop | Admin (role `ADMIN`) |
|---|---|
| `/` home, `/search`, `/c/[slug]` category, `/p/[slug]` product | `/admin` dashboard |
| `/cart`, `/checkout`, `/checkout/pay/[sessionId]` (test payments), `/checkout/success`, `/checkout/cancelled` | `/admin/products`, `/admin/products/new`, `/admin/products/[id]` |
| `/login`, `/register`, `/verify-email`, `/account`, `/account/orders/[id]` | `/admin/orders`, `/admin/orders/[id]`, `/admin/categories`, `/admin/brands` |

`/bff/orders/[id]` is a small route handler the success page polls for payment confirmation.

## Running it

```bash
cp .env.example .env.local   # point API_URL at the backend
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Default | Purpose |
|---|---|---|
| `API_URL` | `http://localhost:8080` | API base URL as seen from the Next.js server |
| `COOKIE_SECURE` | `true` in production | set `false` to serve a production build over plain http |

## Checks

```bash
npm run lint
npm run typecheck
npm test          # vitest: money, JWT and search-URL helpers
npm run build
```

## Docker

```bash
docker build -t za-storefront .
docker run -p 3000:3000 -e API_URL=http://host.docker.internal:8080 -e COOKIE_SECURE=false za-storefront
```

The image runs the standalone server as a non-root user on port 3000.
