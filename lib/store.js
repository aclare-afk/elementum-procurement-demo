// ─── Shared in-memory store ───────────────────────────────────────────────
// Uses globalThis so data persists across calls within the same
// Vercel function instance. Seed data always present on cold start.

const defaultData = () => ({
  purchaseRequests: [
    { pr_id: "PR-1096", description: "AWS Credits Q1", vendor_id: "amazon", vendor_name: "Amazon Web Services", amount: 8000.00, budget_category: "Software & Services", requestor: "J. Davis", status: "AUTO_APPROVED", po_number: "PO-2024-0891", source: "MANUAL", ai_policy: { auto_approved: true, routing: "AUTO_APPROVED" }, created_at: "2024-11-12T09:14:00" },
    { pr_id: "PR-1095", description: "Lab Supplies — Q4", vendor_id: "thermo", vendor_name: "Thermo Fisher Scientific", amount: 3200.00, budget_category: "R&D Supplies", requestor: "M. Chen", status: "PENDING_APPROVAL", source: "MANUAL", ai_policy: { auto_approved: false, routing: "PENDING_HUMAN_APPROVAL" }, created_at: "2024-11-11T14:22:00" },
    { pr_id: "PR-1094", description: "IT Equipment Refresh", vendor_id: "dell", vendor_name: "Dell Technologies", amount: 12400.00, budget_category: "IT Infrastructure", requestor: "T. Rodriguez", status: "PENDING_APPROVAL", source: "MANUAL", ai_policy: { auto_approved: false, routing: "PENDING_HUMAN_APPROVAL" }, created_at: "2024-11-12T08:30:00" },
    { pr_id: "PR-1093", description: "Office Supplies Nov", vendor_id: "staples", vendor_name: "Staples Business", amount: 892.50, budget_category: "Office Supplies", requestor: "A. Patel", status: "AUTO_APPROVED", po_number: "PO-2024-0890", source: "MANUAL", ai_policy: { auto_approved: true, routing: "AUTO_APPROVED" }, created_at: "2024-11-11T11:03:00" },
    { pr_id: "PR-1092", description: "MRO Supplies", vendor_id: "grainger", vendor_name: "Grainger", amount: 1440.00, budget_category: "MRO", requestor: "K. Williams", status: "AUTO_APPROVED", po_number: "PO-2024-0889", source: "MANUAL", ai_policy: { auto_approved: true, routing: "AUTO_APPROVED" }, created_at: "2024-11-11T09:00:00" },
  ],
  purchaseOrders: [
    { po_number: "PO-2024-0891", pr_id: "PR-1096", vendor_id: "amazon",   vendor_name: "Amazon Business",   amount: 4230.00, currency: "USD", payment_terms: "Net 30", status: "SENT",      generated_by: "Elementum AI", created_at: "2024-11-12T09:14:00", delivery_date: "2024-11-18" },
    { po_number: "PO-2024-0890", pr_id: "PR-1093", vendor_id: "staples",  vendor_name: "Staples Business",  amount: 892.50,  currency: "USD", payment_terms: "Net 30", status: "CONFIRMED", generated_by: "Elementum AI", created_at: "2024-11-11T14:22:00", delivery_date: "2024-11-15" },
    { po_number: "PO-2024-0889", pr_id: "PR-1092", vendor_id: "grainger", vendor_name: "Grainger",          amount: 1440.00, currency: "USD", payment_terms: "Net 30", status: "CONFIRMED", generated_by: "Elementum AI", created_at: "2024-11-11T11:03:00", delivery_date: "2024-11-14" },
    { po_number: "PO-2024-0888", pr_id: "PR-1091", vendor_id: "dell",     vendor_name: "Dell Technologies", amount: 8000.00, currency: "USD", payment_terms: "Net 30", status: "SENT",      generated_by: "Elementum AI", created_at: "2024-11-10T16:45:00", delivery_date: "2024-11-20" },
  ],
  invoices: [
    { invoice_id: "INV-4421", invoice_number: "INV-4421", vendor_id: "staples",  vendor_name: "Staples Business", po_number: "PO-2024-0890", amount: 892.50,  status: "MATCHED",     match_status: "MATCHED",     match_details: "3-way match passed.", ai_action: "APPROVED_FOR_PAYMENT", submitted_at: "2024-11-11T15:00:00" },
    { invoice_id: "INV-4420", invoice_number: "INV-4420", vendor_id: "grainger", vendor_name: "Grainger",         po_number: "PO-2024-0889", amount: 1440.00, status: "MATCHED",     match_status: "MATCHED",     match_details: "3-way match passed.", ai_action: "APPROVED_FOR_PAYMENT", submitted_at: "2024-11-11T12:00:00" },
    { invoice_id: "INV-4419", invoice_number: "INV-4419", vendor_id: "amazon",   vendor_name: "Amazon Business",  po_number: "PO-2024-0887", amount: 2100.00, status: "DISCREPANCY", match_status: "DISCREPANCY", match_details: "Variance $130.00 exceeds tolerance.", ai_action: "FLAGGED_FOR_REVIEW", submitted_at: "2024-11-09T10:00:00" },
  ],
  flowSessions: [],
  vendors: {
    amazon:   { name: "Amazon Business",   punchout: true, cxml: true },
    staples:  { name: "Staples Business",  punchout: true, cxml: true },
    grainger: { name: "Grainger",          punchout: true, cxml: true },
    thermo:   { name: "Thermo Fisher",     punchout: true, cxml: true },
    dell:     { name: "Dell Technologies", punchout: true, cxml: true },
  },
});

if (!globalThis._elementumStore) {
  globalThis._elementumStore = defaultData();
}
export const store = globalThis._elementumStore;

export function genId(prefix) {
  const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const rand = Math.random().toString(36).slice(2,8).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

export function aiPolicyCheck(amount, vendorId) {
  const vendorApproved = vendorId in store.vendors;
  const autoApprove    = amount <= 5000 && vendorApproved;
  return {
    vendor_approved:   vendorApproved,
    auto_approved:     autoApprove,
    routing:           autoApprove ? "AUTO_APPROVED" : "PENDING_HUMAN_APPROVAL",
    ai_recommendation: autoApprove ? "Approve — within threshold." : "Route to manager — exceeds $5k threshold.",
  };
}

export function generatePO(pr) {
  const po = {
    po_number: genId("PO"), pr_id: pr.pr_id, vendor_id: pr.vendor_id,
    vendor_name: pr.vendor_name, amount: pr.amount, currency: "USD",
    payment_terms: "Net 30", status: "SENT", generated_by: "Elementum AI",
    created_at: new Date().toISOString(),
    delivery_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10),
  };
  store.purchaseOrders.push(po);
  return po;
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
