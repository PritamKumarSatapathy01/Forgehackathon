const jwt = require('jsonwebtoken');
function required(req, res, next) { const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, ''); if (!token || !process.env.JWT_SECRET) return res.status(401).json({ error: 'Authentication required.' }); try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Session expired or invalid.' }); } }
required.required = required;
required.optional = (req, res, next) => { const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, ''); if (token && process.env.JWT_SECRET) { try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch { /* public read remains available */ } } next(); };
required.roles = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'This action requires an authorized role.' });
module.exports = required;
