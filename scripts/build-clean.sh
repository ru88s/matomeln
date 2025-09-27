#!/bin/bash

# 本番ビルド用のクリーンアップ
# app/api シンボリックリンクを削除

# app/api が存在する場合は削除
if [ -e "app/api" ]; then
  rm -rf app/api
  echo "Removed API routes for production build"
fi