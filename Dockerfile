# Stage 1: Install development dependencies
FROM node:20-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

# Stage 2: Install production dependencies
FROM node:20-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev

# Stage 3: Build the app
FROM node:20-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
RUN npm run build

# Stage 4: Serve the app with Caddy
FROM caddy:alpine
EXPOSE 80
EXPOSE 443
COPY --from=build-env /app/dist /srv/dist
COPY Caddyfile /etc/caddy/Caddyfile
