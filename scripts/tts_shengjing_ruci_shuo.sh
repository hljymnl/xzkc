#!/bin/bash
cd /Users/macbook/Documents/ChatGPT/小组平台
PY=/Users/macbook/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
COURSE_SLUG=shengjing-ruci-shuo $PY scripts/tts_generate.py > /tmp/tts-shengjing-ruci-shuo.log 2>&1
tail -3 /tmp/tts-shengjing-ruci-shuo.log
echo "DONE $(date +%H:%M)"
