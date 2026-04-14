// GET  /api/approvals   — list pending approvals
// POST /api/approvals/[prId] — approve or deny a PR

const { store, generatePO, cors } = require('../lib/store');

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const parts = req.url.replace('/api/approvals', '').split('/').filter(Boolean);
  const prId  = parts[0];

  // GET /api/approvals — pending list
  if (req.method === 'GET' && !prId) {
    const pending = store.purchaseRequests.filter(p => p.status === 'PENDING_APPROVAL');
    return res.status(200).json({ count: pending.length, results: pending });
  }

  // POST /api/approvals/[prId] — approve or deny
  if (req.method === 'POST' && prId) {
    const pr = store.purchaseRequests.find(p => p.pr_id === prId);
    if (!pr) return res.status(404).json({ error: `PR ${prId} not found` });
    if (!['PENDING_APPROVAL', 'DRAFT'].includes(pr.status)) {
      return res.status(400).json({ error: `PR is not pending approval (current: ${pr.status})` });
    }

    const { action, approver, notes } = req.body;
    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: "action must be 'approve' or 'deny'" });
    }

    if (action === 'approve') {
      pr.status      = "APPROVED";
      pr.approver    = approver;
      pr.approved_at = new Date().toISOString();
      const po       = generatePO(pr);
      pr.po_number   = po.po_number;
      return res.status(200).json({ message: `${prId} approved.`, pr, po });
    } else {
      pr.status      = "DENIED";
      pr.approver    = approver;
      pr.denied_at   = new Date().toISOString();
      pr.denial_notes = notes;
      return res.status(200).json({ message: `${prId} denied.`, pr });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
