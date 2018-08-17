#!/bin/bash

rm app.zip
zip -r app.zip ./
aws lambda update-function-code \
    --function-name "Sonny" \
    --zip-file "fileb://./app.zip"
