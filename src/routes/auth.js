const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');

router.get('/register', (req, res) => res.render('auth/register'));
router.get('/login', (req, res) => res.render('auth/login'));

router.post('/register',
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['attendee', 'organizer']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).render('auth/register', { errors: errors.array() });
      const { name, email, password, role } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).render('auth/register', { errors: [{ msg: 'Email already exists' }] });
      const passwordHash = await hashPassword(password);
      const user = await User.create({ name, email, passwordHash, role });
      req.session.user = { _id: user._id, name: user.name, email: user.email, role: user.role };
      res.redirect('/');
    } catch (e) { next(e); }
  });

router.post('/login',
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).render('auth/login', { errors: errors.array() });
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(400).render('auth/login', { errors: [{ msg: 'Invalid email or password' }] });
      const ok = await comparePassword(password, user.passwordHash);
      if (!ok) return res.status(400).render('auth/login', { errors: [{ msg: 'Invalid email or password' }] });
      req.session.user = { _id: user._id, name: user.name, email: user.email, role: user.role };
      res.redirect('/');
    } catch (e) { next(e); }
  });

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
