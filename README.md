# MarketMap3D

3D indoor mapping and navigation system designed for flea markets

## Development

### Quick Start

```bash
npm install && npm run dev
```

### Local Development

```bash
npm run dev
```

Run the development server without Docker:

### Development with Docker + Nginx

```bash
docker compose -p marketmap3d-dev -f docker-compose.yml -f docker-compose-dev.yml up --watch
```

Runs the app inside a Docker container behind Nginx. Use this to test Nginx config (SSL, headers, cache etc.)

The `-p` flag namespaces the dev container and `--watch` flag automatically syncs file changes and restarts services when configuration files are modified.

### Production

```bash
docker compose up -d
```

Build and run the application in detached mode with production optimizations enabled.

## Notes

- Test certificates are located in `testcerts/`
- Nginx configuration files are in `nginx-snippets/` and `nginx.conf`
- Logs are persisted in the `nginx_logs` volume

## Todo

- [x] Fit to screen button
- [x] Search bar
- [ ] Beautiful popup
