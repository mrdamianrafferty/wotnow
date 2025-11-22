/**
 * Fish ID Budget Tracking - Server-side database tracking
 *
 * Replaces insecure client-side localStorage with server-side database tracking
 * tied to user accounts with RLS policies.
 */

import { createClient } from '@/lib/supabase/server';

export interface BudgetData {
  usage_amount: number;  // Total spend in euros
  call_count: number;    // Number of calls
  month: string;         // YYYY-MM format
  provider: 'openai' | 'huggingface';
}

/**
 * Get current month string in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Load budget data for current month and provider
 * Returns usage data or creates a new entry if not exists
 */
export async function loadBudget(
  provider: 'openai' | 'huggingface'
): Promise<BudgetData> {
  try {
    const supabase = await createClient();
    const currentMonth = getCurrentMonth();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[BudgetTracking] No authenticated user, using defaults');
      return {
        usage_amount: 0,
        call_count: 0,
        month: currentMonth,
        provider
      };
    }

    // Query budget data for this user/month/provider
    const { data, error } = await supabase
      .from('fish_id_usage')
      .select('usage_amount, call_count, month')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .eq('provider', provider)
      .maybeSingle();

    if (error) {
      console.error('[BudgetTracking] Load error:', error);
      return {
        usage_amount: 0,
        call_count: 0,
        month: currentMonth,
        provider
      };
    }

    if (!data) {
      // No data yet - return defaults
      return {
        usage_amount: 0,
        call_count: 0,
        month: currentMonth,
        provider
      };
    }

    return {
      usage_amount: parseFloat(data.usage_amount?.toString() || '0'),
      call_count: data.call_count || 0,
      month: data.month,
      provider
    };

  } catch (error) {
    console.error('[BudgetTracking] Load failed:', error);
    return {
      usage_amount: 0,
      call_count: 0,
      month: getCurrentMonth(),
      provider
    };
  }
}

/**
 * Save/update budget data for current month and provider
 * Uses upsert to create or update the record
 */
export async function saveBudget(budgetData: BudgetData): Promise<void> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[BudgetTracking] No authenticated user, cannot save budget');
      return;
    }

    // Upsert budget data (insert or update)
    const { error } = await supabase
      .from('fish_id_usage')
      .upsert(
        {
          user_id: user.id,
          month: budgetData.month,
          provider: budgetData.provider,
          usage_amount: budgetData.usage_amount,
          call_count: budgetData.call_count
        },
        {
          onConflict: 'user_id,month,provider'
        }
      );

    if (error) {
      console.error('[BudgetTracking] Save error:', error);
    }

  } catch (error) {
    console.error('[BudgetTracking] Save failed:', error);
  }
}

/**
 * Increment usage for a successful AI call
 * Loads current data, increments, and saves back
 */
export async function incrementUsage(
  provider: 'openai' | 'huggingface',
  cost: number
): Promise<void> {
  const currentBudget = await loadBudget(provider);

  const updatedBudget: BudgetData = {
    ...currentBudget,
    usage_amount: currentBudget.usage_amount + cost,
    call_count: currentBudget.call_count + 1
  };

  await saveBudget(updatedBudget);
}
