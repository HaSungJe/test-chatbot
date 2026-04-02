import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieveRelevantChunks } from '@/lib/retriever';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question = messages.at(-1)?.content ?? '';

  const chunks = await retrieveRelevantChunks(question);
  const context = chunks
    .map(c => `[출처: ${c.source}]\n${c.content}`)
    .join('\n\n---\n\n');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `당신은 주어진 문서를 기반으로 질문에 답변하는 어시스턴트입니다.
아래 문서 내용을 참고해서 답변하세요.
문서에 없는 내용은 "문서에서 찾을 수 없습니다"라고 답하세요.

이미지 경로(/images/로 시작하는 경로)가 문서에 포함된 경우, 해당 경로를 그대로 응답에 포함하세요.
경로 앞뒤로 공백이나 줄바꿈을 두어 다른 텍스트와 분리되도록 해주세요.

[참고 문서]
${context}`,
  });

  // 이전 대화 히스토리 변환 (마지막 메시지 제외)
  const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(question);

  // useChat이 읽는 AI SDK Data Stream Protocol 포맷으로 변환
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          controller.enqueue(encoder.encode(`0:${JSON.stringify(text)}\n`));
        }
      }
      controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'x-vercel-ai-data-stream': 'v1',
    },
  });
}
