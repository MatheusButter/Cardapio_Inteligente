# syntax=docker/dockerfile:1
# --- Stage 1: build the React app ---
FROM node:20-alpine AS builder

WORKDIR /app

# REACT_APP_BACKEND_URL must be baked at build time. Empty string => relative URL,
# which is what we want when nginx in the same container proxies /api to backend.
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY . .

# Disable CRA warnings-as-errors during build
ENV CI=false
RUN yarn build

# --- Stage 2: serve with nginx ---
FROM nginx:1.27-alpine AS runner

# Replace default config with our SPA + proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=5s --retries=5 \
    CMD wget -qO- http://localhost/ || exit 1
