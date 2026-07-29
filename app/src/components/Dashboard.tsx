import { useMemo } from 'react';
import { useApp } from '../store/AppStore';
import { NOW, STAGE_ORDER, getStage } from '../data/constants';
import { formatDateTime, followupStatus, isSameDay } from '../data/format';

export function Dashboard() {
  const { myLeads, openLead, goLeads } = useApp();

  const todayDisplay = useMemo(
    () => new Date(NOW).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  );

  const statAssignedToday = myLeads.filter((l) => isSameDay(l.createdOn, NOW)).length;
  const statNotAttempted = myLeads.filter((l) => l.stage === 1).length;
  const statSales = myLeads.filter((l) => [7, 8].includes(l.stage)).length;

  const followupsToday = myLeads
    .filter((l) => l.followupAt && ![7, 8].includes(l.stage) && (l.followupAt < NOW || isSameDay(l.followupAt, NOW)))
    .sort((a, b) => (a.followupAt as number) - (b.followupAt as number))
    .slice(0, 8);

  const stageBreakdown = STAGE_ORDER.map((id) => ({
    label: getStage(id).label,
    dot: getStage(id).dot,
    count: myLeads.filter((l) => l.stage === id).length,
  }));

  return (
    <div style={{ padding: '12px 48px 8px' }} data-screen-label="Dashboard">
      <h1 style={{ margin: '0 0 4px', fontSize: 30 }}>Good afternoon, Aditya</h1>
      <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginBottom: 30 }}>
        {todayDisplay} · {myLeads.length} leads in your queue
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 40 }}>
        <StatCard label="Assigned Today" value={statAssignedToday} labelColor="var(--color-accent-700)" />
        <StatCard label="Not Attempted" value={statNotAttempted} labelColor="var(--color-neutral-700)" />
        <StatCard label="Follow-ups Due Today" value={followupsToday.length} labelColor="var(--color-accent-2-700)" />
        <StatCard label="Sales On Book" value={statSales} labelColor="var(--color-accent-700)" />
      </div>

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 420 }}>
          <h4 style={{ margin: '0 0 16px' }}>Follow-ups due &amp; overdue</h4>
          {followupsToday.length > 0 ? (
            followupsToday.map((l) => {
              const tag = followupStatus(l.followupAt, l.stage);
              const tagText = tag === 'overdue' ? 'Overdue' : 'Due today';
              const tagColor = tag === 'overdue' ? 'var(--color-accent-2-700)' : 'var(--color-accent-700)';
              return (
                <div
                  key={l.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 4px',
                    borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)', cursor: 'pointer',
                  }}
                  onClick={() => openLead(l.id)}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{l.name || '[No Name]'}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>
                      {l.city} · {getStage(l.stage).label}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13 }}>{formatDateTime(l.followupAt)}</div>
                    <div style={{ fontSize: 11, marginTop: 2, color: tagColor, fontWeight: 600 }}>{tagText}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', padding: '8px 4px' }}>Nothing due right now — nice work.</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h4 style={{ margin: '0 0 16px' }}>Your pipeline</h4>
          {stageBreakdown.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                {s.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 36 }}>
        <button
          style={{
            background: 'transparent', color: 'var(--color-accent)', border: 'none', padding: '6px 4px',
            fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
          onClick={goLeads}
        >
          View all leads →
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, labelColor }: { label: string; value: number; labelColor: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '22px 26px', minWidth: 210, flex: 1 }}>
      <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: labelColor, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
