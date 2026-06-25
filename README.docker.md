# Cardápio Digital — Rodando com Docker

Este projeto está pronto para Docker. O `docker-compose.yml` sobe **três serviços**:

| Serviço   | Imagem base        | Porta exposta no host | Descrição |
|-----------|--------------------|------------------------|-----------|
| `mongo`   | `mongo:7`          | `27017`                | Banco de dados |
| `backend` | `python:3.11-slim` | `8001`                 | API FastAPI |
| `frontend`| `nginx:1.27-alpine`| `3000`                 | React build servido pelo Nginx (faz proxy de `/api` para o backend) |

---

## 1. Pré-requisitos

- Docker Engine 24+ e Docker Compose v2 instalados
  - Verifique com: `docker --version` e `docker compose version`

## 2. Configuração

Na raiz do projeto:

```bash
cp .env.example .env
# Edite o .env e troque pelo menos JWT_SECRET e ADMIN_PASSWORD
```

> **Object Storage (uploads de imagens):** o sistema usa o Object Storage gerenciado da Emergent para os uploads de fotos dos pratos. Para habilitar, preencha `EMERGENT_LLM_KEY` no `.env`. **Sem essa chave o sistema continua funcionando normalmente — apenas o botão de upload de imagem fica indisponível** (você ainda pode colar URLs de imagens externas no campo `image_path` via API).

## 3. Subir tudo

```bash
docker compose up -d --build
```

O primeiro build leva alguns minutos (instala dependências Python + faz `yarn install` + `yarn build`). Acompanhe os logs:

```bash
docker compose logs -f
```

## 4. Acessar

- **Cardápio público (cliente):** http://localhost:3000/
- **Painel administrativo:** http://localhost:3000/admin/login
  - E-mail: o valor de `ADMIN_EMAIL` (padrão `admin@cardapio.com`)
  - Senha:  o valor de `ADMIN_PASSWORD` (padrão `admin123`)
- **API (direta):** http://localhost:8001/api/

Na primeira inicialização o backend:
1. cria os índices no Mongo,
2. seeda o usuário **admin**,
3. seeda **3 cardápios** padrão (Cardápio Principal, Café da Manhã, Happy Hour),
4. seeda **5 tags** e **6 pratos** demo (caso as coleções estejam vazias).

## 5. Comandos úteis

```bash
# Parar tudo (mantém volumes)
docker compose stop

# Parar e remover containers (mantém o volume mongo_data)
docker compose down

# Reset total (apaga o banco também)
docker compose down -v

# Rebuild só do frontend (após mudar código React)
docker compose build frontend && docker compose up -d frontend

# Acessar shell do backend
docker compose exec backend bash

# Acessar shell do Mongo
docker compose exec mongo mongosh cardapio_digital
```

## 6. Estrutura interna

```
/app/
├── docker-compose.yml          # orquestração dos 3 serviços
├── .env.example                # variáveis de ambiente (copiar para .env)
├── backend/
│   ├── Dockerfile              # python:3.11-slim + uvicorn
│   ├── .dockerignore
│   ├── requirements.txt
│   └── server.py
└── frontend/
    ├── Dockerfile              # multi-stage: node build → nginx serve
    ├── .dockerignore
    ├── nginx.conf              # SPA fallback + proxy /api → backend:8001
    ├── package.json
    └── src/
```

### Como o frontend chama a API dentro do Docker

No build do React, `REACT_APP_BACKEND_URL` é setado como **string vazia**. Isso faz com que o cliente chame `/api/...` (URL relativa). O Nginx do container `frontend` recebe essa requisição e faz proxy para `http://backend:8001/api/...` — tudo dentro da rede interna do compose. Não há CORS no caminho do cliente porque o navegador vê apenas o origin do frontend.

## 7. Deploy em produção

Recomendações mínimas:

1. **Troque `JWT_SECRET`** por uma string aleatória de pelo menos 64 caracteres
2. **Troque `ADMIN_PASSWORD`** e, após o primeiro login, vá em **Equipe → Editar** seu próprio usuário e troque novamente pela UI
3. **Restrinja `CORS_ORIGINS`** para o domínio real do estabelecimento
4. Coloque um **reverse proxy com TLS** (Traefik, Caddy, Nginx) na frente — assim o app fica em HTTPS
5. Faça backup periódico do volume `mongo_data` (`docker run --rm -v cardapio-digital_mongo_data:/data -v $(pwd):/backup busybox tar czf /backup/mongo.tgz -C /data .`)
6. Considere subir o Mongo em serviço gerenciado (Mongo Atlas) e remover o container `mongo` daqui

## 8. Solução de problemas

| Sintoma | Causa provável | O que fazer |
|--|--|--|
| `frontend` não abre | Build do React falhou | `docker compose logs frontend` |
| Página abre mas nada carrega | Backend não respondeu | `docker compose logs backend`; verifique `MONGO_URL` |
| Upload de imagem retorna 500 | `EMERGENT_LLM_KEY` vazio ou inválido | Configure a chave no `.env` e `docker compose up -d backend` |
| Login admin não funciona | `ADMIN_EMAIL`/`ADMIN_PASSWORD` mudaram após o seed | `docker compose down -v && docker compose up -d` (apaga banco) |
| Mongo não inicia em Mac/Windows | Recursos baixos no Docker Desktop | Aumente memória/CPU em Settings → Resources |
