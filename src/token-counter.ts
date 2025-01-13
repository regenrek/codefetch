import { Tiktoken, type TiktokenBPE } from "js-tiktoken/lite";
import type { TokenEncoder } from "./types";

let tokenizer: Tiktoken | null = null;

const initTokenizer = async () => {
  if (!tokenizer) {
    const response = await fetch(
      "https://tiktoken.pages.dev/js/p50k_base.json"
    );
    const rank = (await response.json()) as TiktokenBPE;
    tokenizer = new Tiktoken(rank);
  }
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

  const tiktoken = await initTokenizer();
  return tiktoken.encode(text).length;
};

export const countTokens = async (
  text: string,
  encoder: TokenEncoder
): Promise<number> => {
  if (!encoder || !text) return 0;
  return getTokenCount(text, encoder);
};

export const SUPPORTED_MODELS = {
  simple: ["*"],
  p50k: ["text-davinci-003", "text-davinci-002", "code-davinci-002"],
  o200k: [
    "gpt-4o-2024-11-20",
    "gpt-4o-2024-08-06",
    "gpt-4o-2024-05-13",
    "gpt-4o-mini-2024-07-18",
  ],
  cl100k: ["gpt-4", "gpt-3.5-turbo", "gpt-35-turbo"],
} as const;
