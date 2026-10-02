# Multi-stage build for TypstPad
# Stage 1: Build the application
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
ARG BUILD_MODE=production
ARG SITE_URL
ARG SITE_INDEXABLE=true
RUN npm run build -- --mode "$BUILD_MODE"

# Precompress assets for Nginx. Quality 11 takes about two minutes for the
# Typst compiler; pass a lower BROTLI_QUALITY for faster local builds.
ARG BROTLI_QUALITY=11
RUN node scripts/precompress.mjs --quality "$BROTLI_QUALITY"

# Stage 2: Production image with Nginx (with Brotli support)
FROM fholzer/nginx-brotli:v1.28.0

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/snippets/typstpad-security-headers.conf

# Expose port 80
EXPOSE 80
