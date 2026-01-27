import { Router } from "express";
import { createReport, verifyReport } from "./reports.controller";

const router = Router();

router.post("/verify", verifyReport);

export default router;
