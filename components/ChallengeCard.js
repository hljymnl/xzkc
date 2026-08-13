'use client';
import { useEffect, useState } from 'react';
import { getChallenge, getKnownIds, getUserId } from '@/lib/store';

export default function ChallengeCard() {
  const [rows, setRows] = useState([]);
  const refresh = () => {
    const uids = getKnownIds();
    const me = getUserId();
    const data = uids.map((id) => ({ id, ...(getChallenge(id) || { lessons: 0, segments: 0, quiz: 0, days: 0, streak: 0 }) }));
    data.sort((a, b) => b.lessons - a.lessons);
    setRows(data);
  };
  useEffect(() => {
    refresh();
    window.addEventListener('xz-store', refresh);
    return () => window.removeEventListener('xz-store', refresh);
  }, []);
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + r.lessons, 0);
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>🏆</span>
        <h3 style={{ margin: 0, fontSize: 17 }}>阅读挑战 · 记录</h3>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)' }}>共完成 {total} 课</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 14 }}>
          <thead>
            <tr style={{ color: 'var(--muted)', fontSize: 12.5, textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>ID</th>
              <th>完成课数</th>
              <th>听读段数</th>
              <th>答题</th>
              <th>活跃天数</th>
              <th>连续🔥</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '8px', fontWeight: 700 }}>{r.id} {r.id === getUserId() ? '（我）' : ''}</td>
                <td>{r.lessons}</td>
                <td>{r.segments}</td>
                <td>{r.quiz}</td>
                <td>{r.days}</td>
                <td>{r.streak > 1 ? `🔥${r.streak}` : (r.streak === 1 ? '🔥1' : '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 0' }}>
        💡 阅读挑战自动记录：学完一课、听读正文、提交测验都会计入；每天学习可保持「连续」🔥
      </p>
    </div>
  );
}
