// POST /api/punchout/cart-return
// Called by amazon-mock.html when user submits their cart back to Elementum.

import { store, genId, aiPolicyCheck, generatePO, cors, createPR } from '../../lib/store.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id, items, total } = req.body;
  if (!session_id || !items || total === undefined) {
    return res.status(400).json({ error: 'session_id, items, and total are required' });
  }

  const prId    = genId('PR');
  const policy  = aiPolicyCheck(total, 'amazon');
  const quantity = items.reduce((s, i) => s + (i.qty || 1), 0);
  const description = items[0]?.name || 'Procurement Request';

  const pr = {
    pr_id:       prId,
    pr_number:   prId,
    source:      'PUNCHOUT_FLOW',
    record_id:   session_id,
    description,
    vendor_id:   'amazon',
    vendor_name: 'Amazon Business',
    amount:      total,
    quantity,
    requestor:   'ACLARE@ELEMENTUM.COM',
    status:      policy.auto_approved ? 'AUTO_APPROVED' : 'pending_approval',
    ai_policy:   policy,
    line_items:  items,
    created_at:  new Date().toISOString(),
  };

  if (policy.auto_approved) {
    const po = generatePO(pr);
    pr.po_number = po.po_number;
  }

  // Save to Upstash-backed durable store
  await createPR(pr);

  return res.status(201).json({
    message:       `Cart received. Requisition ${prId} created.`,
    flow_id:       session_id,
    pr_id:         prId,
    pr_status:     pr.status,
    amount:        total,
    quantity,
    items,
    po_number:     pr.po_number || null,
    auto_approved: policy.auto_approved,
  });
}
