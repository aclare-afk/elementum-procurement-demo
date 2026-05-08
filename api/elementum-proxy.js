// POST /api/elementum-proxy
// Proxies cart data to Elementum via GraphQL mutation (aspectRecordUpdate).
// This avoids CORS issues that occur when calling api.elementum.io from the browser.

import { cors } from '../lib/store.js';

const CLIENT_ID     = 'a2f93de77e2619cf38b5e567addf3041';
const CLIENT_SECRET = 'b16bc05979e853262b38f53d1011b766';
const TOKEN_URL     = 'https://api.elementum.io/oauth/token';
const GRAPHQL_URL   = 'https://api.elementum.io/graphql';
const ASPECT_ID     = '70dd3608-9f1f-4cae-8677-0a9217fe7538';

// Stage picklist option UUIDs
const STAGE_IDS = {
  'Intake':        '3e0806db-f50f-429c-a3d1-159369547941',
  'Shopping':      '2a8827ce-260f-4e1a-9291-a3c95a661a26',
  'Cart Received': '201f20b2-bc3c-42ee-8bab-7e2f506a6906',
  'Complete':      '75beb257-21aa-4d6e-84ad-e45d16d5b529',
};

const STAGE_FIELD_ID = '04caec9a-de87-4e92-aa91-86a017c5ba8e';

const MUTATION = `
  mutation UpdateRecord($id: ID!, $data: AspectRecordData!) {
    aspectRecordUpdate(id: $id, input: $data) {
      __typename
      id
      ... on AppRecord {
        stage { id }
      }
    }
  }
`;

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

    const fullRecordId = record_id.includes(':') ? record_id : `${ASPECT_ID}:${record_id}`;

    // Remap Stage string value to its UUID if present
    const data = { ...payload };
    if (data[STAGE_FIELD_ID] && typeof data[STAGE_FIELD_ID] === 'string') {
      const stageUUID = STAGE_IDS[data[STAGE_FIELD_ID]];
      if (stageUUID) data[STAGE_FIELD_ID] = stageUUID;
    }

    console.log('Calling GraphQL mutation for record:', fullRecordId, data);

    const gqlRes = await fetch(GRAPHQL_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query:     MUTATION,
        variables: { id: fullRecordId, data },
      }),
    });

    const gqlData = await gqlRes.json();
    console.log('Elementum GraphQL response:', JSON.stringify(gqlData));

    if (gqlData.errors) {
      return res.status(400).json({ success: false, errors: gqlData.errors });
    }

    return res.status(200).json({
      success:   true,
      elementum: gqlData.data,
    });

  } catch (err) {
    console.error('Elementum proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
