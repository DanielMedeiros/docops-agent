import OpenAI from "openai";
import { config } from "./config.js";

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export async function createEmbedding(text: string): Promise<number[]> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("Não é possível gerar embedding para texto vazio.");
  }

  const response = await openai.embeddings.create({
    model: config.OPENAI_EMBEDDING_MODEL,
    input: normalizedText,
    encoding_format: "float",
  });

  const embedding = response.data[0]?.embedding;

  if (!embedding || embedding.length !== 1536) {
    throw new Error(
      `Embedding inválido. Esperadas 1536 dimensões; recebidas ${embedding?.length ?? 0}.`
    );
  }

  return embedding;
}
