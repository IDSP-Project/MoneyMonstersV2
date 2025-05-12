const { ObjectId } = require('mongodb');
const { getDB } = require('../db/connection');

class Learning {
  constructor(learningData = {}) {
    this.category = learningData.category || '';
    this.title = learningData.title || '';
    this.summary = learningData.summary || '';
    this.content = learningData.content || '';
    this.reward = learningData.reward || 0;
    this.posterId = learningData.posterId || null;
    this.assigneeId = learningData.assigneeId || null;
    this.familyId = learningData.familyId || null;
    this.createdAt = learningData.createdAt || new Date();
    this.updatedAt = learningData.updatedAt || new Date();
    
    this.userProgress = learningData.userProgress || [];
  }

  static createLearning(category, title, summary, content, reward, user, selectedChild) {
    return {
      category,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      reward: Number(reward || 0),
      posterId: new ObjectId(user.id),
      assigneeId: new ObjectId(selectedChild._id),
      familyId: new ObjectId(user.familyId),
      createdAt: new Date(),
      updatedAt: new Date(),
      userProgress: [
        {
          userId: new ObjectId(selectedChild._id),
          status: 'new',
          reflection: '',
          lastAccessedAt: new Date(),
          completedAt: null
        }
      ]
    };
  }

  async save() {
    const db = getDB();
    const result = await db.collection('learnings').insertOne(this);
    return result;
  }

  static async findAll() {
    try {
      const db = getDB();
      return await db.collection('learnings').find().sort({ createdAt: -1 }).toArray();
    } catch (err) {
      throw err;
    }
  }

  static async findById(id) {
    try {
      const db = getDB();
      return await db.collection('learnings').findOne({ _id: new ObjectId(id) });
    } catch (err) {
      throw err;
    }
  }

  static async findByAssignee(assigneeId) {
    try {
      const db = getDB();
      return await db.collection('learnings')
        .find({ assigneeId: new ObjectId(assigneeId) })
        .sort({ createdAt: -1 })
        .toArray();
    } catch (err) {
      throw err;
    }
  }

  static async getUserProgress(userId, learningId) {
    try {
      const db = getDB();
      const learning = await db.collection('learnings').findOne(
        { _id: new ObjectId(learningId) },
        { projection: { userProgress: 1 } }
      );

      if (!learning || !learning.userProgress) {
        return null;
      }

      const userIdStr = userId.toString();
      return learning.userProgress.find(
        p => p.userId.toString() === userIdStr
      ) || null;
    } catch (err) {
      throw err;
    }
  }

  static async getAllUserProgress(userId) {
    try {
      const db = getDB();
      const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
      
      const learnings = await db.collection('learnings')
        .find({ "userProgress.userId": userIdObj })
        .toArray();
      
      const progressMap = {};
      
      learnings.forEach(learning => {
        const userProgress = learning.userProgress.find(
          p => p.userId.toString() === userIdObj.toString()
        );
        
        if (userProgress) {
          progressMap[learning._id.toString()] = {
            status: userProgress.status,
            reflection: userProgress.reflection
          };
        }
      });
      
      return progressMap;
    } catch (err) {
      throw err;
    }
  }

  static async updateStatus(userId, learningId, status, reflection = '') {
    try {
      const db = getDB();
      const session = db.client.startSession();
      let result = { success: false, message: 'Operation failed' };
      
      await session.withTransaction(async () => {
        const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
        const learningObj = new ObjectId(learningId);
        
        const learning = await db.collection('learnings').findOne(
          { _id: learningObj }
        );
        
        if (!learning) {
          result = { success: false, message: 'Learning module not found' };
          return;
        }
        
        const userIdStr = userIdObj.toString();
        const existingProgress = learning.userProgress?.find(p => p.userId.toString() === userIdStr);
        
        let rewardApplied = false;
        let rewardAmount = 0;
        let userBalance = 0;
        
        if (status === 'completed' && learning.reward > 0 && 
            (!existingProgress || existingProgress.status !== 'completed')) {
          
          rewardAmount = learning.reward;
          
          const userUpdateResult = await db.collection('users').updateOne(
            { _id: userIdObj },
            { 
              $inc: { balance: rewardAmount },
              $push: { 
                transactions: {
                  type: 'reward',
                  amount: rewardAmount,
                  description: `Learning completed: ${learning.title}`,
                  date: new Date(),
                  learningId: learning._id
                } 
              }
            },
            { session }
          );
          
          rewardApplied = userUpdateResult.modifiedCount === 1;
          
          if (rewardApplied) {
            const updatedUser = await db.collection('users').findOne(
              { _id: userIdObj },
              { session, projection: { balance: 1 } }
            );
            userBalance = updatedUser.balance;
          }
        }
        
        const progressUpdate = {
          status: status,
          reflection: reflection || (existingProgress?.reflection || ''),
          lastAccessedAt: new Date()
        };
        
        if (status === 'completed') {
          progressUpdate.completedAt = new Date();
        }
        
        let updateResult;
        
        if (existingProgress) {
          updateResult = await db.collection('learnings').updateOne(
            { 
              _id: learningObj,
              "userProgress.userId": userIdObj
            },
            { $set: { "userProgress.$": { ...existingProgress, ...progressUpdate } } },
            { session }
          );
        } else {
          updateResult = await db.collection('learnings').updateOne(
            { _id: learningObj },
            { 
              $push: { 
                userProgress: {
                  userId: userIdObj,
                  ...progressUpdate
                }
              } 
            },
            { session }
          );
        }
        
        if (updateResult.modifiedCount === 1) {
          result = { 
            success: true, 
            message: `Progress updated to ${status}`,
            rewardApplied,
            rewardAmount,
            userBalance
          };
        } else {
          result = { success: false, message: 'No changes made to progress' };
        }
      });
      
      await session.endSession();
      return result;
      
    } catch (err) {
      console.error("Error updating status:", err);
      throw err;
    }
  }

  static async markInProgress(userId, learningId) {
    return await this.updateStatus(userId, learningId, 'to do');
  }

  static async markCompleted(userId, learningId, reflection = '') {
    return await this.updateStatus(userId, learningId, 'completed', reflection);
  }
}

module.exports = Learning;