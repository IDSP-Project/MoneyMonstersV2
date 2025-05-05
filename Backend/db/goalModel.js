// currently Mongoose, but needs to be Mongo DB instead

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  description: String,
  amount: Number,
  completed: Boolean,
  completedAt: Date
});

const goalSchema = new mongoose.Schema({
  name: String,
  source: String,
  image: String,
  price: Number,
  progress: Number,
  tasks: [taskSchema],
  childId: {
    type: String,
    ref: 'Child'
  }
});

module.exports = mongoose.model('Goal', goalSchema);