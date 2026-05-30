import pool from "../db.js";
import { analyzeBudgetList } from "../utils/gemini.js";

// Get all budgets for user
export const getBudgets = async (req, res) => {
  try {
    const result = await pool.query(
      `
            SELECT 
                b.id,
                b.category_id,
                b.amount,
                b.period,
                b.start_date,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color AS category_color,
                COALESCE(SUM(t.amount), 0) AS spent
            FROM budgets b
            JOIN categories c ON c.id = b.category_id
            LEFT JOIN transactions t
                ON t.category_id = b.category_id
                AND t.user_id = b.user_id
                AND t.type = 'expense'
                AND (
                    (b.period = 'monthly' AND t.transaction_date >= date_trunc('month', CURRENT_DATE))
                    OR (b.period = 'weekly' AND t.transaction_date >= date_trunc('week', CURRENT_DATE))
                )
            WHERE b.user_id = $1
            GROUP BY b.id, c.name, c.icon, c.color
            ORDER BY c.name`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create a new budget
export const createBudget = async (req, res) => {
  const { categoryId, amount, period = "monthly", startDate } = req.body;

  if (!categoryId || !amount) {
    return res.status(400).json({ message: "categoryId and amount required" });
  }

  if (!["monthly", "weekly"].includes(period)) {
    return res
      .status(400)
      .json({ message: "Invalid period, period must be monthly or weekly" });
  }

  try {
    const today = new Date();
    const monthStart = `${today.getFullYear()}-${today.getMonth() + 1}-01`;
    const effectiveStart = startDate || monthStart;
    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, period, start_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [req.userId, categoryId, amount, period, effectiveStart],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({
        message: "You have already created a budget for this category",
      });
    }
    console.error("Create budget error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update a budget
export const updateBudget = async (req, res) => {
  const { id } = req.params;
  const { amount, period } = req.body;

  try {
    const result = await pool.query(
      `
        UPDATE budgets 
        SET amount = COALESCE($1, amount),
            period = COALESCE($2, period)
        WHERE id = $3 AND user_id = $4 RETURNING *;
        `,
      [amount, period, id, req.userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Budget not found or unauthorized" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a budget
export const deleteBudget = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
            DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id;
        `,
      [id, req.userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Budget not found or unauthorized" });
    }

    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("Delete budget error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const analyzeBudgets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id,
      b.amount,
      b.period,
      c.name AS category_name,
      COALESCE(SUM(t.amount),0) AS spent
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      LEFT JOIN transactions t ON t.category_id = b.category_id AND t.user_id = b.user_id AND t.type = 'expense'
      AND (
        (b.period = 'monthly' AND t.transaction_date >= date_trunc('month', CURRENT_DATE))
        OR (b.period = 'weekly' AND t.transaction_date >= date_trunc('week', CURRENT_DATE))
      )
      WHERE b.user_id = $1
      GROUP BY b.id, c.name`,
      [req.userId],
    );

    if (result.rows.length === 0) {
      return res.json({ analyses: [] });
    }

    const userRes = await pool.query(
      "SELECT currency FROM users WHERE id = $1",
      [req.userId],
    );

    const currency = userRes.rows[0]?.currency || "USD";

    const analysis = await analyzeBudgetList({
      budgets: result.rows,
      currency,
    });

    res.json({ analyses: analysis });
  } catch (error) {
    console.error("Error analyzing budgets:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};
