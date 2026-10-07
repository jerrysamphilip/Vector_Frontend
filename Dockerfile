# ---------- Stage 1: Build the Vite app ----------
FROM node:22-alpine AS build

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

# ---------- Stage 2: Serve with Nginx ----------
FROM nginx:alpine

ARG BASE_PATH=/

# Copy build output from previous stage (under the base path, so nginx serves it at that prefix)
COPY --from=build /app/dist /usr/share/nginx/html${BASE_PATH}

# Copy our Docker-specific Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
