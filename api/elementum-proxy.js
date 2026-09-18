// POST /api/elementum-proxy
// Proxies cart data to Elementum via REST PUT.
// This avoids CORS issues that occur when calling api.elementum.io from the browser.
//
// Request body:
// {
//   "record_id": "PREQ-10",
//   "org": "dev-se" | "presentation-se",   // which org/environment to write back to
//   "payload": { "<fieldId>": "<value>", ... }
// }
//
// ORG-AWARE REWRITE (Sept 2026): this used to always authenticate as
// presentation-se and PUT to its "purchasereqmngmnt" app alias, no matter
// which org's automation actually called /api/punchout/initiate. That meant
// a dev-se punchout session's cart write was silently going to the wrong
// org/app the whole time — separate from (and underneath) the mock page's
// hardcoded return-URL bug. This keys the OAuth client + app alias by `org`
// so each org's session writes to its own app.
 
import { cors } from '../lib/store.js';
 
const TOKEN_URL = 'https://api.elementum.io/oauth/token';
const API_BASE  = 'https://api.elementum.io/v1';
 
const ORG_CONFIG = {
  // Existing, already-working credentials — kept as the default so any
  // caller that doesn't pass `org` yet behaves exactly as before.
  'presentation-se': {
    alias:        'purchasereqmngmnt',
    clientId:     process.env.PRESENTATION_SE_CLIENT_ID     || 'a2f93de77e2619cf38b5e567addf3041',
    clientSecret: process.env.PRESENTATION_SE_CLIENT_SECRET || 'b16bc05979e853262b38f53d1011b766',
  },
  // NEW — needs its own OAuth service-account client with API access to the
  // dev-se "purchaserequests" app. Set these two in Vercel → Project
  // Settings → Environment Variables once that client exists; until then
  // this org fails loudly instead of silently writing to presentation-se.
  'dev-se': {
    alias:        'purchaserequests',
    clientId:     process.env.DEV_SE_CLIENT_ID,
    clientSecret: process.env.DEV_SE_CLIENT_SECRET,
  },
};
 
async function getToken(cfg) {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=client_credentials&client_id=${cfg.clientId}&client_secret=${cfg.clientSecret}&audience=https://api.elementum.io`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('No access token returned: ' + JSON.stringify(data));
  return data.access_token;
}
 
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  const { record_id, payload } = req.body;
  const org = (req.body.org || 'presentation-se').toLowerCase();
  if (!record_id || !payload) {
    return res.status(400).json({ error: 'record_id and payload are required' });
  }
 
  const cfg = ORG_CONFIG[org];
  if (!cfg) {
    return res.status(400).json({ error: `Unknown org "${org}"` });
  }
  if (!cfg.clientId || !cfg.clientSecret) {
    return res.status(500).json({
      error: `No OAuth credentials configured for org "${org}". Set ` +
             `${org.toUpperCase().replace(/-/g, '_')}_CLIENT_ID / _CLIENT_SECRET in Vercel env vars.`,
    });
  }
 
  try {
    const token = await getToken(cfg);
 
    // Use just the handle (e.g. PREQ-10), strip any aspect ID prefix if present
    const handle = record_id.includes(':') ? record_id.split(':').pop() : record_id;
    const elementumUrl = `${API_BASE}/apps/${cfg.alias}/${handle}`;
 
    console.log('Proxying PUT to Elementum:', org, elementumUrl, payload);
 
    const putRes = await fetch(elementumUrl, {
      method:  'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
 
    const putData = await putRes.json();
    console.log('Elementum PUT response:', JSON.stringify(putData));
 
    return res.status(200).json({
      success:   true,
      org,
      status:    putRes.status,
      elementum: putData,
    });
 
  } catch (err) {
    console.error('Elementum proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
 
