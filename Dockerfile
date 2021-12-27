FROM node:16-alpine

RUN npm install pm2 -g

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000
CMD ["pm2-runtime", "pm2.config.js"]
