require('dotenv').config();
const mongoose = require('mongoose');
const { hashPassword } = require('./src/utils/password');
const User = require('./src/models/User');
const Event = require('./src/models/Event');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event_booking_ejs');
  await User.deleteMany({}); await Event.deleteMany({});
  const organizer = await User.create({ name: 'Demo Organizer', email: 'org@example.com', passwordHash: await hashPassword('password'), role: 'organizer' });
  const attendee = await User.create({ name: 'Demo Attendee', email: 'att@example.com', passwordHash: await hashPassword('password'), role: 'attendee' });
  await Event.create({
    organizerId: organizer._id,
    title: 'Sample Tech Meetup',
    description: 'A meetup to discuss Node.js and web development.',
    coverImage: 'https://placehold.co/1200x400?text=Tech+Meetup',
    startAt: new Date(Date.now() + 86400000),
    endAt: new Date(Date.now() + 90000000),
    venue: 'Main Hall A', location: 'Bangkok',
    ticketTypes: [
      { name: 'General', price: 100, qtyTotal: 100, qtySold: 0 },
      { name: 'VIP', price: 300, qtyTotal: 20, qtySold: 0 }
    ],
    status: 'published'
  });
  console.log('Seeded: org@example.com / att@example.com, password: password');
  process.exit(0);
})();
