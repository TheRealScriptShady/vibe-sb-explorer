FROM node:20-alpine

WORKDIR /app

COPY src/frontend/package.json src/frontend/package-lock.json* ./
RUN npm install

COPY src/frontend .

# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED 1

CMD ["npm", "run", "dev"]
