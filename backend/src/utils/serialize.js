/* serialize.js — شکل لینکی که به فرانت‌اند می‌دیم */
const env = require('../config/env');

const shortUrl = (slug) => `${env.baseUrl}/${slug}`;

function serializeLink(link) {
  const l = typeof link.toObject === 'function' ? link.toObject() : link;
  const archived = !!l.archived;
  const expired = !!l.expiresAt && new Date(l.expiresAt).getTime() <= Date.now();
  return {
    id: String(l._id),
    title: l.title,
    slug: l.slug,
    url: l.url,
    shortUrl: shortUrl(l.slug),
    clicks: l.clicks || 0,
    archived,
    status: archived ? 'archived' : expired ? 'expired' : 'active',
    expiresAt: l.expiresAt ? new Date(l.expiresAt).toISOString() : null,
    lastClickAt: l.lastClickAt ? new Date(l.lastClickAt).toISOString() : null,
    createdAt: new Date(l.createdAt).toISOString(),
  };
}

module.exports = { serializeLink, shortUrl };
