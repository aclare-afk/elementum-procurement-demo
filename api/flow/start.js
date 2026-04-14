// POST /api/flow/start  — starts a new procurement flow
// GET  /api/flow/start  — not used, returns 405

const { store, genId, cors } = require('../../lib/store');

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user_id, request_text, cost_center, budget_category } = req.body;
  if (!user_id || !request_text) {
    return res.status(400).json({ error: 'user_id and request_text are required' });
  }

  const keywords  = request_text.toLowerCase();
  const preferred = ['pen','pencil','paper','office','supply','supplies','staple',
                     'folder','notebook','marker','tape','clip','binder','printer']
                    .some(w => keywords.includes(w));

  const flowId = genId("FLOW");
  const session = {
    flow_id:                  flowId,
    user_id,
    request_text,
    cost_center:              cost_center  || "GENERAL",
    budget_category:          budget_category || "Office Supplies",
    status:                   "SEARCHING",
    preferred_supplier_found: preferred,
    suggested_vendor:         preferred ? "amazon" : null,
    suggested_vendor_name:    preferred ? "Amazon Business" : null,
    agent_note:               preferred
      ? `Agent searched catalog for "${request_text}". Preferred supplier Amazon Business found.`
      : `Agent searched catalog for "${request_text}". No preferred supplier — presenting options.`,
    created_at:               new Date().toISOString(),
    pr_id:                    null,
  };

  store.flowSessions.push(session);
  return res.status(201).json(session);
}
