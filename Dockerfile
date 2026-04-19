FROM node:20-alpine
WORKDIR /app
COPY server.js .
COPY package.json .
CMD ["node", "server.js"]
