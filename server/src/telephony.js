// Pluggable click-to-call providers. Configure via the Integrations page in the app
// (stored in the DB) or via server/.env — DB settings win when both are present.
// Every provider exposes the same shape: placeCall({ toNumber, agentNumber, leadId }, dbConfig)
//   -> { provider, status, sid, message }

export function resolveTelephonyConfig(dbConfig) {
  return {
    provider: dbConfig?.provider || process.env.TELEPHONY_PROVIDER || 'mock',
    sarv: {
      userId: dbConfig?.sarv?.userId || process.env.SARV_USER_ID || '',
      token: dbConfig?.sarv?.token || process.env.SARV_TOKEN || '',
    },
    twilio: {
      accountSid: dbConfig?.twilio?.accountSid || process.env.TWILIO_ACCOUNT_SID || '',
      authToken: dbConfig?.twilio?.authToken || process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: dbConfig?.twilio?.fromNumber || process.env.TWILIO_FROM_NUMBER || '',
      twimlUrl: dbConfig?.twilio?.twimlUrl || process.env.TWILIO_TWIML_URL || '',
    },
    exotel: {
      sid: dbConfig?.exotel?.sid || process.env.EXOTEL_SID || '',
      apiKey: dbConfig?.exotel?.apiKey || process.env.EXOTEL_API_KEY || '',
      apiToken: dbConfig?.exotel?.apiToken || process.env.EXOTEL_API_TOKEN || '',
      callerId: dbConfig?.exotel?.callerId || process.env.EXOTEL_CALLER_ID || '',
      agentNumber: dbConfig?.exotel?.agentNumber || process.env.EXOTEL_AGENT_NUMBER || '',
      subdomain: dbConfig?.exotel?.subdomain || process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
    },
  };
}

async function mockProvider({ toNumber, agentNumber }) {
  return {
    provider: 'mock',
    status: 'initiated',
    sid: 'mock_' + Date.now(),
    message: `Simulated call: agent ${agentNumber || '(none)'} → customer ${toNumber}. Configure a real provider on the Integrations page to place live calls.`,
  };
}

// Sarv / DeepCall click-to-call: connects the agent's phone to the customer's phone.
async function sarvProvider({ toNumber, agentNumber, config }) {
  const { userId, token } = config.sarv;
  if (!userId || !token) {
    throw new Error('Sarv is not configured yet. Add your User ID and Token on the Integrations page.');
  }
  if (!agentNumber) {
    throw new Error("This lead's owner has no phone number on file. Add one in User Management before calling.");
  }
  const url = new URL('https://v4-api.deepcall.com/api/v3/clickToCall/para');
  url.searchParams.set('user_id', userId);
  url.searchParams.set('token', token);
  url.searchParams.set('callFirst', 'agent');
  url.searchParams.set('customer', toNumber);
  url.searchParams.set('agentType', 'agent_number');
  url.searchParams.set('agent_number', agentNumber);

  const res = await fetch(url, { method: 'POST', headers: { 'cache-control': 'no-cache' } });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(data.message || data.msg || `Sarv call failed (${res.status})`);
  return {
    provider: 'sarv',
    status: data.status || data.Status || 'initiated',
    sid: data.call_id || data.callid || data.id || 'sarv_' + Date.now(),
    message: data.message || data.msg || `Call connecting agent ${agentNumber} to ${toNumber} via Sarv`,
  };
}

// https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource
async function twilioProvider({ toNumber, config }) {
  const { accountSid, authToken, fromNumber, twimlUrl } = config.twilio;
  if (!accountSid || !authToken || !fromNumber || !twimlUrl) {
    throw new Error('Twilio is not fully configured yet. Fill in all four fields on the Integrations page.');
  }
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const body = new URLSearchParams({ To: toNumber, From: fromNumber, Url: twimlUrl });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Twilio call failed');
  return { provider: 'twilio', status: data.status, sid: data.sid, message: `Call ${data.status} via Twilio` };
}

// https://developer.exotel.com/api/#connect-two-numbers (click to call)
async function exotelProvider({ toNumber, config }) {
  const { sid, apiKey, apiToken, callerId, agentNumber: exotelAgentNumber, subdomain } = config.exotel;
  if (!sid || !apiKey || !apiToken || !callerId || !exotelAgentNumber) {
    throw new Error('Exotel is not fully configured yet. Fill in all fields on the Integrations page.');
  }
  const auth = Buffer.from(`${apiKey}:${apiToken}`).toString('base64');
  const body = new URLSearchParams({ From: exotelAgentNumber, To: toNumber, CallerId: callerId });
  const res = await fetch(`https://${subdomain}/v1/Accounts/${sid}/Calls/connect.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.RestException?.Message || 'Exotel call failed');
  const call = data.Call || {};
  return { provider: 'exotel', status: call.Status || 'initiated', sid: call.Sid, message: `Call ${call.Status || 'initiated'} via Exotel` };
}

const PROVIDERS = { mock: mockProvider, twilio: twilioProvider, exotel: exotelProvider, sarv: sarvProvider };

export async function placeCall({ toNumber, agentNumber, leadId }, dbConfig) {
  const config = resolveTelephonyConfig(dbConfig);
  const provider = PROVIDERS[config.provider];
  if (!provider) throw new Error(`Unknown telephony provider "${config.provider}". Use one of: ${Object.keys(PROVIDERS).join(', ')}`);
  return provider({ toNumber, agentNumber, leadId, config });
}
