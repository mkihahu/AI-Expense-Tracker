import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

if (!process.env.GEMINI_API_KEY) {
  console.error(
    "WARNING: GEMINI_API_KEY not found in environment variables. AI features will not work.",
  );
}

const stripMarkdown = (text) => {
  let cleaned = text.trim();
  // Remove markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```\n?/g, "");
  }
  return cleaned.trim();
};

export const generateMonthlyInsight = async ({
  totalIncome,
  totalExpenses,
  savingsRate,
  expenseBreakdown,
  previousMonths,
  currency = "USD",
}) => {
  const breakdownText =
    expenseBreakdown.length > 0
      ? expenseBreakdown
          .map((c) => `${c.category}: ${currency}${c.amount.toFixed(2)}`)
          .join("\n")
      : "- No expenses recorded yet";

  const trendText =
    previousMonths.length > 0
      ? previousMonths
          .map(
            (m) =>
              `- ${m.month}: Income ${currency} ${m.income.toFixed(2)}, Expenses ${currency} ${m.totalExpenses.toFixed(2)}, Savings ${currency} ${(m.income - m.totalExpenses).toFixed(2)}`,
          )
          .join("\n")
      : "- No previous months recorded";

  const prompt = `
  Analyze this user's monthly financial data and generate actionable insights.

 Currency: ${currency}
 Total Income (this month): ${currency}${totalIncome.toFixed(2)}
 Total Expenses (this month): ${currency}${totalExpenses.toFixed(2)}
 Savings Rate: ${savingsRate.toFixed(2)}%

 Expense breakdown:
 ${breakdownText}

 Previous month trends:
 ${trendText}

 Return ONLY a valid JSON (no markdown, no commentary) in this exact structure:
 {
 "summary": "2-3 sentence summary of the user's financial health this month",
 "highlights": ["Positive observation 1", "Positive observation 2"],
 "concerns": ["Concern 1", "Concern 2"],
 "recommendations": [
 {"title": "Short title", "detail": "Actionable suggestion (1-2 sentences)"}
 ],
 "topSpendingCategory": "Expense category name or null",
 "estimatedMonthlySavings": Number,
 "healthScore": number 
 }
Constraints:
- "healthScore" must be an integer between 0 and 100.
-"topSpendingCategory" must be from the expenseBreakdown array. Example: 'Groceries', 'Rent', etc.
- provide 3 recommendations.
- Reference actual numbers from the data. Tone: friendly but honest.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API Error (monthly insights):", error);
    throw new Error("Failed to generate monthly insights");
  }
};

export const generateBudgetAlert = async ({
  categoryName,
  budgetAmount,
  spentAmount,
  daysIntoPeriod,
  totalPeriodDays,
  currency = "USD",
}) => {
  const percentUsed = ((spentAmount / budgetAmount) * 100).toFixed(2);
  const daysLeft = totalPeriodDays - daysIntoPeriod;

  const prompt = `A user is tracking a budget. Generate a helpful alert.
    Category: ${categoryName}
    Budget: ${currency}${budgetAmount.toFixed(2)}
    Spent so far: ${currency}${spentAmount.toFixed(2)} (${percentUsed}% used)
    Days into period: ${daysIntoPeriod} of ${totalPeriodDays} (${daysLeft} days remaining)

    Return ONLY a valid JSON (no markdown, no commentary) in this exact format:
    {
        "severity": "warning" | "critical" | "info",
        "title": "Short alert title.",
        "message": "1-2 sentences. Empathetic. Reference the numbers."
        "suggestions":["Specific action 1", "Specific action 2", "Specific action 3"]
    }

    Severity guide:
    -info: under 70% spent
    -warning: 70-85% spent
    -critical: over 85% spent
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API Error (budget alert):", error);
    throw new Error("Failed to generate budget alert");
  }
};

export const generateSavingsTips = async ({
  topCategories,
  monthlyIncome,
  currency = "USD",
}) => {
  const categoryText =
    topCategories.length > 0
      ? topCategories
          .map(
            (c) =>
              `${c.category}: ${currency}${c.amount.toFixed(2)} across ${c.transactionsCount} transactions`,
          )
          .join("\n")
      : "- No expenses recorded yet";

  const prompt = `
    Based on the user's spending habits, provide savings tips.
    Monthly income (last 30 days): ${currency}${monthlyIncome.toFixed(2)}
    Top spending categories (last 30 days):
    ${categoryText}

    Return ONLY a valid JSON (no markdown, no commentary) in this exact format:
    {
        "overallTip": "Top-level 1-sentence advice",
        "tips":[
        {
        "category": "Category this targets",
        "title": "Short title",
        "detail": "2-3 sentence actionable suggestion. Reference their spending in this category. Be encouraging but direct.",
        "estimatedSavings": number
        }]
    }
        Provide exactly 4 tips. Each tip should reference an actual category from the data and include a realistic monthly savings amount.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API Error (savings tips):", error);
    throw new Error("Failed to generate savings tips");
  }
};

export const analyzeTransactionList = async ({
  transactions,
  currency = "USD",
}) => {
  const formatDate = (d) => {
    if (!d) return "";
    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${m}-${day}-${y}`;
    }
    return String(d).split("T")[0];
  };
  const lines = transactions
    .slice(0, 50)
    .map((t) => {
      const date = formatDate(t.transaction_date);
      const amt = parseFloat(t.amount).toFixed(2) || 0;
      const cat = t.category_name || "uncategorized";
      const desc = t.description ? ` | ${t.description}` : "";
      return `- ${date}: ${t.type} ${currency} ${amt} ${cat} ${desc}`;
    })
    .join("\n");

  const prompt = `
    Analyze these ${transactions.length} transactions and provide a concise, helpful spending report for the user.

    Transactions:
    ${lines}

    Return ONLY a valid JSON (no markdown, no commentary) in this exact format:
    {
        "insight": "2-4 sentence analysis with specific numbers from the data. Tone: friendly, helpful, and honest.",
        "highlights": "Single short phrase capturing the key takeaway(e.g 'Heavy on dining', 'Stable income','Unexpected subscription costs')"
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API Error (transaction list analysis):", error);
    throw new Error("Failed to generate transaction list analysis");
  }
};

export const analyzeBudgetList = async ({ budgets, currency = "USD" }) => {
  const lines = budgets
    .map((b) => {
      const spent = parseFloat(b.spent);
      const total = parseFloat(b.amount);
      const pct = total > 0 ? ((spent / total) * 100).toFixed(1) : 0;

      return `Budget ID: ${b.id} | Category: ${b.category_name} | Limit: ${currency}${total.toFixed(2)} | Spent: ${currency}${spent.toFixed(2)} | ${pct}%`;
    })
    .join("\n");

  const prompt = `
    You are a personal finance assistant. Analyze each budget and provide a realistic, actionable suggestion for improvement if the user is overspending or on track to overspend. If the user is well within budget, say so.

    Today: ${new Date().toISOString().split("T")[0]}

    Budgets:
    ${lines}

    For each budget return:
    - status: 'good' (well-paced, under target), 'caution' (approaching limit or above 70%), or concerning (over 85%)
    - message: A specific, friendly 1 sentence assessment with actionable feedback or encouragement.
    - confidence: 0.5-1.0

    Return ONLY a valid JSON (no markdown, no commentary) in this exact format:
    {"analyses": [
    {"budgetId": number, "status": "good" | "caution" | "concerning", "message": string, "confidence": number}
    ]}
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API Error (budget list analysis):", error);
    throw new Error("Failed to generate budget list analysis");
  }
};

export default {
  generateMonthlyInsight,
  generateBudgetAlert,
  generateSavingsTips,
  analyzeTransactionList,
  analyzeBudgetList,
};
