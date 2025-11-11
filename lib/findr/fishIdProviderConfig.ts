/**
 * Fish Identification Provider Configuration
 * Controls which AI provider to use (OpenAI vs Hugging Face)
 *
 * Toggle via environment variable:
 * - FISH_ID_PROVIDER=openai (default)
 * - FISH_ID_PROVIDER=huggingface
 *
 * This allows A/B testing and easy rollback between providers
 */

export type FishIdProvider = 'openai' | 'huggingface';

/**
 * Get the configured fish ID provider
 * Server-side only - checks environment variable
 */
export function getFishIdProvider(): FishIdProvider {
  // Only run on server
  if (typeof window !== 'undefined') {
    throw new Error('getFishIdProvider can only be called server-side');
  }

  const provider = process.env.FISH_ID_PROVIDER?.toLowerCase();

  if (provider === 'openai') {
    return 'openai';
  }

  // Default to Hugging Face (faster, cheaper, local inference)
  // Easy rollback: set FISH_ID_PROVIDER=openai
  return 'huggingface';
}

/**
 * Get the API endpoint for the configured provider
 */
export function getFishIdEndpoint(provider?: FishIdProvider): string {
  const activeProvider = provider || (typeof window === 'undefined' ? getFishIdProvider() : 'openai');

  if (activeProvider === 'huggingface') {
    return '/api/findr/identify-fish-hf';
  }

  return '/api/findr/identify-fish';
}

/**
 * Provider configuration details
 */
export const PROVIDER_CONFIG = {
  openai: {
    name: 'OpenAI GPT-4o',
    avgLatencyMs: 1500,
    costPerCall: 0.05,
    accuracy: 'High',
  },
  huggingface: {
    name: 'Hugging Face ViT',
    avgLatencyMs: 450,
    costPerCall: 0,
    accuracy: 'High',
  },
} as const;

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: FishIdProvider): string {
  return PROVIDER_CONFIG[provider].name;
}

/**
 * Check if provider is available
 * For OpenAI: check if API key is configured
 * For Hugging Face: always available (local model)
 */
export function isProviderAvailable(provider: FishIdProvider): boolean {
  if (provider === 'openai') {
    return typeof process !== 'undefined' && !!process.env.OPENAI_API_KEY;
  }

  // Hugging Face is always available (local inference)
  return true;
}
