# 1. ビルド環境
FROM node:22-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# docker-compose からIPアドレスを受け取ってビルドに埋め込む
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# 2. 本番配信環境 (Nginx)
FROM nginx:alpine
COPY --from=build-stage /app/dist /usr/share/nginx/html
# 画面リロード時にエラーになるのを防ぐ設定
RUN sed -i '10i \\        try_files $uri $uri/ /index.html;' /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]