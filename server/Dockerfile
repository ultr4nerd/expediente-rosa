FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 8787
# Node 24 strips TypeScript types natively: no build step.
CMD ["node", "src/index.ts"]
