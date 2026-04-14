// GET /api/vendors — list all vendors

const { store, cors } = require('../lib/store');

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(200).json({ count: Object.keys(store.vendors).length, vendors: store.vendors });
}
