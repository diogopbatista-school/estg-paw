const mongoose = require('mongoose');
const order = require('./order');

const NotificationSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    message:{
        type: String,
        required: true
    },
    order:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    },
    read:{
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
      },
});

module.exports = mongoose.model('Notification', NotificationSchema);