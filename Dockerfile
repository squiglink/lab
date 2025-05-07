FROM node:23.11-alpine3.21

RUN npm install --global pnpm@^10.10.0

WORKDIR /lab
