# Local application image for web and API. No secrets are baked in; they come from
# the environment at run time (see compose.yaml). Not a deployment artifact.
FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM build AS runtime
# Chromium is only needed to collect the NorthStar terms page. Off by default.
ARG INSTALL_CHROMIUM=false
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN if [ "$INSTALL_CHROMIUM" = "true" ]; then \
      node_modules/.bin/playwright install --with-deps chromium \
      && chmod -R a+rX /ms-playwright; \
    fi
RUN chown -R node:node /app/apps/web/.next
USER node
EXPOSE 3000
# Default: web. compose.yaml overrides the command for api and migrate.
CMD ["node", "node_modules/next/dist/bin/next", "start", "apps/web", "--hostname", "0.0.0.0", "--port", "3000"]
