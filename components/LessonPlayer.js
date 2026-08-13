'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import QuizSection from './QuizSection';
import { asset } from '@/lib/base';
import { getCourseState, saveCourseState, getLessonPlayed, saveLessonPlayed, getUserId, recordLessonDone, recordSegmentPlayed } from '@/lib/store';

const SPEEDS = [1, 1.25, 1.5, 0.75];

export default function LessonPlayer({ course, lesson, prev, next }) {
  const slug = course.id;
  const lessonId = lesson.id;
  const audioManifest = lesson.audio || { segments: [], memoryAudio: null };

  // 可播放段落 = type=text 且有音频
  const playables = useMemo(
    () => audioManifest.segments.filter((s) => s.type === 'text' && s.audio),
    [audioManifest]
  );

  const [segIdx, setSegIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [played, setPlayed] = useState([]);
  const [done, setDone] = useState(false);
  const audioRef = useRef(null);
  const segRefs = useRef({});

  // 加载已播放记录
  useEffect(() => {
    setPlayed(getLessonPlayed(slug, lessonId));
    const s = getCourseState(slug);
    setDone(!!(s && s.done.includes(lessonId)));
  }, [slug, lessonId]);

  const current = playables[Math.min(segIdx, playables.length - 1)];

  const markDone = useCallback(() => {
    const s = getCourseState(slug) || { done: [], quiz: {}, played: {} };
    if (!s.done.includes(lessonId)) {
      s.done.push(lessonId);
      saveCourseState(slug, s);
    }
    setDone(true);
    recordLessonDone(getUserId(), slug, lessonId);
  }, [slug, lessonId]);

  const notePlayed = useCallback((idx) => {
    setPlayed((prev) => {
      if (prev.includes(idx)) return prev;
      const nextArr = [...prev, idx];
      saveLessonPlayed(slug, lessonId, nextArr);
      recordSegmentPlayed(getUserId(), slug, lessonId, idx);
      return nextArr;
    });
  }, [slug, lessonId]);

  // 播放某段
  const playSegment = useCallback((idx, autoplay) => {
    const seg = playables[idx];
    if (!seg) return;
    setSegIdx(idx);
    notePlayed(idx);
    if (autoplay && audioRef.current) {
      audioRef.current.src = asset(seg.audio);
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    } else if (audioRef.current) {
      audioRef.current.src = asset(seg.audio);
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [playables, notePlayed]);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      // 若未设置 src 或已播完，从头/当前段播放
      if (!audioRef.current.src || audioRef.current.ended) {
        const idx = playables.findIndex((p) => !played.includes(playables.indexOf(p)));
        playSegment(Math.max(0, idx === -1 ? 0 : idx), true);
      } else {
        audioRef.current.play().catch(() => {});
        setPlaying(true);
      }
    }
  }, [playing, playables, played, playSegment]);

  const nextSeg = useCallback(() => {
    const n = Math.min(segIdx + 1, playables.length - 1);
    playSegment(n, playing);
  }, [segIdx, playables.length, playing, playSegment]);

  const prevSeg = useCallback(() => {
    // 若当前进度 > 3 秒则回到段首
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const n = Math.max(segIdx - 1, 0);
    playSegment(n, playing);
  }, [segIdx, playing, playSegment]);

  // 音频事件
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => {
      setPlaying(false);
      if (segIdx < playables.length - 1) {
        playSegment(segIdx + 1, true);
      } else {
        markDone();
      }
    };
    const onTime = () => {
      if (a.duration) setProgress(a.currentTime / a.duration);
    };
    const onLoaded = () => {
      setProgress(0);
      a.play().catch(() => {});
      setPlaying(true);
    };
    a.addEventListener('ended', onEnded);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onLoaded);
    return () => {
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [segIdx, playables.length, playSegment, markDone]);

  // 滚动当前段到可视区
  useEffect(() => {
    const el = segRefs.current[`seg-${segIdx}`];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [segIdx]);

  // Media Session（锁屏控制 + 后台播放）
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const title = `第${lesson.number}课 ${lesson.title}`;
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: course.title, album: course.title });
    navigator.mediaSession.setActionHandler('play', () => toggle());
    navigator.mediaSession.setActionHandler('pause', () => toggle());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevSeg());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextSeg());
    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      } catch {}
    };
  }, [lesson, course, toggle, prevSeg, nextSeg]);

  // 渲染：按小节分组显示文字
  const renderSegments = () => {
    const groups = [];
    let lastSection = -1;
    audioManifest.segments.forEach((seg, i) => {
      if (seg.type === 'heading') {
        groups.push({ kind: 'heading', text: seg.text, section: seg.section });
      } else {
        const segIndex = playables.findIndex((p) => p === seg);
        if (segIndex !== -1) {
          groups.push({ kind: 'text', text: seg.text, segIndex });
        }
      }
    });
    return groups;
  };
  const groups = renderSegments();

  const pct = playables.length ? Math.round((played.filter((i) => i < playables.length).length / playables.length) * 100) : 0;

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <Link className="back" href={`/course/${slug}`}>‹</Link>
          <span className="title">第{lesson.number}课 · {lesson.title}</span>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 190 }}>
        <audio ref={audioRef} preload="auto" />

        <div className="page-head">
          <h1>第{lesson.number}课 · {lesson.title}</h1>
          <p>{course.title}</p>
        </div>

        {/* 存心节 */}
        {lesson.memory && (
          <div className="memory-card">
            <div className="tag">★ 存心节</div>
            <div className="verse">{lesson.memory}</div>
            {audioManifest.memoryAudio && (
              <button className="btn" style={{ background: 'rgba(255,255,255,.15)', marginTop: 6 }}
                onClick={() => {
                  const a = audioRef.current;
                  if (a) {
                    a.src = asset(audioManifest.memoryAudio);
                    a.play().catch(() => {});
                    setPlaying(true);
                  }
                }}>
                ▶ 听存心节
              </button>
            )}
          </div>
        )}

        {/* 正文 */}
        <div className="segment-text">
          {groups.map((g, i) => {
            if (g.kind === 'heading') {
              return (
                <div key={`h-${i}`} className="section-head">
                  <span className="bar" /><h2>{g.text}</h2>
                </div>
              );
            }
            const isActive = g.segIndex === segIdx && playing;
            const wasPlayed = played.includes(g.segIndex);
            return (
              <span key={`s-${i}`}
                ref={(el) => { segRefs.current[`seg-${g.segIndex}`] = el; }}
                className={`seg ${isActive ? 'active' : ''} ${!isActive && wasPlayed ? 'played' : ''}`}
                onClick={() => playSegment(g.segIndex, true)}>
                {g.text}
              </span>
            );
          })}
        </div>

        {/* 本课进度 */}
        <div className="card card-pad" style={{ marginTop: 20, textAlign: 'center' }}>
          {done ? (
            <p style={{ color: 'var(--ok)', fontWeight: 700, margin: 0 }}>🎉 本课已完成</p>
          ) : (
            <p style={{ margin: '0 0 8px', color: 'var(--muted)', fontSize: 14 }}>已听 {played.length}/{playables.length} 段 · {pct}%</p>
          )}
          {!done && (
            <button className="btn ghost block" onClick={markDone}>标记本课完成</button>
          )}
        </div>

        {/* 测验 */}
        <QuizSection slug={slug} lessonId={lessonId} quiz={lesson.quiz || []} />

        {/* 上下课导航 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {prev ? (
            <Link href={`/lesson/${slug}/${prev.id}`} style={{ flex: 1 }}>
              <button className="btn ghost block">← 第{prev.number}课</button>
            </Link>
          ) : <span style={{ flex: 1 }} />}
          {next ? (
            <Link href={`/lesson/${slug}/${next.id}`} style={{ flex: 1 }}>
              <button className="btn block">第{next.number}课 →</button>
            </Link>
          ) : <span style={{ flex: 1 }} />}
        </div>
      </div>

      {/* 固定底部播放器 */}
      <div className="player">
        <div className="player-inner">
          <div className="player-progress"
            onClick={(e) => {
              const a = audioRef.current;
              if (!a || !a.duration) return;
              const r = e.currentTarget.getBoundingClientRect();
              a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
            }}>
            <i style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="player-controls">
            <button className="pc-btn small" onClick={() => { setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]); }}>
              {speed}×
            </button>
            <button className="pc-btn" onClick={prevSeg}>⏮</button>
            <button className="pc-btn play" onClick={toggle}>{playing ? '⏸' : '▶'}</button>
            <button className="pc-btn" onClick={nextSeg}>⏭</button>
            <button className="pc-btn small" onClick={markDone}>✓</button>
          </div>
          <div className="player-label">
            {current ? `${segIdx + 1} / ${playables.length} · ${lesson.title}` : '点击正文开始播放'}
          </div>
        </div>
      </div>
    </div>
  );
}
