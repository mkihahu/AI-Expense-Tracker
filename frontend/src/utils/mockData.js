// =============================================================================
// MOCK DATA — used by lib/axios.js to power the boilerplate without a backend.
// Delete this file once the real backend is wired up.
// =============================================================================

export const mockUser = {
    id: 1,
    name: 'Alex',
    email: 'alex@timetoprogram.com',
    currency: 'USD',
};

export const mockCategories = [
    // Income
    { id: 1, name: 'Salary', type: 'income', icon: 'briefcase', color: '#10B981', is_default: true },
    { id: 2, name: 'Freelance', type: 'income', icon: 'laptop', color: '#22C55E', is_default: true },
    { id: 3, name: 'Investments', type: 'income', icon: 'trending-up', color: '#14B8A6', is_default: true },
    { id: 4, name: 'Gifts', type: 'income', icon: 'gift', color: '#06B6D4', is_default: true },
    { id: 5, name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#0EA5E9', is_default: true },
    // Expense
    { id: 6, name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#F59E0B', is_default: true },
    { id: 7, name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#EAB308', is_default: true },
    { id: 8, name: 'Transportation', type: 'expense', icon: 'car', color: '#EF4444', is_default: true },
    { id: 9, name: 'Rent', type: 'expense', icon: 'home', color: '#F43F5E', is_default: true },
    { id: 10, name: 'Utilities', type: 'expense', icon: 'zap', color: '#EC4899', is_default: true },
    { id: 11, name: 'Entertainment', type: 'expense', icon: 'film', color: '#A855F7', is_default: true },
    { id: 12, name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#8B5CF6', is_default: true },
    { id: 13, name: 'Healthcare', type: 'expense', icon: 'heart', color: '#3B82F6', is_default: true },
    { id: 14, name: 'Education', type: 'expense', icon: 'book-open', color: '#6366F1', is_default: true },
    { id: 15, name: 'Travel', type: 'expense', icon: 'plane', color: '#F97316', is_default: true },
    { id: 16, name: 'Personal Care', type: 'expense', icon: 'sparkles', color: '#D946EF', is_default: true },
    { id: 17, name: 'Other Expense', type: 'expense', icon: 'more-horizontal', color: '#64748B', is_default: true },
];

// -----------------------------------------------------------------------------
// Transactions — built fresh every load so dates are always relative to "today"
// -----------------------------------------------------------------------------
const buildMockTransactions = () => {
    const today = new Date();
    const catMap = Object.fromEntries(mockCategories.map((c) => [c.name, c]));
    let id = 1;
    const out = [];

    const dateNDaysAgo = (n) => {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const add = (daysAgo, categoryName, amount, type, description) => {
        const c = catMap[categoryName];
        out.push({
            id: id++,
            user_id: 1,
            category_id: c?.id || null,
            category_name: c?.name || null,
            category_icon: c?.icon || null,
            category_color: c?.color || null,
            amount: amount.toFixed(2),
            type,
            description,
            notes: null,
            transaction_date: dateNDaysAgo(daysAgo),
            created_at: new Date().toISOString(),
        });
    };

    // Income — bi-weekly salary going back ~3 months
    [0, 14, 30, 44, 60, 74, 90].forEach((n) => add(n, 'Salary', 2750, 'income', 'Salary deposit'));
    add(15, 'Freelance', 800, 'income', 'Client project');
    add(75, 'Freelance', 1200, 'income', 'Client project');

    // Rent (monthly)
    [3, 33, 63, 93].forEach((n) => add(n, 'Rent', 1800, 'expense', 'Monthly rent'));

    // Utilities (monthly)
    [7, 37, 67].forEach((n) => add(n, 'Utilities', 95, 'expense', 'Electric + Internet'));

    // Subscriptions
    [4, 34, 64, 94].forEach((n) => {
        add(n, 'Entertainment', 15.99, 'expense', 'Netflix');
        add(n, 'Entertainment', 10.99, 'expense', 'Spotify');
    });

    // Weekly groceries
    [2, 9, 16, 23, 30, 37, 44, 51, 58, 65, 72, 79].forEach((n) =>
        add(n, 'Groceries', 60 + (n % 35), 'expense', 'Weekly groceries')
    );

    // Food & Dining — many small entries
    const foodDays = [1, 2, 5, 6, 8, 11, 13, 17, 19, 22, 25, 28, 31, 36, 41, 46, 52, 58, 67, 73, 81];
    foodDays.forEach((n, i) => {
        const amount = 8 + (n % 32);
        const desc = i % 4 === 0 ? 'Coffee' : i % 4 === 1 ? 'Lunch' : i % 4 === 2 ? 'Dinner out' : 'Takeout';
        add(n, 'Food & Dining', amount, 'expense', desc);
    });

    // Transportation
    [4, 11, 18, 25, 32, 39, 46, 53, 60, 67].forEach((n, i) =>
        add(n, 'Transportation', 25 + (n % 30), 'expense', i % 2 === 0 ? 'Gas' : 'Uber')
    );

    // Entertainment outings
    [12, 27, 49, 71].forEach((n) => add(n, 'Entertainment', 32 + (n % 40), 'expense', 'Movie / event'));

    // Shopping
    add(11, 'Shopping', 120, 'expense', 'New shoes');
    add(48, 'Shopping', 85, 'expense', 'Home goods');
    add(83, 'Shopping', 65, 'expense', 'Amazon order');

    // Healthcare
    add(22, 'Healthcare', 75, 'expense', 'Pharmacy');
    add(55, 'Healthcare', 45, 'expense', 'Doctor visit');

    // Personal care
    [8, 38, 68].forEach((n) => add(n, 'Personal Care', 38, 'expense', 'Haircut'));

    // Travel
    add(40, 'Travel', 220, 'expense', 'Weekend trip');

    return out.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
};

export const mockTransactions = buildMockTransactions();

// -----------------------------------------------------------------------------
// Budgets — current-month with spent values matching the seed scenario
// -----------------------------------------------------------------------------
const buildMockBudgets = () => {
    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const items = [
        { categoryName: 'Food & Dining', amount: 400, spent: 320 },
        { categoryName: 'Groceries', amount: 400, spent: 262 },
        { categoryName: 'Entertainment', amount: 100, spent: 80 },
        { categoryName: 'Transportation', amount: 250, spent: 139 },
        { categoryName: 'Shopping', amount: 100, spent: 120 },
    ];
    const catMap = Object.fromEntries(mockCategories.map((c) => [c.name, c]));
    return items.map((b, i) => {
        const c = catMap[b.categoryName];
        return {
            id: i + 1,
            user_id: 1,
            category_id: c.id,
            category_name: c.name,
            category_icon: c.icon,
            category_color: c.color,
            amount: b.amount.toFixed(2),
            spent: b.spent.toFixed(2),
            period: 'monthly',
            start_date: monthStart,
        };
    });
};

export const mockBudgets = buildMockBudgets();

// -----------------------------------------------------------------------------
// Dashboard aggregates
// -----------------------------------------------------------------------------
export const mockDashboardSummary = {
    incomeThisMonth: 6300,
    expenseThisMonth: 2364,
    balance: 3936,
    savingsRate: 62.5,
    incomeDelta: 5.2,
    expenseDelta: -8.3,
};

const buildMonthlyTrend = () => {
    // Return last 6 months in YYYY-MM format with reasonable values
    const today = new Date();
    const months = [];
    const samples = [
        { income: 6700, expense: 2890 },
        { income: 5500, expense: 2680 },
        { income: 6300, expense: 2720 },
        { income: 5500, expense: 2540 },
        { income: 6300, expense: 2820 },
        { income: 6300, expense: 2364 },
    ];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const s = samples[5 - i];
        months.push({ month, income: s.income.toFixed(2), expense: s.expense.toFixed(2) });
    }
    return months;
};

export const mockMonthlyTrend = buildMonthlyTrend();

export const mockCategoryBreakdown = [
    { category_id: 9, category_name: 'Rent', category_icon: 'home', category_color: '#F43F5E', total: '1800.00', transaction_count: 1 },
    { category_id: 6, category_name: 'Food & Dining', category_icon: 'utensils', category_color: '#F59E0B', total: '320.00', transaction_count: 8 },
    { category_id: 7, category_name: 'Groceries', category_icon: 'shopping-cart', category_color: '#EAB308', total: '262.00', transaction_count: 4 },
    { category_id: 8, category_name: 'Transportation', category_icon: 'car', category_color: '#EF4444', total: '139.00', transaction_count: 4 },
    { category_id: 11, category_name: 'Entertainment', category_icon: 'film', category_color: '#A855F7', total: '95.00', transaction_count: 3 },
];

// -----------------------------------------------------------------------------
// AI insights — pre-generated history + responses for "Generate" buttons
// -----------------------------------------------------------------------------
export const mockInsights = [
    {
        id: 101,
        insight_type: 'monthly_summary',
        period_start: '2026-05-01',
        period_end: '2026-05-14',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        content_json: {
            summary:
                "You're tracking well this month with a healthy 62.5% savings rate. Income of $6,300 is matched against $2,364 in expenses, leaving solid room for savings. Rent dominates your spending at $1,800, but everything else is well-controlled.",
            highlights: [
                'Savings rate of 62.5% is significantly above the recommended 20%',
                'Food & Dining is under budget at $320 of $400',
                'Transportation costs are 8% lower than last month',
            ],
            concerns: [
                'Shopping has exceeded its $100 budget by $20',
                'Discretionary spending tends to spike on weekends',
            ],
            recommendations: [
                {
                    title: 'Cap Shopping for the rest of May',
                    detail: 'Avoid new non-essential purchases for the next two weeks to bring Shopping back under budget.',
                },
                {
                    title: 'Move $1,500 to savings',
                    detail: 'Based on your projected end-of-month surplus, you can safely transfer $1,500 to your savings account.',
                },
                {
                    title: 'Set a weekly food limit',
                    detail: 'Aim for ~$80/week on Food & Dining to leave headroom for one weekend dinner out.',
                },
            ],
            topSpendingCategory: 'Rent',
            estimatedMonthlySavings: 240,
            healthScore: 78,
        },
    },
    {
        id: 102,
        insight_type: 'savings_tips',
        period_start: null,
        period_end: null,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        content_json: {
            overallTip: 'Small daily wins on coffee and dining out could free up ~$120/mo without any lifestyle change.',
            tips: [
                {
                    category: 'Food & Dining',
                    title: 'Brew at home twice a week',
                    detail: 'Replacing two coffee shop visits per week with home-brew saves about $40/month.',
                    estimatedSavings: 40,
                },
                {
                    category: 'Entertainment',
                    title: 'Audit subscriptions',
                    detail: "You're paying for Netflix, Spotify, and YouTube Premium. Drop one and save the monthly fee.",
                    estimatedSavings: 16,
                },
                {
                    category: 'Transportation',
                    title: 'Bundle errands on one Uber',
                    detail: 'Combining short rides into one weekly trip can cut transportation costs by ~$25/month.',
                    estimatedSavings: 25,
                },
                {
                    category: 'Shopping',
                    title: 'Use a 24-hour wishlist rule',
                    detail: 'Add non-essentials to a wishlist for 24 hours before buying. Avoids ~$40/mo in impulse buys.',
                    estimatedSavings: 40,
                },
            ],
        },
    },
];

export const mockInsightGenerators = {
    monthly_summary: {
        summary:
            'This month is shaping up well — income is steady at $6,300, expenses are tracking 8% below last month, and your savings rate sits at a healthy 62.5%. Rent remains the largest single line item.',
        highlights: [
            'Savings rate of 62.5% is well above the 20% benchmark',
            'Food & Dining is on pace ($320 of $400)',
            'Transportation spending dropped 8% month-over-month',
        ],
        concerns: [
            'Shopping has exceeded its $100 limit by $20',
            'Subscriptions creep — three streaming services active',
        ],
        recommendations: [
            { title: 'Freeze Shopping for two weeks', detail: 'Pause non-essential purchases to recover the $20 overage and finish the month under budget.' },
            { title: 'Transfer surplus to savings', detail: 'Set up an automatic $1,500 transfer at month end to lock in the surplus before it leaks.' },
            { title: 'Consolidate subscriptions', detail: 'Drop one of Netflix, Spotify, or YouTube Premium for a quick $11–16/month win.' },
        ],
        topSpendingCategory: 'Rent',
        estimatedMonthlySavings: 240,
        healthScore: 78,
    },
    savings_tips: {
        overallTip: 'Your top three leak categories are dining, subscriptions, and impulse shopping — small habit shifts here unlock ~$120/mo.',
        tips: [
            { category: 'Food & Dining', title: 'Brew coffee twice a week at home', detail: 'Two home-brew swaps per week cut monthly coffee spend by about $40.', estimatedSavings: 40 },
            { category: 'Entertainment', title: 'Drop one streaming service', detail: 'Three active subscriptions is overkill. Pick the one you actually use most this quarter.', estimatedSavings: 16 },
            { category: 'Transportation', title: 'Plan weekly errands together', detail: 'Combining trips into one Uber/rideshare per week reduces transportation overhead.', estimatedSavings: 25 },
            { category: 'Shopping', title: '24-hour pause rule', detail: 'Add non-essentials to a wishlist; revisit after 24 hours. Most impulse buys fade.', estimatedSavings: 40 },
        ],
    },
    budget_alert: {
        severity: 'warning',
        title: "You're approaching your Food & Dining limit",
        message: "You've used $320 of your $400 Food & Dining budget with 17 days left in the month. At your current pace, you'll go over by about $30.",
        suggestions: [
            'Aim for $20/day max on food & drinks for the rest of the month',
            'Plan one home-cooked dinner per weekend to skip a restaurant visit',
            'Skip premium coffee shop visits this week — drip coffee from home',
        ],
    },
};

// -----------------------------------------------------------------------------
// AI verdicts for each mock budget — matches the IDs in mockBudgets
// -----------------------------------------------------------------------------
export const mockBudgetAnalyses = [
    { budgetId: 1, status: 'good', message: "You've spent $320 of your $400 Food & Dining budget — right on pace with two weeks left." },
    { budgetId: 2, status: 'good', message: 'Groceries are comfortably under budget at $262 of $400. Nice consistent pace.' },
    { budgetId: 3, status: 'caution', message: 'Entertainment is at $80 of $100 — close to the limit with a few weeks left. Watch new subscriptions.' },
    { budgetId: 4, status: 'good', message: 'Transportation usage is healthy at $139 of $250.' },
    { budgetId: 5, status: 'concerning', message: 'Shopping has exceeded its $100 cap by $20. Consider pausing non-essentials until next month.' },
];

// -----------------------------------------------------------------------------
// Transaction analyzer mock response
// -----------------------------------------------------------------------------
export const mockTransactionAnalysis = {
    insight:
        'Your spending has been stable with Food & Dining as the top category at $320 across 8 transactions. Subscriptions account for about $43/month — modest but worth reviewing. Most discretionary spending happens on weekends.',
    highlight: 'Stable spending',
};
