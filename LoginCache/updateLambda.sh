#!/bin/bash

rm app.zip
npm run build
rm app.zip
zip -r app.zip ./
aws lambda update-function-code \
    --region "us-west-1" \
    --function-name "arn:aws:lambda:us-west-1:727151012682:function:get_access_token" \
    --zip-file "fileb://./app.zip"
