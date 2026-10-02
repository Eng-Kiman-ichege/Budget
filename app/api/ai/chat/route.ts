import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const MODEL_NAME = process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3.5-lightning:free';

export async function POST(req: Request) {
  try {
    const { messages, financialContext } = await req.json();

    const systemPrompt = `You are a strict, highly direct personal finance engine analyzing budget data in Kenya (KSh).

Financial Data:
- Net Monthly Income: KSh ${financialContext.netIncome?.toLocaleString()}
- Total Monthly Expenses: KSh ${financialContext.totalExpenses?.toLocaleString()}
- Free Cashflow: KSh ${financialContext.remainingCashflow?.toLocaleString()}

Current Monthly Expenses:
${financialContext.expensesSummary}

Target Item Goal:
- Item: "${financialContext.goalTitle}"
- Target Amount: KSh ${financialContext.goalTargetAmount?.toLocaleString()}
- Saved So Far: KSh ${financialContext.goalCurrentAmount?.toLocaleString()}
- Timeline: ${financialContext.goalMonths} months
- Required Monthly Deposit: KSh ${financialContext.requiredMonthlySavings?.toLocaleString()}

CRITICAL RESPONSE RULES:
1. NO greetings (do NOT say "Hello", "Habari", "Hi", or introduce yourself).
2. NO conversational fluff or pleasantries.
3. Give ONLY direct, concise feedback using bullet points in these 3 clean sections:

### 1. Financial Diagnosis
• Short summary of income vs expenses vs goal deposit.

### 2. Expense Cutbacks
• List specific expense items to trim down in KSh with exact monthly savings.

### 3. How to Save for "${financialContext.goalTitle}"
• Direct step-by-step instructions on required monthly deposit and recommended vehicle (e.g. MMF like CIC/Sanlam/Zimele or SACCO).`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || [])
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'My Budget',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: apiMessages,
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API Error:', errorText);
      return NextResponse.json({ error: 'OpenRouter API error', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    const rawContent: string = data.choices?.[0]?.message?.content || '';

    // Strip any internal chain-of-thought / "thinking" text the model may leak
    // before the first structured section header (### 1. ...)
    const firstSectionIndex = rawContent.search(/###\s*\d+\./);
    const replyContent = firstSectionIndex !== -1
      ? rawContent.slice(firstSectionIndex).trim()
      : rawContent.trim() || 'Direct budget diagnosis generated.';

    return NextResponse.json({ reply: replyContent });
  } catch (error: any) {
    console.error('AI Route error:', error);
    return NextResponse.json({ error: 'Internal AI Route error', message: error.message }, { status: 500 });
  }
}
