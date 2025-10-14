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
    const { title, description, coverImage, startAt, endAt, venue, location, promptPay } = req.body;
    const names = Array.isArray(req.body.ticketName) ? req.body.ticketName : [req.body.ticketName].filter(Boolean);
    const prices = Array.isArray(req.body.ticketPrice) ? req.body.ticketPrice : [req.body.ticketPrice].filter(Boolean);
    const qtys = Array.isArray(req.body.ticketQty) ? req.body.ticketQty : [req.body.ticketQty].filter(Boolean);
    const ticketTypes = names.map((n,i)=>({ name:n, price:Number(prices[i]||0), qtyTotal:Number(qtys[i]||0) })).filter(t=>t.name);
    await Event.create({ organizerId: req.session.user._id, title, description, coverImage, startAt, endAt, venue, location, ticketTypes, promptPay, status:'published' });
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
    const { title, description, coverImage, startAt, endAt, venue, location, promptPay } = req.body;
    const names = Array.isArray(req.body.ticketName) ? req.body.ticketName : [req.body.ticketName].filter(Boolean);
    const prices = Array.isArray(req.body.ticketPrice) ? req.body.ticketPrice : [req.body.ticketPrice].filter(Boolean);
    const qtys = Array.isArray(req.body.ticketQty) ? req.body.ticketQty : [req.body.ticketQty].filter(Boolean);
    const ticketTypes = names.map((n,i)=>({ name:n, price:Number(prices[i]||0), qtyTotal:Number(qtys[i]||0) })).filter(t=>t.name);
    await Event.updateOne({ _id: req.params.id, organizerId: req.session.user._id }, { $set: { title, description, coverImage, startAt, endAt, venue, location, ticketTypes, promptPay } });
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

// Ticket verification page
router.get('/verify', requireRole('organizer'), (req, res) => {
  res.render('organizer/verify', { ticket: null, error: null });
});

// Verify ticket API
router.post('/verify', requireRole('organizer'), async (req, res, next) => {
  try {
    const { ticketCode } = req.body;
    
    if (!ticketCode) {
      return res.render('organizer/verify', { ticket: null, error: 'Please provide a ticket code' });
    }
    
    // First, try to find individual ticket
    const order = await Order.findOne({ 'tickets.ticketCode': ticketCode.toUpperCase() })
      .populate('eventId')
      .populate('attendeeId', 'name email');
    
    if (order) {
      // Find the specific ticket
      const ticket = order.tickets.find(t => t.ticketCode === ticketCode.toUpperCase());
      
      if (!ticket) {
        return res.render('organizer/verify', { ticket: null, error: 'Ticket not found' });
      }
      
      // Check if organizer owns this event
      if (order.eventId.organizerId.toString() !== req.session.user._id.toString()) {
        return res.render('organizer/verify', { ticket: null, error: 'You are not authorized to verify this ticket' });
      }
      
      // Check if event has already passed
      const eventPassed = new Date(order.eventId.endAt) < new Date();
      
      return res.render('organizer/verify', { 
        ticket: {
          _id: ticket._id,
          ticketCode: ticket.ticketCode,
          name: ticket.name,
          unitPrice: ticket.unitPrice,
          usedAt: ticket.usedAt,
          eventId: order.eventId,
          attendeeId: order.attendeeId,
          orderId: order._id,
          createdAt: order.createdAt,
          isValid: true,
          eventPassed,
          isIndividual: true
        }, 
        error: null 
      });
    }
    
    // Fallback: try to find old format order
    const oldOrder = await Order.findOne({ ticketCode: ticketCode.toUpperCase() })
      .populate('eventId')
      .populate('attendeeId', 'name email');
    
    if (!oldOrder) {
      return res.render('organizer/verify', { ticket: null, error: 'Invalid ticket code' });
    }
    
    // Check if organizer owns this event
    if (oldOrder.eventId.organizerId.toString() !== req.session.user._id.toString()) {
      return res.render('organizer/verify', { ticket: null, error: 'You are not authorized to verify this ticket' });
    }
    
    // Check if event has already passed
    const eventPassed = new Date(oldOrder.eventId.endAt) < new Date();
    
    res.render('organizer/verify', { 
      ticket: {
        ...oldOrder.toObject(),
        isValid: true,
        eventPassed,
        isIndividual: false
      }, 
      error: null 
    });
  } catch (e) { next(e); }
});

// Mark ticket as used
router.post('/verify/use', requireRole('organizer'), async (req, res, next) => {
  try {
    const { ticketId, orderId } = req.body;
    
    const order = await Order.findById(orderId)
      .populate('eventId')
      .populate('attendeeId', 'name email');
    
    if (!order) {
      return res.render('organizer/verify', { ticket: null, error: 'Order not found' });
    }
    
    // Check if organizer owns this event
    if (order.eventId.organizerId.toString() !== req.session.user._id.toString()) {
      return res.render('organizer/verify', { ticket: null, error: 'You are not authorized' });
    }
    
    // Find and update the ticket
    const ticket = order.tickets.id(ticketId);
    if (!ticket) {
      return res.render('organizer/verify', { ticket: null, error: 'Ticket not found' });
    }
    
    if (ticket.usedAt) {
      return res.render('organizer/verify', { 
        ticket: null, 
        error: `Ticket already used at ${new Date(ticket.usedAt).toLocaleString()}` 
      });
    }
    
    ticket.usedAt = new Date();
    await order.save();
    
    res.redirect('/organizer/verify?success=true');
  } catch (e) { next(e); }
});

module.exports = router;
