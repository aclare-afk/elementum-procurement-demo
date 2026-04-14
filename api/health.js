// GET /api/health — health check

import { cors } from '../lib/store.js';

export default function handler(req, res) {
  cors(res);
  return res.status(200).json({
    platform:  "Elementum Procurement Orchestration",
    version:   "1.0.0",
    status:    "operational",
    ai_engine: "active",
    hosted_on: "Vercel",
  });
}
