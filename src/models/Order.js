const mongoose = require('mongoose');
const OrderItemSchema = new mongoose.Schema({
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: String,
  qty: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  attendeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  items: { type: [OrderItemSchema], required: true },
  amount: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'paid' }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
