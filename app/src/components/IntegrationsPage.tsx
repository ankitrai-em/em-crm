import { useEffect, useState, type CSSProperties } from 'react';
import { useApp } from '../store/AppStore';
import { api, type TelephonyConfig } from '../lib/api';

const EMPTY_CONFIG: TelephonyConfig = {
  provider: 'mock',
  sarv: { userId: '', token: '' },
  twilio: { accountSid: '', authToken: '', fromNumber: '', twimlUrl: '' },
  exotel: { sid: '', apiKey: '', apiToken: '', callerId: '', agentNumber: '', subdomain: 'api.exotel.com' },
};

export function IntegrationsPage() {
  const { state, showToast } = useApp();
  const [config, setConfig] = useState<TelephonyConfig>(EMPTY_CONFIG);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);

  useEffect(() => {
    api
      .getTelephonyIntegration()
      .then((c) => setConfig({ ...EMPTY_CONFIG, ...c, sarv: { ...EMPTY_CONFIG.sarv, ...c.sarv }, twilio: { ...EMPTY_CONFIG.twilio, ...c.twilio }, exotel: { ...EMPTY_CONFIG.exotel, ...c.exotel } }))
      .catch((err) => showToast('Could not load integration settings: ' + err.message))
      .finally(() => setLoading(false));
    api.getWebhookSecret().then((c) => setWebhookSecret(c.secret)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.currentUser?.role !== 'Admin') {
    return (
      <div style={{ padding: '12px 48px 40px' }}>
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Only Admins can manage API integrations.</p>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.saveTelephonyIntegration(config);
      setConfig(saved);
      showToast('Integration saved');
    } catch (err) {
      showToast('Could not save: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveWebhookSecret = async () => {
    setSavingWebhook(true);
    try {
      const saved = await api.saveWebhookSecret(webhookSecret);
      setWebhookSecret(saved.secret);
      showToast(saved.secret ? 'Webhook secret saved' : 'Webhook secret cleared — the webhook is now open');
    } catch (err) {
      showToast('Could not save: ' + (err as Error).message);
    } finally {
      setSavingWebhook(false);
    }
  };

  const generateSecret = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    setWebhookSecret(Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''));
  };

  if (loading) return null;

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Integrations">
      <h2 style={{ margin: '0 0 20px' }}>API Integrations</h2>

      <div style={{ padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', maxWidth: 560 }}>
        <h4 style={{ margin: '0 0 4px' }}>Telephony (Click-to-Call)</h4>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--color-neutral-600)' }}>
          Controls what happens when someone clicks Call on a lead. The customer number always comes from the lead; the agent number comes from that lead's owner in Users.
        </p>

        <label style={fieldLabel}>Provider</label>
        <select
          value={config.provider}
          onChange={(e) => setConfig((c) => ({ ...c, provider: e.target.value as TelephonyConfig['provider'] }))}
          style={{ ...fieldInput, marginBottom: 16 }}
        >
          <option value="mock">Mock (no credentials, simulates calls)</option>
          <option value="sarv">Sarv / DeepCall</option>
          <option value="twilio">Twilio</option>
          <option value="exotel">Exotel</option>
        </select>

        {config.provider === 'sarv' && (
          <>
            <Field label="User ID" value={config.sarv.userId || ''} onChange={(v) => setConfig((c) => ({ ...c, sarv: { ...c.sarv, userId: v } }))} />
            <Field label="Token" value={config.sarv.token || ''} onChange={(v) => setConfig((c) => ({ ...c, sarv: { ...c.sarv, token: v } }))} secret />
          </>
        )}

        {config.provider === 'twilio' && (
          <>
            <Field label="Account SID" value={config.twilio.accountSid || ''} onChange={(v) => setConfig((c) => ({ ...c, twilio: { ...c.twilio, accountSid: v } }))} />
            <Field label="Auth Token" value={config.twilio.authToken || ''} onChange={(v) => setConfig((c) => ({ ...c, twilio: { ...c.twilio, authToken: v } }))} secret />
            <Field label="From Number" value={config.twilio.fromNumber || ''} onChange={(v) => setConfig((c) => ({ ...c, twilio: { ...c.twilio, fromNumber: v } }))} />
            <Field label="TwiML URL" value={config.twilio.twimlUrl || ''} onChange={(v) => setConfig((c) => ({ ...c, twilio: { ...c.twilio, twimlUrl: v } }))} />
          </>
        )}

        {config.provider === 'exotel' && (
          <>
            <Field label="SID" value={config.exotel.sid || ''} onChange={(v) => setConfig((c) => ({ ...c, exotel: { ...c.exotel, sid: v } }))} />
            <Field label="API Key" value={config.exotel.apiKey || ''} onChange={(v) => setConfig((c) => ({ ...c, exotel: { ...c.exotel, apiKey: v } }))} />
            <Field label="API Token" value={config.exotel.apiToken || ''} onChange={(v) => setConfig((c) => ({ ...c, exotel: { ...c.exotel, apiToken: v } }))} secret />
            <Field label="Caller ID" value={config.exotel.callerId || ''} onChange={(v) => setConfig((c) => ({ ...c, exotel: { ...c.exotel, callerId: v } }))} />
            <Field label="Agent Number" value={config.exotel.agentNumber || ''} onChange={(v) => setConfig((c) => ({ ...c, exotel: { ...c.exotel, agentNumber: v } }))} />
            <Field label="Subdomain" value={config.exotel.subdomain || ''} onChange={(v) => setConfig((c) => ({ ...c, exotel: { ...c.exotel, subdomain: v } }))} />
          </>
        )}

        <button
          onClick={save}
          disabled={saving}
          style={{ marginTop: 8, background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div style={{ padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', maxWidth: 560, marginTop: 24 }}>
        <h4 style={{ margin: '0 0 4px' }}>Webhook Security</h4>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--color-neutral-600)' }}>
          Protects <code>/api/leads/webhook</code> — the public endpoint your website posts leads to. When set, every request must include the header{' '}
          <code>X-Webhook-Secret</code> with this value, or it's rejected. Leave blank to keep the webhook open (today's default).
        </p>
        <Field label="Webhook secret" value={webhookSecret} onChange={setWebhookSecret} />
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            onClick={saveWebhookSecret}
            disabled={savingWebhook}
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: savingWebhook ? 'default' : 'pointer', opacity: savingWebhook ? 0.7 : 1 }}
          >
            {savingWebhook ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={generateSecret}
            style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}
          >
            Generate random
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, secret }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={fieldLabel}>{label}</label>
      <input type={secret ? 'password' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} style={fieldInput} />
    </div>
  );
}

const fieldLabel: CSSProperties = { display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' };
const fieldInput: CSSProperties = { width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' };
