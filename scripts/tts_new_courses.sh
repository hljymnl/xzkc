#!/bin/bash
# 批量生成4门新课程音频
cd /Users/macbook/Documents/ChatGPT/小组平台
PY=/Users/macbook/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
for slug in cuibai guanli-wode-jiankang rumen-chajing tonglai-yanxi; do
  echo "=== TTS $slug $(date +%H:%M) ==="
  COURSE_SLUG=$slug $PY scripts/tts_generate.py > /tmp/tts-$slug.log 2>&1 || echo "FAILED $slug"
  tail -1 /tmp/tts-$slug.log
done
echo "=== ALL DONE $(date +%H:%M) ==="
