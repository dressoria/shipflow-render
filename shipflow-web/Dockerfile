# syntax=docker/dockerfile:1

# ── Base image ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base

# ── Production-only deps ───────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Build stage ────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Full deps (including dev) required for next build
COPY package.json package-lock.json ./
RUN npm ci

# NEXT_PUBLIC_* must be declared as ARG and promoted to ENV before `npm run build`.
# Next.js bakes these values into the client bundle at build time — not at runtime.
# Values are passed by docker-compose via build.args (sourced from .env.production in the shell).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_ENABLE_DEMO_AUTH=false

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_ENABLE_DEMO_AUTH=$NEXT_PUBLIC_ENABLE_DEMO_AUTH

# Copy source — .dockerignore excludes node_modules, .env files, .next, etc.
COPY . .
RUN npm run build

# ── Production runner ──────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Production node_modules from deps stage, built output from builder stage.
# No source code, no dev deps, no secrets are copied into the runner image.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "start"]
