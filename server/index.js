require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const auth = require('./middleware/auth');
const { User, Emergency, Inventory, ReliefRequest, Vehicle, Delivery, ActivityLog } = require('./models');
const { demo } = require('./seed');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' } });
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => { req.io = io; next(); });
let dbReady = false;
if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => { dbReady = true; console.log('MongoDB connected'); }).catch(err => console.error('MongoDB unavailable; API uses labeled demo data:', err.message));
app.get('/api/health', (req, res) => res.json({ status: 'ok', database: dbReady ? 'connected' : 'demo', liveWeather: Boolean(process.env.OPENWEATHER_API_KEY), aiEnabled: Boolean(process.env.GEMINI_API_KEY), mapEnabled: Boolean(process.env.MAPBOX_TOKEN) }));
app.post('/api/auth/register', async (req, res) => {
  try { const { name, email, password, role } = req.body; if (!name || !email || !password || password.length < 10) return res.status(400).json({ error: 'Name, email, and a password of at least 10 characters are required.' });
    const safeRole = ['emergency_manager','supplier','driver','relief_team'].includes(role) ? role : 'relief_team';
    const user = await User.create({ name, email: email.toLowerCase(), password, role: safeRole }); res.status(201).json(issueToken(user));
  } catch (e) { res.status(400).json({ error: e.code === 11000 ? 'Email already registered.' : 'Could not create account.' }); }
});
app.post('/api/auth/login', async (req, res) => { const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() }); if (!user || !(await user.comparePassword(req.body.password || ''))) return res.status(401).json({ error: 'Invalid email or password.' }); res.json(issueToken(user)); });
function issueToken(user) { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be configured'); const token = require('jsonwebtoken').sign({ sub: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '12h' }); return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }; }
app.get('/api/dashboard', auth.optional, async (req, res) => {
  if (!dbReady) return res.json({ source: 'DEMO', ...demo.dashboard });
  const [emergencies, inventory, requests, vehicles, deliveries] = await Promise.all([Emergency.countDocuments({ status: 'active' }), Inventory.aggregate([{ $group: { _id: null, units: { $sum: '$quantity' } } }]), ReliefRequest.countDocuments({ status: { $in: ['pending','in_review'] } }), Vehicle.countDocuments({ status: 'available' }), Delivery.countDocuments({ status: { $in: ['dispatched','in_transit'] } })]);
  res.json({ source: 'LIVE', metrics: { emergencies, supplyUnits: inventory[0]?.units || 0, pendingRequests: requests, availableVehicles: vehicles, activeDeliveries: deliveries } });
});
app.get('/api/emergencies', auth.optional, async (req, res) => res.json(dbReady ? await Emergency.find().sort({ createdAt: -1 }).limit(100) : { source: 'DEMO', data: demo.emergencies }));
app.get('/api/inventory', auth.optional, async (req, res) => res.json(dbReady ? await Inventory.find().limit(500) : { source: 'DEMO', data: demo.inventory }));
app.get('/api/vehicles', auth.optional, async (req, res) => res.json(dbReady ? await Vehicle.find().limit(300) : { source: 'DEMO', data: demo.vehicles }));
app.get('/api/requests', auth.optional, async (req, res) => res.json(dbReady ? await ReliefRequest.find().sort({ createdAt: -1 }).limit(500) : { source: 'DEMO', data: demo.requests }));
app.post('/api/requests', auth.required, async (req, res) => { try { const request = await ReliefRequest.create({ ...req.body, createdBy: req.user.sub, status: 'pending' }); await ActivityLog.create({ actor: req.user.sub, action: 'request.created', target: request.id }); io.emit('request:created', request); res.status(201).json(request); } catch (e) { res.status(400).json({ error: e.message }); } });
app.patch('/api/requests/:id/approve', auth.required, auth.roles('admin','emergency_manager'), async (req, res) => { const item = await ReliefRequest.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.user.sub, approvedAt: new Date() }, { new: true, runValidators: true }); if (!item) return res.status(404).json({ error: 'Request not found.' }); await ActivityLog.create({ actor: req.user.sub, action: 'request.approved', target: item.id }); io.emit('request:updated', item); res.json(item); });
app.post('/api/deliveries/:id/dispatch', auth.required, auth.roles('admin','emergency_manager'), async (req, res) => { const delivery = await Delivery.findById(req.params.id); if (!delivery) return res.status(404).json({ error: 'Delivery not found.' }); if (delivery.status !== 'approved') return res.status(409).json({ error: 'Only approved deliveries can be dispatched.' }); delivery.status = 'dispatched'; delivery.dispatchedBy = req.user.sub; delivery.dispatchedAt = new Date(); await delivery.save(); await ActivityLog.create({ actor: req.user.sub, action: 'delivery.dispatched', target: delivery.id }); io.emit('delivery:updated', delivery); res.json(delivery); });
app.patch('/api/deliveries/:id/status', auth.required, async (req, res) => { const allowed = ['in_transit','delivered','delayed']; if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid delivery status.' }); const delivery = await Delivery.findById(req.params.id); if (!delivery) return res.status(404).json({ error: 'Delivery not found.' }); if (req.user.role !== 'admin' && req.user.role !== 'emergency_manager' && String(delivery.driver) !== req.user.sub) return res.status(403).json({ error: 'Not assigned to this delivery.' }); delivery.status = req.body.status; await delivery.save(); await ActivityLog.create({ actor: req.user.sub, action: `delivery.${delivery.status}`, target: delivery.id }); io.emit('delivery:updated', delivery); res.json(delivery); });
app.get('/api/integrations/status', (req, res) => res.json({ weather: process.env.OPENWEATHER_API_KEY ? 'configured' : 'unavailable', ai: process.env.GEMINI_API_KEY ? 'configured' : 'unavailable', maps: process.env.MAPBOX_TOKEN ? 'configured' : 'unavailable' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Unexpected server error.' }); });
const port = process.env.PORT || 4000; server.listen(port, () => console.log(`ReliefOps API listening on ${port}`));
