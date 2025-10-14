const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Order = require('../models/Order');
const { requireAuth } = require('../middlewares/auth');
const QRCode = require('qrcode');
const { generatePromptPayPayload } = require('../utils/promptpay');

router.get('/', (req, res) => res.redirect('/events'));

router.get('/events', async (req, res, next) => {
  try {
    const { search, dateFrom, dateTo, priceMin, priceMax } = req.query;
    const query = { status: 'published' };
    if (search) query.title = { $regex: search, $options: 'i' };
    if (dateFrom || dateTo) {
      query.startAt = {};
      if (dateFrom) query.startAt.$gte = new Date(dateFrom);
      if (dateTo) query.startAt.$lte = new Date(dateTo);
    }
    if (priceMin || priceMax) {
      query['ticketTypes.price'] = {};
      if (priceMin) query['ticketTypes.price'].$gte = Number(priceMin);
      if (priceMax) query['ticketTypes.price'].$lte = Number(priceMax);
    }
    const events = await Event.find(query).sort({ startAt: 1 }).limit(50);
    res.render('events/list', { events });
  } catch (e) { next(e); }
});

router.get('/events/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).render('errors/404');
    
    // If user is organizer of this event, fetch orders with buyer info
    let orders = [];
    if (req.session.user && 
        req.session.user.role === 'organizer' && 
        event.organizerId.toString() === req.session.user._id.toString()) {
      orders = await Order.find({ eventId: event._id, paymentStatus: 'paid' })
        .populate('attendeeId', 'name email')
        .sort({ createdAt: -1 });
    }
    
    res.render('events/detail', { event, orders });
  } catch (e) { next(e); }
});

    // Payment page: show QR code for selected ticket type and qty
    router.get('/events/:id/pay', async (req, res, next) => {
      try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).render('errors/404');
        const { ticketTypeId, qty } = req.query;
        const t = event.ticketTypes.id(ticketTypeId);
        const q = Math.max(1, parseInt(qty || '1', 10));
        if (!t) return res.status(400).render('events/pay', { event, qr: null, amount: 0, phone: '0902748581' });
        const amount = t.price * q;
        const phone = '0902748581';
        const payload = generatePromptPayPayload(phone, amount);
        const qrDataUrl = await QRCode.toDataURL(payload);
        res.render('events/pay', { event, qr: qrDataUrl, amount, phone });
      } catch (e) { next(e); }
    });

    // QR Code for PromptPay payment
    router.get('/events/:id/qrcode', async (req, res, next) => {
      try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).send('Event not found');
        // Use first ticket type price or query param
        let amount = 0;
        if (event.ticketTypes && event.ticketTypes.length > 0) {
          amount = event.ticketTypes[0].price;
        }
        if (req.query.amount) {
          amount = Number(req.query.amount);
        }
        const phone = '0902748581';
        const payload = generatePromptPayPayload(phone, amount);
        const qrDataUrl = await QRCode.toDataURL(payload);
        res.json({ qr: qrDataUrl, amount, phone });
      } catch (e) { next(e); }
    });
router.post('/events/:id/checkout', requireAuth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).render('errors/404');
    const { ticketTypeId, qty } = req.body;
    const t = event.ticketTypes.id(ticketTypeId);
    const q = Math.max(1, parseInt(qty || '1', 10));
    if (!t) return res.status(400).send('Invalid ticket type');
    if (t.qtySold + q > t.qtyTotal) {
      return res.status(400).render('events/detail', { event, error: 'Not enough tickets remaining' });
    }
    const amount = t.price * q;
    await Order.create({
      attendeeId: req.session.user._id,
      eventId: event._id,
      items: [{ ticketTypeId: t._id, name: t.name, qty: q, unitPrice: t.price }],
      amount, paymentStatus: 'paid'
    });
    t.qtySold += q;
    await event.save();
    res.render('events/success', { event, order: { amount, _id: 'mock' } });
  } catch (e) { next(e); }
});

module.exports = router;
