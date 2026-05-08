// ─── Shared durable store ─────────────────────────────────────────────────
// Backing strategy mirrors elementum-translator / sap-me5a-smoke:
//   1. Upstash Redis (KV) when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//      (or KV_REST_API_URL + KV_REST_API_TOKEN) env vars are set.
//      State survives cold starts and is shared across serverless instances.
//   2. globalThis fallback for local dev without KV provisioning.
//
// One key (`procurement-demo:prs:v1`) holds the full purchase requests array.

import { Redis } from '@upstash/redis';

const STORE_KEY = 'procurement-demo:prs:v1';

// ── KV plumbing ─────────────────────────────────────────────────────────────

function kvEnabled() {
  const url   = process.env.UPSTASH_REDIS_REST_URL   ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

let redisSingleton = null;
function getRedis() {
  if (redisSingleton) return redisSingleton;
  redisSingleton = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL   ?? process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
  });
  return redisSingleton;
}

// ── Seed data ────────────────────────────────────────────────────────────────

function seedPRs() {
  return [
    { pr_id: 'PR-1096', description: 'AWS Credits Q1',       vendor_name: 'Amazon Web Services',   vendor_id: 'amazon',   amount: 8000.00, quantity: 1,  requestor: 'J. DAVIS',      status: 'AUTO_APPROVED',     source: 'MANUAL', created_at: '2024-11-12T09:14:00', line_items: [] },
    { pr_id: 'PR-1095', description: 'Lab Supplies — Q4',    vendor_name: 'Thermo Fisher Scientific', vendor_id: 'thermo', amount: 3200.00, quantity: 1,  requestor: 'M. CHEN',       status: 'PENDING_APPROVAL',  source: 'MANUAL', created_at: '2024-11-11T14:22:00', line_items: [] },
    { pr_id: 'PR-1094', description: 'IT Equipment Refresh', vendor_name: 'Dell Technologies',     vendor_id: 'dell',     amount: 12400.00, quantity: 1, requestor: 'T. RODRIGUEZ',  status: 'PENDING_APPROVAL',  source: 'MANUAL', created_at: '2024-11-12T08:30:00', line_items: [] },
    { pr_id: 'PR-1093', description: 'Office Supplies Nov',  vendor_name: 'Staples Business',      vendor_id: 'staples',  amount: 892.50,  quantity: 1,  requestor: 'A. PATEL',      status: 'AUTO_APPROVED',     source: 'MANUAL', created_at: '2024-11-11T11:03:00', line_items: [] },
    { pr_id: 'PR-1092', description: 'MRO Supplies',         vendor_name: 'Grainger',              vendor_id: 'grainger', amount: 1440.00, quantity: 1,  requestor: 'K. WILLIAMS',   status: 'AUTO_APPROVED',     source: 'MANUAL', created_at: '2024-11-11T09:00:00', line_items: [] },
    { pr_id: 'PRCRQ-70', description: 'BIC Round Stic Ballpoint Pens, Medium Point, Black, 60-Count', vendor_name: 'Amazon Business', vendor_id: 'amazon', amount: 89.90, quantity: 10, requestor: 'TIM KIM', status: 'Submitted',    source: 'PUNCHOUT', created_at: '2026-04-15T00:00:00', line_items: [{name:'BIC Pens',qty:10,price:8.99}] },
    { pr_id: 'PRCRQ-69', description: 'Ballpoint pens',      vendor_name: 'Amazon Business',       vendor_id: 'amazon',   amount: 89.90,  quantity: 10, requestor: 'TIM KIM',       status: 'Cart Received',     source: 'PUNCHOUT', created_at: '2026-04-15T00:00:00', line_items: [{name:'Ballpoint pens',qty:10,price:8.99}] },
  ];
}

// ── Load / save ──────────────────────────────────────────────────────────────

async function loadPRs() {
  if (kvEnabled()) {
    const existing = await getRedis().get(STORE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) return existing;
    const seeded = seedPRs();
    await getRedis().set(STORE_KEY, seeded);
    return seeded;
  }
  if (!globalThis._elementumPRs) globalThis._elementumPRs = seedPRs();
  return globalThis._elementumPRs;
}

async function savePRs(prs) {
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, prs);
    return;
  }
  globalThis._elementumPRs = prs;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function listPRs() {
  return loadPRs();
}

export async function createPR(data) {
  const all = await loadPRs();
  all.unshift(data); // newest first
  await savePRs(all);
  return data;
}

export async function resetPRs() {
  const seeded = seedPRs();
  await savePRs(seeded);
  return seeded;
}

// ── Legacy in-memory store (kept for other handlers that use store.*) ────────

const defaultData = () => ({
  purchaseRequests: seedPRs(),
  purchaseOrders: [
    { po_number: 'PO-2024-0891', pr_id: 'PR-1096', vendor_id: 'amazon',   vendor_name: 'Amazon Business',   amount: 4230.00, currency: 'USD', payment_terms: 'Net 30', status: 'SENT',      generated_by: 'Elementum AI', created_at: '2024-11-12T09:14:00', delivery_date: '2024-11-18' },
    { po_number: 'PO-2024-0890', pr_id: 'PR-1093', vendor_id: 'staples',  vendor_name: 'Staples Business',  amount: 892.50,  currency: 'USD', payment_terms: 'Net 30', status: 'CONFIRMED', generated_by: 'Elementum AI', created_at: '2024-11-11T14:22:00', delivery_date: '2024-11-15' },
    { po_number: 'PO-2024-0889', pr_id: 'PR-1092', vendor_id: 'grainger', vendor_name: 'Grainger',          amount: 1440.00, currency: 'USD', payment_terms: 'Net 30', status: 'CONFIRMED', generated_by: 'Elementum AI', created_at: '2024-11-11T11:03:00', delivery_date: '2024-11-14' },
  ],
  invoices: [
    { invoice_id: 'INV-4421', vendor_name: 'Staples Business', po_number: 'PO-2024-0890', amount: 892.50,  status: 'MATCHED',     ai_action: 'APPROVED_FOR_PAYMENT', submitted_at: '2024-11-11T15:00:00' },
    { invoice_id: 'INV-4420', vendor_name: 'Grainger',         po_number: 'PO-2024-0889', amount: 1440.00, status: 'MATCHED',     ai_action: 'APPROVED_FOR_PAYMENT', submitted_at: '2024-11-11T12:00:00' },
    { invoice_id: 'INV-4419', vendor_name: 'Amazon Business',  po_number: 'PO-2024-0887', amount: 2100.00, status: 'DISCREPANCY', ai_action: 'FLAGGED_FOR_REVIEW',   submitted_at: '2024-11-09T10:00:00' },
  ],
  flowSessions: [],
  vendors: {
    amazon:   { name: 'Amazon Business',   punchout: true, cxml: true },
    staples:  { name: 'Staples Business',  punchout: true, cxml: true },
    grainger: { name: 'Grainger',          punchout: true, cxml: true },
    thermo:   { name: 'Thermo Fisher',     punchout: true, cxml: true },
    dell:     { name: 'Dell Technologies', punchout: true, cxml: true },
  },
});

if (!globalThis._elementumStore) globalThis._elementumStore = defaultData();
export const store = globalThis._elementumStore;

// ── Utilities ────────────────────────────────────────────────────────────────

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
    routing:           autoApprove ? 'AUTO_APPROVED' : 'PENDING_HUMAN_APPROVAL',
    ai_recommendation: autoApprove ? 'Approve — within threshold.' : 'Route to manager — exceeds $5k threshold.',
  };
}

export function generatePO(pr) {
  const po = {
    po_number: genId('PO'), pr_id: pr.pr_id, vendor_id: pr.vendor_id,
    vendor_name: pr.vendor_name, amount: pr.amount, currency: 'USD',
    payment_terms: 'Net 30', status: 'SENT', generated_by: 'Elementum AI',
    created_at: new Date().toISOString(), delivery_date: new Date(Date.now()+7*86400000).toISOString().slice(0,10),
  };
  store.purchaseOrders.push(po);
  return po;
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
