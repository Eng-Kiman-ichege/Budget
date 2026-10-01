import { MonthlyBudgetState, ExpenseItem, TargetSavingItem } from './types';
import { DEFAULT_BUDGET_STATE } from './initialData';

export function formatKSh(amount: number): string {
  const formatted = new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));

  return `KSh ${formatted}`;
}

export function formatCurrency(amount: number): string {
  return formatKSh(amount);
}

const STORAGE_KEY = 'vaultbudget_simple_state_v1';

export function loadStoredBudgetState(): MonthlyBudgetState {
  if (typeof window === 'undefined') return DEFAULT_BUDGET_STATE;
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : DEFAULT_BUDGET_STATE;
  } catch {
    return DEFAULT_BUDGET_STATE;
  }
}

export function saveStoredBudgetState(state: MonthlyBudgetState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
