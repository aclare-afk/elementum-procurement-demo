// GET  /api/procurement/purchase-requests  — list all PRs
// POST /api/procurement/purchase-requests  — create a PR (Tim's contract)

import { listPRs, createPR, genId, aiPolicyCheck, generatePO, cors, store } from '../../lib/store.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const prs = await listPRs();
    return res.status(200).json({ count: prs.length, results: prs });
  }

  if (req.method === 'POST') {
    const { record_id } = req.body;
    const requester = req.body.requester && req.body.requester !== 'null' ? req.body.requester : 'Elementum User';
    const item      = req.body.item      && req.body.item      !== 'null' ? req.body.item      : 'Procurement Request';
    const amount    = req.body.amount    && req.body.amount    !== 'null' ? parseFloat(req.body.amount) : 0;
    const quantity  = req.body.quantity  && req.body.quantity  !== 'null' ? parseInt(req.body.quantity) : 1;

    const prNumber = genId('PR');
    const policy   = aiPolicyCheck(amount, 'amazon');

    const pr = {
      pr_id:       prNumber,
      pr_number:   prNumber,
      source:      'TIM_FLOW',
      record_id:   record_id || null,
      description: item,
      vendor_name: 'Amazon Business',
      vendor_id:   'amazon',
      amount,
      quantity,
      requestor:   requester,
      status:      'pending_approval',
      ai_policy:   policy,
      line_items:  [],
      created_at:  new Date().toISOString(),
    };

    await createPR(pr);

    return res.status(200).json({ pr_number: prNumber, status: 'pending_approval' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
