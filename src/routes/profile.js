const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth');
const Order = require('../models/Order');

router.get('/tickets', requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ attendeeId: req.session.user._id, paymentStatus: 'paid' }).populate('eventId');
    res.render('profile/tickets', { orders });
  } catch (e) { next(e); }
});

module.exports = router;
