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

# Stage 4: Serve the app with Nginx
FROM nginx:alpine
COPY --from=build-env /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
