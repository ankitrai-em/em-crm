import type { ActivityEntry, Lead, StageId } from '../types';
import { CURRENT_AGENT, NOW } from './constants';

// Deterministic PRNG (mulberry32) so the seeded sample data renders the
// same 200 leads on every load, matching the original prototype.
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateLeads(): Lead[] {
  const rng = mulberry32(42);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const names = ['Sachin Dantwar', 'Surya Das', 'Ashish Bera', 'Ravi Kumar', 'Meera Nair', 'Karan Chopra', 'Divya Iyer', 'Rohit Sharma', 'Ananya Gupta', 'Vikram Singh', 'Priya Menon', 'Arjun Reddy', 'Neha Kulkarni', 'Suresh Pillai', 'Kavita Joshi', 'Manoj Tiwari', 'Pooja Shetty', 'Rahul Verma', 'Sneha Bhat', 'Amit Yadav', 'Ritu Malhotra', 'Deepak Rao', 'Swati Desai', 'Nikhil Bansal', 'Anjali Nambiar', 'Harish Chandra', 'Lakshmi Narayan', 'Gaurav Sethi', 'Isha Kapoor', 'Faisal Khan'];
  const cities = [{ city: 'Chennai', pin: '600102' }, { city: 'Bengaluru', pin: '560041' }, { city: 'Ludhiana', pin: '141003' }, { city: 'Noida', pin: '201301' }, { city: 'Ernakulam', pin: '682037' }, { city: 'Mumbai', pin: '400104' }, { city: 'Pune', pin: '411045' }, { city: 'Hyderabad', pin: '500081' }, { city: 'Jaipur', pin: '302017' }, { city: 'Delhi', pin: '110085' }, { city: 'Ahmedabad', pin: '380015' }, { city: 'Nagpur', pin: '440010' }];
  const sources = ['Website', 'Facebook Ads', 'Instagram Ads', 'WhatsApp', 'Test Ride Page', 'Inbound Call', 'Referral', 'ExitIntentLeads'];
  const campaigns = ['Summer Ride 24', 'Diwali Dhamaka', 'Zero Down EMI', 'Monsoon Sale', 'Republic Day Offer', 'College Fest Drive', 'Always-On Search'];
  const agents = ['Aditya Narayan', 'Shreya Raj', 'Preeti Vankhede', 'Deep Malakar', 'Dip Roy', 'Shweta Madel', 'Yash Pawar'];
  const models = ['X2 Sea Green', 'X1 Jet Black', 'T-Rex+ Charcoal', 'Doodle V3 Red', 'EMX Trail White', 'S1 Neo Blue'];
  const stores = ['MG Road Experience Store', 'Whitefield Hub', 'Andheri West Showroom', 'Salt Lake Studio', 'Anna Nagar Store'];
  const noAnswerDispositions = ['Not Reachable', 'Switched Off', 'Busy', 'Ringing - No Response'];
  const stageWeights: [StageId, number][] = [[1, 0.34], [2, 0.2], [3, 0.11], [4, 0.09], [5, 0.08], [6, 0.07], [7, 0.05], [8, 0.06]];
  const pickStage = (): StageId => {
    let r = rng();
    let acc = 0;
    for (const [id, w] of stageWeights) {
      acc += w;
      if (r <= acc) return id;
    }
    return 1;
  };

  const leads: Lead[] = [];
  for (let i = 0; i < 200; i++) {
    const stage = pickStage();
    const hasName = rng() > 0.22;
    const nm = hasName ? names[i % names.length] : null;
    const cityInfo = pick(cities);
    const daysAgo = Math.floor(rng() * 90);
    const createdOn = NOW - daysAgo * 86400000 - Math.floor(rng() * 80000) * 1000;
    const owner = pick(agents);
    const phone = '+91-9' + String(Math.floor(rng() * 900000000) + 100000000).slice(0, 8);
    let followupAt: number | null = null;
    if ([2, 3, 4, 5, 6].includes(stage) && rng() > 0.15) {
      const offsetDays = Math.floor(rng() * 8) - 3;
      followupAt = NOW + offsetDays * 86400000 + Math.floor(rng() * 10) * 3600000;
    }
    let taskDate: number | null = null;
    if (stage <= 6) {
      const offsetDays = Math.floor(rng() * 13) - 5;
      taskDate = NOW + offsetDays * 86400000 + Math.floor(rng() * 10) * 3600000;
    }
    const reTriggered = stage <= 5 && rng() > 0.85;
    const attempts = stage === 1 ? 0 : stage === 5 ? 3 : Math.min(2, Math.floor(rng() * 3));
    const source = pick(sources);
    const activity: ActivityEntry[] = [{ ts: createdOn, kind: 'note', text: 'Lead captured from ' + source }];
    for (let c = 0; c < attempts; c++) {
      const callTs = createdOn + (c + 1) * 3600000 * (4 + Math.floor(rng() * 20));
      const dur = 5 + Math.floor(rng() * 50);
      activity.unshift({ ts: callTs, kind: 'call', connected: false, text: 'Outbound Call: Did not answer a call by ' + owner + ' through ' + phone + '.', duration: dur, remarks: pick(noAnswerDispositions) });
    }
    if (stage >= 3) {
      const connDur = stage >= 4 ? 120 + Math.floor(rng() * 180) : 40 + Math.floor(rng() * 70);
      activity.unshift({ ts: createdOn + attempts * 3600000 * 6 + 3600000, kind: 'call', connected: true, text: 'Outbound Call: Was called by ' + owner + ' through ' + phone + '.', duration: connDur, remarks: stage >= 4 ? 'Answered - Interested' : 'Answered - Call Back Later' });
    }
    let testRide: Lead['testRide'] = null;
    let sale: Lead['sale'] = null;
    if (stage >= 6) {
      const trDate = createdOn + 2 * 86400000;
      testRide = { date: trDate, store: pick(stores), dealer: pick(agents) };
      activity.unshift({ ts: trDate, kind: 'note', text: 'Test ride booked at ' + testRide.store });
    }
    if (stage >= 7) {
      const saleDate = createdOn + 4 * 86400000;
      sale = { invoiceNo: stage === 8 ? 'INV-' + (10234 + i) : '', amount: String(28000 + Math.floor(rng() * 40000)), model: pick(models), fileName: stage === 8 ? 'invoice_' + (10234 + i) + '.pdf' : '' };
      activity.unshift({ ts: saleDate, kind: 'note', text: stage === 8 ? 'Sale marked complete with documents' : 'Sale marked complete — documents pending' });
    }
    leads.push({
      id: 'L' + (1000 + i),
      name: nm,
      phone,
      email: nm ? nm.toLowerCase().replace(' ', '.') + '@gmail.com' : '',
      city: cityInfo.city,
      pin: cityInfo.pin,
      source,
      campaign: pick(campaigns),
      createdOn,
      owner,
      stage,
      leadScore: Math.floor(rng() * 80) + (stage >= 6 ? 20 : 0),
      followupAt,
      taskDate,
      reTriggered,
      attempts,
      activity,
      testRide,
      sale,
    });
  }

  let todayCount = 0;
  for (const l of leads) {
    if (l.owner === CURRENT_AGENT && l.stage <= 6 && todayCount < 6) {
      l.taskDate = NOW - (NOW % 3600000) + todayCount * 3600000;
      todayCount++;
    }
  }
  return leads;
}
