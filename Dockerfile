# Base images are pinned by digest (P-2). Refresh with `python3 scripts/pin_images.py` before a
# release; `python3 scripts/pin_images.py --check` fails on any unpinned FROM / image line.

# ---------- Stage 1: Build the Vite app ----------
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy all source code
COPY . .

# Path the app is served under: "/" in EKS, "/vector/" behind the local hub nginx
ARG BASE_PATH=/
ENV BASE_PATH=${BASE_PATH}

# Build the production version
RUN npm run build

# ---------- Stage 2: Serve with Nginx (non-root) ----------
# nginx-unprivileged runs as uid 101 and listens on 8080. With a read-only root filesystem the only
# writable path is /tmp (pid file and temp dirs, see nginx.conf), an emptyDir / tmpfs.
FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:378d0c32f6562f7fd9629170797f57d2b953aa09be983b3daaf4809bb039ca00

ARG BASE_PATH=/

# Copy build output from previous stage (under the base path, so nginx serves it at that prefix).
# Owned by root: the nginx user can read but not modify what it serves.
COPY --from=build /app/dist /usr/share/nginx/html${BASE_PATH}

# Copy our Docker-specific Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
