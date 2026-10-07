
# ---------- Stage 1: Build the Vite app ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy all source code
COPY . .

# Build the production version
RUN npm run build

# ---------- Stage 2: Serve with Nginx ----------
FROM nginx:alpine

# Copy build output from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our Docker-specific Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
