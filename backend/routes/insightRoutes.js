import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getInsights,
  generateInsight,
} from "../controllers/insightController.js";

const router = express.Router();

router.use(protect);

router.get("/", getInsights);
router.post("/generate", generateInsight);

export default router;
