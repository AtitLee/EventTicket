const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Order = require('../models/Order');
const { requireRole } = require('../middlewares/auth');

router.get('/dashboard', requireRole('organizer'), async (req, res, next) => {
  try {
    const organizerId = req.session.user._id;
    const events = await Event.find({ organizerId }).sort({ createdAt: -1 });
    const eventIds = events.map(e => e._id);
    const orders = await Order.find({ eventId: { $in: eventIds }, paymentStatus: 'paid' })
      .populate('attendeeId', 'name email');
    const totals = orders.reduce((acc, o) => acc + o.amount, 0);
    res.render('organizer/dashboard', { events, totals, orders });
  } catch (e) { next(e); }
});

router.get('/events', requireRole('organizer'), async (req, res, next) => {
  try {
    const events = await Event.find({ organizerId: req.session.user._id }).sort({ createdAt: -1 });
    res.render('organizer/events', { events });
  } catch (e) { next(e); }
});

router.get('/events/new', requireRole('organizer'), (req, res) => {
  res.render('organizer/event-form', { event: null });
});

router.post('/events', requireRole('organizer'), async (req, res, next) => {
  try {
    const { title, description, coverImage, startAt, endAt, venue, location } = req.body;
    const names = Array.isArray(req.body.ticketName) ? req.body.ticketName : [req.body.ticketName].filter(Boolean);
    const prices = Array.isArray(req.body.ticketPrice) ? req.body.ticketPrice : [req.body.ticketPrice].filter(Boolean);
    const qtys = Array.isArray(req.body.ticketQty) ? req.body.ticketQty : [req.body.ticketQty].filter(Boolean);
    const ticketTypes = names.map((n,i)=>({ name:n, price:Number(prices[i]||0), qtyTotal:Number(qtys[i]||0) })).filter(t=>t.name);
    await Event.create({ organizerId: req.session.user._id, title, description, coverImage, startAt, endAt, venue, location, ticketTypes, status:'published' });
    res.redirect('/organizer/events');
  } catch (e) { next(e); }
});

router.get('/events/:id/edit', requireRole('organizer'), async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizerId: req.session.user._id });
    if (!event) return res.status(404).render('errors/404');
    res.render('organizer/event-form', { event });
  } catch (e) { next(e); }
});

router.post('/events/:id', requireRole('organizer'), async (req, res, next) => {
  try {
    const { title, description, coverImage, startAt, endAt, venue, location } = req.body;
    const names = Array.isArray(req.body.ticketName) ? req.body.ticketName : [req.body.ticketName].filter(Boolean);
    const prices = Array.isArray(req.body.ticketPrice) ? req.body.ticketPrice : [req.body.ticketPrice].filter(Boolean);
    const qtys = Array.isArray(req.body.ticketQty) ? req.body.ticketQty : [req.body.ticketQty].filter(Boolean);
    const ticketTypes = names.map((n,i)=>({ name:n, price:Number(prices[i]||0), qtyTotal:Number(qtys[i]||0) })).filter(t=>t.name);
    await Event.updateOne({ _id: req.params.id, organizerId: req.session.user._id }, { $set: { title, description, coverImage, startAt, endAt, venue, location, ticketTypes } });
    res.redirect('/organizer/events');
  } catch (e) { next(e); }
});

router.post('/events/:id/delete', requireRole('organizer'), async (req, res, next) => {
  try { await Event.deleteOne({ _id: req.params.id, organizerId: req.session.user._id }); res.redirect('/organizer/events'); }
  catch (e) { next(e); }
});

router.get('/events/:id/orders', requireRole('organizer'), async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, organizerId: req.session.user._id });
    if (!event) return res.status(404).render('errors/404');
    const orders = await Order.find({ eventId: event._id, paymentStatus: 'paid' }).populate('attendeeId', 'name email');
    res.render('organizer/orders', { event, orders });
  } catch (e) { next(e); }
});

module.exports = router;
