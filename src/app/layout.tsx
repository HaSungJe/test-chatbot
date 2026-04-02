import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RAG 챗봇',
  description: '문서 기반 AI 챗봇',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
