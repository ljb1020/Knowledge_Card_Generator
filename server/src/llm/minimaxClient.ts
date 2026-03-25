import '../utils/loadEnv.js';

// ── Types ──

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  /** Provider ID from the registry (e.g. 'minimax', 'deepseek'). Defaults to 'minimax'. */
  providerId?: string;
}

interface LlmProvider {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

interface LlmChoice {
  message?: {
    content?: string;
    reasoning_content?: string;
  };
}

interface LlmChatResponse {
  choices?: LlmChoice[];
  error?: {
    message?: string;
    code?: string | number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

// ── Provider Registry ──

const PROVIDERS: Record<string, LlmProvider> = {};

function registerProvider(id: string, envBaseUrl: string, defaultBaseUrl: string, envApiKey: string, defaultModel: string, label: string): void {
  const apiKey = process.env[envApiKey]?.trim();
  if (!apiKey) {
    // API key not configured — skip this provider silently
    return;
  }

  PROVIDERS[id] = {
    id,
    label,
    baseUrl: (process.env[envBaseUrl] ?? defaultBaseUrl).replace(/\/+$/, ''),
    apiKey,
    defaultModel,
  };
}

// Register available providers (only those with API keys configured)
registerProvider('minimax', 'LLM_BASE_URL', 'https://api.minimaxi.com/v1', 'LLM_API_KEY', process.env.LLM_MODEL ?? 'MiniMax-M2.7', 'MiniMax');
registerProvider('deepseek', 'DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1', 'DEEPSEEK_API_KEY', 'DeepSeek-V3.2', 'DeepSeek V3');

const DEFAULT_PROVIDER_ID = 'minimax';

function getProvider(providerId?: string): LlmProvider {
  const id = providerId?.trim() || DEFAULT_PROVIDER_ID;
  const provider = PROVIDERS[id];
  if (!provider) {
    // Fallback to first available provider
    const fallback = Object.values(PROVIDERS)[0];
    if (!fallback) {
      throw new Error(`No LLM providers configured. Please set LLM_API_KEY or DEEPSEEK_API_KEY in .env`);
    }
    console.warn(`[llm] Provider "${id}" not found, falling back to "${fallback.id}"`);
    return fallback;
  }
  return provider;
}

/**
 * Returns the list of configured providers for the /api/models endpoint.
 */
export function getAvailableProviders(): Array<{ id: string; label: string; defaultModel: string }> {
  return Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    label: p.label,
    defaultModel: p.defaultModel,
  }));
}

// ── Helpers ──

function stripReasoningBlocks(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// ── Main API ──

export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  const provider = getProvider(options.providerId);
  const model = options.model?.trim() || provider.defaultModel;

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 4000,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const rawText = await response.text();
  let data: LlmChatResponse | null = null;
  try {
    data = rawText ? (JSON.parse(rawText) as LlmChatResponse) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const providerMessage = data?.error?.message?.trim();
    const providerCode = data?.error?.code;
    const rawPreview = rawText.trim().slice(0, 300);
    const details = [
      `LLM request failed [${provider.id}]`,
      `status=${response.status}`,
      providerCode !== undefined ? `code=${providerCode}` : null,
      `model=${model}`,
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
      `LLM request failed [${provider.id}] | code=${baseResp.status_code} | message=${baseResp.status_msg ?? 'unknown'}`
    );
  }

  const message = data?.choices?.[0]?.message;
  const content = message?.content || message?.reasoning_content;
  if (!content) {
    throw new Error(
      `LLM response did not include message content [${provider.id}] | model=${model} | body=${rawText.trim().slice(0, 300)}`
    );
  }

  return stripReasoningBlocks(content);
}
