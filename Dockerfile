FROM node:22-alpine

WORKDIR /app

COPY server.js /app/server.js
COPY site/ /app/site/

ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000

CMD ["node", "server.js"]
