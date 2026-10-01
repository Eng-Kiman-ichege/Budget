'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MonthlyBudgetState,
  ExpenseItem,
  TargetSavingItem,
  AIBudgetAnalysisResult,
  AIChatMessage
} from '../lib/types';
import { DEFAULT_BUDGET_STATE } from '../lib/initialData';
import { loadStoredBudgetState, saveStoredBudgetState, formatKSh } from '../lib/utils';
import { analyzeBudgetAndGoal } from '../lib/aiEngine';
import { FormattedAIMessage } from '../components/FormattedAIMessage';
import {
  Sparkles,
  Wallet,
  ShoppingBag,
  Target,
  Bot,
  Send,
  Plus,
  Trash2,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Zap,
  Building2,
  Save,
  Check,
  Copy,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<MonthlyBudgetState>(DEFAULT_BUDGET_STATE);

  // Persistence & Analysis Controls
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Expense form inline state
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<number>(3000);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTrimApplied, setIsTrimApplied] = useState(false);

  const aiSectionRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load state from localStorage on initial render
  useEffect(() => {
    const loaded = loadStoredBudgetState();
    setState(loaded);
    setMounted(true);
  }, []);

  // Auto-persist changes to localStorage as user edits
  useEffect(() => {
    if (mounted) {
      saveStoredBudgetState(state);
    }
  }, [state, mounted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  if (!mounted) return null;

  // Run AI analysis calculation
  const analysis: AIBudgetAnalysisResult = analyzeBudgetAndGoal(state);

  // Explicit Handler for "Save Budget Data" button
  const handleSaveData = () => {
    saveStoredBudgetState(state);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  // Explicit Handler for "Run AI Analysis & Get Suggestions" button
  const handleRunAIAnalysis = async () => {
    saveStoredBudgetState(state);
    setIsAnalyzing(true);
    setHasRunAnalysis(true);

    const netIncome = state.monthlySalary + (state.additionalIncome || 0);
    const totalExpenses = state.expenses.reduce((acc, item) => acc + item.amount, 0);

    const expensesSummary = state.expenses
      .map((e) => `- ${e.name}: KSh ${e.amount.toLocaleString()}`)
      .join('\n');

    try {
      const apiRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: `Give me direct budget feedback for my salary of KSh ${netIncome} and target goal "${state.savingsGoal.title}".` }
          ],
          financialContext: {
            netIncome,
            totalExpenses,
            remainingCashflow: analysis.remainingCashflow,
            expensesSummary,
            goalTitle: state.savingsGoal.title,
            goalTargetAmount: state.savingsGoal.targetAmount,
            goalCurrentAmount: state.savingsGoal.currentAmount,
            goalMonths: state.savingsGoal.targetMonths,
            requiredMonthlySavings: analysis.goalPlan.requiredMonthlySavings,
          },
        }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        const aiMessage: AIChatMessage = {
          id: `ai-run-${Date.now()}`,
          sender: 'ai',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages([aiMessage]);
      } else {
        const fallbackText =
          `### 1. Financial Diagnosis\n` +
          `• Net Income: ${formatKSh(netIncome)} | Expenses: ${formatKSh(totalExpenses)} | Free Cashflow: ${formatKSh(analysis.remainingCashflow)}/mo.\n` +
          `• Target "${state.savingsGoal.title}": Requires ${formatKSh(analysis.goalPlan.requiredMonthlySavings)}/mo for ${state.savingsGoal.targetMonths} months.\n\n` +
          `### 2. Expense Cutbacks\n` +
          `${analysis.reductions.map((r) => `• **${r.expenseName}**: Cut from ${formatKSh(r.currentAmount)} → ${formatKSh(r.recommendedAmount)} (Saves ${formatKSh(r.monthlySavings)}/mo)`).join('\n')}\n\n` +
          `### 3. How to Save for "${state.savingsGoal.title}"\n` +
          `• Deposit ${formatKSh(analysis.goalPlan.requiredMonthlySavings)}/month into a High-Yield Money Market Fund (MMF).`;

        setChatMessages([
          {
            id: `ai-run-${Date.now()}`,
            sender: 'ai',
            text: fallbackText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
      }
    } catch (err) {
      console.error('Error running AI analysis:', err);
    } finally {
      setIsAnalyzing(false);
      aiSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }
  };

  // Handlers for Salary
  const handleSalaryChange = (val: number) => {
    setState((prev) => ({ ...prev, monthlySalary: Math.max(0, val) }));
  };

  const handleSideIncomeChange = (val: number) => {
    setState((prev) => ({ ...prev, additionalIncome: Math.max(0, val) }));
  };

  // Handlers for Expenses List
  const handleExpenseAmountChange = (id: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((exp) => (exp.id === id ? { ...exp, amount: Math.max(0, amount) } : exp)),
    }));
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseName.trim() || newExpenseAmount <= 0) return;

    const newExp: ExpenseItem = {
      id: `exp-${Date.now()}`,
      name: newExpenseName.trim(),
      amount: newExpenseAmount,
      category: 'Expense',
    };

    setState((prev) => ({
      ...prev,
      expenses: [...prev.expenses, newExp],
    }));

    setNewExpenseName('');
    setNewExpenseAmount(3000);
    setIsAddingExpense(false);
  };

  const handleDeleteExpense = (id: string) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((exp) => exp.id !== id),
    }));
  };

  // Handlers for Savings Goal Item
  const handleGoalChange = (field: keyof TargetSavingItem, value: any) => {
    setState((prev) => ({
      ...prev,
      savingsGoal: {
        ...prev.savingsGoal,
        [field]: value,
      },
    }));
  };

  // One-Click Trim Expenses Action
  const handleApplyCutbacks = () => {
    const reductionsMap = new Map(analysis.reductions.map((r) => [r.expenseId, r.recommendedAmount]));
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((exp) => {
        const rec = reductionsMap.get(exp.id);
        return rec !== undefined ? { ...exp, amount: rec } : exp;
      }),
    }));

    setIsTrimApplied(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => setIsTrimApplied(false), 3000);
  };

  // Reset to Demo Data
  const handleResetDemo = () => {
    if (confirm('Reset salary, expenses, and savings goal to default demo values?')) {
      setState(DEFAULT_BUDGET_STATE);
      saveStoredBudgetState(DEFAULT_BUDGET_STATE);
      setHasRunAnalysis(false);
      setChatMessages([]);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle AI Chat Messages
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    const expensesSummary = state.expenses
      .map((e) => `- ${e.name}: KSh ${e.amount.toLocaleString()}`)
      .join('\n');

    try {
      const apiRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...chatMessages.map((m) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: query.trim() },
          ],
          financialContext: {
            netIncome: analysis.netIncome,
            totalExpenses: analysis.totalExpenses,
            remainingCashflow: analysis.remainingCashflow,
            expensesSummary,
            goalTitle: state.savingsGoal.title,
            goalTargetAmount: state.savingsGoal.targetAmount,
            goalCurrentAmount: state.savingsGoal.currentAmount,
            goalMonths: state.savingsGoal.targetMonths,
            requiredMonthlySavings: analysis.goalPlan.requiredMonthlySavings,
          },
        }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: 'ai',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('AI chat error:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    `How can I save for "${state.savingsGoal.title}" faster?`,
    'Which expenses should I trim first?',
    'Where should I invest my savings in Kenya?',
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white pb-20">

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white shadow-md shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                My<span className="text-emerald-500"> Budget</span>
              </h1>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">
                Salary &amp; Expense Savings Planner (KSh)
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isSavedNotice && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
            <button
              onClick={handleSaveData}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Data</span>
              <span className="sm:hidden">Save</span>
            </button>
            <button
              onClick={handleResetDemo}
              title="Reset Demo Data"
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN ─── */}
      <main className="max-w-5xl mx-auto px-4 pt-5 space-y-5">

        {/* ── SUMMARY CARDS ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Take-Home */}
          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Take-Home</span>
              <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 leading-none">
                {formatKSh(analysis.netIncome)}
              </div>
            </div>
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 items-center justify-center font-bold text-xs">
              KSh
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Expenses</span>
              <div className="text-lg sm:text-2xl font-black text-slate-800 mt-0.5 leading-none">
                {formatKSh(analysis.totalExpenses)}
              </div>
            </div>
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          {/* Free Cashflow */}
          <div className="bg-gradient-to-br from-indigo-600 to-emerald-600 text-white p-3 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-indigo-100 uppercase tracking-wider">Cashflow</span>
              <div className={`text-lg sm:text-2xl font-black mt-0.5 leading-none ${analysis.remainingCashflow >= 0 ? 'text-emerald-200' : 'text-rose-300'}`}>
                {formatKSh(analysis.remainingCashflow)}
              </div>
            </div>
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-white/15 text-emerald-200 items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ── SECTION 1: SALARY & EXPENSES ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Salary Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Wallet className="w-5 h-5 text-emerald-500 shrink-0" />
              <h2 className="font-black text-sm sm:text-base text-slate-900">1. Monthly Salary (KSh)</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Monthly Net Take-Home (KSh)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">KSh</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={state.monthlySalary || ''}
                  onChange={(e) => handleSalaryChange(parseFloat(e.target.value) || 0)}
                  placeholder="120000"
                  className="w-full pl-12 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Side Hustle / Extra Income (KSh)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">KSh</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={state.additionalIncome || ''}
                  onChange={(e) => handleSideIncomeChange(parseFloat(e.target.value) || 0)}
                  placeholder="10000"
                  className="w-full pl-12 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <span className="font-bold">Total Net Income: </span>
              <span className="font-black text-emerald-600 text-sm ml-1">
                {formatKSh(analysis.netIncome)}/month
              </span>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-500 shrink-0" />
                <h2 className="font-black text-sm sm:text-base text-slate-900">2. Monthly Expenses (KSh)</h2>
              </div>
              <button
                onClick={() => setIsAddingExpense(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Expense</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>

            {/* Add Expense Form */}
            {isAddingExpense && (
              <form onSubmit={handleAddExpense} className="p-4 rounded-xl bg-slate-50 border border-indigo-400 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-slate-700">New Expense</span>
                  <button type="button" onClick={() => setIsAddingExpense(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Expense Name</label>
                    <input
                      type="text"
                      required
                      value={newExpenseName}
                      onChange={(e) => setNewExpenseName(e.target.value)}
                      placeholder="e.g. Gym Membership"
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Amount (KSh)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      required
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingExpense(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-xs transition active:scale-95"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            )}

            {/* Expenses List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-0.5 no-scrollbar">
              {state.expenses.length === 0 && (
                <div className="col-span-2 text-center py-6 text-slate-400 text-xs">
                  No expenses yet — click Add to get started.
                </div>
              )}
              {state.expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                >
                  <span className="font-bold text-xs text-slate-800 truncate flex-1">{exp.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={exp.amount || ''}
                      onChange={(e) => handleExpenseAmountChange(exp.id, parseFloat(e.target.value) || 0)}
                      className="w-24 text-right px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg transition-colors active:scale-90"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SECTION 2: SAVINGS GOAL ── */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-emerald-700 p-5 sm:p-6 rounded-2xl text-white border border-indigo-500/40 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/15">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-300 shrink-0" />
              <h2 className="font-black text-base sm:text-lg text-white">3. My Savings Goal</h2>
            </div>
            <span className="text-xs font-bold text-emerald-200 bg-white/10 px-3 py-1 rounded-full border border-white/15 self-start sm:self-auto">
              Specific Target
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1 lg:col-span-1">
              <label className="block text-xs font-bold text-emerald-200 mb-1.5">Item / Goal Name</label>
              <input
                type="text"
                value={state.savingsGoal.title}
                onChange={(e) => handleGoalChange('title', e.target.value)}
                placeholder="e.g. Work Laptop"
                className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-200 mb-1.5">Target (KSh)</label>
              <input
                type="number"
                inputMode="numeric"
                value={state.savingsGoal.targetAmount || ''}
                onChange={(e) => handleGoalChange('targetAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-black text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-200 mb-1.5">Saved So Far (KSh)</label>
              <input
                type="number"
                inputMode="numeric"
                value={state.savingsGoal.currentAmount || 0}
                onChange={(e) => handleGoalChange('currentAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-200 mb-1.5">Timeline (Months)</label>
              <input
                type="number"
                inputMode="numeric"
                value={state.savingsGoal.targetMonths || 1}
                onChange={(e) => handleGoalChange('targetMonths', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>

          {/* Goal Formula Bar */}
          <div className="p-4 rounded-xl bg-white/10 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-emerald-200 text-xs block mb-0.5">Required Monthly Deposit:</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300">
                {formatKSh(analysis.goalPlan.requiredMonthlySavings)}<span className="text-sm font-semibold text-emerald-200">/mo</span>
              </span>
              <span className="text-[11px] text-emerald-200/70 block mt-0.5">
                To reach {formatKSh(state.savingsGoal.targetAmount)} in {state.savingsGoal.targetMonths} months
              </span>
            </div>
            <div>
              <span className="text-indigo-200 text-xs block mb-0.5">Your Available Cashflow:</span>
              <span className={`text-xl sm:text-2xl font-black ${analysis.remainingCashflow >= analysis.goalPlan.requiredMonthlySavings ? 'text-emerald-300' : 'text-rose-300'}`}>
                {formatKSh(analysis.remainingCashflow)}<span className="text-sm font-semibold text-indigo-200">/mo</span>
              </span>
              {analysis.goalPlan.savingsShortfallOrSurplus < 0 && (
                <span className="text-[11px] text-rose-300 font-bold block mt-0.5">
                  Shortfall: {formatKSh(Math.abs(analysis.goalPlan.savingsShortfallOrSurplus))}/mo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0" />
                Save Budget &amp; Get AI Feedback
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Save your inputs, then run the AI to get direct cutbacks &amp; savings advice.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSaveData}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-sm transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4 text-indigo-500" />
                Save Budget Data
              </button>

              <button
                onClick={handleRunAIAnalysis}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze & Get Savings Feedback'}
              </button>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: AI RESULTS ── */}
        <div ref={aiSectionRef} className="space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-md shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900">
                4. AI Savings Feedback
              </h2>
            </div>

            {analysis.reductions.length > 0 && (
              <button
                onClick={handleApplyCutbacks}
                disabled={isTrimApplied}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                {isTrimApplied ? (
                  <><CheckCircle2 className="w-4 h-4" /> Applied!</>
                ) : (
                  <><Zap className="w-4 h-4 fill-current" /> Trim Expenses Auto</>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Cutbacks + Goal Steps (left) */}
            <div className="lg:col-span-7 space-y-5">

              {/* Cutback Cards */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
                    Recommended Cutbacks
                  </h3>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 shrink-0">
                    {analysis.reductions.length} targets
                  </span>
                </div>

                {analysis.reductions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    Your expenses are well balanced!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {analysis.reductions.map((red) => (
                      <div
                        key={red.expenseId}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
                      >
                        <div className="space-y-0.5 flex-1">
                          <h4 className="font-bold text-xs text-slate-900">{red.expenseName}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{red.reasoning}</p>
                          <span className="text-[11px] text-slate-400 block">
                            {formatKSh(red.currentAmount)} → <strong className="text-indigo-600">{formatKSh(red.recommendedAmount)}</strong>
                          </span>
                        </div>
                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block">Monthly Savings:</span>
                          <span className="text-sm font-black text-emerald-600">+{formatKSh(red.monthlySavings)}/mo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Goal Steps Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    How to Save for &ldquo;{state.savingsGoal.title}&rdquo;
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    Step-by-Step
                  </span>
                </div>

                <div className="space-y-2">
                  {analysis.goalPlan.actionSteps.map((stepText, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs text-slate-800 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{stepText}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 block">Recommended Savings Vehicle:</span>
                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {analysis.goalPlan.vehicleRecommendation}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Chat (right) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col h-[560px] sm:h-[600px]">
              {/* Chat Header */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        My Budget
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </h3>
                      <span className="text-[10px] text-slate-400 font-semibold block">nvidia/nemotron-3.5-lightning</span>
                    </div>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(prompt)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 whitespace-nowrap transition-colors cursor-pointer shrink-0 border border-slate-200/50 active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="my-3 flex-1 overflow-y-auto space-y-3 pr-0.5 text-xs no-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
                    <Bot className="w-10 h-10 text-indigo-400 opacity-50" />
                    <p className="font-bold text-xs">No analysis yet</p>
                    <p className="text-[11px] opacity-75">Click &ldquo;Analyze &amp; Get Savings Feedback&rdquo; to get started!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.sender === 'ai' && (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div
                        className={`relative group max-w-[88%] p-3.5 rounded-2xl leading-relaxed shadow-xs transition-all ${
                          msg.sender === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-sm font-medium'
                            : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'
                        }`}
                      >
                        {msg.sender === 'ai' ? (
                          <FormattedAIMessage text={msg.text} />
                        ) : (
                          <p>{msg.text}</p>
                        )}

                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{msg.timestamp}</span>
                          {msg.sender === 'ai' && (
                            <button
                              onClick={() => handleCopyText(msg.id, msg.text)}
                              className="flex items-center gap-1 hover:text-indigo-500 cursor-pointer transition-colors"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              {copiedId === msg.id ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {isTyping && (
                  <div className="flex gap-2 items-center">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Bot className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-slate-100 border border-slate-200 text-xs text-slate-400 italic max-w-[70%]">
                      Generating feedback...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="pt-3 border-t border-slate-100 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={`Ask about saving for ${state.savingsGoal.title}...`}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400 transition"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isTyping}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-sm transition-all active:scale-90 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
