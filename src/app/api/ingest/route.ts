import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { getEmbedding } from '@/lib/embedding';
import { splitIntoChunks } from '@/lib/chunker';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function getExt(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function getFileType(filename: string): 'image' | 'pdf' | 'text' {
  const ext = getExt(filename);
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'text';
}

// 문서 목록 조회 (source별 청크 수)
type DocumentRow = { source: string; chunk_count: bigint; created_at: Date };

export async function GET() {
  const rows = await db.$queryRaw<DocumentRow[]>`
    SELECT source, COUNT(*) AS chunk_count, MIN("createdAt") AS created_at
    FROM documents
    GROUP BY source
    ORDER BY MIN("createdAt") DESC
  `;

  const documents = rows.map((r: DocumentRow) => ({
    source: r.source,
    chunkCount: Number(r.chunk_count),
    createdAt: r.created_at,
  }));

  return Response.json({ documents });
}

// 파일 업로드 → 타입별 처리 → 임베딩 저장
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return Response.json({ error: '파일이 없습니다' }, { status: 400 });
  }

  const fileName = file.name;
  const type = getFileType(fileName);

  // 동일 파일 기존 데이터 삭제 (재업로드 시 교체)
  await db.$executeRaw`DELETE FROM documents WHERE source = ${fileName}`;

  let chunks: string[] = [];

  if (type === 'image') {
    // 이미지: public/images/ 에 파일 저장 + 경로를 텍스트로 임베딩
    const buffer = Buffer.from(await file.arrayBuffer());
    const imageDir = path.join(process.cwd(), 'public', 'images');
    await mkdir(imageDir, { recursive: true });
    await writeFile(path.join(imageDir, fileName), buffer);

    const imagePath = `/images/${fileName}`;
    chunks = [`이미지 ${imagePath}\n파일명: ${fileName}`];

  } else if (type === 'pdf') {
    // PDF: 텍스트 추출 후 청킹
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text?.trim()) {
      return Response.json({ error: 'PDF에서 텍스트를 추출할 수 없습니다 (스캔 이미지 PDF는 미지원)' }, { status: 400 });
    }

    chunks = splitIntoChunks(pdfData.text);

  } else {
    // 텍스트 파일 (.txt / .md)
    const text = await file.text();
    chunks = splitIntoChunks(text);
  }

  if (chunks.length === 0) {
    return Response.json({ error: '내용이 없거나 너무 짧습니다' }, { status: 400 });
  }

  // 청크별 임베딩 저장
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk);
    const vector = `[${embedding.join(',')}]`;
    await db.$executeRaw`
      INSERT INTO documents (content, source, embedding)
      VALUES (${chunk}, ${fileName}, ${vector}::vector)
    `;
  }

  return Response.json({ ok: true, file: fileName, chunks: chunks.length, type });
}

// 문서 삭제
export async function DELETE(req: NextRequest) {
  const { source } = await req.json();

  if (!source) {
    return Response.json({ error: '삭제할 문서명이 없습니다' }, { status: 400 });
  }

  const result = await db.$executeRaw`DELETE FROM documents WHERE source = ${source}`;

  return Response.json({ ok: true, deleted: Number(result) });
}
