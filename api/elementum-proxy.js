// POST /api/elementum-proxy
// Proxies the cart data PUT to Elementum API server-side.
// This avoids CORS issues that occur when calling api.elementum.io from the browser.
//
// Request body:
// {
//   "record_id": "PRCRQ-30",
//   "payload": { "Vendor": "...", "Item Description": "...", ... }
// }

import { cors } from '../lib/store.js';

const CLIENT_ID     = 'd0915e212254e98514012b0e15df7e4d';
const CLIENT_SECRET = '37463afccdf454a802055009f2d0e600';
const TOKEN_URL     = 'https://api.elementum.io/oauth/token';
const API_BASE      = 'https://api.elementum.io/v1';
const RECORD_TYPE   = 'apps';
const ALIAS         = 'purchaserequests';

async function getToken() {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&audience=https://api.elementum.io`,
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
  if (!record_id || !payload) {
    return res.status(400).json({ error: 'record_id and payload are required' });
  }

  try {
    // Step 1: Get fresh token server-side (no CORS issues here)
    const token = await getToken();

    // Step 2: PUT to Elementum with the cart payload
    const elementumUrl = `${API_BASE}/${RECORD_TYPE}/${ALIAS}/${record_id}`;
    console.log('Proxying PUT to Elementum:', elementumUrl, payload);

    const putRes  = await fetch(elementumUrl, {
      method:  'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const putData = await putRes.json();
    console.log('Elementum PUT response:', putData);

    return res.status(200).json({
      success:   true,
      status:    putRes.status,
      elementum: putData,
    });

  } catch (err) {
    console.error('Elementum proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
