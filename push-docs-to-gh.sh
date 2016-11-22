#!/bin/bash

if [ "$TRAVIS_REPO_SLUG" == "gastonadrian/cmi-data-collector" ] && [ "$TRAVIS_BRANCH" == "master" ]; then

  echo -e "Publishing documentation...\n"

  cp -R ./docs $HOME/docs-latest

  cd $HOME
  git config --global user.email "travis@travis-ci.org"
  git config --global user.name "travis-ci"
  git clone --quiet --branch=gh-pages https://${GITHUB_TOKEN}@github.com/gastonadrian/cmi-data-collector gh-pages > /dev/null

  cd gh-pages
  # git rm -rf ./docs
  cp -Rf $HOME/docs-latest/ ./
  git add -f .
  git commit -m "Latest documentation on successful travis build $TRAVIS_BUILD_NUMBER auto-pushed to gh-pages"
  git push -fq origin gh-pages > /dev/null

  echo -e "Published documentation to gh-pages.\n"
  
fi