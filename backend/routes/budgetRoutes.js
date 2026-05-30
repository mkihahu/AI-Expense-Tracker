import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  analyzeBudgets,
} from "../controllers/budgetController.js";

const router = express.Router();

router.use(protect);

router.get("/", getBudgets);
router.post("/", createBudget);
router.put("/:id", updateBudget);
router.delete("/:id", deleteBudget);
router.post("/analyze", analyzeBudgets);

export default router;
