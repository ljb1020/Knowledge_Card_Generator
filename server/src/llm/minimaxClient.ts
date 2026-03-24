import '../utils/loadEnv.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MiniMaxChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

interface MiniMaxChoice {
  message?: {
    content?: string;
    reasoning_content?: string;
  };
}

interface MiniMaxChatResponse {
  choices?: MiniMaxChoice[];
  error?: {
    message?: string;
    code?: string | number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
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

function getModel(explicitModel?: string): string {
  return explicitModel?.trim() || DEFAULT_MODEL;
}

function stripReasoningBlocks(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export async function createChatCompletion(
  messages: ChatMessage[],
  options: MiniMaxChatOptions = {}
): Promise<string> {
  const apiKey = getRequiredEnv('LLM_API_KEY');
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getModel(options.model),
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 4000,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const rawText = await response.text();
  let data: MiniMaxChatResponse | null = null;
  try {
    data = rawText ? (JSON.parse(rawText) as MiniMaxChatResponse) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const providerMessage = data?.error?.message?.trim();
    const providerCode = data?.error?.code;
    const rawPreview = rawText.trim().slice(0, 300);
    const details = [
      `LLM request failed`,
      `status=${response.status}`,
      providerCode !== undefined ? `code=${providerCode}` : null,
      `baseUrl=${baseUrl}`,
      providerMessage ? `message=${providerMessage}` : null,
      !providerMessage && rawPreview ? `body=${rawPreview}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    throw new Error(details);
  }

  // MiniMax-specific: check base_resp for business-level errors (HTTP 200 but failed)
  const baseResp = data?.base_resp;
  if (baseResp && baseResp.status_code !== undefined && baseResp.status_code !== 0) {
    throw new Error(
      `LLM request failed | baseUrl=${baseUrl} | code=${baseResp.status_code} | message=${baseResp.status_msg ?? 'unknown'}`
    );
  }

  const message = data?.choices?.[0]?.message;
  // Reasoning models (e.g. MiniMax-M2.7) may return content in reasoning_content with empty content
  const content = message?.content || message?.reasoning_content;
  if (!content) {
    throw new Error(
      `LLM response did not include message content | baseUrl=${baseUrl} | body=${rawText.trim().slice(0, 300)}`
    );
  }

  return stripReasoningBlocks(content);
}
