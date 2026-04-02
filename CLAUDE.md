# Next.js + RAG 챗봇 - 프로젝트 설계 가이드

> **⚠️ 주의사항**: `npm run` 명령은 반드시 사용자가 직접 실행 (Claude 실행 금지)

---

## 빠른 시작

> **사전 조건**: Docker Desktop이 실행 중인 상태여야 함

### 최초 1회 세팅

```bash
cp .env.example .env   # .env 파일 생성
```

`.env`에 반드시 입력해야 할 키:

| 키 | 발급처 |
|---|---|
| `GOOGLE_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API Key |

```bash
npm install             # 패키지 설치 (로컬 임베딩 모델 포함)
npm run db:migrate      # DB 초기화 + 테이블 생성
```

> `npm run db:migrate`는 내부적으로 `prisma migrate reset --force`를 실행하므로 확인 없이 자동 처리됨.
> 단, Docker Desktop이 실행 중이어야 함.

### 이후 매번 (개발 시작)

```bash
npm run dev             # DB 컨테이너 시작 + Next.js 개발 서버 한번에 실행
```

> `npm run dev`는 내부적으로 `docker compose up -d && next dev --turbopack -p 5000` 을 실행하므로
> DB를 별도로 올릴 필요 없음. Docker Desktop만 켜져 있으면 됨.

### 첫 문서 업로드 시 주의

첫 번째 파일 업로드 시 로컬 임베딩 모델(`Xenova/multilingual-e5-small`, 약 120MB)을
`.cache/transformers/`에 자동 다운로드함. 최초 1회만 발생하며 이후엔 캐시 사용.

### 접속 URL

| 페이지 | URL |
|---|---|
| 채팅 | http://localhost:5000/ |
| 문서 관리 (관리자) | http://localhost:5000/admin/ |

### npm scripts

| 명령 | 동작 |
|---|---|
| `npm run dev` | DB 컨테이너 시작 + Next.js 개발 서버 (Turbopack, port 5000) |
| `npm run db:up` | DB 컨테이너만 시작 |
| `npm run db:down` | DB 컨테이너 중지 |
| `npm run db:reset` | 볼륨 포함 초기화 후 재시작 (데이터 전부 삭제) |
| `npm run db:logs` | DB 로그 실시간 확인 |
| `npm run db:migrate` | DB 초기화 + 마이그레이션 자동 실행 (확인 없음) |
| `npm run db:push` | Prisma 스키마를 DB에 직접 반영 (마이그레이션 파일 없음) |
| `npm run db:studio` | Prisma Studio (DB GUI) |

---

## 프로젝트 개요

텍스트 문서를 기반으로 답변하는 AI 챗봇.
문서를 벡터 DB에 임베딩해두고, 사용자 질문과 유사한 청크를 검색해 Gemini에게 컨텍스트로 제공한다.
관리자 UI에서 문서를 업로드하면 자동으로 임베딩 후 pgvector에 저장된다.

---

## 기술 스택

| 항목 | 기술 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router) | 풀스택 단일 프로젝트 |
| UI 라이브러리 | React 19 + TypeScript | |
| AI 모델 | Google Gemini (`gemini-2.0-flash`) | `@google/generative-ai` 직접 사용, 무료 tier |
| 스트리밍 | `@ai-sdk/react` (`useChat` 훅) | AI SDK Data Stream Protocol 수동 구현 |
| 임베딩 | `@xenova/transformers` 로컬 모델 | `Xenova/multilingual-e5-small` 384차원, 무료·오프라인 |
| 벡터 DB | PostgreSQL + pgvector | 단일 DB로 벡터 저장/검색 |
| ORM | Prisma | pgvector 연동 |
| 환경변수 | dotenv-expand | DB 접속정보 개별 변수로 분리 관리 |
| 문서 형식 | .txt / .md / .pdf / 이미지(.jpg .png 등) | |
| PDF 파싱 | `pdf-parse` | 텍스트 추출 후 청킹 (스캔 이미지 PDF 미지원) |

---

## 프로젝트 구조

```
├── docker-compose.yml                 # PostgreSQL + pgvector 컨테이너
├── docker/
│   └── init.sql                       # DB 최초 생성 시 vector 확장 활성화
├── prisma/
│   ├── schema.prisma                  # documents 테이블 + pgvector(384)
│   └── migrations/                    # 마이그레이션 파일
├── samples/                           # 테스트용 샘플 문서 (.txt / .md)
├── public/
│   └── images/                        # 업로드된 이미지 파일 저장 (자동 생성)
├── .cache/
│   └── transformers/                  # 로컬 임베딩 모델 캐시 (자동 생성, .gitignore)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx                   # 채팅 UI
│   │   ├── admin/
│   │   │   └── page.tsx               # 문서 목록 + 업로드(progress bar) + 삭제 UI
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts           # POST: RAG 스트리밍 응답 (Gemini)
│   │       └── ingest/
│   │           └── route.ts           # GET: 목록 / POST: 업로드 / DELETE: 삭제
│   ├── types/
│   │   └── pdf-parse.d.ts             # pdf-parse 타입 선언
│   └── lib/
│       ├── env.ts                     # dotenv-expand 로드
│       ├── db.ts                      # Prisma 클라이언트 싱글턴
│       ├── embedding.ts               # 로컬 임베딩 (384차원)
│       ├── chunker.ts                 # 텍스트 청크 분할
│       └── retriever.ts               # pgvector 유사도 검색
└── .env
```

---

## Next.js 설정

```ts
// next.config.ts
const nextConfig: NextConfig = {
  reactCompiler: true,   // React Compiler 활성화
  trailingSlash: true,   // 모든 URL은 /로 끝남 — 링크 작성 시 주의
  serverExternalPackages: ['@xenova/transformers', 'pdf-parse'],  // 번들링 제외
};
```

- `@xenova/transformers` — Node.js 네이티브 모듈, 클라이언트 번들에서 제외 필수
- `pdf-parse` — import 시 테스트 파일 로드 문제로 번들링 제외 필수

개발 서버는 Turbopack 사용 (`npm run dev` → port 5000).

---

## Docker 개발 환경

PostgreSQL + pgvector는 Docker로 관리한다. `pgvector/pgvector:pg16` 이미지 사용.

```yaml
# docker-compose.yml 핵심 구조
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER / PASSWORD / DB  # .env 변수 참조
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql  # vector 확장 자동 활성화
    healthcheck:
      test: pg_isready  # 5초 간격, 10회 재시도
```

`docker/init.sql` — DB 최초 생성 시 1회 실행:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Path Aliases

`tsconfig.json`에 정의. import 시 상대경로 대신 alias 사용.

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `./src/*` |
| `@lib/*` | `./src/lib/*` |

---

## TypeScript Config 주의사항

- `strictNullChecks` 비활성화 — null 안전성 검사에 의존하지 말 것
- `strictPropertyInitialization` 비활성화
- `experimentalDecorators` / `emitDecoratorMetadata` 활성화 (class-validator 대비)

---

## 환경 변수

```
GOOGLE_API_KEY=AIza...

DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=password
DB_NAME=ragdb

# 위 변수들을 참조해서 자동 조합됨 (dotenv-expand)
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
```

| 변수 | 용도 |
|------|------|
| `GOOGLE_API_KEY` | Gemini API 인증 |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | DB 접속 개별 변수 |
| `DATABASE_URL` | dotenv-expand로 자동 조합되는 Prisma 연결 URL |

---

## DB 스키마 (prisma/schema.prisma)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

model Document {
  id        Int      @id @default(autoincrement())
  content   String
  source    String
  embedding Unsupported("vector(384)")   // multilingual-e5-small 출력 차원
  createdAt DateTime @default(now())

  @@map("documents")
}
```

> 임베딩 모델 변경 시 차원 수도 함께 수정 후 `npm run db:migrate` 재실행 필요.

---

## 구현 파일별 명세

### lib/embedding.ts

`@xenova/transformers`로 텍스트를 384차원 벡터로 로컬 변환. API 키 불필요.

```ts
import { pipeline, env } from '@xenova/transformers';

env.cacheDir = './.cache/transformers';  // 모델 캐시 위치

let embeddingPipeline = null;

async function getPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
  }
  return embeddingPipeline;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const pipe = await getPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}
```

---

### lib/chunker.ts

문서를 일정 크기로 분할. 오버랩으로 문맥 유지.

```ts
export function splitIntoChunks(text: string, size = 500, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, Math.min(start + size, text.length)).trim());
    start += size - overlap;
  }
  return chunks.filter(c => c.length > 50);
}
```

---

### lib/retriever.ts

pgvector 코사인 유사도 검색 (`<=>` 연산자). 상위 k개 청크 반환.

```ts
export async function retrieveRelevantChunks(question: string, k = 3) {
  const embedding = await getEmbedding(question);
  const vector = `[${embedding.join(',')}]`;

  return db.$queryRaw`
    SELECT content, source
    FROM documents
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${k}
  `;
}
```

---

### app/api/chat/route.ts

질문 수신 → 유사 청크 검색 → Gemini 스트리밍 응답.

- `@google/generative-ai` 직접 사용 (`gemini-2.0-flash`)
- 응답을 **AI SDK Data Stream Protocol** 형식으로 수동 포맷 → `useChat` 훅과 호환
  - 텍스트 청크: `0:"text"\n`
  - 완료: `d:{"finishReason":"stop"}\n`
  - 헤더: `x-vercel-ai-data-stream: v1`
- 시스템 프롬프트에 이미지 경로 처리 지침 포함
  - 컨텍스트에 `/images/...` 경로가 있으면 응답에 그대로 포함하도록 지시
  - 채팅 UI의 `renderContent()`가 해당 경로를 `<img>`로 렌더링

---

### app/api/ingest/route.ts

3개의 HTTP 메서드 처리. 현재 인증 없음. 추후 관리자 권한 체크 추가 예정.

| 메서드 | 동작 |
|---|---|
| `GET` | 업로드된 문서 목록 반환 (source별 청크 수, 업로드일) |
| `POST` | 파일 업로드 → 타입별 처리 → 임베딩 → pgvector 저장. 동일 파일명이면 기존 데이터 삭제 후 재저장 |
| `DELETE` | `{ source: string }` body로 특정 문서 전체 삭제 |

POST 파일 타입별 처리:

| 파일 타입 | 처리 방식 |
|---|---|
| `.txt` / `.md` | 텍스트 그대로 청킹 → 임베딩 |
| `.pdf` | `pdf-parse/lib/pdf-parse.js`로 텍스트 추출 → 청킹 → 임베딩 |
| `.jpg` `.jpeg` `.png` `.gif` `.webp` | `public/images/`에 파일 저장 → 경로를 텍스트(`이미지 /images/파일명`)로 임베딩 |

GET 응답 형식:
```ts
{ documents: { source: string; chunkCount: number; createdAt: string }[] }
```

> `pdf-parse`는 `pdf-parse/lib/pdf-parse.js`로 직접 import해야 함.
> 패키지 진입점이 테스트 파일을 `fs`로 읽으려 해서 Next.js 환경에서 실패하기 때문.
> 타입 선언은 `src/types/pdf-parse.d.ts`에 직접 정의.

---

### app/admin/page.tsx

- 업로드 허용 형식: `.txt`, `.md`, `.pdf`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- 업로드 진행 중 **Progress Bar** 표시 (가상 진행률, 0→90% 자동 증가 → 완료 시 100%)
- 업로드된 문서 목록을 테이블로 표시 (파일명, **유형 뱃지**, 청크 수, 업로드일, 삭제 버튼)
- 이미지 파일은 목록에서 썸네일 미리보기 표시
- 페이지 진입 시 `GET /api/ingest/`로 목록 초기 로드
- 파일 업로드/삭제 후 목록 자동 갱신
- 인증 없음. 추후 로그인 + 관리자 권한 체크 추가 예정

---

### app/page.tsx

`useChat` 훅(`@ai-sdk/react`)으로 SSE 스트리밍 자동 처리.
응답에 이미지 경로가 포함된 경우 `<img>`로 렌더링.

**이미지 렌더링 방식**: `renderContent()` 함수가 메시지 텍스트를 `/images/...` 경로 패턴으로 split → 이미지 경로는 `<img>` 태그로, 나머지는 `<span>`으로 렌더링.

```tsx
const IMAGE_PATH_REGEX = /(\/images\/\S+\.(?:jpg|jpeg|png|gif|webp))/gi;

function renderContent(content: string) {
  const parts = content.split(IMAGE_PATH_REGEX);
  return parts.map((part, i) => {
    if (/^\/images\/\S+\.(?:jpg|jpeg|png|gif|webp)$/i.test(part)) {
      return <img key={i} src={part} alt="첨부 이미지" style={{ maxWidth: '100%' }} />;
    }
    return part ? <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span> : null;
  });
}
```

---

### src/types/pdf-parse.d.ts

`pdf-parse` 타입 패키지(`@types/pdf-parse`)가 없으므로 직접 선언.

```ts
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>;
  export default pdfParse;
}
```

---

## URL 작성 규칙

`trailingSlash: true` 설정으로 **모든 URL은 `/`로 끝내야 함**.

```ts
// 올바른 예
fetch('/api/ingest/', { method: 'POST', ... })
router.push('/admin/')

// 잘못된 예
fetch('/api/ingest', ...)
```

---

## 문서 변경 시나리오

| 상황 | 처리 방법 |
|---|---|
| 문서 추가 | 관리자 UI(`/admin/`)에서 파일 업로드 |
| 문서 수정 | 수정된 파일 재업로드 (동일 파일명이면 자동 교체) |
| 문서 삭제 | 관리자 UI 문서 목록에서 삭제 버튼 클릭 |
| 임베딩 모델 변경 | schema.prisma 차원 수 수정 → migration.sql 수정 → `npm run db:migrate` → 문서 전체 재업로드 |

---

## 샘플 문서 (`samples/`)

테스트용 샘플 5종. 관리자 UI에서 업로드하여 RAG 동작 검증에 사용.

| 파일 | 내용 |
|---|---|
| `회사소개.txt` | 회사 연혁, 제품, 고객 현황 |
| `제품매뉴얼_NovaERP.txt` | 로그인, 메뉴 구성, FAQ |
| `인사규정.txt` | 근무, 휴가, 급여, 복리후생 |
| `기술스택_가이드.md` | 프론트/백엔드 스택, 브랜치 전략 |
| `고객지원_FAQ.txt` | 계정, 발주, 재고, 회계 Q&A |

---

## 관리자 인증 (추후 추가 예정)

추후 관리자 페이지 인증 구현 시 Auth Flow 패턴을 따른다:

- JWT + httpOnly 쿠키 방식 (`src/app/api/cookie/` 라우트 핸들러)
- 클라이언트에서 쿠키 직접 접근 금지 — Next.js API route를 프록시로 사용
- 인증 상태는 React Context로 공유 (`IsLogin`, `AccessTokenContext`)
- 미인증 시 `/login/`으로 리다이렉트 (layout.tsx에서 처리)

---

## 추후 확장 예정

- 관리자 페이지 로그인 + 권한 체크 (Auth Flow 패턴 적용)
- 출처 문서명 응답에 함께 표시
- 청크 크기 튜닝 (문서 성격에 따라 size/overlap 조정)
- 스캔 이미지 PDF OCR 지원
