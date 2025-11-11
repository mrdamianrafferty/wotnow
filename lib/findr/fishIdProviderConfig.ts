/**
 * Fish Identification Provider Configuration
 *
 * Manages selection between OpenAI and HuggingFace AI providers
 * via environment variable FISH_ID_PROVIDER
 *
 * Providers:
 * - openai: GPT-4 Vision (~€0.05 per call, high accuracy)
 * - huggingface: Vision Transformer (€0.001 per call, 20x cheaper)
 *
 * Default: OpenAI (can be changed via env var)
 */

export type FishIdProvider = 'openai' | 'huggingface';

/**
 * Get the configured fish ID provider from environment
 *
 * @returns 'openai' or 'huggingface'
 *
 * Environment variable options:
 * - FISH_ID_PROVIDER=openai (default)
 * - FISH_ID_PROVIDER=huggingface (or 'hf' for short)
 */
export function getFishIdProvider(): FishIdProvider {
  const provider = process.env.FISH_ID_PROVIDER?.toLowerCase();

  if (provider === 'huggingface' || provider === 'hf') {
    return 'huggingface';
  }

  // Default to OpenAI for production stability
  return 'openai';
}

/**
 * Get provider-specific configuration
 */
export function getProviderConfig(provider: FishIdProvider) {
  switch (provider) {
    case 'huggingface':
      return {
        name: 'HuggingFace Inference API',
        modelName: 'google/vit-base-patch16-224',
        costPerCall: 0.001, // €0.001
        monthlyBudget: 10, // €10/month
        description: 'Vision Transformer - Fast and cost-effective'
      };
    case 'openai':
    default:
      return {
        name: 'OpenAI GPT-4 Vision',
        modelName: 'gpt-4o',
        costPerCall: 0.05, // €0.05
        monthlyBudget: 50, // €50/month
        description: 'GPT-4 with high-detail vision - Maximum accuracy'
      };
  }
}
