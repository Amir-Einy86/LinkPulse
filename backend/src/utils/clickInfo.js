const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu)\./i;
const SOCIAL = /(^|\.)(t\.me|telegram|instagram|facebook|fb|x\.com|twitter|linkedin|reddit|whatsapp|youtube|pinterest|tiktok|eitaa|rubika|aparat)\b/i;

function parseSource(referer, selfHost) {
  if (!referer) return { source: 'direct', refHost: '' };
  let host = '';
  try { host = new URL(referer).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return { source: 'direct', refHost: '' }; }
  if (!host || host === selfHost) return { source: 'direct', refHost: '' };
  if (SEARCH.test(host)) return { source: 'search', refHost: host.slice(0, 100) };
  if (SOCIAL.test(host)) return { source: 'social', refHost: host.slice(0, 100) };
  return { source: 'other', refHost: host.slice(0, 100) };
}

function parseUserAgent(ua = '') {
  const s = String(ua);
  let device = 'desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(s)) device = 'tablet';
  else if (/mobi|iphone|ipod|android/i.test(s)) device = 'mobile';
  let browser = 'other';
  if (/edg(e|a|ios)?\//i.test(s)) browser = 'edge';
  else if (/firefox|fxios/i.test(s)) browser = 'firefox';
  else if (/chrome|crios|chromium/i.test(s)) browser = 'chrome';
  else if (/safari/i.test(s)) browser = 'safari';
  return { device, browser };
}

function parseCountry(headers) {
  const c = headers['cf-ipcountry'] || headers['x-vercel-ip-country'] || headers['x-country-code'] || '';
  return /^[A-Za-z]{2}$/.test(c) && c.toUpperCase() !== 'T1' ? c.toUpperCase() : 'XX';
}

const crypto = require('crypto');
const env = require('../config/env');

function visitorHash(req) {
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHmac('sha256', env.jwtSecret || 'test-secret')
    .update(`${day}|${req.ip}|${req.get('user-agent') || ''}`).digest('hex').slice(0, 24);
}

const BOT = /bot|crawl|spider|slurp|preview|fetch|facebookexternalhit|whatsapp|telegram|discord|slack|skype|embedly|quora|pinterest|headless|lighthouse|curl|wget|python-requests|axios|go-http-client|monitor|uptime/i;
const isBot = (ua) => !ua || BOT.test(ua);

function fromRequest(req, selfHost) {
  return {
    visitor: visitorHash(req),
    ...parseSource(req.get('referer'), selfHost),
    ...parseUserAgent(req.get('user-agent')),
    country: parseCountry(req.headers),
  };
}

module.exports = { parseSource, parseUserAgent, parseCountry, fromRequest, isBot, visitorHash };
