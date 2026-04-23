# Cardápio Digital (Ei-001) — PRD

## Original Problem
Sistema de cardápio digital para estabelecimentos gastronômicos com atualizações em tempo real, acesso via QR Code, motor de filtros instantâneo, i18n PT/EN/ES, CRUD administrativo de pratos/tags/preços, JWT+RBAC+bcrypt.

## Stack (adaptado para o ambiente Emergent)
- Backend: FastAPI + MongoDB (substituindo Node+Postgres por restrição de infra — documentos Mongo são funcionalmente equivalentes a JSONB)
- Frontend: React 19 + Tailwind + shadcn/ui + lucide-react
- Storage: Emergent Object Storage
- Auth: JWT (PyJWT) + bcrypt, Bearer token via localStorage

## User Personas
1. **Gerente (admin)** — faz CRUD de pratos/tags, gerencia preços e disponibilidade
2. **Cliente (público)** — escaneia QR, navega cardápio mobile, filtra, muda idioma

## Implemented (23/04/2026)
- Backend `/api/*`: auth (login/me/logout), products CRUD, tags CRUD, upload + file serving, categories, seed admin+6 produtos demo+5 tags demo
- Frontend:
  - `/` Menu público mobile-first — busca, filtros por categoria, chips de tags, PROMO/UNAVAILABLE badges, i18n instantâneo
  - `/admin/login` — login JWT
  - `/admin/products` — CRUD com modal multi-idioma, upload de imagem, seletor de tags
  - `/admin/tags` — CRUD com color-picker e ícone
  - `/admin/qr` — QR gerado automaticamente + download/copy
- Design guidelines seguidos: paleta #A0522D/#205427/#303226/#2F3538, fontes Outfit+Manrope, sidebar escura, cards glassmórficos

## Backlog P0/P1/P2
- P1: Múltiplos estabelecimentos (multi-tenant) — hoje tudo é single-restaurant
- P1: Gestão de usuários/gerentes adicionais no admin
- P2: Histórico de alterações de preço / logs de auditoria
- P2: Relatórios simples (top pratos, conversão)
- P2: Modo kiosk / carrinho / pedido (pedido na mesa)
- P2: Import/export de cardápio (CSV)

## Next Action Items
- (Opcional) Rodar testing agent para cobrir CRUD de admin no Playwright
- Deploy quando o usuário solicitar
