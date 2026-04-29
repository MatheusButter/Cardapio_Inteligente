# Cardápio Digital (Ei-001) — PRD

## Original Problem
Sistema de cardápio digital para estabelecimentos gastronômicos com atualizações em tempo real, acesso via QR Code, motor de filtros instantâneo, i18n PT/EN/ES, CRUD administrativo de pratos/tags/preços, JWT+RBAC+bcrypt.

## Stack (adaptado para o ambiente Emergent)
- Backend: FastAPI + MongoDB (substituindo Node+Postgres por restrição de infra — documentos Mongo são funcionalmente equivalentes a JSONB)
- Frontend: React 19 + Tailwind + shadcn/ui + lucide-react
- Storage: Emergent Object Storage
- Auth: JWT (PyJWT) + bcrypt, Bearer token via localStorage

## User Personas
1. **Gerente (admin)** — CRUD de pratos/tags, preços/disponibilidade, gestão de QR
2. **Cliente (público)** — escaneia QR, navega, filtra, monta pedido

## Implemented (atualizado em 29/04/2026)

### Iteração 1 (23/04/2026)
- Backend `/api/*`: auth (login/me/logout), products CRUD, tags CRUD, upload + file serving, categories, seed admin+6 produtos demo+5 tags demo
- Frontend: `/` Menu público mobile-first, `/admin/login`, `/admin/products|tags|qr`
- Design: paleta #A0522D/#205427/#303226/#2F3538, fontes Outfit+Manrope

### Iteração 2 — Feedback do PDF (28/04/2026)
- **Backend**: novos campos no produto — `images[]`, `ingredients[]` (i18n), `prep_time`, `portion_sizes[]` (label i18n + price), `pairing_ids[]` para harmonização
- **Página de detalhes** `/menu/:id`: galeria com thumbnails, badge da categoria, prep time, seletor de **Tamanho da porção**, ingredientes, tags, **harmonização sugerida**, barra fixa inferior com preço dinâmico e "Adicionar ao pedido"
- **Hero "Curadoria Sazonal"** no menu público (gradient escuro + título serif italicizado)
- **Modal Tags modernizado**: pré-visualização ao vivo, presets de cores em círculos, **grid visual de 21 ícones** (lucide-react)
- **Modal Produto**: galeria multi-imagem com capa, lista dinâmica de ingredientes (PT/EN/ES), porções, tempo de preparo, seletor de pairings

### Iteração 3 — Carrinho/Pedido (29/04/2026)
- **CartContext** localStorage-backed (`cd_cart`)
- **CartDrawer** lateral: lista de itens com qty +/-, remover, total dinâmico
- **FAB "Fechar pedido (n)"** verde, aparece quando há itens
- Botão **+ quick-add** em cada card do menu público
- "Adicionar ao pedido" do detail page funcional (respeita porção selecionada)
- Checkout via WhatsApp (`wa.me`) com itens formatados + total

## Backlog
- P1: Multi-tenant (vários restaurantes)
- P1: Gestão de usuários/gerentes adicionais
- P1: Translation Hub admin com auto-tradução via LLM (descrito no PDF)
- P2: Histórico de pedidos / dashboard de analytics
- P2: Modo kiosk em tablets
- P2: Import/export de cardápio (CSV)
- P2: Configurar número de WhatsApp do estabelecimento (hoje vai para wa.me sem destinatário)

## Test Credentials
- Admin: `admin@cardapio.com` / `admin123`
