#!/bin/bash
cd /Users/macbook/Documents/ChatGPT/小组平台
PY=/Users/macbook/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
run() { COURSE_SLUG=$1 $PY scripts/tts_generate.py --lessons "$2" > /tmp/tts-fix-$1.log 2>&1 || echo "FAIL $1 $2"; }
run cuibai 10
run fengsheng-shengming 22
run guanli-wode-jiankang 1,12
run rumen-chajing 7
run shengjing-ruci-shuo 21
run tonglai-yanxi 4,5,6,7
run xunbao-chajing 17,18,19,21
echo "FIX DONE $(date +%H:%M)"
