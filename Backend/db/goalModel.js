
const { getDB } = require('./connection');

class Goal {
  constructor(data = {}) {
    this._id = data._id;
    this.title = data.title || '';
    this.description = data.description || '';
    this.price = parseFloat(data.price || 0);
    this.purchaseLink = data.purchaseLink || '';
    this.parentId = data.parentId || [];
    this.childId = data.childId || '';
    this.status = data.status || 'active';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.totalRequired = parseFloat(data.totalRequired || data.price || 0);
    this.amountAchieved = data.amountAchieved !== undefined ? parseFloat(data.amountAchieved) : 0;
    this.requestStatus = data.requestStatus || 'none';
    
    if (this.totalRequired > 0) {
      this.progress = Math.min(100, Math.round((this.amountAchieved / this.totalRequired) * 100));
    } else {
      this.progress = data.progress !== undefined ? parseFloat(data.progress) : 0;
    }
    
    this.completed = this.progress >= 100;
    this.completedAt = this.completed ? (data.completedAt || new Date()) : null;
    
    if (this.completed && this.status !== 'ready') {
      this.status = 'ready';
    }
  }
  
  isCompleted() {
    return this.completed === true || this.progress >= 100 || this.amountAchieved >= this.totalRequired;
  }

  addReward(amount) {
  this.amountAchieved += parseFloat(amount);
  this.updateProgress();
  return this;
}
  
  updateProgress() {
    if (this.totalRequired > 0) {
      this.progress = Math.min(100, Math.round((this.amountAchieved / this.totalRequired) * 100));
    } else {
      this.progress = 0;
    }
    
    const isNowCompleted = this.progress >= 100;
    if (isNowCompleted && !this.completed) {
      this.completed = true;
      this.completedAt = new Date();
      
      if (this.status !== 'ready') {
        this.status = 'ready';
      }
    }
    
    this.updatedAt = new Date();
    return this;
  }
  
  static create(goalData) {
    const newGoal = new Goal(goalData);
    return newGoal;
  }
  
async save() {
  const db = getDB();
  if (this._id) {
    const updateData = {
      amountAchieved: this.amountAchieved,
      progress: this.progress,
      completed: this.completed,
      updatedAt: new Date()
    };
    
    const result = await db.collection('goals').updateOne(
      { _id: this._id },
      { $set: updateData }
    );
    
    return result;
  } else {
    const result = await db.collection('goals').insertOne(this);
    this._id = result.insertedId;
    return result;
  }
}
}

module.exports = Goal;