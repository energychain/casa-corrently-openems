#!/bin/sh
# Perform auto restarts in case of exit(2) = Update check

until npm install;npm ci;node ./app.js /casa-corrently-docker
do
  sleep 1
done
