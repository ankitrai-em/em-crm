import { useState } from 'react';
import type { Lead } from '../../types';
import { useApp } from '../../store/AppStore';
import { apiBaseUrl } from '../../lib/api';
import { formatDate } from '../../data/format';
import { UploadIcon } from '../icons/Icons';

const AUDIT_LABEL: Record<string, string> = { pending: 'Audit pending', successful: 'Audit successful', rejected: 'Audit rejected' };
const AUDIT_COLOR: Record<string, string> = { pending: 'var(--color-neutral-600)', successful: 'var(--color-accent-700)', rejected: 'var(--color-accent-2-700)' };

export function SaleCard({ lead }: { lead: Lead }) {
  const { state, openSaleForm, cancelSaleForm, setSaleDocs, updateSaleForm, toggleSaleAccessory, onInvoiceFile, saveSale, auditSale } = useApp();
  const form = state.saleForm;
  const hasInvoice = !!(lead.sale && lead.sale.invoiceNo);
  const missingInvoice = !!(lead.sale && !lead.sale.invoiceNo);
  const isAdmin = state.currentUser?.role === 'Admin';
  const isPending = !!lead.sale && (lead.sale.auditStatus === 'pending' || !lead.sale.auditStatus);
  const [rejectNote, setRejectNote] = useState('');

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22 }}>
      <h5 style={{ margin: '0 0 14px' }}>Sale</h5>
      {lead.sale && (
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Model:</span> {lead.sale.modelRange} / {lead.sale.modelSku} / {lead.sale.modelColour}
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Amount:</span> ₹{lead.sale.amount} × {lead.sale.quantity}
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Sale date:</span> {lead.sale.saleDate ? formatDate(lead.sale.saleDate) : '—'}
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Source:</span> {lead.sale.saleSource}{lead.sale.sourceName ? ` — ${lead.sale.sourceName}` : ''}
          </div>
          {lead.sale.accessories.length > 0 && (
            <div>
              <span style={{ color: 'var(--color-neutral-600)' }}>Accessories:</span> {lead.sale.accessories.join(', ')}
            </div>
          )}
          {hasInvoice && (
            <div>
              <span style={{ color: 'var(--color-neutral-600)' }}>Invoice:</span> {lead.sale.invoiceNo} —{' '}
              {lead.sale.fileUrl ? (
                <a href={`${apiBaseUrl}${lead.sale.fileUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent-700)' }}>
                  {lead.sale.fileName}
                </a>
              ) : (
                lead.sale.fileName
              )}
            </div>
          )}
          {!hasInvoice && !missingInvoice && <div style={{ color: 'var(--color-neutral-600)' }}>No invoice uploaded.</div>}
          {missingInvoice && <div style={{ color: 'var(--color-accent-2-700)', fontWeight: 600 }}>Documents pending</div>}
          <div style={{ fontWeight: 600, color: AUDIT_COLOR[lead.sale.auditStatus] }}>
            {AUDIT_LABEL[lead.sale.auditStatus]}
            {lead.sale.auditStatus === 'rejected' && lead.sale.auditNote ? ` — ${lead.sale.auditNote}` : ''}
          </div>
          {isAdmin && isPending && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4, padding: 12, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-neutral-600)', width: '100%' }}>Sales Audit</span>
              <button
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                onClick={() => auditSale(lead.id, 'successful', '')}
              >
                Mark Successful
              </button>
              <input
                type="text"
                placeholder="Rejection note…"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                style={{ fontSize: 12, padding: '5px 8px', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', width: 160 }}
              />
              <button
                style={{ background: 'transparent', color: 'var(--color-accent-2-700)', border: '1px solid var(--color-accent-2)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                onClick={() => auditSale(lead.id, 'rejected', rejectNote)}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}
      {!form.open && (
        <button
          style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onClick={openSaleForm}
        >
          {lead.sale ? 'Update Sale' : 'Mark as Sold'}
        </button>
      )}
      {form.open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: 'fit-content' }}>
            <button
              style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', border: 'none', background: form.docs === 'no' ? 'var(--color-accent-2-600)' : 'var(--color-bg)', color: form.docs === 'no' ? 'var(--color-bg)' : 'var(--color-text)' }}
              onClick={() => setSaleDocs('no')}
            >
              Without docs
            </button>
            <button
              style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', border: 'none', borderLeft: '1px solid var(--color-divider)', background: form.docs === 'yes' ? 'var(--color-accent-600)' : 'var(--color-bg)', color: form.docs === 'yes' ? 'var(--color-bg)' : 'var(--color-text)' }}
              onClick={() => setSaleDocs('yes')}
            >
              With docs
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Model (from Inventory)</label>
            <select
              value={form.inventoryId}
              onChange={(e) => updateSaleForm({ inventoryId: e.target.value })}
              style={{ width: '100%', maxWidth: 360, minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">Select model…</option>
              {state.inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.modelRange} / {i.modelSku} / {i.modelColour}
                </option>
              ))}
            </select>
            {state.inventory.length === 0 && <div style={{ fontSize: 11, color: 'var(--color-accent-2-700)', marginTop: 4 }}>No inventory items yet — add some on the Inventory page.</div>}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Sale amount (₹)</label>
              <input
                type="text"
                value={form.amount}
                onChange={(e) => updateSaleForm({ amount: e.target.value })}
                style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Quantity</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => updateSaleForm({ quantity: e.target.value })}
                style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Sale date</label>
              <input
                type="date"
                value={form.saleDate}
                onChange={(e) => updateSaleForm({ saleDate: e.target.value })}
                style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Sale source</label>
              <select
                value={form.saleSource}
                onChange={(e) => updateSaleForm({ saleSource: e.target.value as typeof form.saleSource })}
                style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              >
                <option value="D2C">D2C</option>
                <option value="Ecom">Ecom</option>
                <option value="Dealer">Dealer</option>
              </select>
            </div>
            {form.saleSource !== 'D2C' && (
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>{form.saleSource} name</label>
                <input
                  type="text"
                  value={form.sourceName}
                  onChange={(e) => updateSaleForm({ sourceName: e.target.value })}
                  style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
            )}
          </div>

          {state.accessories.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Accessories</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {state.accessories.map((a) => (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={form.accessories.includes(a.name)} onChange={() => toggleSaleAccessory(a.name)} />
                    {a.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.docs === 'yes' && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Invoice number</label>
                <input
                  type="text"
                  value={form.invoiceNo}
                  onChange={(e) => updateSaleForm({ invoiceNo: e.target.value })}
                  style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Upload invoice</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px dashed var(--color-divider)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-neutral-600)' }}>
                  <UploadIcon size={15} />
                  {form.uploading ? 'Uploading…' : form.fileName || 'Choose file…'}
                  <input type="file" accept=".pdf,.jpg,.png" disabled={form.uploading} onChange={(e) => onInvoiceFile(e.target.files?.[0])} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onClick={saveSale}
            >
              Save Sale
            </button>
            <button
              style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}
              onClick={cancelSaleForm}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
