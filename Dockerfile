FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages ./packages
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter @mubdi/api build
EXPOSE 8787
CMD ["node", "apps/api/dist/server.js"]