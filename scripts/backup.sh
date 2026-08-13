#!/bin/bash
# 完整备份：源码 + 全部音频 + 课程数据（排除可再生的 node_modules/.next/.git/out）
set -e
cd /Users/macbook/Documents/ChatGPT/小组平台
STAMP=$(date +%Y%m%d-%H%M)
OUT=/tmp/xiaozu-backup-$STAMP.zip
rm -f "$OUT"
zip -r -q "$OUT" \
  app components lib scripts data public \
  README.md package.json next.config.mjs jsconfig.json .gitignore \
  -x "*/node_modules/*" "*.next/*" "*/.git/*" "out/*"
echo "BACKUP: $OUT"
ls -lh "$OUT"
