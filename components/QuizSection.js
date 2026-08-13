'use client';
import { useEffect, useState } from 'react';
import { getLessonQuiz, saveLessonQuiz, getUserId, recordQuizAnswered } from '@/lib/store';

const TYPE_META = {
  fill: { title: '填空题', icon: '✍️', hint: '根据本课内容填写空白处' },
  choice: { title: '是非 / 选择题', icon: '✅', hint: '选择你的答案' },
  open: { title: '思考题', icon: '💭', hint: '写下来你的想法，可分享给小组' },
};

export default function QuizSection({ slug, lessonId, quiz }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState({});

  useEffect(() => {
    setAnswers(getLessonQuiz(slug, lessonId));
  }, [slug, lessonId]);

  const persist = (next) => {
    setAnswers(next);
    saveLessonQuiz(slug, lessonId, next);
  };

  const setAnswer = (groupIdx, qIdx, val) => {
    persist({ ...answers, [`${groupIdx}:${qIdx}`]: val });
  };

  const handleSubmit = () => {
    const nextSub = {};
    quiz.forEach((g, gi) => {
      g.questions.forEach((_, qi) => {
        const key = `${gi}:${qi}`;
        if (answers[key] !== undefined && String(answers[key]).trim() !== '') nextSub[key] = true;
      });
    });
    setSubmitted(nextSub);
    const answered = Object.keys(nextSub).length;
    if (answered) recordQuizAnswered(getUserId(), slug, lessonId, answered);
  };

  // 判分：choice 有答案时判对错；其余显示参考答案
  const grade = (g, gi, qi) => {
    const key = `${gi}:${qi}`;
    const ans = answers[key];
    if (ans === undefined || String(ans).trim() === '') return null;
    if (g.type === 'choice' && g.answers && g.answers[qi] !== undefined) {
      return String(ans).trim() === String(g.answers[qi]).trim();
    }
    return null;
  };
  const refAnswer = (g, qi) => (g.answers && g.answers[qi]) || null;

  return (
    <div>
      <h2 className="quiz-title">📝 本课测验</h2>
      <p className="quiz-intro">学完课文后，做一做练习题吧！是非/选择题有答案的会自动判分，填空题与思考题提交后可查看参考答案。</p>
      {quiz.map((g, gi) => {
        const meta = TYPE_META[g.type] || { title: g.label, icon: '📋', hint: '' };
        return (
          <div key={gi} className="qgroup">
            <p className="qgroup-label">{meta.icon} {g.label}</p>
            {g.questions.map((q, qi) => {
              const key = `${gi}:${qi}`;
              const val = answers[key];
              const isSubmitted = !!submitted[key];
              const gd = grade(g, gi, qi);
              const ref = refAnswer(g, qi);
              const opts = g.type === 'choice'
                ? (Array.isArray(g.options?.[0]) ? (g.options[qi] || []) : (g.options || ['对', '错']))
                : [];
              return (
                <div key={qi} className="card qcard">
                  <p className="qtext">{q}</p>
                  {g.type === 'choice' && (
                    <div className="qoptions">
                      {opts.map((opt, oi) => {
                        const ov = String(opt);
                        const isSel = String(val) === ov;
                        const isRight = ref !== null && String(ref) === ov;
                        let cls = isSel ? 'selected' : '';
                        if (isSubmitted && gd !== null) {
                          if (isSel) cls += gd ? ' ok' : ' bad';
                          else if (isRight && gd === false) cls += ' ok';
                        }
                        return (
                          <button key={oi} className={`qopt ${cls}`} onClick={() => setAnswer(gi, qi, opt)}>
                            {ov}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {g.type === 'fill' && (
                    <input className="qinput" value={val || ''} placeholder="填入你的答案…"
                      onChange={(e) => setAnswer(gi, qi, e.target.value)} />
                  )}
                  {g.type === 'open' && (
                    <textarea className="qtextarea" value={val || ''} placeholder="写下你的想法…"
                      onChange={(e) => setAnswer(gi, qi, e.target.value)} />
                  )}
                  {isSubmitted && gd !== null && (
                    <p className={`qresult ${gd ? 'ok' : 'bad'}`}>{gd ? '✓ 回答正确' : '✗ 回答不正确'}</p>
                  )}
                  {isSubmitted && ref && gd === null && (
                    <p className="qresult" style={{ color: 'var(--muted)' }}>
                      💡 参考答案：{ref}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="quiz-footer">
        <button className="btn block" onClick={handleSubmit}>提交已答题目</button>
      </div>
    </div>
  );
}
