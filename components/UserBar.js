'use client';
import { useEffect, useState } from 'react';
import { getUserId, setUserId, getKnownIds } from '@/lib/store';

export default function UserBar({ compact }) {
  const [uid, setUid] = useState('');
  const [known, setKnown] = useState([]);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const refresh = () => {
    setUid(getUserId());
    setKnown(getKnownIds());
  };
  useEffect(() => {
    refresh();
    window.addEventListener('xz-store', refresh);
    return () => window.removeEventListener('xz-store', refresh);
  }, []);

  const save = () => {
    if (input.trim()) setUserId(input);
    setEditing(false);
    setInput('');
  };

  if (compact) {
    return (
      <button className="btn ghost" style={{ padding: '8px 12px', fontSize: 14 }}
        onClick={() => setEditing(true)}>
        {uid ? `👤 ${uid}` : '👤 设置我的ID'}
      </button>
    );
  }

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>当前学习者</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{uid || '未设置'}</div>
        </div>
        {!editing ? (
          <button className="btn" onClick={() => setEditing(true)}>切换 / 新建 ID</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
            <input className="qinput" style={{ flex: 1 }} value={input} placeholder="输入你的名字/ID"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
            <button className="btn" onClick={save}>保存</button>
          </div>
        )}
      </div>
      {known.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {known.map((id) => (
            <button key={id} className={`qopt ${id === uid ? 'selected' : ''}`} onClick={() => setUserId(id)}>
              {id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
