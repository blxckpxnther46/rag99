# ─────────────────────────────────────────────────────────────
# @concept Backend Deployment
# @concept Containerization (Docker + Render)
# ─────────────────────────────────────────────────────────────
# Multi-Stage Build & Container Execution Architecture:
#
# 1. MULTI-STAGE BUILD PATTERN:
#    - Stage 1 (builder): Compiles TypeScript source into JavaScript (`dist/`)
#      and generates the Prisma Client (`npx prisma generate`).
#    - Stage 2 (runner): Creates a slim production image with `node:20-alpine`,
#      installing only production dependencies (`npm install --omit=dev`),
#      stripping source code and compiler overhead for reduced attack surface and faster boot.
#
# 2. EXPOSE 4000:
#    - Documents that the containerized Node.js process listens on internal port 4000.
#    - Note: EXPOSE does NOT publish the port to the public Internet by itself.
#      It serves as metadata for container engines (Docker, Render, Kubernetes).
#
# 3. CMD ["node", "dist/server.js"]:
#    - Specifies the executable runtime command triggered when the container starts.
#    - Boots the production HTTP/WebSocket Express server directly with Node.js.
#
# 4. RELATION TO RENDER DEPLOYMENT:
#    - How Render container deployments work:
#      Render builds this Dockerfile, spins up the container, and automatically
#      detects port 4000 from EXPOSE (or passes `PORT` via environment variable).
#    - External Accessibility:
#      Render's edge routing layer maps external incoming HTTPS traffic (port 443)
#      at `https://rag99-api.onrender.com` down to the container's internal port.
#    - If using Render's Docker Runtime:
#      In Render Dashboard, select "Docker" as runtime environment (or in render.yaml:
#      env: docker, dockerfilePath: ./api/Dockerfile, dockerContext: ./api).
# ─────────────────────────────────────────────────────────────

# STAGE 1: Build Environment
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate && npm run build

# STAGE 2: Lightweight Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# Install only production dependencies
RUN npm install --omit=dev
# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Container metadata: in-container listening port
EXPOSE 4000

# Container entrypoint command
CMD ["node", "dist/server.js"]
