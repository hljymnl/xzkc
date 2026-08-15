# -*- coding: utf-8 -*-
"""为每课生成 10 道选择题（基于课文的选词填空式，jieba 分词）。
已有 ≥10 道选择题的课不动；不足则补充。"""
import json, re, glob, os, random
import jieba, jieba.posseg as pseg

ROOT = "/Users/macbook/Documents/ChatGPT/小组平台"
random.seed(42)
jieba.setLogLevel(60)

SENT_RE = re.compile(r'[^。！？]*[。！？]')
FOOTER_RE = re.compile(r'(圣经人物与你\d+|\d+圣经人物与你|丰盛的生命|要道入门[^\s，。]{0,6})')
NUM_UNIT = re.compile(r'([0-9０-９一二三四五六七八九十百千万两]+)([个年天日条章节位次卷人国城山位本课句])')
STOP = {'上帝','耶稣','圣经','我们','他们','你们','自己','一个','这个','那个','因为','所以','但是','就是','什么'}

def clean_text(text):
    text = FOOTER_RE.sub('', text)
    text = re.sub(r'\(cid:\d+\)', '', text)
    text = '\n'.join(l.lstrip('·• ').strip() for l in text.split('\n'))
    text = re.sub(r'\s+', '', text)
    # 清理常见残渣：孤立的引用括号、杂音字
    text = re.sub(r'[（(][^）)]{0,4}[)）]', '', text)
    text = re.sub(r'[」”]?$', '', text)
    return text

def sentences(text):
    t = clean_text(text)
    out = []
    for s in SENT_RE.findall(t):
        s = s.strip()
        if not (10 <= len(s) <= 90): continue
        # 跳过含书名号或经文标注的句子（挖空容易挖进专名，题质差）
        if '《' in s or re.search(r'[（(][^）)]*\d+\s*[:：]\s*\d+[^）)]*[)）]', s):
            continue
        out.append(s)
    return out

COMMON = {'时候','地方','事情','东西','问题','方法','方式','原因','结果','世界','生命','生活','人类','人们','国家','教会','信徒','圣经','上帝','耶稣','基督','门徒','先知','使徒','百姓','弟兄','姐妹','日子','年间','面前','身上','心中','里面','之间','之中','天上','地上','未来','过去','现在','一切','所有','许多','一些','一个','一位','一句','一章'}
def nouns_of(text):
    words = [w for w, flag in pseg.cut(text) if flag.startswith('n') and len(w) >= 2 and w not in STOP and w not in COMMON]
    freq = {}
    for w in words: freq[w] = freq.get(w, 0) + 1
    return sorted(freq, key=lambda w: (-freq[w], -len(w)))[:40]

def numbers_of(text):
    nums = [m.group(0) for m in NUM_UNIT.finditer(text)]
    return list(dict.fromkeys(nums))[:30]

def pick_term(sent, lesson_nouns, lesson_nums):
    for m in NUM_UNIT.finditer(sent):
        num, unit = m.group(1), m.group(2)
        if num in ('一', '二', '两') and unit in '个位章句年天次些种':
            continue
        return m.group(0)
    q = re.search(r'[「“]([^」”]{2,14})[」”]', sent)
    if q:
        return q.group(1)
    for n in lesson_nouns:
        if len(n) >= 3 and n in sent:
            return n
    for n in lesson_nouns:
        if n in sent:
            return n
    return None

def make_q(sent, term, dists):
    i = sent.find(term)
    if i == -1: return None
    stem = sent[:i] + '（　　）' + sent[i+len(term):]
    opts = [term] + [d for d in dists if d != term][:3]
    if len(set(opts)) < 2: return None
    random.shuffle(opts)
    return {"q": stem, "opts": opts, "ans": term}

def gen_for_lesson(lesson, course_nouns, course_nums, need=10):
    text = clean_text(''.join(s['text'] for s in lesson['sections']) + (lesson.get('memoryVerse') or ''))
    if len(text) < 50: return []
    sents = sentences(text)
    lesson_nouns = nouns_of(text)
    lesson_nums = numbers_of(text)
    dist_nouns = [n for n in course_nouns if n not in lesson_nouns] + lesson_nouns
    dist_nums = [n for n in course_nums if n not in lesson_nums] + lesson_nums
    random.shuffle(dist_nouns); random.shuffle(dist_nums)

    out, seen = [], set()
    for sent in sents:
        if len(out) >= need: break
        term = pick_term(sent, lesson_nouns, lesson_nums)
        if not term: continue
        is_num = bool(NUM_UNIT.fullmatch(term) or term.isdigit() or re.fullmatch(r'[一二三四五六七八九十百千万两]+', term))
        dists = dist_nums if is_num else dist_nouns
        q = make_q(sent, term, dists)
        if q and q['q'] not in seen:
            seen.add(q['q']); out.append(q)
    return out[:need]

def main():
    for f in sorted(glob.glob(f'{ROOT}/data/courses/*.json')):
        c = json.load(open(f, encoding='utf-8'))
        course_text = clean_text(' '.join(''.join(s['text'] for s in l['sections']) for l in c['lessons']))
        course_nouns = nouns_of(course_text)
        course_nums = numbers_of(course_text)
        total_added = 0
        for l in c['lessons']:
            existing = sum(len(g['questions']) for g in l.get('quiz', []) if g['type'] == 'choice')
            need = max(0, 10 - existing)
            if need == 0: continue
            qs = gen_for_lesson(l, course_nouns, course_nums, need)
            if qs:
                l.setdefault('quiz', []).append({
                    "label": "阅读理解·选择题",
                    "type": "choice",
                    "questions": [q['q'] for q in qs],
                    "options": [q['opts'] for q in qs],
                    "answers": [q['ans'] for q in qs],
                })
                total_added += len(qs)
        json.dump(c, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f"{c['title']}: 补充 {total_added} 题")

if __name__ == '__main__':
    main()
