const express = require('express');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const limiters = require('../middleware/rateLimiters');
const S = require('../validators/schemas');
const auth = require('../controllers/authController');
const user = require('../controllers/userController');
const links = require('../controllers/linkController');
const analytics = require('../controllers/analyticsController');

const router = express.Router();

router.get('/health', (req, res) => res.json({ data: { status: 'ok', time: new Date().toISOString() } }));

router.post('/auth/register', limiters.auth, validate({ body: S.register }), auth.register);
router.post('/auth/login', limiters.auth, validate({ body: S.login }), auth.login);
router.post('/auth/logout', protect, auth.logout);
router.get('/auth/me', protect, auth.me);

router.get('/users/me', protect, user.getProfile);
router.patch('/users/me', protect, validate({ body: S.updateProfile }), user.updateProfile);
router.patch('/users/me/settings', protect, validate({ body: S.updateSettings }), user.updateSettings);
router.put('/users/me/password', protect, limiters.auth, validate({ body: S.changePassword }), auth.changePassword);
router.delete('/users/me', protect, limiters.auth, validate({ body: S.deleteAccount }), auth.deleteAccount);

router.use('/links', protect);
router.get('/links', validate({ query: S.listLinks }), links.list);
router.post('/links', limiters.createLink, validate({ body: S.createLink }), links.create);
router.delete('/links', links.removeAll);
router.get('/links/export.csv', validate({ query: S.listLinks }), links.exportCsv);
router.get('/links/check-slug', validate({ query: S.checkSlug }), links.checkSlug);
router.post('/links/bulk-delete', validate({ body: S.bulkDelete }), links.bulkRemove);
router.get('/links/:id', validate({ params: S.idParam }), links.get);
router.patch('/links/:id', validate({ params: S.idParam, body: S.updateLink }), links.update);
router.delete('/links/:id', validate({ params: S.idParam }), links.remove);
router.get('/links/:id/analytics', validate({ params: S.idParam, query: S.linkAnalytics }), analytics.linkAnalytics);

router.get('/analytics/overview', protect, validate({ query: S.overview }), analytics.overview);
router.get('/notifications', protect, analytics.notifications);

module.exports = router;
