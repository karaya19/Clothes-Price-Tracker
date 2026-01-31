import express from "express";
const router = express.Router();
import scheduleProductCheck from "../scheduler/schedule-product-check.js";

router.post("/run", async (req, res, next) => {
  try {
    const result = await scheduleProductCheck();
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
