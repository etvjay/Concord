FROM node:24.19.0-alpine AS build

WORKDIR /repo/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY frontend/ ./
COPY sdk/typescript/ /repo/sdk/typescript/
COPY config/coston2/concord-deployment.json /repo/config/coston2/concord-deployment.json

RUN npm run build

FROM nginx:1.29.4-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
