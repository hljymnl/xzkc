'use client';
import { useEffect, useRef } from 'react';
import { getUserId } from '@/lib/store';
import { isSyncOn, pushLearner } from '@/lib/sync';

// 全局自动同步：学员数据一变化（分享/录音/测验/完成），延迟 2.5s 自动上传
export default function SyncController() {
  const timer = useRef(null);
  const lastPush = useRef(0);
  useEffect(() => {
    const onStore = () => {
      if (!isSyncOn()) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const uid = getUserId();
        if (uid) {
          const ok = await pushLearner(uid);
          if (ok) lastPush.current = Date.now();
        }
      }, 2500);
    };
    window.addEventListener('xz-store', onStore);
    // 页面加载后也同步一次（若有记录）
    onStore();
    return () => { clearTimeout(timer.current); window.removeEventListener('xz-store', onStore); };
  }, []);
  return null;
}
