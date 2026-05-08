// POST /api/elementum-proxy
// Proxies cart data to Elementum via REST PUT.
// This avoids CORS issues that occur when calling api.elementum.io from the browser.
//
// Request body:
// {
//   "record_id": "PREQ-10",
//   "payload": { "<fieldId>": "<value>", ... }
// }

import { cors } from '../lib/store.js';

const CLIENT_ID     = 'a1b36864d082d06eb6fd1cc545d3633f';
const CLIENT_SECRET = '40c4536700f9f3bcc10f5b518ba43a02';
const TOKEN_URL     = 'https://api.elementum.io/oauth/token';
const API_BASE      = 'https://api.elementum.io/v1';
const ALIAS         = 'purchasereqmngmnt';

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
    const token = await getToken();

    // Use just the handle (e.g. PREQ-10), strip any aspect ID prefix if present
    const handle = record_id.includes(':') ? record_id.split(':').pop() : record_id;
    const elementumUrl = `${API_BASE}/apps/${ALIAS}/${handle}`;

    console.log('Proxying PUT to Elementum:', elementumUrl, payload);

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
      status:    putRes.status,
      elementum: putData,
    });

  } catch (err) {
    console.error('Elementum proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
