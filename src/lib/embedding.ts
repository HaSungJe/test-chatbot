import { pipeline, env } from '@xenova/transformers';

// 모델 캐시 디렉토리 설정
env.cacheDir = './.cache/transformers';

let embeddingPipeline: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'Xenova/multilingual-e5-small',
    );
  }
  return embeddingPipeline;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const pipe = await getPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}
