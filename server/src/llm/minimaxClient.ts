import '../utils/loadEnv.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MiniMaxChatOptions {
  temperature?: number;
  maxTokens?: number;
}

interface MiniMaxChoice {
  message?: {
    content?: string;
  };
}

interface MiniMaxChatResponse {
  choices?: MiniMaxChoice[];
  error?: {
    message?: string;
  };
}

const DEFAULT_BASE_URL = 'https://api.minimax.io/v1';
const DEFAULT_MODEL = process.env.LLM_MODEL ?? 'MiniMax-M2.7';

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getBaseUrl(): string {
  return (process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function stripReasoningBlocks(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export async function createChatCompletion(
  messages: ChatMessage[],
  options: MiniMaxChatOptions = {}
): Promise<string> {
  const apiKey = getRequiredEnv('LLM_API_KEY');
  const response = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 4000,
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = (await response.json()) as MiniMaxChatResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? `MiniMax request failed with status ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('MiniMax response did not include message content');
  }

  return stripReasoningBlocks(content);
}
