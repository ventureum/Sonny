#!/bin/bash

rm app.zip
npm run build
zip -r app.zip ./
aws lambda update-function-code \
    --function-name "Sonny" \
    --zip-file "fileb://./app.zip"
