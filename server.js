require('dotenv').config();
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const path = require('path');
const engine = require('ejs-mate');

const app = express();

// DB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/event_booking_ejs';
mongoose.connect(MONGODB_URI).then(() => console.log('MongoDB connected')).catch(console.error);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// EJS-mate
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session (dev)
app.use(session({ secret: process.env.SESSION_SECRET || 'dev_secret', resave: false, saveUninitialized: false }));

// Locals
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.role = req.session.user ? req.session.user.role : null;
  res.locals.query = req.query;
  next();
});

// Routes
app.use('/', require('./src/routes/public'));
app.use('/auth', require('./src/routes/auth'));
app.use('/organizer', require('./src/routes/organizer'));
app.use('/profile', require('./src/routes/profile'));

// 404/500
app.use((req, res) => res.status(404).render('errors/404'));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('errors/500', { error: err });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));
