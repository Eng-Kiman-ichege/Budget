export interface ExpenseItem {
  id: string;
  name: string;
  amount: number; // in KSh
  category?: string; // Optional grouping
}

export interface TargetSavingItem {
  id: string;
  title: string;
  targetAmount: number; // in KSh
  currentAmount: number; // in KSh
  targetMonths: number; // e.g. 3 months, 6 months
  notes?: string;
}

export interface MonthlyBudgetState {
  monthlySalary: number; // Net monthly take-home salary in KSh
  additionalIncome: number;
  expenses: ExpenseItem[];
  savingsGoal: TargetSavingItem;
}

export interface AIReductionTip {
  expenseId: string;
  expenseName: string;
  currentAmount: number;
  recommendedAmount: number;
  monthlySavings: number;
  reasoning: string;
}

export interface AIGoalSavingPlan {
  goalTitle: string;
  targetAmount: number;
  monthsToAchieve: number;
  requiredMonthlySavings: number;
  currentAvailableMonthlySavings: number;
  savingsShortfallOrSurplus: number;
  actionSteps: string[];
  vehicleRecommendation: string;
}

export interface AIBudgetAnalysisResult {
  netIncome: number;
  totalExpenses: number;
  remainingCashflow: number;
  healthScore: number;
  reductions: AIReductionTip[];
  goalPlan: AIGoalSavingPlan;
  summary: string;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}
