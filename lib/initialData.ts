import { MonthlyBudgetState, ExpenseItem, TargetSavingItem } from './types';

export const DEFAULT_EXPENSES: ExpenseItem[] = [
  { id: 'exp-1', name: 'House Rent', amount: 30000, category: 'Needs' },
  { id: 'exp-2', name: 'Groceries & Food', amount: 18000, category: 'Needs' },
  { id: 'exp-3', name: 'KPLC Power Tokens & Water', amount: 4000, category: 'Needs' },
  { id: 'exp-4', name: 'Commute & Transport', amount: 8500, category: 'Needs' },
  { id: 'exp-5', name: 'Home WiFi & Internet', amount: 3500, category: 'Needs' },
  { id: 'exp-6', name: 'Dining Out & Takeaway', amount: 9000, category: 'Wants' },
  { id: 'exp-7', name: 'Airtime & Mobile Data', amount: 3000, category: 'Wants' },
  { id: 'exp-8', name: 'Weekend Outings & Fun', amount: 7000, category: 'Wants' },
  { id: 'exp-9', name: 'Family Support & Black Tax', amount: 8000, category: 'Wants' },
];

export const DEFAULT_SAVINGS_GOAL: TargetSavingItem = {
  id: 'goal-main',
  title: 'New Work Laptop',
  targetAmount: 120000,
  currentAmount: 25000,
  targetMonths: 5,
  notes: 'High performance laptop for work & projects'
};

export const DEFAULT_BUDGET_STATE: MonthlyBudgetState = {
  monthlySalary: 120000,
  additionalIncome: 10000,
  expenses: DEFAULT_EXPENSES,
  savingsGoal: DEFAULT_SAVINGS_GOAL,
};
