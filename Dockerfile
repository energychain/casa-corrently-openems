FROM node:lts
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package*.json ./
COPY sample_config.json ./
USER node
RUN npm install
COPY --chown=node:node . .
EXPOSE 3000
RUN npm install pm2 -g
ENV PM2_PUBLIC_KEY 98ds7yd6auypqpk
ENV PM2_SECRET_KEY qwmvnfkkoy07vhg
CMD ["pm2-runtime", "./app.js","/casa-corrently-docker"]
