#!/bin/bash
# 部署：把 out/ 推送到 gh-pages 分支
set -e
cd /Users/macbook/Documents/ChatGPT/小组平台
rm -rf /tmp/gh-repo
mkdir -p /tmp/gh-repo
cp -R "out/." /tmp/gh-repo/
# 修复首页 RSC 负载路径：index.txt -> {basePath}.txt
if [ -f /tmp/gh-repo/index.txt ]; then
  cp /tmp/gh-repo/index.txt /tmp/gh-repo/xiaozu-kecheng.txt
fi
cd /tmp/gh-repo
git init -q -b gh-pages
git add -A
git -c user.name="lqjymnl2026" -c user.email="lqjymnl2026@users.noreply.github.com" commit -q -m "deploy site"
git remote add origin https://github.com/lqjymnl2026/xiaozu-kecheng.git
git -c http.postBuffer=1572864000 push -f origin gh-pages
echo "DEPLOY DONE"
