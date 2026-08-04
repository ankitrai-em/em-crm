// Lead scoring: a 0-100 weighted estimate of how promising a lead is, recomputed on every
// insert/update so it always reflects the lead's current state. Weighted mainly by source,
// then campaign, per the product ask ("major weightage depends on source and then campaign").
// Weights are hardcoded here rather than DB-configurable — deliberately simple for v1, easy
// to retune by editing the maps below.

const SOURCE_WEIGHT = {
  'Referral': 40,
  'Test Ride Page': 38,
  'Test Ride': 38,
  'Inbound Call': 36,
  'Website': 30,
  'Website Kalki Orders': 30,
  'WhatsApp': 26,
  'Facebook Ads': 20,
  'Instagram Ads': 20,
  'ExitIntentLeads': 12,
  'Quick Add': 25,
  'CSV Import': 8,
  'Webhook': 15,
};
const DEFAULT_SOURCE_WEIGHT = 15;

// Any campaign that isn't blank/unknown is worth something; a handful of high-intent
// keywords (sale/offer periods, buy-now pages) score higher than a generic campaign tag.
const CAMPAIGN_KEYWORD_BONUS = ['sale', 'offer', 'buy', 'order', 'diwali', 'monsoon', 'festive'];
const BLANK_CAMPAIGN_VALUES = new Set(['', '—', '-', 'na', 'n/a', 'none']);

function scoreSource(source) {
  if (!source) return DEFAULT_SOURCE_WEIGHT;
  return SOURCE_WEIGHT[source] ?? DEFAULT_SOURCE_WEIGHT;
}

function scoreCampaign(campaign) {
  const normalized = (campaign || '').trim().toLowerCase();
  if (BLANK_CAMPAIGN_VALUES.has(normalized)) return 0;
  const hasKeyword = CAMPAIGN_KEYWORD_BONUS.some((kw) => normalized.includes(kw));
  return hasKeyword ? 20 : 12;
}

function scoreContactCompleteness(lead) {
  let score = 0;
  if (lead.email) score += 5;
  if (lead.city && lead.city !== '—') score += 3;
  if (lead.pin && lead.pin !== '—') score += 2;
  return score;
}

const POSITIVE_DISPOSITION_KEYWORDS = ['interested', 'call back', 'callback'];
const NEGATIVE_DISPOSITION_KEYWORDS = ['not interested', 'wrong number', 'junk'];

function scoreEngagement(lead) {
  if (lead.sale) return 30; // already converted — max engagement signal
  let score = 0;
  if (lead.testRide) score += 15;
  const disp = (lead.disposition || '').toLowerCase();
  if (POSITIVE_DISPOSITION_KEYWORDS.some((kw) => disp.includes(kw))) score += 15;
  if (NEGATIVE_DISPOSITION_KEYWORDS.some((kw) => disp.includes(kw))) score -= 10;
  if (lead.reTriggered) score += 10; // came back on their own — real signal of interest
  if (lead.attempts >= 3 && lead.stage === 5) score -= 5; // repeatedly unreachable
  return score;
}

export function computeLeadScore(lead) {
  const raw = scoreSource(lead.source) + scoreCampaign(lead.campaign) + scoreContactCompleteness(lead) + scoreEngagement(lead);
  return Math.max(0, Math.min(100, Math.round(raw)));
}
