# -*- coding: utf-8 -*-
"""用 edge-tts 为课程生成音频。
正文: 晓晓(女声) | 存心节: 云希(男声)
按句切块 -> 每块一个 mp3 -> 写回课程 JSON 的 audio 清单。
用法: python tts_generate.py [--lessons 1-3] [--voice-content zh-CN-XiaoxiaoNeural] [--voice-memory zh-CN-YunxiNeural]
"""
import asyncio, argparse, json, re, sys, os
import edge_tts

ROOT = "/Users/macbook/Documents/ChatGPT/小组平台"
COURSE = os.path.join(ROOT, "data/courses/yaodao-rumen.json")
AUDIO_DIR = os.path.join(ROOT, "public/audio/yaodao-rumen")

SENT_RE = re.compile(r'[^。！？]*[。！？]+[”’」』]?|[^。！？]+$')

def chunk_text(text, max_chars=120):
    """按句子切块，每块尽量不超过 max_chars 字符"""
    units = [u for u in SENT_RE.findall(text) if u.strip()]
    chunks, cur = [], ''
    for u in units:
        if len(u) > max_chars:  # 超长单句，硬切
            for i in range(0, len(u), max_chars):
                chunks.append(u[i:i+max_chars])
            continue
        if cur and len(cur) + len(u) > max_chars:
            chunks.append(cur); cur = u
        else:
            cur += u
    if cur: chunks.append(cur)
    return chunks

async def gen_one(voice, text, out, sem):
    async with sem:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        tts = edge_tts.Communicate(text, voice, rate="-8%")
        await tts.save(out)
        return out

async def gen_lesson(lesson, sem, args):
    num = lesson['number']
    ldir = os.path.join(AUDIO_DIR, f"lesson-{num}")
    manifest = {"lessonId": lesson['id'], "memoryAudio": None, "segments": []}
    tasks = []
    # 存心节 (云希 男声)
    if lesson.get('memory'):
        out = os.path.join(ldir, "memory.mp3")
        tasks.append((gen_one(args.voice_memory, lesson['memory'], out, sem), "memory", out))
    # 正文小节 (晓晓 女声)
    seg_idx = 0
    for si, sec in enumerate(lesson['sections']):
        if sec['heading']:
            manifest['segments'].append({"type": "heading", "section": si, "text": sec['heading'], "audio": None})
        for chunk in chunk_text(sec['text']):
            out = os.path.join(ldir, f"sec-{si}-{seg_idx}.mp3")
            manifest['segments'].append({"type": "text", "section": si, "text": chunk, "audio": f"/audio/yaodao-rumen/lesson-{num}/sec-{si}-{seg_idx}.mp3"})
            tasks.append((gen_one(args.voice_content, chunk, out, sem), "seg", out))
            seg_idx += 1
    results = await asyncio.gather(*(t[0] for t in tasks))
    for (coro, kind, out), ok in zip(tasks, results):
        if kind == 'memory' and ok:
            manifest['memoryAudio'] = f"/audio/yaodao-rumen/lesson-{num}/memory.mp3"
    return manifest

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lessons', default=None, help='如 1 或 1-3 或 1,3,5')
    ap.add_argument('--voice-content', default='zh-CN-XiaoxiaoNeural')
    ap.add_argument('--voice-memory', default='zh-CN-YunxiNeural')
    args = ap.parse_args()

    course = json.load(open(COURSE, encoding='utf-8'))
    lessons = course['lessons']
    if args.lessons:
        sel = set()
        for part in args.lessons.split(','):
            if '-' in part:
                a, b = part.split('-'); sel.update(range(int(a), int(b)+1))
            else:
                sel.add(int(part))
        lessons = [l for l in lessons if l['number'] in sel]
    sem = asyncio.Semaphore(4)
    for l in lessons:
        man = await gen_lesson(l, sem, args)
        l['audio'] = man
        print(f"课{l['number']} {l['title']}: {len(man['segments'])} 段音频, 存心节={'有' if man['memoryAudio'] else '无'}", flush=True)
    json.dump(course, open(COURSE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("done. audio manifest written to", COURSE)

if __name__ == '__main__':
    asyncio.run(main())
