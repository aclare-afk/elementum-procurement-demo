// GET  /api/procurement/purchase-requests  — list all PRs
// POST /api/procurement/purchase-requests  — generate a PR number for the
//   "Submit Procurement Request" Elementum automation's "Call Procurement
//   System" task.
//
// FIX (Sept 2026): this used to also write a second, parallel PR entry into
// the shared store via createPR(), hardcoded to vendor_name: 'Amazon
// Business' / vendor_id: 'amazon' regardless of which supplier the punchout
// flow actually used. That produced a mislabeled duplicate row in the SAP
// mock (sap-procurement.html) alongside the correct entry that
// api/punchout/cart-return.js already writes for the same PR. Nothing
// downstream of this endpoint (Update Record Fields / Notify Requestor /
// Create Record in the automation) reads anything from the store write —
// they only consume this response's pr_number/status — so the store write
// is dropped entirely rather than threading real vendor data through it.

import { listPRs, genId, cors } from '../../lib/store.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const prs = await listPRs();
    return res.status(200).json({ count: prs.length, results: prs });
  }

  if (req.method === 'POST') {
    // record_id/requester/item/quantity/amount/cost_center arrive here but
    // are no longer persisted — the real PR record (with correct vendor
    // data) is already created by api/punchout/cart-return.js. This call
    // just needs to hand the automation a PR number and status to stamp
    // back onto the Elementum record and PO.
    const prNumber = genId('PR');

    return res.status(200).json({ pr_number: prNumber, status: 'pending_approval' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
