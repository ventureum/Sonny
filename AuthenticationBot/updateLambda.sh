#!/bin/bash

rm app.zip
npm run build
zip -r app.zip ./
aws lambda update-function-code \
    --region "us-west-1" \
    --function-name "AuthenticationBot" \
    --zip-file "fileb://./app.zip"
