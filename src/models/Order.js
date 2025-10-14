const mongoose = require('mongoose');
const crypto = require('crypto');

// Individual ticket schema with unique code
const TicketSchema = new mongoose.Schema({
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: String,
  unitPrice: { type: Number, required: true, min: 0 },
  ticketCode: { type: String, unique: true, sparse: true },
  usedAt: { type: Date, default: null }
}, { timestamps: true });

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
  tickets: { type: [TicketSchema], default: [] },
  amount: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'paid' },
  ticketCode: { type: String, unique: true, sparse: true } // Keep for backward compatibility
}, { timestamps: true });

// Generate unique ticket codes after order is saved
OrderSchema.post('save', async function(doc) {
  if (doc.paymentStatus === 'paid' && doc.tickets.length === 0) {
    // Generate individual tickets from items
    const tickets = [];
    for (const item of doc.items) {
      for (let i = 0; i < item.qty; i++) {
        tickets.push({
          ticketTypeId: item.ticketTypeId,
          name: item.name,
          unitPrice: item.unitPrice,
          ticketCode: crypto.randomBytes(16).toString('hex').toUpperCase()
        });
      }
    }
    
    // Update order with tickets
    await this.constructor.updateOne(
      { _id: doc._id },
      { $set: { tickets } }
    );
  }
});

// Generate unique ticket code before saving (backward compatibility)
OrderSchema.pre('save', function(next) {
  if (this.isNew && !this.ticketCode && this.paymentStatus === 'paid') {
    this.ticketCode = crypto.randomBytes(16).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
