import { pipeline } from "@huggingface/transformers";
import type { EmbedProvider } from "@/lib/ai/types";

type FeatureExtractor = (
  texts: string | string[],
  opts?: { pooling?: string; normalize?: boolean },
) => Promise<{ tolist(): number[][] | number[] }>;

/**
 * Local embeddings (default): ONNX in-process, no sidecar, no egress.
 * Model downloads once into the HF cache — bake it into the Docker image
 * (P5) or mount the cache, or every fresh deploy pays a ~90MB cold start.
 */
const extractors = new Map<string, Promise<FeatureExtractor>>();

function getExtractor(model: string): Promise<FeatureExtractor> {
  let pending = extractors.get(model);
  if (!pending) {
    pending = pipeline("feature-extraction", model, {
      dtype: "q4",
    }) as unknown as Promise<FeatureExtractor>;
    extractors.set(model, pending);
  }
  return pending;
}

export function createLocalEmbedder(model: string, dim: number): EmbedProvider {
  return {
    name: `local:${model}`,
    model,
    dim,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      const extractor = await getExtractor(model);
      const out = await extractor(texts, { pooling: "mean", normalize: true });
      const rows = out.tolist() as number[][];
      return rows.map((row) => row.slice(0, dim));
    },
  };
}
