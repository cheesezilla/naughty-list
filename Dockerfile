# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run check-content && npm test && npm run build

FROM node:22-alpine
RUN apk add --no-cache su-exec tzdata
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data NODE_NO_WARNINGS=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY content ./content
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "dist/server.js"]
