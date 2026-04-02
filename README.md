# RAG 챗봇

문서를 업로드하면 AI가 해당 문서를 기반으로 질문에 답변하는 챗봇입니다.

---

## 기술 스택

| 항목 | 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) |
| AI 모델 | Google Gemini `gemini-2.0-flash` |
| 임베딩 | `@xenova/transformers` 로컬 모델 (무료, 오프라인) |
| 벡터 DB | PostgreSQL + pgvector |
| ORM | Prisma |

---

## 시작하기

### 사전 조건

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 및 실행
- Node.js 18 이상

### 1. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일에 Google API 키 입력:

```
GOOGLE_API_KEY=AIza...
```

> API 키 발급: [aistudio.google.com](https://aistudio.google.com) → Get API Key (무료)

### 2. 설치 및 초기화

```bash
npm install
npm run db:migrate
```

### 3. 개발 서버 실행

```bash
npm run dev
```

| 페이지 | URL |
|---|---|
| 채팅 | http://localhost:5000 |
| 문서 관리 | http://localhost:5000/admin |

---

## 사용 방법

1. **문서 업로드** — `/admin` 페이지에서 파일 업로드
2. **질문** — `/` 채팅 페이지에서 업로드된 문서 내용 기반으로 질문

### 지원 파일 형식

| 형식 | 처리 방식 |
|---|---|
| `.txt` `.md` | 텍스트 청킹 → 임베딩 |
| `.pdf` | 텍스트 추출 → 청킹 → 임베딩 |
| `.jpg` `.jpeg` `.png` `.gif` `.webp` | 이미지 저장 → 경로 임베딩 → 채팅에서 이미지 렌더링 |

> 동일 파일명으로 재업로드하면 자동으로 교체됩니다.

---

## 주요 명령어

```bash
npm run dev          # 개발 서버 시작 (DB 포함)
npm run db:migrate   # DB 초기화 + 마이그레이션
npm run db:reset     # DB 데이터 전체 삭제 후 재시작
npm run db:studio    # Prisma Studio (DB GUI)
```

---

## 구조

```
src/
├── app/
│   ├── page.tsx          # 채팅 UI
│   ├── admin/page.tsx    # 문서 관리 UI
│   └── api/
│       ├── chat/         # RAG 스트리밍 응답
│       └── ingest/       # 문서 업로드/삭제/목록
└── lib/
    ├── embedding.ts      # 로컬 임베딩
    ├── retriever.ts      # 벡터 유사도 검색
    └── chunker.ts        # 텍스트 청크 분할
```
