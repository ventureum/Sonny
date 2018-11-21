#!/bin/bash

rm app.zip
zip -r app.zip ./
aws lambda update-function-code \
    --function-name "arn:aws:lambda:us-west-1:727151012682:function:get_access_token" \
    --zip-file "fileb://./app.zip"
