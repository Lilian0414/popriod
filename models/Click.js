const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
    clicks: {
        type: Number,
        required: true,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ip: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Click', clickSchema); 