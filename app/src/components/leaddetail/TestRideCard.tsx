import { useEffect, useState } from 'react';
import type { Dealer, Lead } from '../../types';
import { formatDateTime } from '../../data/format';
import { useApp } from '../../store/AppStore';
import { api } from '../../lib/api';

export function TestRideCard({ lead }: { lead: Lead }) {
  const { state, showToast, openTestRideForm, cancelTestRideForm, updateTestRideForm, saveTestRide } = useApp();
  const form = state.testRideForm;

  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);

  useEffect(() => {
    if (!form.open) return;
    api.getDealerStates().then(setStates).catch((err) => showToast('Could not load states: ' + err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.open]);

  useEffect(() => {
    setCities([]);
    setDealers([]);
    if (!form.state) return;
    api.getDealerCities(form.state).then(setCities).catch((err) => showToast('Could not load cities: ' + err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.state]);

  useEffect(() => {
    setDealers([]);
    if (!form.state || !form.city) return;
    api.getDealers(form.state, form.city).then(setDealers).catch((err) => showToast('Could not load dealers: ' + err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.state, form.city]);

  const selectedDealer = dealers.find((d) => d.id === form.dealerId);

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22 }}>
      <h5 style={{ margin: '0 0 14px' }}>Test Ride</h5>
      {lead.testRide && (
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Dealer:</span> {lead.testRide.dealerName} ({lead.testRide.city}, {lead.testRide.state})
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Phone:</span> {lead.testRide.dealerPhone}
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Address:</span> {lead.testRide.dealerAddress}
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>When:</span> {formatDateTime(lead.testRide.date)}
          </div>
        </div>
      )}
      {!form.open && (
        <button
          style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onClick={openTestRideForm}
        >
          {lead.testRide ? 'Update Test Ride' : 'Book Test Ride'}
        </button>
      )}
      {form.open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Date &amp; time</label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => updateTestRideForm({ date: e.target.value })}
              style={{ width: '100%', maxWidth: 260, minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>State</label>
              <select
                value={form.state}
                onChange={(e) => updateTestRideForm({ state: e.target.value, city: '', dealerId: '' })}
                style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              >
                <option value="">Select state…</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>City</label>
              <select
                value={form.city}
                onChange={(e) => updateTestRideForm({ city: e.target.value, dealerId: '' })}
                disabled={!form.state}
                style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              >
                <option value="">Select city…</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Dealer</label>
            <select
              value={form.dealerId}
              onChange={(e) => updateTestRideForm({ dealerId: e.target.value })}
              disabled={!form.city}
              style={{ width: '100%', maxWidth: 340, minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">Select dealer…</option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          {selectedDealer && (
            <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 10 }}>
              <div>Phone: {selectedDealer.phone}</div>
              <div>Address: {selectedDealer.address}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onClick={() => selectedDealer && saveTestRide(selectedDealer)}
            >
              Save
            </button>
            <button
              style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}
              onClick={cancelTestRideForm}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
