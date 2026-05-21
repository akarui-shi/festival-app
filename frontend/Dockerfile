FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json bun.lockb* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
ENV PORT=80
ENV BACKEND_UPSTREAM=backend:8080
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
