
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
    this.amountAchieved = parseFloat(data.amountAchieved || 0);
    
    if (this.totalRequired > 0) {
      this.progress = Math.min(100, Math.round((this.amountAchieved / this.totalRequired) * 100));
    } else {
      this.progress = 0;
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
    // Create a plain object from this Goal instance
    const plainObject = {
      _id: this._id,
      title: this.title,
      description: this.description,
      price: this.price,
      purchaseLink: this.purchaseLink,
      parentId: this.parentId,
      childId: this.childId,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      totalRequired: this.totalRequired,
      amountAchieved: this.amountAchieved,
      progress: this.progress,
      completed: this.completed,
      completedAt: this.completedAt
    };
    
    console.log('Saving goal with explicit fields:', plainObject);
    
    const result = await db.collection('goals').replaceOne(
      { _id: this._id },
      plainObject,
      { writeConcern: { w: 'majority' } }
    );
    
    console.log('Save result details:', result);
    return result;
    } else {
      const result = await db.collection('goals').insertOne(this);
      this._id = result.insertedId;
      return result;
    }
  }
  
  addReward(amount) {
    this.amountAchieved += parseFloat(amount);
    this.updateProgress();
    return this;
  }
}

module.exports = Goal;