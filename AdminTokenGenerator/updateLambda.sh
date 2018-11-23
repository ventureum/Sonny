#!/bin/bash

rm app.zip
npm run build
zip -r app.zip ./
aws lambda update-function-code \
    --region "ca-central-1" \
    --function-name "admin_token_generator_$1_$2" \
    --zip-file "fileb://./app.zip"
