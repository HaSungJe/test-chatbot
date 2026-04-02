'use client';
import { useChat } from '@ai-sdk/react';
import Link from 'next/link';

const IMAGE_PATH_REGEX = /(\/images\/\S+\.(?:jpg|jpeg|png|gif|webp))/gi;

function renderContent(content: string) {
  const parts = content.split(IMAGE_PATH_REGEX);
  return parts.map((part, i) => {
    if (/^\/images\/\S+\.(?:jpg|jpeg|png|gif|webp)$/i.test(part)) {
      return (
        <img
          key={i}
          src={part}
          alt="첨부 이미지"
          style={{ maxWidth: '100%', borderRadius: 8, display: 'block', marginTop: 8, marginBottom: 8 }}
        />
      );
    }
    return part ? <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span> : null;
  });
}

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat/',
  });

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ padding: '16px 20px', borderBottom: '1px solid #ddd', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>RAG 챗봇</h1>
        <Link href="/admin/" style={{ fontSize: 14, color: '#666' }}>문서 관리</Link>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center', marginTop: 40 }}>
            질문을 입력하면 업로드된 문서를 기반으로 답변합니다.
          </p>
        )}
        {messages.map(m => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: 12,
              background: m.role === 'user' ? '#0070f3' : '#fff',
              color: m.role === 'user' ? '#fff' : '#333',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              lineHeight: 1.6,
            }}
          >
            {renderContent(m.content)}
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 12, background: '#fff', color: '#999', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            답변 생성 중...
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ padding: '16px 20px', borderTop: '1px solid #ddd', background: '#fff', display: 'flex', gap: 8 }}
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="질문을 입력하세요..."
          disabled={isLoading}
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{ padding: '10px 20px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', opacity: isLoading || !input.trim() ? 0.5 : 1 }}
        >
          전송
        </button>
      </form>
    </main>
  );
}
