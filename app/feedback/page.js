'use client';
import { useState } from 'react';
import Link from 'next/link';

// 学员端：导入组长反馈 JSON，查看组长的回应
export default function FeedbackPage() {
  const [paste, setPaste] = useState('');
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');

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
