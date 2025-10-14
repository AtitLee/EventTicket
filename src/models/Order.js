const mongoose = require('mongoose');
const crypto = require('crypto');

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
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'paid' },
  ticketCode: { type: String, unique: true, sparse: true }
}, { timestamps: true });

// Generate unique ticket code before saving
OrderSchema.pre('save', function(next) {
  if (this.isNew && !this.ticketCode && this.paymentStatus === 'paid') {
    this.ticketCode = crypto.randomBytes(16).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
