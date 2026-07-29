// Pluggable click-to-call providers. Set TELEPHONY_PROVIDER in .env to switch.
// Every provider exposes the same shape: placeCall({ toNumber, leadId }) -> { provider, status, sid, message }

async function mockProvider({ toNumber }) {
  return {
    provider: 'mock',
    status: 'initiated',
    sid: 'mock_' + Date.now(),
    message: `Simulated call to ${toNumber}. Set TELEPHONY_PROVIDER=twilio or exotel in server/.env with real credentials to place live calls.`,
  };
}

// https://www.twilio.com/docs/voice/api/call-resource#create-a-call-resource
async function twilioProvider({ toNumber }) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_TWIML_URL } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER || !TWILIO_TWIML_URL) {
    throw new Error('Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER / TWILIO_TWIML_URL in server/.env');
  }
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams({ To: toNumber, From: TWILIO_FROM_NUMBER, Url: TWILIO_TWIML_URL });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Twilio call failed');
  return { provider: 'twilio', status: data.status, sid: data.sid, message: `Call ${data.status} via Twilio` };
}

// https://developer.exotel.com/api/#connect-two-numbers (click to call)
async function exotelProvider({ toNumber }) {
  const { EXOTEL_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_CALLER_ID, EXOTEL_AGENT_NUMBER, EXOTEL_SUBDOMAIN } = process.env;
  if (!EXOTEL_SID || !EXOTEL_API_KEY || !EXOTEL_API_TOKEN || !EXOTEL_CALLER_ID || !EXOTEL_AGENT_NUMBER) {
    throw new Error('Missing EXOTEL_SID / EXOTEL_API_KEY / EXOTEL_API_TOKEN / EXOTEL_CALLER_ID / EXOTEL_AGENT_NUMBER in server/.env');
  }
  const subdomain = EXOTEL_SUBDOMAIN || 'api.exotel.com';
  const auth = Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString('base64');
  const body = new URLSearchParams({ From: EXOTEL_AGENT_NUMBER, To: toNumber, CallerId: EXOTEL_CALLER_ID });
  const res = await fetch(`https://${subdomain}/v1/Accounts/${EXOTEL_SID}/Calls/connect.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.RestException?.Message || 'Exotel call failed');
  const call = data.Call || {};
  return { provider: 'exotel', status: call.Status || 'initiated', sid: call.Sid, message: `Call ${call.Status || 'initiated'} via Exotel` };
}

const PROVIDERS = { mock: mockProvider, twilio: twilioProvider, exotel: exotelProvider };

export async function placeCall({ toNumber, leadId }) {
  const key = process.env.TELEPHONY_PROVIDER || 'mock';
  const provider = PROVIDERS[key];
  if (!provider) throw new Error(`Unknown TELEPHONY_PROVIDER "${key}". Use one of: ${Object.keys(PROVIDERS).join(', ')}`);
  return provider({ toNumber, leadId });
}
