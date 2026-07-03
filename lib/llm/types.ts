/**
 * Provider-agnostic LLM interface types.
 *
 * All adapters (OpenAI, mock, future providers) implement these interfaces.
 * No framework imports — usable from Next.js routes, Lambda, CLI, anywhere.
 */
import type { z } from 'zod';

/** Options shared across all LLM calls */
export interface LLMCallOptions {
  /** Model identifier (e.g. "gpt-4o", "gpt-4o-mini") */
  model?: string;
  /** System prompt */
  system?: string;
  /** Temperature (0-2). Lower = more deterministic. */
  temperature?: number;
  /** Max tokens in the response */
  maxTokens?: number;
}

/** A single message in a conversation */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Options for generateCompletion */
export interface CompletionOptions extends LLMCallOptions {
  messages: LLMMessage[];
}

/** Options for generateStructuredOutput — the LLM must return data matching the schema */
export interface StructuredOutputOptions<T extends z.ZodType> extends LLMCallOptions {
  messages: LLMMessage[];
  /** Zod schema the response must conform to */
  schema: T;
  /** Name for the schema (used in function calling) */
  schemaName: string;
}

/** Options for streamCompletion */
export interface StreamCompletionOptions extends LLMCallOptions {
  messages: LLMMessage[];
}

/**
 * Provider-agnostic LLM adapter interface.
 *
 * Each provider (OpenAI, Anthropic, mock) implements this.
 * Services import from the factory — never directly from a provider SDK.
 */
export interface LLMAdapter {
  /** Generate a plain text completion */
  generateCompletion(options: CompletionOptions): Promise<string>;

  /** Generate a structured (JSON) output validated against a Zod schema */
  generateStructuredOutput<T extends z.ZodType>(
    options: StructuredOutputOptions<T>,
  ): Promise<z.infer<T>>;

  /** Stream a completion as an async iterable of text chunks */
  streamCompletion(options: StreamCompletionOptions): AsyncIterable<string>;
}
