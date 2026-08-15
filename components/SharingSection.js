'use client';
import { useEffect, useRef, useState } from 'react';
import { getUserId, getLessonShare, saveLessonShare } from '@/lib/store';
import { saveRecording, getRecording, deleteRecording, startRecording } from '@/lib/voice';

function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}

export default function SharingSection({ course, lesson }) {
  const questions = lesson.discussion || [];
  const [uid, setUid] = useState('');
  const [share, setShare] = useState({});
  const [recState, setRecState] = useState({}); // idx -> {status:'idle'|'rec'|'done', blobUrl}
  const recRef = useRef({});

  useEffect(() => { setUid(getUserId()); }, []);
  useEffect(() => {
    if (uid) setShare(getLessonShare(uid, course.id, lesson.id));
  }, [uid, course.id, lesson.id]);

  const persist = (next) => {
    setShare(next);
    saveLessonShare(uid, course.id, lesson.id, next);
  };

  const setText = (idx, val) => persist({ ...share, [`q${idx}`]: { ...(share[`q${idx}`] || {}), text: val } });

  const toggleRec = async (idx) => {
    const st = recState[idx] || { status: 'idle' };
    if (st.status === 'rec') {
      const rec = recRef.current[idx];
      if (rec) { rec.stop(); }
      return;
    }
    if (st.status === 'playing') {
      if (st.audio) st.audio.pause();
      setRecState({ ...recState, [idx]: { ...st, status: 'idle' } });
      return;
    }
    try {
      const rec = await startRecording((blob) => {
        const key = `voice:${uid || 'guest'}:${course.id}:${lesson.id}:${idx}`;
        saveRecording(key, blob).then(() => {
          const url = URL.createObjectURL(blob);
          setRecState((prev) => ({ ...prev, [idx]: { status: 'done', blobUrl: url, mime: blob.type } }));
          persist({ ...share, [`v${idx}`]: true });
        }).catch((e) => {
          setRecState((prev) => ({ ...prev, [idx]: { status: 'error' } }));
          alert('录音保存失败：' + e.message);
        });
      });
      recRef.current[idx] = rec;
      setRecState((prev) => ({ ...prev, [idx]: { status: 'rec' } }));
    } catch (e) {
      setRecState((prev) => ({ ...prev, [idx]: { status: 'error' } }));
      alert('无法录音，请检查麦克风权限：' + e.message);
    }
  };

  const playVoice = async (idx) => {
    if (recState[idx]?.status === 'playing') {
      const st = recState[idx];
      if (st.audio) st.audio.pause();
      setRecState({ ...recState, [idx]: { ...st, status: 'idle' } });
      return;
    }
    const key = `voice:${uid || 'guest'}:${course.id}:${lesson.id}:${idx}`;
    let blob;
    try {
      blob = await getRecording(key);
    } catch {}
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => setRecState((prev) => ({ ...prev, [idx]: { ...prev[idx], status: 'idle' } }));
    audio.play();
    setRecState((prev) => ({ ...prev, [idx]: { ...(prev[idx] || {}), status: 'playing', audio } }));
  };

  const deleteVoice = async (idx) => {
    const key = `voice:${uid || 'guest'}:${course.id}:${lesson.id}:${idx}`;
    await deleteRecording(key).catch(() => {});
    const { [`v${idx}`]: _v, ...rest } = share;
    persist(rest);
    setRecState((prev) => ({ ...prev, [idx]: { status: 'idle' } }));
  };

  if (!questions.length) return null;
  const answered = questions.filter((_, i) => share[`q${i}`]?.text || share[`v${i}`]).length;

  return (
    <div style={{ marginTop: 8 }}>
      <h2 className="quiz-title">💬 读书分享</h2>
      <p className="quiz-intro">
        聚会后写下或录下你对讨论题的想法，作为你的读书分享记录（保存在本机）。
        {answered > 0 && <strong> 已分享 {answered}/{questions.length} 题</strong>}
      </p>

      {lesson.goal && (
        <div className="card card-pad" style={{ background: 'var(--accent-soft)' }}>
          <p style={{ margin: 0, fontSize: 14.5, color: '#7a5f17' }}>🎯 今日对话目标：{lesson.goal}</p>
        </div>
      )}

      {questions.map((q, i) => {
        const st = recState[i] || { status: 'idle' };
        const ans = share[`q${i}`] || {};
        return (
          <div key={i} className="card qcard">
            <p className="qtext" style={{ marginBottom: 6 }}>{i + 1}. {q}</p>
            <button className="btn ghost" style={{ padding: '4px 10px', fontSize: 13, marginBottom: 8 }}
              onClick={() => speak(q)}>🔊 读题</button>
            <textarea className="qtextarea" style={{ minHeight: 64 }} placeholder="写下你的分享…（也可用下方🎤语音留言）"
              value={ans.text || ''} onChange={(e) => setText(i, e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button className="btn ghost" style={{ padding: '8px 12px', fontSize: 14 }}
                onClick={() => toggleRec(i)} disabled={st.status === 'rec'}>
                {st.status === 'rec' ? '⏹ 停止录音…' : (st.status === 'done' || share[`v${i}`] ? '🎤 重录' : '🎤 语音留言')}
              </button>
              {(st.status === 'done' || share[`v${i}`]) && (
                <>
                  <button className="btn ghost" style={{ padding: '8px 12px', fontSize: 14 }}
                    onClick={() => playVoice(i)}>
                    {st.status === 'playing' ? '⏸ 暂停' : '▶ 听我的留言'}
                  </button>
                  <button className="btn ghost" style={{ padding: '8px 12px', fontSize: 14, color: 'var(--err)' }}
                    onClick={() => deleteVoice(i)}>🗑 删除</button>
                </>
              )}
              {st.status === 'error' && <span style={{ color: 'var(--err)', fontSize: 13 }}>录音不可用</span>}
            </div>
          </div>
        );
      })}

      <div className="card card-pad" style={{ textAlign: 'center', background: 'var(--accent-soft)' }}>
        <p style={{ margin: 0, fontSize: 14, color: '#7a5f17' }}>
          ✨ 读书分享小贴士：分享不在长短，真诚最重要。把最触动你的一句话告诉小组吧。
        </p>
      </div>
    </div>
  );
}
