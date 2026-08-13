# -*- coding: utf-8 -*-
"""从磁盘上已有的 mp3 文件重建课程 JSON 的 audio 清单（无需重新调用 TTS）。
分段逻辑与 tts_generate.py 完全一致。"""
import json, os, re

ROOT = "/Users/macbook/Documents/ChatGPT/小组平台"
COURSE = os.path.join(ROOT, "data/courses/yaodao-rumen.json")
AUDIO_DIR = os.path.join(ROOT, "public/audio/yaodao-rumen")
SLUG = "yaodao-rumen"

SENT_RE = re.compile(r'[^。！？]*[。！？]+[”’」』]?|[^。！？]+$')

def chunk_text(text, max_chars=120):
    units = [u for u in SENT_RE.findall(text) if u.strip()]
    chunks, cur = [], ''
    for u in units:
        if len(u) > max_chars:
            for i in range(0, len(u), max_chars):
                chunks.append(u[i:i+max_chars])
            continue
        if cur and len(cur) + len(u) > max_chars:
            chunks.append(cur); cur = u
        else:
            cur += u
    if cur: chunks.append(cur)
    return chunks

def main():
    course = json.load(open(COURSE, encoding='utf-8'))
    missing = []
    total = 0
    for l in course['lessons']:
        num = l['number']
        ldir = os.path.join(AUDIO_DIR, f"lesson-{num}")
        manifest = {"lessonId": l['id'], "memoryAudio": None, "segments": []}
        mem = os.path.join(ldir, "memory.mp3")
        if l.get('memory') and os.path.exists(mem):
            manifest['memoryAudio'] = f"/audio/{SLUG}/lesson-{num}/memory.mp3"
        elif l.get('memory'):
            missing.append(f"lesson-{num}/memory.mp3")
        seg_idx = 0
        for si, sec in enumerate(l['sections']):
            if sec['heading']:
                manifest['segments'].append({"type": "heading", "section": si, "text": sec['heading'], "audio": None})
            for chunk in chunk_text(sec['text']):
                rel = f"lesson-{num}/sec-{si}-{seg_idx}.mp3"
                fp = os.path.join(AUDIO_DIR, rel)
                if os.path.exists(fp):
                    manifest['segments'].append({"type": "text", "section": si, "text": chunk, "audio": f"/audio/{SLUG}/{rel}"})
                    total += 1
                else:
                    missing.append(rel)
                seg_idx += 1
        l['audio'] = manifest
    json.dump(course, open(COURSE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"重建完成：{total} 段音频清单")
    print("缺失:", missing if missing else "无")

if __name__ == '__main__':
    main()
