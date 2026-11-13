const Link = require('../models/Link');
const Click = require('../models/Click');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { serializeLink } = require('../utils/serialize');
const T = require('../utils/timeBuckets');
const { summarize } = require('./linkController');

const sum = (a) => a.reduce((x, y) => x + y, 0);
const pct = (v, total) => (total ? (v / total) * 100 : 0);

async function countByKey(match, unit, tz, keys) {
  const rows = await Click.aggregate([
    { $match: match },
    { $addFields: { k: T.mongoKey(unit, tz) } },
    { $match: { k: { $in: keys } } },
    { $group: { _id: '$k', n: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach((r) => { map[r._id] = r.n; });
  return map;
}

function toWeekly(points) {
  const out = [];
  for (let end = points.length - 1; end >= 0; end -= 7) {
    const start = Math.max(0, end - 6);
    const slice = points.slice(start, end + 1);
    out.unshift({ from: slice[0].from, to: slice[slice.length - 1].from, value: sum(slice.map((p) => p.value)) });
  }
  return out;
}

const SOURCE_KEYS = ['direct', 'search', 'social', 'other'];
const DEVICE_KEYS = ['desktop', 'mobile', 'tablet'];
const BROWSER_KEYS = ['chrome', 'safari', 'firefox', 'edge', 'other'];

function breakdownOf(rows, total) {
  return rows.map((r) => ({ key: r._id, value: r.n, pct: pct(r.n, total) })).sort((a, b) => b.value - a.value);
}

exports.linkAnalytics = asyncHandler(async (req, res) => {
  const { range, tz } = req.valid.query;
  const link = await Link.findOne({ _id: req.valid.params.id, owner: req.user._id }).lean();
  if (!link) throw new AppError('این لینک پیدا نشد.', 404, 'LINK_NOT_FOUND');
  const base = { link: link._id };
  const now = new Date();

  let unit = 'day';
  let keys;
  let windowStart;
  if (range === '24h') { unit = 'hour'; keys = T.lastHourKeys(24, tz, now); windowStart = new Date(now.getTime() - 26 * 3600e3); }
  else if (range === '7d' || range === '30d') {
    const n = range === '7d' ? 7 : 30;
    keys = T.lastDayKeys(n, tz, now);
    windowStart = new Date(now.getTime() - (n + 1) * 864e5);
  } else {
    const today = T.dayKeyOf(now, tz);
    const age = Math.min(364, Math.max(0, T.diffDays(T.dayKeyOf(link.createdAt, tz), today)));
    keys = T.lastDayKeys(age + 1, tz, now);
    windowStart = new Date(link.createdAt.getTime() - 864e5);
  }

  const counts = await countByKey({ ...base, at: { $gte: windowStart } }, unit, tz, keys);
  let points = keys.map((k) => ({ from: k, value: counts[k] || 0 }));
  let seriesUnit = unit;
  if (range === 'all' && points.length > 21) { points = toWeekly(points); seriesUnit = 'week'; }

  const inWindow = [
    { $match: { ...base, at: { $gte: windowStart } } },
    { $addFields: { k: T.mongoKey(unit, tz) } },
    { $match: { k: { $in: keys } } },
  ];
  const group = (field) => [{ $group: { _id: `$${field}`, n: { $sum: 1 } } }];
  const [facet] = await Click.aggregate([
    ...inWindow,
    { $facet: { total: [{ $count: 'n' }], sources: group('source'), devices: group('device'), browsers: group('browser'), countries: group('country') } },
  ]);
  const total = facet.total[0] ? facet.total[0].n : 0;

  const d14 = T.lastDayKeys(14, tz, now);
  const c14 = await countByKey({ ...base, at: { $gte: new Date(now.getTime() - 16 * 864e5) } }, 'day', tz, d14);
  const last7 = d14.slice(7).map((k) => c14[k] || 0);
  const prev7 = sum(d14.slice(0, 7).map((k) => c14[k] || 0));
  const cur7 = sum(last7);
  const peakIdx = last7.indexOf(Math.max(...last7));

  const [overall] = await Click.aggregate([
    { $match: base },
    { $facet: { visitors: [{ $group: { _id: '$visitor' } }, { $count: 'n' }], sources: group('source'), n: [{ $count: 'n' }] } },
  ]);
  const allTotal = overall.n[0] ? overall.n[0].n : 0;
  const topSource = breakdownOf(overall.sources, allTotal)[0] || null;

  const recent = await Click.find(base).sort({ at: -1 }).limit(10).select('at country source refHost device browser -_id').lean();

  res.json({
    data: {
      link: serializeLink(link),
      range,
      series: { unit: seriesUnit, points, total: sum(points.map((p) => p.value)) },
      breakdowns: {
        total,
        sources: breakdownOf(facet.sources, total),
        devices: breakdownOf(facet.devices, total),
        browsers: breakdownOf(facet.browsers, total),
        countries: breakdownOf(facet.countries, total),
      },
      kpis: {
        totalClicks: link.clicks,
        trend: prev7 ? ((cur7 - prev7) / prev7) * 100 : null,
        uniqueVisitors: overall.visitors[0] ? overall.visitors[0].n : 0,
        topSource: topSource ? { key: topSource.key, pct: topSource.pct } : null,
        avgDaily7: cur7 / 7,
        peak7: cur7 ? { value: last7[peakIdx], day: d14[7 + peakIdx] } : null,
      },
      recent: recent.map((c) => ({ ...c, at: c.at.toISOString() })),
    },
  });
});

exports.overview = asyncHandler(async (req, res) => {
  const { days, tz } = req.valid.query;
  const owner = req.user._id;
  const now = new Date();
  const activeLinks = await Link.find({ owner, archived: false }).select('_id title slug url clicks createdAt expiresAt archived').lean();
  const ids = activeLinks.map((l) => l._id);
  const base = { owner, link: { $in: ids } };

  const keys = T.lastDayKeys(days * 2, tz, now);
  const counts = await countByKey({ ...base, at: { $gte: new Date(now.getTime() - (days * 2 + 1) * 864e5) } }, 'day', tz, keys);
  const points = keys.slice(days).map((k) => ({ from: k, value: counts[k] || 0 }));
  const total = sum(points.map((p) => p.value));
  const prevTotal = sum(keys.slice(0, days).map((k) => counts[k] || 0));

  const top = activeLinks.slice().sort((a, b) => b.clicks - a.clicks || String(a._id).localeCompare(String(b._id))).slice(0, 4);
  const k14 = T.lastDayKeys(14, tz, now);
  const rows = top.length
    ? await Click.aggregate([
        { $match: { link: { $in: top.map((l) => l._id) }, at: { $gte: new Date(now.getTime() - 16 * 864e5) } } },
        { $addFields: { k: T.mongoKey('day', tz) } },
        { $match: { k: { $in: k14 } } },
        { $group: { _id: { link: '$link', k: '$k' }, n: { $sum: 1 } } },
      ])
    : [];
  const perLink = {};
  rows.forEach((r) => { (perLink[String(r._id.link)] = perLink[String(r._id.link)] || {})[r._id.k] = r.n; });
  const topLinks = top.map((l) => {
    const m = perLink[String(l._id)] || {};
    const series = k14.map((k) => m[k] || 0);
    const cur = sum(series.slice(7)), prev = sum(series.slice(0, 7));
    return { ...serializeLink(l), sparkline: series.slice(7), trend: prev ? ((cur - prev) / prev) * 100 : null };
  });

  res.json({
    data: {
      days,
      series: { unit: 'day', points, total, prevTotal, change: prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null },
      summary: await summarize(owner),
      topLinks,
    },
  });
});

const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 50000, 100000];
exports.notifications = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  const s = user.settings || {};
  const items = [];
  const now = Date.now();
  if (s.notifyExpiry !== false) {
    const soon = await Link.find({ owner: user._id, archived: false, expiresAt: { $gt: new Date(now), $lte: new Date(now + 7 * 864e5) } }).sort({ expiresAt: 1 }).limit(5).lean();
    soon.forEach((l) => items.push({ id: `exp_${l._id}`, type: 'expiry', icon: 'schedule', linkId: String(l._id), title: l.title, days: Math.max(1, Math.ceil((l.expiresAt.getTime() - now) / 864e5)), at: l.updatedAt.toISOString() }));
  }
  if (s.notifyMilestone !== false) {
    const best = await Link.find({ owner: user._id, clicks: { $gte: MILESTONES[0] } }).sort({ clicks: -1 }).limit(3).lean();
    best.forEach((l) => {
      const m = MILESTONES.filter((x) => x <= l.clicks).pop();
      items.push({ id: `ms_${l._id}_${m}`, type: 'milestone', icon: 'celebration', linkId: String(l._id), title: l.title, milestone: m, at: (l.lastClickAt || l.updatedAt).toISOString() });
    });
  }
  res.json({ data: { notifications: items } });
});
