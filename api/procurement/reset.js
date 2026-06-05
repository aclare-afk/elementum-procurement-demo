// POST /api/procurement/reset
// Wipes accumulated test/demo records from Redis and restores the seed data.

import { resetPRs, cors } from '../../lib/store.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const seeded = await resetPRs();
  return res.status(200).json({ ok: true, count: seeded.length, message: 'Demo data reset to seed records.' });
}
