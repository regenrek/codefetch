import { Tiktoken, type TiktokenBPE } from "js-tiktoken/lite";
import type { TokenEncoder } from "./types";

const tokenizerCache = new Map<TokenEncoder, Tiktoken>();

const getTokenizer = async (encoder: TokenEncoder): Promise<Tiktoken> => {
  if (tokenizerCache.has(encoder)) {
    return tokenizerCache.get(encoder)!;
  }

  // A simplified map of encoders to their JSON definition files
  const encoderFiles: Record<string, string> = {
    p50k: "p50k_base.json",
    o200k: "o200k_base.json",
    cl100k: "cl100k_base.json",
  };

  const fileName = encoderFiles[encoder];
  if (!fileName) {
    throw new Error(`Unsupported token encoder: ${encoder}`);
  }

  const response = await fetch(`https://tiktoken.pages.dev/js/${fileName}`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch tokenizer file for ${encoder}: ${response.statusText}`
    );
  }

  const rank = (await response.json()) as TiktokenBPE;
  const tokenizer = new Tiktoken(rank);
  tokenizerCache.set(encoder, tokenizer);
  return tokenizer;
};

const estimateTokens = (text: string): number => {
  return text.split(/[\s\p{P}]+/u).filter(Boolean).length;
};

const getTokenCount = async (
  text: string,
  encoder: TokenEncoder
): Promise<number> => {
  if (!text) return 0;

  if (encoder === "simple") {
    return estimateTokens(text);
  }

  const tiktoken = await getTokenizer(encoder);
  return tiktoken.encode(text).length;
};

export const countTokens = async (
  text: string,
  encoder: TokenEncoder
): Promise<number> => {
  if (!encoder || !text) return 0;
  try {
    return await getTokenCount(text, encoder);
  } catch (error) {
    if (
      error instanceof Error &&
      /Unsupported token encoder/.test(error.message)
    ) {
      throw error;
    }

    // Network or remote tokenizer failure – fall back to simple estimation
    // instead of failing the entire operation.
    console.warn(
      `[codefetch-sdk] Falling back to simple tokenizer for ${encoder}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return estimateTokens(text);
  }
};
