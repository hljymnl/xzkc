import './globals.css';
import SWRegister from '@/components/SWRegister';
import SyncController from '@/components/SyncController';
import { asset } from '@/lib/base';

export const metadata = {
  title: '小组互动课程',
  description: '成人小组互动查经课程 · 音频播放 · 问答测试',
  manifest: asset('/manifest.webmanifest'),
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '小组课程' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2f6b5e',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href={asset("/icons/icon-192.png")} />
        <link rel="apple-touch-icon" href={asset("/icons/icon-192.png")} />
        <meta name="theme-color" content="#2f6b5e" />
      </head>
      <body>{children}
        <SyncController />
        <SWRegister />
      </body>
    </html>
  );
}
