'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserId, setUserId, getKnownIds } from '@/lib/store';
import { buildLearnerReport, downloadJson } from '@/lib/report';
import { getSyncUrl, setSyncUrl, isSyncOn, pushLearner } from '@/lib/sync';

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

  // 自动同步设置
  const [syncUrl, setSyncUrlState] = useState(getSyncUrl());
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const saveSync = async () => {
    setSyncUrl(syncUrl.trim());
    setSyncMsg(syncUrl.trim() ? '☁️ 已开启自动同步：分享/录音会自动上传给组长' : '已关闭自动同步');
    if (syncUrl.trim() && uid) {
      const ok = await pushLearner(uid);
      if (ok) setSyncMsg('☁️ 已开启自动同步，并已上传当前记录');
    }
    setTimeout(() => setSyncMsg(''), 4000);
  };

  // 上报学习记录给组长
  const [report, setReport] = useState(null);
  const [reporting, setReporting] = useState(false);
  const doReport = async () => {
    if (!uid) { setEditing(true); return; }
    setReporting(true);
    try {
      const r = await buildLearnerReport();
      setReport(JSON.stringify(r, null, 1));
    } catch { setReport('生成失败'); }
    setReporting(false);
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
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn ghost" style={{ padding: '8px 12px', fontSize: 14 }} disabled={reporting} onClick={doReport}>
          {reporting ? '生成中…' : '📤 上报我的记录'}
        </button>
        <Link href="/feedback"><button className="btn ghost" style={{ padding: '8px 12px', fontSize: 14 }}>💌 组长反馈</button></Link>
        <Link href="/admin"><button className="btn ghost" style={{ padding: '8px 12px', fontSize: 14 }}>🔧 管理后台</button></Link>
        <button className="btn ghost" style={{ padding: '8px 12px', fontSize: 14, color: isSyncOn() ? 'var(--ok)' : 'inherit' }}
          onClick={() => setSyncOpen(!syncOpen)}>
          {isSyncOn() ? '☁️ 已同步' : '☁️ 同步设置'}
        </button>
      </div>

      {syncOpen && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--accent-soft)', borderRadius: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 13.5, color: '#7a5f17' }}>
            粘贴组长给你的「同步地址」（组长在后台「自动记录」里配置），之后你的读书分享与语音留言会自动上传给组长，组长回应也会自动同步给你。
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="qinput" style={{ flex: 1, fontSize: 13 }} placeholder="Firebase 数据库地址" value={syncUrl}
              onChange={(e) => setSyncUrlState(e.target.value)} />
            <button className="btn" style={{ padding: '8px 14px', fontSize: 14 }} onClick={saveSync}>保存</button>
          </div>
          {syncMsg && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ok)' }}>{syncMsg}</p>}
        </div>
      )}

      {report && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--accent-soft)', borderRadius: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 13.5, color: '#7a5f17' }}>
            ✅ 学习记录已生成！把下面的内容复制/下载后发给组长（组长在管理后台导入即可看到你的进度、测验与读书分享）。
          </p>
          <textarea className="qtextarea" style={{ minHeight: 110, fontSize: 12 }} readOnly value={report} onFocus={(e) => e.target.select()} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" style={{ padding: '8px 14px', fontSize: 14 }}
              onClick={() => { navigator.clipboard && navigator.clipboard.writeText(report); }}>📋 复制</button>
            <button className="btn ghost" style={{ padding: '8px 14px', fontSize: 14 }}
              onClick={() => downloadJson(JSON.parse(report), `学习记录-${uid}.json`)}>⬇️ 下载文件</button>
            <button className="btn ghost" style={{ padding: '8px 14px', fontSize: 14 }} onClick={() => setReport(null)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}
