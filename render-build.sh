#!/usr/bin/env bash
# a basic build script which ensures chromium browser installed on render. 
set -o errexit

npm install 

export PUPPETEER_CACHE_DIR=opt/render/project/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR
npx puppeteer browsers install chrome