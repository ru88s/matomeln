#!/bin/bash

# 開発環境用のセットアップ
# app-api ディレクトリを app/api にコピー

# app/api が存在する場合は削除
if [ -e "app/api" ]; then
  rm -rf app/api
fi

# ディレクトリをコピー
cp -r app-api app/api

echo "Development API routes enabled"