"# 🍽️ Cardápio Digital

> Sistema completo de cardápio digital para estabelecimentos gastronômicos — QR Code, pedidos em tempo real, painel Kanban para a cozinha, múltiplos cardápios, i18n (PT/EN/ES) e dashboards de negócio.

<p align=\"center\">
  <img alt=\"Stack\" src=\"https://img.shields.io/badge/stack-FastAPI%20%2B%20React%20%2B%20MongoDB-2F3538\">
  <img alt=\"Docker Ready\" src=\"https://img.shields.io/badge/docker-ready-205427\">
  <img alt=\"Languages\" src=\"https://img.shields.io/badge/i18n-PT%20%2F%20EN%20%2F%20ES-A0522D\">
  <img alt=\"License\" src=\"https://img.shields.io/badge/license-MIT-303226\">
</p>

---

## ✨ Principais recursos

### Para o cliente (mobile-first, via QR Code)
- **Curadoria sazonal** com hero elegante e cards clicáveis por prato
- **Múltiplos cardápios**: Principal, Café da Manhã, Happy Hour, etc.
- **Motor de filtros em tempo real** — busca, categoria e tags dinâmicas 100% client-side, sem recarregar a página
- **Página de detalhes** por prato: galeria de fotos, ingredientes, tempo de preparo, tamanhos de porção, harmonização sugerida
- **i18n instantâneo** PT / EN / ES (labels + conteúdo dos pratos)
- **Carrinho + checkout** direto — cliente informa nome e mesa (ou balcão) e envia o pedido para a cozinha
- **Modo \"loja fechada\"** — quando o gerente desliga o toggle, o cliente vê o cardápio mas pedidos ficam bloqueados

### Para a equipe (painel administrativo)
- **Dashboard de negócio**: receita hoje/semana/mês, ticket médio, top 5 pratos (30d), gráfico de receita 7d, distribuição de pedidos por hora, contagem por status
- **Kanban de pedidos** com atualização automática a cada 6s — `Novo → Na cozinha → Aguardando garçom → Entregue → Concluído`
- **CRUD completo de produtos** com upload de imagens, ingredientes multi-idioma, porções, pairings entre pratos
- **Tags dinâmicas** com cor e ícone customizáveis (21 ícones)
- **CRUD de cardápios** (café da manhã, happy hour…)
- **Gestão de equipe** com 5 cargos e sidebar/rotas gateadas por role
- **Configurações** do estabelecimento — abre/fecha loja com toggle instantâneo, nome, endereço, WhatsApp
- **QR Code** gerado automaticamente com link do cardápio, pronto para imprimir

### Segurança
- **JWT** com bcrypt (12 rounds)
- **RBAC** com 5 papéis: `admin`, `manager`, `waiter`, `kitchen`, `cashier`
- httpOnly cookies + `Authorization: Bearer` (funciona em cross-origin)

---

## 🛠️ Stack

| Camada     | Tecnologia |
|------------|------------|
| Backend    | **FastAPI** (Python 3.11), Motor (Mongo async), PyJWT, bcrypt |
| Frontend   | **React 19**, React Router 6, Tailwind CSS, shadcn/ui, lucide-react, recharts, sonner, axios |
| Banco      | **MongoDB 7** (documentos flexíveis, equivalente ao JSONB) |
| Storage    | Emergent Object Storage (opcional — degradação graciosa se ausente) |
| Deploy     | Docker Compose (backend + frontend + mongo + Nginx com proxy `/api`) |

> A stack do enunciado original pedia Node.js + PostgreSQL. O projeto foi adaptado para FastAPI + MongoDB por restrições do ambiente Emergent, mantendo 100% dos requisitos funcionais. Um `init.sql` equivalente para PostgreSQL está disponível em `init.sql` (com JSONB, GIN indexes e view `v_produtos_atuais`).

---

## 🚀 Rodando com Docker (recomendado)

```bash
# 1. Clone o repositório
git clone https://github.com/<seu-usuario>/cardapio-digital.git
cd cardapio-digital

# 2. Configure variáveis
cp .env.example .env
# edite .env — troque JWT_SECRET e ADMIN_PASSWORD

# 3. Suba tudo (mongo + backend + frontend)
docker compose up -d --build

# 4. Acesse
# Cardápio público → http://localhost:3000/
# Painel admin     → http://localhost:3000/admin/login
```

**Credenciais padrão:** `admin@cardapio.com` / `admin123`

Detalhes completos, troubleshooting e recomendações de produção em [**README.docker.md**](./README.docker.md).

---

## 💻 Rodando localmente (sem Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # e ajuste MONGO_URL, JWT_SECRET, etc.
uvicorn server:app --reload --port 8001
```

### Frontend

```bash
cd frontend
yarn install                    # sempre yarn, nunca npm
echo \"REACT_APP_BACKEND_URL=http://localhost:8001\" > .env
yarn start
```

Requisitos: Python 3.11+, Node 20+, Yarn 1.22+, MongoDB rodando localmente ou Atlas.

---

## 📁 Estrutura do projeto

```
cardapio-digital/
├── docker-compose.yml
├── .env.example
├── README.md
├── README.docker.md
├── init.sql                          # equivalente PostgreSQL (opcional)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── server.py                     # única fonte da API
└── frontend/
    ├── Dockerfile
    ├── nginx.conf                    # SPA + proxy /api → backend
    ├── package.json
    └── src/
        ├── App.js
        ├── auth/AuthContext.jsx
        ├── cart/CartContext.jsx
        ├── store/StoreContext.jsx
        ├── i18n/I18nContext.jsx
        ├── lib/api.js
        ├── components/               # LanguageToggle, CartDrawer, CheckoutModal
        └── pages/
            ├── MenuPage.jsx          # cardápio público
            ├── ProductDetailPage.jsx # detalhes do prato
            ├── AdminLogin.jsx
            ├── AdminLayout.jsx       # sidebar dinâmica por role
            ├── AdminDashboard.jsx    # KPIs + charts
            ├── AdminOrders.jsx       # Kanban ao vivo
            ├── AdminProducts.jsx
            ├── AdminMenus.jsx
            ├── AdminTags.jsx
            ├── AdminStaff.jsx
            ├── AdminSettings.jsx
            └── AdminQR.jsx
```

---

## 🔑 API — principais endpoints

| Método | Rota | Papel | Descrição |
|--------|------|-------|-----------|
| `POST` | `/api/auth/login` | público | Login com email/senha, retorna JWT |
| `GET`  | `/api/auth/me` | autenticado | Perfil atual |
| `GET`  | `/api/products` | público | Lista produtos |
| `POST/PUT/DELETE` | `/api/products` | admin/manager | CRUD de produtos |
| `GET/POST/PUT/DELETE` | `/api/tags` | mixed | Tags dinâmicas |
| `GET/POST/PUT/DELETE` | `/api/menus` | mixed | Cardápios (Principal, Café, Happy Hour…) |
| `GET/POST` | `/api/orders` | público (POST guest se loja aberta) / staff (GET) | Pedidos |
| `PATCH` | `/api/orders/{id}/status` | staff | Avança status do pedido |
| `GET`  | `/api/analytics` | admin/manager | Dashboard: KPIs, top produtos, hourly, 7d |
| `GET/POST/PUT/DELETE` | `/api/staff` | admin | Gestão de funcionários |
| `GET/PUT` | `/api/store` | pub / admin+manager | Config do estabelecimento (open toggle) |
| `POST` | `/api/upload` | admin/manager | Upload de imagem para storage |

Todas as rotas de API têm prefixo `/api` (obrigatório para o roteamento do Nginx).

---

## 🎨 Design system

Paleta oficial do projeto (extraída do enunciado):

| Cor       | Hex       | Uso |
|-----------|-----------|-----|
| Primary   | `#A0522D` | CTAs, marca, promoções |
| Secondary | `#205427` | \"Loja aberta\", confirmações |
| Tertiary  | `#303226` | Textos secundários, ícones |
| Neutral   | `#2F3538` | Texto principal, sidebar |
| Background| `#FAF8F5` | Fundo geral |

**Fontes**: [Outfit](https://fonts.google.com/specimen/Outfit) (headings) + [Manrope](https://fonts.google.com/specimen/Manrope) (body).

---

## 🌍 Internacionalização

Suporte PT / EN / ES com:

- **Labels da interface** — arquivo único de dicionário em `src/i18n/I18nContext.jsx`
- **Conteúdo dos pratos** — cada campo é armazenado como objeto no Mongo:
  ```json
  { \"pt\": \"Hambúrguer da casa\", \"en\": \"House burger\", \"es\": \"Hamburguesa de la casa\" }
  ```
- **Troca instantânea** sem reload — o hook `useI18n().tf(field)` faz o pick correto

---

## 👥 Papéis (RBAC)

| Papel        | Vê no painel                                              |
|--------------|-----------------------------------------------------------|
| `admin`      | Tudo (Dashboard, Pedidos, Produtos, Cardápios, Tags, Equipe, QR, Config) |
| `manager`    | Dashboard, Pedidos, Produtos, Cardápios, Tags, QR, Config *(sem Equipe)* |
| `waiter`     | Apenas Pedidos                                            |
| `kitchen`    | Apenas Pedidos                                            |
| `cashier`    | Apenas Pedidos                                            |

Rotas protegidas por `<Protected roles={[...]} />` no React + `Depends(require_roles(...))` no FastAPI.

---

## 📸 Screenshots

<details>
<summary>Cardápio mobile (Curadoria Sazonal)</summary>

Hero escuro com título serif, cards de pratos com imagem, tags coloridas, badge de promoção e quick-add. Tabs superiores para trocar entre cardápios (Todos / Café da Manhã / Happy Hour…).

</details>

<details>
<summary>Página de detalhes do prato</summary>

Galeria com thumbnails, seletor de tamanho de porção com preço dinâmico, ingredientes principais em i18n, harmonização sugerida pelo chef, barra fixa inferior \"Adicionar ao pedido\".

</details>

<details>
<summary>Dashboard admin</summary>

4 KPIs (receita hoje/semana/mês, pedidos hoje com ticket médio), gráfico de linha 7 dias, pedidos por status, top 5 pratos com barra de progresso, gráfico de barras hourly, snapshot do catálogo.

</details>

<details>
<summary>Kanban de pedidos</summary>

4 colunas ao vivo com auto-refresh a cada 6s. Cada card mostra código, cliente, mesa/balcão, itens, forma de pagamento e botão \"Avançar →\". Histórico de status com timestamps no modal.

</details>

---

## 🗺️ Roadmap

- [ ] Pedido em dinheiro criado pelo funcionário direto no Kanban
- [ ] Translation Hub com auto-tradução via LLM (preencher PT/EN/ES vazios)
- [ ] Multi-tenant (vários restaurantes por instância)
- [ ] Integração Stripe/Pix para pagamento online
- [ ] Combo do Chef auto-gerado a partir dos pratos mais pedidos juntos
- [ ] Modo kiosk (tablet no salão)
- [ ] Export CSV de pedidos por período

---

## 🧪 Testes

```bash
# Testes de API (pytest + httpx)
cd backend && pytest -v

# Lint frontend
cd frontend && yarn lint
```

Cobertura atual: 35 testes de backend cobrindo auth/RBAC, CRUD completo, fluxo de pedidos, permissões cross-role.

---

## 📄 Licença

MIT © 2026 — livre para uso comercial e privado.

## 🤝 Contribuindo

PRs bem-vindos! Antes de abrir:
1. Rode `yarn lint` e `pytest`
2. Mantenha o padrão de nomes em `data-testid` (kebab-case)
3. Preserve o suporte a i18n em novos campos de texto
4. Se adicionar endpoint, documente na tabela acima

---

<p align=\"center\">
  Feito com ❤️ para transformar cardápios em experiência.
</p>
"
