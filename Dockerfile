# Simple Dockerfile for Vite-based React App
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* bun.lockb* ./
RUN npm install || bun install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
