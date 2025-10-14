const express = require('express');
const router = express.Router();
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
      
      const upcomingEvents = orders
        .filter(o => o.eventId && new Date(o.eventId.startAt) > new Date())
        .map(o => o.eventId);
      
      res.render('profile/index', { 
        user, 
        orders, 
        upcomingEvents,
        totalOrders: orders.length 
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
    res.render('profile/tickets', { orders });
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
