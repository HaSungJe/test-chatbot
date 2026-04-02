'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

type DocumentInfo = {
  source: string;
  chunkCount: number;
  createdAt: string;
};

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function getFileType(filename: string): 'image' | 'pdf' | 'text' {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'text';
}

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  image: { label: '이미지', color: '#7c3aed', bg: '#ede9fe' },
  pdf:   { label: 'PDF',   color: '#dc2626', bg: '#fee2e2' },
  text:  { label: '텍스트', color: '#059669', bg: '#d1fae5' },
};

export default function AdminPage() {
  const [status, setStatus] = useState<string>('');
  const [statusOk, setStatusOk] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch('/api/ingest/');
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {
      // 목록 조회 실패는 조용히 처리
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  function startProgress(label: string) {
    setProgressValue(5);
    setProgressLabel(label);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgressValue(prev => Math.min(prev + Math.random() * 4, 90));
    }, 400);
  }

  function stopProgress() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setProgressValue(100);
    setTimeout(() => {
      setProgressLabel('');
      setProgressValue(0);
    }, 600);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isImage = IMAGE_EXTS.includes(ext);
    const isPdf = ext === 'pdf';

    setLoading(true);
    setStatus('');
    setStatusOk(true);
    startProgress(
      isImage ? '이미지 저장 중...' :
      isPdf   ? 'PDF 텍스트 추출 + 임베딩 중...' :
                '텍스트 임베딩 중...'
    );

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ingest/', { method: 'POST', body: formData });
      const data = await res.json();

      stopProgress();

      if (data.ok) {
        const typeLabel = TYPE_BADGE[data.type]?.label ?? '';
        const detail = data.type === 'image'
          ? `이미지 저장 완료`
          : `${data.chunks}개 청크 저장`;
        setStatus(`[${typeLabel}] ${data.file} — ${detail}`);
        setStatusOk(true);
        await fetchDocuments();
      } else {
        setStatus(`실패: ${data.error}`);
        setStatusOk(false);
      }
    } catch {
      stopProgress();
      setStatus('업로드 중 오류가 발생했습니다');
      setStatusOk(false);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(source: string) {
    if (!confirm(`"${source}" 문서를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/ingest/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();

      if (data.ok) {
        setStatus(`삭제 완료: ${source}`);
        setStatusOk(true);
        await fetchDocuments();
      } else {
        setStatus(`삭제 실패: ${data.error}`);
        setStatusOk(false);
      }
    } catch {
      setStatus('삭제 중 오류가 발생했습니다');
      setStatusOk(false);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>문서 관리</h1>
        <Link href="/" style={{ fontSize: 14, color: '#0070f3' }}>← 챗봇으로</Link>
      </header>

      {/* 파일 업로드 */}
      <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>파일 업로드</h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
          지원 형식: <strong>텍스트</strong> (.txt, .md) · <strong>PDF</strong> (.pdf) · <strong>이미지</strong> (.jpg, .jpeg, .png, .gif, .webp)
          <br />동일 파일명은 자동 교체됩니다.
        </p>
        <label
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: loading ? '#ccc' : '#0070f3',
            color: '#fff',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          {loading ? '업로드 중...' : '파일 선택'}
          <input
            type="file"
            accept=".txt,.md,.pdf,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleUpload}
            disabled={loading}
            style={{ display: 'none' }}
          />
        </label>

        {loading && progressLabel && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#555' }}>
              <span>{progressLabel}</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressValue}%`,
                  background: 'linear-gradient(90deg, #0070f3, #00c6ff)',
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )}
        {status && (
          <p style={{ marginTop: 12, fontSize: 14, color: statusOk ? '#059669' : '#dc2626' }}>
            {status}
          </p>
        )}
      </section>

      {/* 문서 목록 */}
      <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          업로드된 문서 {!loadingDocs && `(${documents.length}개)`}
        </h2>

        {loadingDocs ? (
          <p style={{ color: '#999', fontSize: 14 }}>불러오는 중...</p>
        ) : documents.length === 0 ? (
          <p style={{ color: '#999', fontSize: 14 }}>업로드된 문서가 없습니다.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#666', fontWeight: 500 }}>파일명</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', color: '#666', fontWeight: 500 }}>유형</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', color: '#666', fontWeight: 500 }}>청크 수</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', color: '#666', fontWeight: 500 }}>업로드일</th>
                <th style={{ textAlign: 'center', padding: '8px 12px', color: '#666', fontWeight: 500 }}>삭제</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => {
                const type = getFileType(doc.source);
                const badge = TYPE_BADGE[type];
                return (
                  <tr key={doc.source} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {type === 'image' && (
                        <img
                          src={`/images/${doc.source}`}
                          alt={doc.source}
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }}
                        />
                      )}
                      {doc.source}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        color: badge.color,
                        background: badge.bg,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#555' }}>
                      {type === 'image' ? '—' : `${doc.chunkCount}개`}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#888' }}>
                      {new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(doc.source)}
                        style={{
                          padding: '4px 12px',
                          background: 'transparent',
                          color: '#dc2626',
                          border: '1px solid #dc2626',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
