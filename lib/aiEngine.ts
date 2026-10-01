import { 
  MonthlyBudgetState, 
  AIBudgetAnalysisResult, 
  AIReductionTip, 
  AIGoalSavingPlan 
} from './types';
import { formatKSh } from './utils';

export function analyzeBudgetAndGoal(state: MonthlyBudgetState): AIBudgetAnalysisResult {
  const netIncome = state.monthlySalary + (state.additionalIncome || 0);
  const totalExpenses = state.expenses.reduce((acc, item) => acc + item.amount, 0);
  const remainingCashflow = netIncome - totalExpenses;

  const goal = state.savingsGoal;
  const remainingGoalTarget = Math.max(0, goal.targetAmount - (goal.currentAmount || 0));
  const months = Math.max(1, goal.targetMonths || 1);
  const requiredMonthlySavings = Math.ceil(remainingGoalTarget / months);

  const shortfallOrSurplus = remainingCashflow - requiredMonthlySavings;

  // 1. Identify Expense Cutbacks to bridge shortfall or boost savings
  const reductions: AIReductionTip[] = [];
  let totalPotentialCutbacks = 0;

  state.expenses.forEach((exp) => {
    const nameLower = exp.name.toLowerCase();

    if (nameLower.includes('dining') || nameLower.includes('takeaway') || nameLower.includes('restaurant')) {
      const rec = Math.round(exp.amount * 0.5); // cut by 50%
      const savings = exp.amount - rec;
      if (savings > 0) {
        reductions.push({
          expenseId: exp.id,
          expenseName: exp.name,
          currentAmount: exp.amount,
          recommendedAmount: rec,
          monthlySavings: savings,
          reasoning: `Trim dining out & coffee to free up ${formatKSh(savings)}/month directly for your "${goal.title}".`
        });
        totalPotentialCutbacks += savings;
      }
    }
    else if (nameLower.includes('outing') || nameLower.includes('entertainment') || nameLower.includes('fun')) {
      const rec = Math.round(exp.amount * 0.5);
      const savings = exp.amount - rec;
      if (savings > 0) {
        reductions.push({
          expenseId: exp.id,
          expenseName: exp.name,
          currentAmount: exp.amount,
          recommendedAmount: rec,
          monthlySavings: savings,
          reasoning: `Streamline weekend outings to save ${formatKSh(savings)}/month.`
        });
        totalPotentialCutbacks += savings;
      }
    }
    else if (nameLower.includes('airtime') || nameLower.includes('data')) {
      const rec = Math.round(exp.amount * 0.6);
      const savings = exp.amount - rec;
      if (savings > 0) {
        reductions.push({
          expenseId: exp.id,
          expenseName: exp.name,
          currentAmount: exp.amount,
          recommendedAmount: rec,
          monthlySavings: savings,
          reasoning: `Switch to monthly data bundles to save ${formatKSh(savings)}/month.`
        });
        totalPotentialCutbacks += savings;
      }
    }
    else if (nameLower.includes('family') || nameLower.includes('support') || nameLower.includes('gift')) {
      const rec = Math.round(exp.amount * 0.7);
      const savings = exp.amount - rec;
      if (savings > 0) {
        reductions.push({
          expenseId: exp.id,
          expenseName: exp.name,
          currentAmount: exp.amount,
          recommendedAmount: rec,
          monthlySavings: savings,
          reasoning: `Cap discretionary family gifts temporarily to preserve cashflow for your savings target.`
        });
        totalPotentialCutbacks += savings;
      }
    }
  });

  // 2. Build Goal Saving Plan
  const actionSteps: string[] = [];
  
  if (shortfallOrSurplus >= 0) {
    actionSteps.push(`You currently have ${formatKSh(remainingCashflow)}/month unspent cashflow, which easily covers your required ${formatKSh(requiredMonthlySavings)}/month deposit for "${goal.title}".`);
    actionSteps.push(`Set up an automatic standing order of ${formatKSh(requiredMonthlySavings)} on your salary payday into a high-yield Money Market Fund (MMF).`);
    actionSteps.push(`At this pace, you will reach your ${formatKSh(goal.targetAmount)} target in ${months} months!`);
  } else {
    const deficit = Math.abs(shortfallOrSurplus);
    actionSteps.push(`Your current unspent cashflow (${formatKSh(remainingCashflow)}) is ${formatKSh(deficit)} short of the required ${formatKSh(requiredMonthlySavings)}/month to hit your "${goal.title}" target in ${months} months.`);
    if (totalPotentialCutbacks >= deficit) {
      actionSteps.push(`Applying the recommended expense cutbacks below will free up ${formatKSh(totalPotentialCutbacks)}/month, fully closing the ${formatKSh(deficit)} gap!`);
    } else {
      actionSteps.push(`Applying cutbacks frees up ${formatKSh(totalPotentialCutbacks)}/month. You can also extend your target timeline by 1–2 months to make payments comfortable.`);
    }
    actionSteps.push(`Automate your savings deposit right on payday so you save first before spending.`);
  }

  const goalPlan: AIGoalSavingPlan = {
    goalTitle: goal.title,
    targetAmount: goal.targetAmount,
    monthsToAchieve: months,
    requiredMonthlySavings,
    currentAvailableMonthlySavings: remainingCashflow,
    savingsShortfallOrSurplus: shortfallOrSurplus,
    actionSteps,
    vehicleRecommendation: 'Money Market Fund (MMF) e.g. CIC, Sanlam, or Zimele (~10-12% p.a. compounding yield)'
  };

  // Health score calculation
  const healthScore = totalExpenses <= netIncome ? (shortfallOrSurplus >= 0 ? 90 : 75) : 45;

  let summary = `Your monthly net income is ${formatKSh(netIncome)} and your total monthly expenses are ${formatKSh(totalExpenses)}. `;
  if (shortfallOrSurplus >= 0) {
    summary += `You have enough cashflow (${formatKSh(remainingCashflow)}/mo) to save ${formatKSh(requiredMonthlySavings)}/mo and achieve your "${goal.title}" target in ${months} months!`;
  } else {
    summary += `To save ${formatKSh(requiredMonthlySavings)}/mo for "${goal.title}", you need to trim ${formatKSh(Math.abs(shortfallOrSurplus))}/mo from discretionary expenses like dining or outings.`;
  }

  return {
    netIncome,
    totalExpenses,
    remainingCashflow,
    healthScore,
    reductions,
    goalPlan,
    summary,
  };
}
