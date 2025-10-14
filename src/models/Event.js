const mongoose = require('mongoose');
const TicketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  qtyTotal: { type: Number, required: true, min: 0 },
  qtySold: { type: Number, default: 0, min: 0 }
}, { _id: true });

const EventSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  coverImage: { type: String },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  venue: { type: String, required: true },
  location: { type: String },
  ticketTypes: { type: [TicketTypeSchema], default: [] },
  status: { type: String, enum: ['draft', 'published', 'closed'], default: 'published' }
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
