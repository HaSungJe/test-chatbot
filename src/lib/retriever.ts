import { db } from '@/lib/db';
import { getEmbedding } from '@/lib/embedding';

export async function retrieveRelevantChunks(
  question: string,
  k = 3,
): Promise<{ content: string; source: string }[]> {
  const embedding = await getEmbedding(question);
  const vector = `[${embedding.join(',')}]`;

  return db.$queryRaw`
    SELECT content, source
    FROM documents
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${k}
  `;
}
