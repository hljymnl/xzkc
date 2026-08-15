'use client';

// IndexedDB：保存「语音分享」录音（Blob），避免 localStorage 容量限制
const DB_NAME = 'xz-voice-db';
const STORE = 'recordings';

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function saveRecording(key, blob) {
  return tx('readwrite', (store) => store.put(blob, key));
}

export async function getRecording(key) {
  return tx('readonly', (store) => store.get(key));
}

export async function deleteRecording(key) {
  return tx('readwrite', (store) => store.delete(key));
}

export async function listRecordingKeys(prefix) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const keys = [];
    const cur = t.objectStore(STORE).openCursor();
    cur.onsuccess = () => {
      const c = cur.result;
      if (c) {
        if (String(c.key).startsWith(prefix)) keys.push(c.key);
        c.continue();
      } else resolve(keys);
    };
    cur.onerror = () => reject(cur.error);
  });
}

// 录音工具：MediaRecorder 封装
export async function startRecording(onStop) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)
  ) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
    onStop(blob);
  };
  rec.start();
  return rec;
}
