#!/bin/bash

# Updates the twitter.json file

set -e

BASE=$(dirname $0)

cd $BASE

git pull --rebase > /dev/null 2>&1 

node lib/node/ebbflow.js 

STATUS=$(git status --porcelain)

if [ -n "$STATUS" ]
then
  git commit -a -m "Updating twitter.json" > /dev/null 2>&1
  git push origin gh-pages > /dev/null 2>&1
fi


