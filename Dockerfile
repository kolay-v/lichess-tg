FROM node:16-alpine

RUN npm install pm2 knex -g

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY migrations migrations
COPY bin bin
COPY knexfile.js .
RUN sh bin/migrate.sh

COPY . .
EXPOSE 3000
CMD ["pm2-runtime", "pm2.config.js"]
