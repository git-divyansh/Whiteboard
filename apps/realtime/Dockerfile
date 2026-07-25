# Realtime WebSocket server image (deploys to Railway / Render / a Docker VPS).
# The web app deploys separately to Vercel and is not built here.
#
# The server runs directly from TypeScript via tsx — no bundle step — which keeps
# the Prisma client and other native deps resolving from node_modules as-is.

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY . .
RUN pnpm install --frozen-lockfile
# Generate the Prisma client to its custom output location.
RUN pnpm --filter @whiteboard/db generate

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production

# Copy the installed workspace (node_modules + source + generated client).
COPY --from=build /repo ./

EXPOSE 3001
WORKDIR /repo/apps/realtime
CMD ["pnpm", "start"]
