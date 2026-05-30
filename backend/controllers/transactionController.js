import pool from "../db.js";
import { analyzeTransactionList } from "../utils/gemini.js";

export const getTransactions = async (req, res) => {
  const {
    startDate,
    endDate,
    categoryId,
    type,
    search,
    limit = 50,
    offset = 0,
  } = req.query;

  const conditions = ["t.user_id = $1"];
  const values = [req.userId];
  let idx = 2;

  if (startDate) {
    conditions.push(`t.transaction_date >= $${idx++}`);
    values.push(startDate);
  }

  if (endDate) {
    conditions.push(`t.transaction_date <= $${idx++}`);
    values.push(endDate);
  }

  if (categoryId) {
    conditions.push(`t.category_id = $${idx++}`);
    values.push(categoryId);
  }

  if (type) {
    conditions.push(`t.type = $${idx++}`);
    values.push(type);
  }

  if (search) {
    conditions.push(`t.description ILIKE $${idx} OR t.notes ILIKE $${idx}`);
    values.push(`%${search}%`);
    idx++;
  }

  values.push(limit, offset);

  try {
    const result = await pool.query(
      `
      SELECT t.*, 
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY t.transaction_date DESC, t.id DESC
      LIMIT $${idx++} OFFSET $${idx}
    `,
      values,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Create Transaction

export const createTransaction = async (req, res) => {
  const { categoryId, amount, type, description, notes, transactionDate } =
    req.body;

  if (!amount || !type || !transactionDate) {
    return res
      .status(400)
      .json({ message: "Amount, type and transaction date are required" });
  }

  if (!["income", "expense"].includes(type)) {
    return res.status(400).json({ message: "Invalid transaction type" });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO transactions 
      (user_id, category_id, amount, type, description, notes, transaction_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING * 
      `,
      [
        req.userId,
        categoryId || null,
        amount,
        type,
        description || "",
        notes || "",
        transactionDate,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Transaction By ID

export const getTransactionById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT t.*, 
      c.name as category_name
      c.icon as category_icon
      c.color as category_color
      
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = $1 AND t.user_id = $2 
      `[(id, req.userId)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update Transaction

export const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { categoryId, amount, type, description, notes, transactionDate } =
    req.body;

  try {
    const result = await pool.query(
      `
      UPDATE transactions
      SET
        category_id = COALESCE($1, category_id),
        amount = COALESCE($2, amount),
        type = COALESCE($3, type),
        description = COALESCE($4, description),
        notes = COALESCE($5, notes),
        transaction_date = COALESCE($6, transaction_date)
      WHERE id = $7 AND user_id = $8
      RETURNING *
      `,
      [
        categoryId,
        amount,
        type,
        description,
        notes,
        transactionDate,
        id,
        req.userId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete Transaction

export const deleteTransaction = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      DELETE FROM transactions
      WHERE id = $1 AND user_id = $2
      RETURNING *`[(id, req.userId)],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const analyzeTransactions = async (req, res) => {
  const { transactionIds } = req.body;

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({ message: "Select transactions to analyze" });
  }

  const ids = transactionIds.slice(0, 50);

  try {
    const result = await pool.query(
      `
      SELECT t.id, t.type, t.amount, t.description, t.transaction_date,
      c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = $1 AND t.id = ANY($2::int[])
      ORDER BY t.transaction_date DESC
      `[(req.userId, ids)],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No transactions found for analysis" });
    }

    const userRes = await pool.query(
      `
      SELECT currency FROM users WHERE id = $1
      `,
      [req.userId],
    );

    const currency = userRes.rows[0]?.currency || "USD";

    const analysis = await analyzeTransactionList({
      transactions: result.rows,
      currency,
    });
    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing transactions:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};
