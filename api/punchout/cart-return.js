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

  // vendor_id/vendor_name/org are optional so existing callers (the original
  // amazon-mock.html) keep working unchanged with the old Amazon defaults.
  const vendorId   = req.body.vendor_id   || 'amazon';
  const vendorName = req.body.vendor_name || 'Amazon Business';
  const org        = req.body.org         || 'presentation-se';
  // FIX (Sept 2026): this used to be hardcoded to 'ACLARE@ELEMENTUM.COM' for
  // every submission, so every punchout completion — no matter who actually
  // ran it — showed up attributed to Xander. The mock pages already know the
  // real requester (the `user` URL param threaded through from the agent's
  // Initiate Punchout call), so it's passed through here instead.
  const requestor  = req.body.requestor   || 'Elementum User';

  const prId    = genId('PR');
  const policy  = aiPolicyCheck(total, vendorId);
  const quantity = items.reduce((s, i) => s + (i.qty || 1), 0);
  const description = items[0]?.name || 'Procurement Request';

  const pr = {
    pr_id:       prId,
    pr_number:   prId,
    source:      'PUNCHOUT_FLOW',
    record_id:   session_id,
    org,
    description,
    vendor_id:   vendorId,
    vendor_name: vendorName,
    amount:      total,
    quantity,
    requestor,
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
