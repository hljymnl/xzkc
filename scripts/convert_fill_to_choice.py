# -*- coding: utf-8 -*-
"""把课程里的填空题(填充)转换为选择题（每空一题，选词填空）。
数据来源: data/answers/yaodao-fill-choice.json
用法: python scripts/convert_fill_to_choice.py
"""
import json, re, os

ROOT = "/Users/macbook/Documents/ChatGPT/小组平台"
COURSE = os.path.join(ROOT, "data/courses/yaodao-rumen.json")
ANSWERS = os.path.join(ROOT, "data/answers/yaodao-fill-choice.json")

BLANK = re.compile(r'（\s*）')

def insert_marker(text, blank_idx):
    """在第 blank_idx 个空（从0起）前插入 【第N空】"""
    positions = [m.start() for m in BLANK.finditer(text)]
    if blank_idx >= len(positions):
        return text
    pos = positions[blank_idx]
    return text[:pos] + f"【第{blank_idx+1}空】" + text[pos:]

def main():
    course = json.load(open(COURSE, encoding='utf-8'))
    ans = json.load(open(ANSWERS, encoding='utf-8'))
    total_q = 0
    total_blank = 0
    for l in course['lessons']:
        la = ans.get(l['id'])
        if not la:
            continue
        # 找到本课的填充组（每组转换成一个选择题组）
        new_groups = []
        fill_idx = 0  # 第几个填充组
        for g in l.get('quiz', []):
            if g['type'] == 'fill':
                if fill_idx < len(la):
                    data = la
                    questions, options, answers = [], [], []
                    for qi, q in enumerate(g['questions']):
                        item = data[qi] if qi < len(data) else None
                        if not item:
                            continue
                        # 去掉粘连的“思考题:...”
                        qtext = re.sub(r'思考题[:：].*$', '', q).strip()
                        # 去掉题号前缀（一）（二）... 保留句子
                        qtext = re.sub(r'^[（(][一二三四五六七八九十]+[)）]\s*', '', qtext)
                        n_blank = len(item['answers'])
                        for bi in range(n_blank):
                            questions.append(insert_marker(qtext, bi))
                            options.append(item['options'][bi])
                            answers.append(item['answers'][bi])
                            total_blank += 1
                        total_q += 1
                    new_groups.append({
                        "label": "选词填空（选择题）",
                        "type": "choice",
                        "questions": questions,
                        "options": options,
                        "answers": answers,
                    })
                    fill_idx += 1
                # 填充组不再保留
            else:
                new_groups.append(g)
        if fill_idx:
            l['quiz'] = new_groups
    json.dump(course, open(COURSE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"完成：转换 {total_q} 道填空题 -> {total_blank} 道选择题（每空一题）")

if __name__ == '__main__':
    main()
