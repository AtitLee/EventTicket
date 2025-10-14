const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { requireAuth } = require('../middlewares/auth');
const Order = require('../models/Order');
const Event = require('../models/Event');
const User = require('../models/User');

// Profile main page
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const user = req.session.user;
    
    if (user.role === 'attendee') {
      // For attendees: show recent orders and upcoming events
      const orders = await Order.find({ attendeeId: user._id, paymentStatus: 'paid' })
        .populate('eventId')
        .sort({ createdAt: -1 })
        .limit(5);
      
      // Generate QR codes for orders
      const ordersWithQR = await Promise.all(orders.map(async (order) => {
        if (order.ticketCode) {
          const qrData = JSON.stringify({
            orderId: order._id,
            ticketCode: order.ticketCode,
            eventId: order.eventId._id,
            attendeeId: order.attendeeId
          });
          const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
          return { ...order.toObject(), qrCodeDataURL };
        }
        return order.toObject();
      }));
      
      const upcomingEvents = ordersWithQR
        .filter(o => o.eventId && new Date(o.eventId.startAt) > new Date())
        .map(o => o.eventId);
      
      res.render('profile/index', { 
        user, 
        orders: ordersWithQR, 
        upcomingEvents,
        totalOrders: ordersWithQR.length 
      });
    } else {
      // For organizers: redirect to organizer dashboard
      res.redirect('/organizer/dashboard');
    }
  } catch (e) { next(e); }
});

router.get('/tickets', requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ attendeeId: req.session.user._id, paymentStatus: 'paid' }).populate('eventId');
    
    // Generate QR codes for each order
    const ordersWithQR = await Promise.all(orders.map(async (order) => {
      if (order.ticketCode) {
        const qrData = JSON.stringify({
          orderId: order._id,
          ticketCode: order.ticketCode,
          eventId: order.eventId._id,
          attendeeId: order.attendeeId
        });
        const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });
        return { ...order.toObject(), qrCodeDataURL };
      }
      return order.toObject();
    }));
    
    res.render('profile/tickets', { orders: ordersWithQR });
  } catch (e) { next(e); }
});

// Edit profile page
router.get('/edit', requireAuth, (req, res) => {
  res.render('profile/edit', { user: req.session.user });
});

// Update profile
router.post('/edit', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body;
    
    await User.updateOne(
      { _id: req.session.user._id },
      { $set: { name: name.trim() } }
    );
    
    // Update session
    req.session.user.name = name.trim();
    
    res.redirect('/profile?updated=true');
  } catch (e) { next(e); }
});

module.exports = router;
