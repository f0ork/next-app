import { pipeline } from "@xenova/transformers";

let embedder: any = null;

const MODEL_NAME = "Xenova/bge-small-zh-v1.5";

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", MODEL_NAME, {
      quantized: true,
    });
  }
  return embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const model = await getEmbedder();
  const results: number[][] = [];
  for (const text of texts) {
    const output = await model(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data));
  }
  return results;
}

export const EMBEDDING_DIM = 384;
