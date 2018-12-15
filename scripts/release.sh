#!/bin/bash

if [ -d app ]; then
    rm -rf app
fi
mkdir app

npm run build

cp -r dist index.html package.json app/
cd app
npm install --production --no-package-lock
cd -

./node_modules/electron-packager/cli.js app --platform=darwin --arch=x64
./node_modules/electron-packager/cli.js app --platform=linux --arch=x64

rm -rf app
