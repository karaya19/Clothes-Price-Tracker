import express from "express";
const router = express.Router();
import scheduleProductCheck from "../scheduler/schedule-product-check.js";

router.post("/run", (req, res) => {
  res.json({ ok: true, message: "Job started" });

  scheduleProductCheck().catch(err =>
    console.error("Cron job failed:", err)
  );
});



export default router;
