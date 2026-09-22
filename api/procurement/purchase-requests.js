// GET  /api/procurement/purchase-requests  — list all PRs
// POST /api/procurement/purchase-requests  — return the PR number for the
//   "Submit Procurement Request" Elementum automation's "Call Procurement
//   System" task.
//
// FIX (Sept 2026): this used to also write a second, parallel PR entry into
// the shared store via createPR(), hardcoded to Amazon Business regardless
// of which supplier the punchout flow actually used. Dropped entirely —
// api/punchout/cart-return.js already writes the real row.
//
// FIX 2 (Sept 2026): minting a fresh PR number here meant the Elementum
// record (and its PR URL) carried a DIFFERENT number than the row
// cart-return.js wrote — so sap-procurement.html?pr=... showed "not found
// in current list" for every punchout run. Now we look up the existing
// punchout row by record_id and return ITS pr_number; we only mint a new
// number when no punchout row exists.

import { listPRs, genId, cors } from '../../lib/store.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const prs = await listPRs();
    return res.status(200).json({ count: prs.length, results: prs });
  }

  if (req.method === 'POST') {
    const record_id = req.body && req.body.record_id;
    if (record_id && record_id !== '$record_id') {
      const prs = await listPRs();
      const matches = prs.filter(p => p.record_id === record_id);
      if (matches.length > 0) {
        // newest first, in case the same record punched out more than once
        matches.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return res.status(200).json({ pr_number: matches[0].pr_number, status: 'pending_approval' });
      }
    }
    const prNumber = genId('PR');
    return res.status(200).json({ pr_number: prNumber, status: 'pending_approval' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
