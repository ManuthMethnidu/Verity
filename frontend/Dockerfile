FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace and package files
COPY package.json ./
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install --workspace=frontend

# Copy source and build
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Custom nginx conf for SPA routing and cross-origin isolation
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cross-Origin-Opener-Policy same-origin; \
        add_header Cross-Origin-Embedder-Policy credentialless; \
    } \
    location /api/ { \
        proxy_pass http://backend:8080/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
