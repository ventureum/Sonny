#!/bin/bash

rm app.zip
zip -r app.zip ./
aws lambda update-function-code \
    --function-name "arn:aws:lambda:us-west-1:727151012682:function:MilestoneLoginBot" \
    --zip-file "fileb://./app.zip"
