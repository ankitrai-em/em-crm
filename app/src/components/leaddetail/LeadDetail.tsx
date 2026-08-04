import { useState } from 'react';
import { STAGE_ORDER, getStage } from '../../data/constants';
import { formatDate, initials } from '../../data/format';
import { useApp } from '../../store/AppStore';
import { MailIcon, PhoneIcon, PinIcon } from '../icons/Icons';
import { FollowupCard } from './FollowupCard';
import { RemarksCard } from './RemarksCard';
import { TestRideCard } from './TestRideCard';
import { SaleCard } from './SaleCard';
import { ActivityFeed } from './ActivityFeed';
import { ContactEditModal } from '../modals/ContactEditModal';
import { CustomerProfileModal } from '../modals/CustomerProfileModal';
import type { StageId } from '../../types';

export function LeadDetail() {
  const { state, backToLeads, callLead, manualStageChange, openEditContact, openEditCustomerProfile, reassignLead, AGENT_LIST } = useApp();
  const lead = state.leads.find((l) => l.id === state.selectedId);
  const [reassignTo, setReassignTo] = useState('');
  if (!lead) return null;

  const st = getStage(lead.stage);
  const canReassign = state.currentUser?.role === 'Admin' || !!state.rolePermissions?.[state.currentUser?.role as 'Manager' | 'Agent']?.reassignLeads;
  const reassignOptions = ['Unassigned', ...AGENT_LIST.filter((name) => name !== lead.owner)];

  return (
    <div style={{ padding: '12px 48px 80px' }} data-screen-label="Lead Detail">
      <button
        style={{ background: 'transparent', color: 'var(--color-accent)', border: 'none', padding: '6px 4px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        onClick={backToLeads}
      >
        ‹ Back to Leads
      </button>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginTop: 20, flexWrap: 'wrap' }}>
        <div style={{ width: 300, flex: 'none', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-accent-100)', color: 'var(--color-accent-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600 }}>
              {initials(lead.name)}
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px' }}>{lead.name || '[No Name]'}</h3>
              <span style={{ display: 'inline-flex', fontSize: 11, padding: '3px 10px', borderRadius: 3, background: st.bg, color: st.color }}>{st.label}</span>
              {lead.reTriggered && (
                <span style={{ display: 'inline-flex', marginLeft: 6, fontSize: 10, fontWeight: 700, letterSpacing: '.03em', padding: '3px 8px', borderRadius: 3, border: '1px solid var(--color-accent-2)', color: 'var(--color-accent-2-700)' }}>
                  Repeat User
                </span>
              )}
              {lead.disposition && (
                <span style={{ display: 'inline-flex', marginLeft: 6, fontSize: 10, fontWeight: 700, letterSpacing: '.03em', padding: '3px 8px', borderRadius: 3, background: 'var(--color-accent-100)', color: 'var(--color-accent-800)' }}>
                  {lead.disposition}
                  {lead.subDisposition ? ` · ${lead.subDisposition}` : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--color-accent-700)', flex: 'none' }}>
                  <PhoneIcon size={15} />
                </span>
                {lead.phone}
                <button
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-accent)', background: 'var(--color-accent-100)', color: 'var(--color-accent-700)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  onClick={() => callLead(lead.id)}
                >
                  <PhoneIcon size={11} />
                  Call
                </button>
              </div>
              {lead.secondaryPhone && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-accent-700)', flex: 'none' }}>
                    <PhoneIcon size={15} />
                  </span>
                  {lead.secondaryPhone}
                  <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>(secondary)</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--color-accent-700)', flex: 'none' }}>
                  <MailIcon size={15} />
                </span>
                {lead.email || '—'}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--color-accent-700)', flex: 'none' }}>
                  <PinIcon size={15} />
                </span>
                {lead.city}, {lead.pin}
              </div>
            </div>
            <button
              style={{ background: 'transparent', color: 'var(--color-accent-700)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, cursor: 'pointer', width: 'fit-content' }}
              onClick={() => openEditContact(lead.id)}
            >
              Edit contact info
            </button>
          </div>

          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h5 style={{ margin: 0 }}>Lead Properties</h5>
            <PropertyRow label="Owner" value={lead.owner} />
            {canReassign && (
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  style={{ flex: 1, minHeight: 32, padding: '4px 8px', fontSize: 12, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
                >
                  <option value="">Reassign to…</option>
                  {reassignOptions.map((name) => (
                    <option key={name} value={name}>
                      {name === 'Unassigned' ? 'Pool (Unassigned)' : name}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!reassignTo}
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-md)', padding: '4px 12px', fontSize: 12, cursor: reassignTo ? 'pointer' : 'default', opacity: reassignTo ? 1 : 0.5 }}
                  onClick={() => {
                    reassignLead(lead.id, reassignTo);
                    setReassignTo('');
                  }}
                >
                  Go
                </button>
              </div>
            )}
            <PropertyRow label="Source" value={lead.source} />
            <PropertyRow label="Campaign" value={lead.campaign} />
            <PropertyRow label="Created On" value={formatDate(lead.createdOn)} />
            <PropertyRow label="Lead Score" value={String(lead.leadScore)} />
            <PropertyRow label="Attempts" value={String(lead.attempts)} />
            {Object.entries(lead.meta || {}).map(([key, value]) => (
              <PropertyRow key={key} label={key} value={String(value)} />
            ))}
          </div>

          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h5 style={{ margin: 0 }}>Customer Profile</h5>
              <button
                style={{ background: 'transparent', color: 'var(--color-accent-700)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}
                onClick={() => openEditCustomerProfile(lead.id)}
              >
                Edit
              </button>
            </div>
            <PropertyRow label="Buying for" value={lead.buyingFor || '—'} />
            <PropertyRow label="Cyclist weight" value={lead.cyclistWeight ? `${lead.cyclistWeight} kg` : '—'} />
            <PropertyRow label="Cyclist height" value={lead.cyclistHeight ? `${lead.cyclistHeight} cm` : '—'} />
            <PropertyRow label="Budget" value={lead.budget ? `₹${lead.budget}` : '—'} />
          </div>

          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Adjust stage manually</label>
            <select
              value={lead.stage}
              onChange={(e) => manualStageChange(parseInt(e.target.value, 10) as StageId)}
              style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            >
              {STAGE_ORDER.map((id) => (
                <option key={id} value={id}>
                  {getStage(id).label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 440, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <FollowupCard lead={lead} />
          <RemarksCard />
          <TestRideCard lead={lead} />
          <SaleCard lead={lead} />
          <ActivityFeed lead={lead} />
        </div>
      </div>
      <ContactEditModal />
      <CustomerProfileModal />
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--color-neutral-600)' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
