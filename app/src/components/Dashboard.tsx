import { useMemo } from 'react';
import { useApp } from '../store/AppStore';
import { NOW, STAGE_ORDER, getStage } from '../data/constants';
import { formatDateTime, followupStatus, isSameDay } from '../data/format';

export function Dashboard() {
  const { state, myLeads, openLead, goLeads } = useApp();

  const todayDisplay = useMemo(
    () => new Date(NOW).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  );

  const firstName = (state.currentUser?.name || '').split(' ')[0] || 'there';

  // Org-wide stats (scoped by the server to whatever this user is allowed to see — every
  // lead for most roles, or their hierarchy tree if Hierarchy is on for them).
  const allLeads = state.leads;
  const funnel = STAGE_ORDER.map((id) => ({ label: getStage(id).label, dot: getStage(id).dot, count: allLeads.filter((l) => l.stage === id).length }));
  const sourceBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of allLeads) counts.set(l.source || 'Unknown', (counts.get(l.source || 'Unknown') || 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [allLeads]);
  const agentPerformance = useMemo(() => {
    const rows = state.users.map((u) => {
      const owned = allLeads.filter((l) => l.owner === u.name);
      const sales = owned.filter((l) => l.sale);
      return { name: u.name, leads: owned.length, sales: sales.length };
    });
    return rows.filter((r) => r.leads > 0 || r.sales > 0).sort((a, b) => b.sales - a.sales || b.leads - a.leads).slice(0, 8);
  }, [allLeads, state.users]);
  const salesThisMonth = useMemo(() => {
    const now = new Date(NOW);
    const sold = allLeads.filter((l) => {
      if (!l.sale?.saleDate) return false;
      const d = new Date(l.sale.saleDate);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const revenue = sold.reduce((sum, l) => sum + (parseFloat(l.sale?.amount || '0') || 0) * (l.sale?.quantity || 1), 0);
    return { count: sold.length, revenue };
  }, [allLeads]);

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
      <h1 style={{ margin: '0 0 4px', fontSize: 30 }}>Good afternoon, {firstName}</h1>
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

      <div style={{ marginTop: 48 }}>
        <h3 style={{ margin: '0 0 20px' }}>Overview</h3>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 32 }}>
          <StatCard label="Total Leads" value={allLeads.length} labelColor="var(--color-accent-700)" />
          <StatCard label="Sales This Month" value={salesThisMonth.count} labelColor="var(--color-accent-700)" />
          <StatCard label="Revenue This Month" value={salesThisMonth.revenue} labelColor="var(--color-accent-700)" prefix="₹" />
        </div>

        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h4 style={{ margin: '0 0 16px' }}>Conversion funnel</h4>
            {funnel.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                  {s.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.count}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <h4 style={{ margin: '0 0 16px' }}>Leads by source</h4>
            {sourceBreakdown.length > 0 ? (
              sourceBreakdown.map(([source, count]) => (
                <div key={source} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <div style={{ fontSize: 13 }}>{source}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{count}</div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>No leads yet.</div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <h4 style={{ margin: '0 0 16px' }}>Agent performance</h4>
            {agentPerformance.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontWeight: 400, color: 'var(--color-neutral-600)', paddingBottom: 8 }}>Agent</th>
                    <th style={{ textAlign: 'right', fontWeight: 400, color: 'var(--color-neutral-600)', paddingBottom: 8 }}>Leads</th>
                    <th style={{ textAlign: 'right', fontWeight: 400, color: 'var(--color-neutral-600)', paddingBottom: 8 }}>Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((a) => (
                    <tr key={a.name}>
                      <td style={{ padding: '6px 0' }}>{a.name}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right' }}>{a.leads}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>{a.sales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>No leads assigned yet.</div>
            )}
          </div>
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

function StatCard({ label, value, labelColor, prefix }: { label: string; value: number; labelColor: string; prefix?: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '22px 26px', minWidth: 210, flex: 1 }}>
      <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: labelColor, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 34, fontWeight: 600 }}>
        {prefix}
        {value.toLocaleString('en-IN')}
      </div>
    </div>
  );
}
