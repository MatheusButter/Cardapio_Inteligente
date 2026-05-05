Clique no ícone VS Code na interface do Emergent
Navegue pelos arquivos do projeto e copie o conteúdo manualmente, recriando a estrutura localmente
Rodando o projeto localmente
Backend (FastAPI + MongoDB):
cd backend
pip install -r requirements.txt
# Configure as variáveis de ambiente em backend/.env
# Garanta que o MongoDB está rodando localmente
uvicorn server:app --reload --port 8001
Frontend (React + Yarn):
cd frontend
yarn install
yarn start
⚠️ Considerações importantes:
Variáveis de ambiente — copie de backend/.env (MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, EMERGENT_LLM_KEY, APP_NAME) e frontend/.env (REACT_APP_BACKEND_URL=http://localhost:8001)
MongoDB — instale localmente ou use Atlas; ajuste MONGO_URL em backend/.env
Object Storage — EMERGENT_LLM_KEY é específico do ambiente Emergent; localmente, troque uploads por armazenamento local ou S3, ou continue usando a mesma chave (vai funcionar enquanto for válida)
Não use npm — sempre yarn no frontend
Portas: backend 8001, frontend 3000
