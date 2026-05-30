import bcrypt from "bcryptjs";
import pool from "../db.js";
import defaultCategories from "../utils/defaultCategories.js";

const DEMO_USER = {
  name: "Martin",
  email: "martin@gmail.com",
  password: "password123",
  currency: "USD",
};

const BUDGETS = [
  { name: "Food & Dining", amount: 600 },
  { name: "Groceries", amount: 400 },
  { name: "Transport", amount: 250 },
  { name: "Entertainment", amount: 200 },
  { name: "Shopping", amount: 250 },
];

const generateTransactions = (catMap) => {
  const txns = [];
  const today = new Date();

  let seed = 1;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const rangeFloat = (min, max) => min + rng() * (max - min);
  const rangeInt = (min, max) => Math.floor(rangeFloat(min, max + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth() - monthsAgo,
      1,
    );
    const daysInMonth = new Date(
      today.getFullYear(),
      monthStart.getMonth() + 1,
      0,
    ).getDate();
    const monthLastDay = monthsAgo === 0 ? today.getDate() : daysInMonth;

    const dateOn = (day) => {
      const year = monthStart.getFullYear();
      const month = monthStart.getMonth() + 1;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };

    const add = (day, categoryName, amount, type, description) => {
      if (day < 1 || day > monthLastDay) return;
      const catId = catMap[categoryName];
      if (!catId) return;
      txns.push({
        categoryId: catId,
        amount: parseFloat(amount.toFixed(2)),
        type,
        description,
        date: dateOn(day),
      });
    };

    // Bi-weekly salary
    add(1, "Salary", 2750, "income", "Salary deposit");
    add(15, "Salary", 2750, "income", "Salary deposit");

    if (monthsAgo % 3 === 1) {
      add(
        rangeInt(8, 25),
        "Other Income",
        rangeFloat(15, 120),
        "income",
        pick(["Freelance", "Gigs", "Side Income"]),
      );
    }

    // Fixed recurring expenses
    add(2, "Housing", 1400, "expense", "Rent");
    add(
      rangeInt(5, 9),
      "Utilities",
      rangeFloat(75, 110),
      "expense",
      "Electricity",
    );
    add(
      rangeInt(10, 14),
      "Utilities",
      rangeFloat(45, 70),
      "expense",
      "Internet",
    );

    // Subscriptions
    add(5, "Subscriptions", 13, "expense", "Netflix");
    add(15, "Subscriptions", 23, "expense", " Spotify");
    add(20, "Subscriptions", 18, "expense", "HBOMAX");

    // Daily granular transactions
    for (let day = 1; day <= monthLastDay; day++) {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;

      if (!isWeekend && rng() < 0.8) {
        add(
          day,
          "Food & Dining",
          rangeFloat(4, 8),
          "expense",
          pick(["Morning coffee", "Coffee", "Latte", "Takeout"]),
        );
      }

      if (!isWeekend && rng() < 0.55) {
        add(
          day,
          "Food & Dining",
          rangeFloat(10, 18),
          "expense",
          pick(["Lunch", "Sandwich", "Salad", "Shake"]),
        );
      }

      if (!isWeekend && rng() < 0.5) {
        add(
          day,
          "Food & Dining",
          rangeFloat(28, 75),
          "expense",
          pick(["Dinner", "Steak", "Seafood", "Grill"]),
        );
      }

      if (!isWeekend && rng() < 0.4) {
        add(
          day,
          "Transport",
          rangeFloat(2.5, 6),
          "expense",
          pick(["Parking", "Gas", "Ride Share"]),
        );
      }

      if (!isWeekend && rng() < 0.15) {
        add(
          day,
          "Shopping",
          rangeFloat(12, 48),
          "expense",
          pick(["Clothes", "Shoes", "Accessories"]),
        );
      }
    }

    // Weekly groceries
    for (let day = 1; day <= monthLastDay; day++) {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (d.getDay() === 6) {
        add(
          day,
          "Groceries",
          rangeFloat(55, 120),
          "expense",
          pick(["Weekly groceries", "Supermarket", "Whole Foods"]),
        );
      }
    }

    // Weekly gas
    for (let day = 4; day <= monthLastDay; day += 7) {
      add(day, "Transport", rangeFloat(35, 60), "expense", "Gas");
    }

    // Occasional larger expenses
    if (monthsAgo % 2 === 0) {
      add(
        rangeInt(8, 25),
        "Shopping",
        rangeFloat(55, 180),
        "expense",
        pick(["Clothes", "Shoes", "Accessories"]),
      );
    }
    if ([10, 6, 2].includes(monthsAgo)) {
      add(
        rangeInt(10, 20),
        "Healthcare",
        rangeFloat(40, 130),
        "expense",
        "Doctor visit",
      );
    }

    if (monthsAgo % 2 === 0) {
      add(
        rangeInt(8, 14),
        "Personal Care",
        rangeFloat(40, 120),
        "expense",
        pick(["Haircut", " Barber", "Shave", "Styling"]),
      );
    }
    if ([11, 7, 3, 1].includes(monthsAgo)) {
      add(
        rangeInt(15, 22),
        "Travel",
        rangeFloat(180, 550),
        "expense",
        " Weekend Trip",
      );
    }
  }
  return txns;
};

const seed = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query("SELECT id FROM users WHERE email=$1", [
      DEMO_USER.email,
    ]);
    if (existing.rows.length > 0) {
      console.log(
        "Demo user already exists. Deleting existing demo user data for fresh seed...",
      );
      await client.query("DELETE FROM users WHERE email=$1", [DEMO_USER.email]);
    }

    console.log(`Creating user ${DEMO_USER.email}...`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEMO_USER.password, salt);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, currency) VALUES ($1, $2, $3, $4) RETURNING id`,
      [DEMO_USER.name, DEMO_USER.email, hashedPassword, DEMO_USER.currency],
    );

    const userId = userResult.rows[0].id;
    console.log(`Adding ${defaultCategories.length} default categories...`);
    for (const cat of defaultCategories) {
      await client.query(
        `INSERT INTO categories (user_id, type, name, icon, color, is_default)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (user_id, name) DO NOTHING`,
        [userId, cat.type, cat.name, cat.icon, cat.color],
      );
    }

    const catRes = await client.query(
      `
      SELECT id, name FROM categories WHERE user_id=$1
      `,
      [userId],
    );
    const catMap = {};
    catRes.rows.forEach((cat) => {
      catMap[cat.name] = cat.id;
    });

    const transactions = generateTransactions(catMap);
    console.log(
      `Inserting ${transactions.length} transactions accross 12 months...`,
    );

    const placeholders = [];
    const params = [];
    transactions.forEach((t, i) => {
      const base = i * 6;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`,
      );
      params.push(
        userId,
        t.categoryId,
        t.amount,
        t.type,
        t.description,
        t.date,
      );
    });
    if (placeholders.length > 0) {
      await client.query(
        `INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date) VALUES ${placeholders.join(", ")}`,
        params,
      );
    }

    const today = new Date();
    const monthStartStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

    console.log(`Insering ${BUDGETS.length} budgets...`);
    for (const b of BUDGETS) {
      await client.query(
        `INSERT INTO budgets (user_id, category_id, amount, period, start_date)
        VALUES ($1, $2, $3, 'monthly', $4)`,
        [userId, catMap[b.name], b.amount, monthStartStr],
      );
    }

    await client.query("COMMIT");
    console.log("");
    console.log("Demo data seeded successfully");
    console.log("");
    console.log(" Email: [EMAIL_ADDRESS]");
    console.log(" Password: password123 ");
    console.log("");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error seeding database:", error);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
