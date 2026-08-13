# -*- coding: utf-8 -*-
"""把 data/answers/<course>.json 的答案合并进课程 JSON 的 quiz 组。"""
import json, sys, os

ROOT = "/Users/macbook/Documents/ChatGPT/小组平台"
def main():
    course = json.load(open(f"{ROOT}/data/courses/yaodao-rumen.json", encoding='utf-8'))
    ans_path = f"{ROOT}/data/answers/yaodao-rumen.json"
    if not os.path.exists(ans_path):
        print("no answers file"); return
    ans = json.load(open(ans_path, encoding='utf-8'))
    for l in course['lessons']:
        la = ans.get(l['id'])
        if not la: continue
        for item in la.get('quiz', []):
            gi = item['group']
            if gi < len(l['quiz']):
                g = l['quiz'][gi]
                g['answers'] = item['answers']
                if item['type'] == 'choice':
                    g['options'] = g.get('options') or ['对', '错']
    json.dump(course, open(f"{ROOT}/data/courses/yaodao-rumen.json", 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("answers merged")

if __name__ == '__main__':
    main()
