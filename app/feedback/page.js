'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserId } from '@/lib/store';
import { isSyncOn, pullLeaderComments } from '@/lib/sync';

// 学员端：查看组长反馈（自动同步或导入反馈文件）
export default function FeedbackPage() {
  const [paste, setPaste] = useState('');
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');

  // 若开启了自动同步，自动拉取组长回应
  useEffect(() => {
    if (!isSyncOn()) return;
    let stop = false;
    const load = async () => {
      const uid = getUserId();
      if (!uid) return;
      const comments = await pullLeaderComments(uid);
      if (!stop && Object.keys(comments).length) setData({ type: 'xz-leader-feedback', comments });
    };
    load();
    const iv = setInterval(load, 8000);
    return () => { stop = true; clearInterval(iv); };
  }, []);

  const parse = () => {
    try {
      const d = JSON.parse(paste);
      if (d.type !== 'xz-leader-feedback') { setMsg('不是有效的组长反馈文件'); return; }
      setData(d); setMsg('导入成功');
    } catch { setMsg('JSON 解析失败'); }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div className="topbar-inner">
          <Link className="back" href="/">‹</Link>
          <span className="title">组长反馈</span>
        </div>
      </div>
      <div className="page-head">
        <h1>💌 组长反馈</h1>
        <p>把组长发给你的「反馈文件」内容粘贴到这里，查看组长的回应。</p>
      </div>
      <div className="card card-pad">
        <textarea className="qtextarea" style={{ minHeight: 90 }} placeholder="粘贴组长反馈 JSON…" value={paste}
          onChange={(e) => setPaste(e.target.value)} />
        <button className="btn block" style={{ marginTop: 10 }} onClick={parse}>查看反馈</button>
        {msg && <p style={{ color: 'var(--ok)', margin: '8px 0 0', fontSize: 14 }}>{msg}</p>}
      </div>

      {data && (
        <div>
          {Object.keys(data.comments || {}).length === 0 && <p className="hint">组长还没有给你留言。</p>}
          {Object.keys(data.comments || {}).map((key) => (
            <div key={key} className="card qcard">
              <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--muted)' }}>📖 {key}</p>
              {(data.comments[key] || []).map((c, i) => (
                <p key={i} style={{ margin: '4px 0', fontSize: 15, color: 'var(--primary-dark)', background: 'var(--accent-soft)', padding: '8px 12px', borderRadius: 10 }}>
                  👨‍🏫 {c.at.slice(0, 10)}：{c.text}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
