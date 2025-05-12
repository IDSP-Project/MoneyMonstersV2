const { ObjectId } = require('mongodb');

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
    this.progress = parseFloat(data.progress || 0);
  }
}

module.exports = Goal;