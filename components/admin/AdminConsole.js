'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  getPass, setPass, getLearners, saveLearners, mergeLearnerReport,
  getComments, addComment, removeLearner, summarizeLearner,
  exportBackup, importBackup, exportFeedback, DEFAULT_PASS,
} from '@/lib/adminStore';
import { downloadJson } from '@/lib/report';
import { getAdminSyncUrl, setAdminSyncUrl, pullAllLearners, pushComment } from '@/lib/sync';

function b64ToUrl(b64, mime) {
  try {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: mime || 'audio/webm' }));
  } catch { return ''; }
}

export default function AdminConsole() {
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [tab, setTab] = useState('dash');
  const [learners, setLearners] = useState([]);
  const [selUid, setSelUid] = useState(null);
  const [comments, setComments] = useState({});
  const [paste, setPaste] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);
  const [newPass, setNewPass] = useState('');
  // 自动同步
  const [syncUrl, setSyncUrl] = useState('');
  const [syncOn, setSyncOn] = useState(false);
  const [lastSync, setLastSync] = useState('');

  const refresh = () => { setLearners(getLearners()); setComments(getComments()); };
  useEffect(() => { if (authed) refresh(); }, [authed]);
  useEffect(() => { if (authed) setSyncUrl(getAdminSyncUrl()); }, [authed]);

  // 自动拉取：开启后每 5 秒把 Firebase 里的学员数据合并进后台
  useEffect(() => {
    if (!authed || !syncOn || !syncUrl) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      const d = await pullAllLearners(syncUrl);
      if (stop || !d) return;
      let n = 0;
      for (const uid in d) if (d[uid] && d[uid].profile) { if (mergeLearnerReport({ ...d[uid], profile: d[uid].profile }).ok) n++; }
      refresh();
      setLastSync(new Date().toLocaleTimeString());
    };
    tick();
    const iv = setInterval(tick, 5000);
    return () => { stop = true; clearInterval(iv); };
  }, [authed, syncOn, syncUrl]);

  const toggleSync = () => {
    if (!syncOn) {
      if (!syncUrl.trim()) { setMsg('请先粘贴 Firebase 数据库地址'); return; }
      setAdminSyncUrl(syncUrl);
      setSyncOn(true);
      setMsg('☁️ 自动同步已开启，正在自动记录学员数据…');
    } else {
      setSyncOn(false);
      setMsg('已暂停自动同步（本地数据保留）');
    }
  };

  const login = () => {
    if (passInput === getPass()) { setAuthed(true); setMsg(''); }
    else setMsg('密码不正确');
  };

  // 导入
  const doImportText = () => {
    if (!paste.trim()) { setMsg('请粘贴上报内容'); return; }
    let data;
    try { data = JSON.parse(paste); } catch { setMsg('JSON 解析失败'); return; }
    if (Array.isArray(data)) {
      let ok = 0;
      for (const d of data) if (mergeLearnerReport(d).ok) ok++;
      setMsg(`已导入 ${ok} 位学员`);
    } else {
      const r = mergeLearnerReport(data);
      setMsg(r.ok ? `已导入学员：${data.profile?.name || data.profile?.uid}` : r.msg);
    }
    setPaste(''); refresh();
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      setPaste(String(fr.result));
      // 自动导入
      setTimeout(doImportText, 50);
    };
    fr.readAsText(f);
    e.target.value = '';
  };

  const sel = useMemo(() => learners.find((l) => l.uid === selUid) || null, [learners, selUid]);
  const sum = useMemo(() => summarizeLearner(sel || {}), [sel]);

  if (!authed) {
    return (
      <div className="container">
        <div className="topbar"><div className="topbar-inner"><Link className="back" href="/">‹</Link><span className="title">管理后台</span></div></div>
        <div className="page-head"><h1>🔐 管理后台</h1><p>请输入管理员密码</p></div>
        <div className="card card-pad">
          <input type="password" className="qinput" placeholder="管理员密码" value={passInput}
            onChange={(e) => setPassInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') login(); }} />
          <button className="btn block" style={{ marginTop: 12 }} onClick={login}>登录</button>
          {msg && <p style={{ color: 'var(--err)', marginTop: 8 }}>{msg}</p>}
          <p className="hint">默认密码：{DEFAULT_PASS}（登录后在设置里可修改）</p>
        </div>
      </div>
    );
  }

  if (tab === 'learner' && sel) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="topbar-inner">
            <button className="back" onClick={() => setTab('dash')}>‹</button>
            <span className="title">{sel.name || sel.uid}</span>
          </div>
        </div>
        <div className="page-head">
          <h1>👤 {sel.name || sel.uid}</h1>
          <p>ID: {sel.uid} · 首次上报 {sel.firstSeen ? sel.firstSeen.slice(0, 10) : '—'} · 最近 {sel.lastReport ? sel.lastReport.slice(0, 10) : '—'}</p>
        </div>

        {/* 学习统计 */}
        <div className="card card-pad">
          <p style={{ margin: 0, fontWeight: 700 }}>学习情况</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {[['📚 完成课数', sum.done], ['📝 答题数', sum.quizAnswered], ['💬 分享数', sum.shares], ['🎤 语音数', sum.voice]].map(([label, v]) => (
              <div key={label} className="stat-chip"><b>{v}</b><span>{label}</span></div>
            ))}
          </div>
          {Object.keys(sel.progress || {}).map((slug) => {
            const total = sel.progress[slug].total || 0;
            const doneN = (sel.progress[slug].done || []).length;
            const pct = total ? Math.round(doneN / total * 100) : 0;
            return (
              <div key={slug} style={{ marginTop: 8, fontSize: 13 }}>
                {slug} · 完成 {doneN}{total ? `/${total}` : ''} 课
                <div className="lesson-progress" style={{ margin: '4px 0 0' }}><i style={{ width: pct + '%' }} /></div>
              </div>
            );
          })}
        </div>

        {/* 读书分享 */}
        <h2 className="quiz-title">💬 读书分享</h2>
        {Object.keys(sel.shares || {}).length === 0 && <p className="hint">暂无分享记录</p>}
        {Object.keys(sel.shares || {}).map((key) => {
          const s = sel.shares[key] || {};
          const [slug, lid] = key.split(':');
          const answers = Object.keys(s).filter((k) => k.startsWith('q') || k.startsWith('v'));
          const voiceKey = key.replace(':', ':'); // voice 用 slug:lesson:idx 存储
          return (
            <div key={key} className="card qcard">
              <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--muted)' }}>
                📖 {slug} · {lid} · {answers.length} 题回应
              </p>
              {answers.map((k) => {
                const v = s[k];
                const isVoice = k.startsWith('v');
                if (isVoice) {
                  const vk = `${key}:${k.slice(1)}`;
                  const rec = (sel.voice || {})[vk];
                  if (!rec) return <p key={k} style={{ fontSize: 14 }}>🎤 有语音留言</p>;
                  const url = b64ToUrl(rec.data, rec.mime);
                  return (
                    <p key={k} style={{ fontSize: 14 }}>
                      🎤 语音留言：<audio controls src={url} style={{ height: 32, maxWidth: '100%' }} />
                    </p>
                  );
                }
                const qIdx = k.slice(1);
                return (
                  <p key={k} style={{ fontSize: 14.5, margin: '4px 0' }}>
                    <b>第{Number(qIdx) + 1}题：</b>{String(v?.text || v)}
                  </p>
                );
              })}
              {/* 组长回应 */}
              <div style={{ marginTop: 8 }}>
                {(comments[sel.uid]?.[key] || []).map((c, i) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: 13.5, color: 'var(--primary-dark)', background: 'var(--accent-soft)', padding: '6px 10px', borderRadius: 8 }}>
                    👨‍🏫 {c.at.slice(0, 10)}：{c.text}
                  </p>
                ))}
                <CommentBox onSend={(text) => {
                  addComment(sel.uid, key, text);
                  setComments(getComments());
                  if (syncOn && syncUrl) pushComment(syncUrl, sel.uid, key, { text, at: new Date().toISOString() });
                }} />
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn ghost block" onClick={() => downloadJson(JSON.parse(exportFeedback(sel.uid)), `反馈-${sel.uid}.json`)}>
            导出「组长反馈」给学员
          </button>
          <button className="btn ghost block" onClick={() => { removeLearner(sel.uid); setTab('dash'); }}>删除学员</button>
        </div>
        <p className="hint">把「组长反馈」文件发给学员，学员在首页点「查看组长反馈」导入即可看到你的回应。</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="topbar-inner">
          <Link className="back" href="/">‹</Link>
          <span className="title">管理后台</span>
        </div>
      </div>
      <div className="page-head">
        <h1>🔧 管理后台</h1>
        <p>查看小组学习情况 · 读书分享 · 组长回应</p>
      </div>

      {/* 导入 */}
      <div className="card card-pad">
        <p style={{ margin: 0, fontWeight: 700 }}>📥 导入学员学习记录</p>
        <p className="quiz-intro">让学员在首页点「📤 上报我的记录」，把生成的 JSON 发给你；在这里粘贴或上传即可汇总。</p>
        <textarea className="qtextarea" style={{ minHeight: 80 }} placeholder="粘贴学员上报的 JSON…" value={paste}
          onChange={(e) => setPaste(e.target.value)} />
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button className="btn" onClick={doImportText}>导入</button>
          <button className="btn ghost" onClick={() => fileRef.current && fileRef.current.click()}>上传文件</button>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onFile} />
        </div>
        {msg && <p style={{ color: 'var(--ok)', margin: '8px 0 0', fontSize: 14 }}>{msg}</p>}
      </div>

      {/* 学员列表 */}
      <div className="section-head" style={{ marginTop: 20 }}>
        <span className="bar" /><h2>👥 学员（{learners.length}）</h2>
      </div>
      {learners.length === 0 && <p className="hint">还没有学员数据，先让学员上报吧。</p>}
      {learners.map((l) => {
        const s = summarizeLearner(l);
        return (
          <div key={l.uid} className="card card-pad" style={{ cursor: 'pointer' }} onClick={() => { setSelUid(l.uid); setTab('learner'); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <b style={{ fontSize: 16 }}>{l.name || l.uid}</b>
              <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{l.uid} · 最近 {l.lastReport ? l.lastReport.slice(0, 10) : '—'}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 13 }}>›</span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', fontSize: 13.5 }}>
              <span>📚 {s.done} 课</span><span>📝 {s.quizAnswered} 题</span><span>💬 {s.shares} 分享</span><span>🎤 {s.voice} 语音</span>
            </div>
          </div>
        );
      })}

      {/* 备份 / 设置 */}
      <div className="section-head" style={{ marginTop: 20 }}>
        <span className="bar" /><h2>⚙️ 数据与设置</h2>
      </div>
      <div className="card card-pad">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn ghost" onClick={() => downloadJson(JSON.parse(exportBackup()), `后台备份-${Date.now()}.json`)}>💾 导出全部备份</button>
          <button className="btn ghost" onClick={() => { const r = importBackup(paste); setMsg(r.ok ? '备份导入成功' : r.msg); refresh(); }}>导入备份</button>
        </div>
        <div style={{ marginTop: 14, padding: 12, background: syncOn ? 'var(--accent-soft)' : 'transparent', border: '1px solid var(--line)', borderRadius: 12 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>☁️ 自动记录学员数据</p>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>
            粘贴 Firebase 实时数据库地址（如 https://xxx-default-rtdb.firebaseio.com/）后开启，学员的分享与录音会自动汇总到这里，无需手动导入。
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="qinput" style={{ flex: 1, minWidth: 220 }} placeholder="Firebase 数据库地址" value={syncUrl}
              onChange={(e) => setSyncUrl(e.target.value)} disabled={syncOn} />
            <button className={syncOn ? 'btn ghost' : 'btn'} onClick={toggleSync}>
              {syncOn ? '⏸ 暂停' : '▶ 开启自动同步'}
            </button>
          </div>
          {syncOn && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ok)' }}>
              ✅ 正在自动记录 · 最近更新 {lastSync || '—'} · 学员 {learners.length} 人
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14 }}>修改密码：</span>
          <input className="qinput" style={{ flex: 1, minWidth: 160, maxWidth: 260 }} placeholder="新密码" value={newPass}
            onChange={(e) => setNewPass(e.target.value)} />
          <button className="btn" onClick={() => { if (newPass.trim().length >= 4) { setPass(newPass.trim()); setMsg('密码已修改'); setNewPass(''); } else setMsg('密码至少 4 位'); }}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentBox({ onSend }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
      <input className="qinput" style={{ flex: 1, fontSize: 14, padding: '8px 10px' }} placeholder="写组长回应…"
        value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) { onSend(val.trim()); setVal(''); } }} />
      <button className="btn" style={{ padding: '8px 14px', fontSize: 14 }}
        onClick={() => { if (val.trim()) { onSend(val.trim()); setVal(''); } }}>回应</button>
    </div>
  );
}
