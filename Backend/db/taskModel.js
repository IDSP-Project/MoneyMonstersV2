const { ObjectId } = require('mongodb');
const { getDB } = require('../db/connection');

class TaskModel {
  constructor(taskData = {}) {
    this.category = taskData.category || '';
    this.title = taskData.title || '';
    this.description = taskData.description || 'NO DESCRIPTION';
    this.reward = taskData.reward || 0;
    this.dueDate = taskData.dueDate || new Date();
    this.status = taskData.status || 'new';
    this.completed = taskData.completed || false;
    this.completedAt = taskData.completedAt || new Date(0);
    this.weeklyRepeat = taskData.weeklyRepeat || false;
    this.goalId = taskData.goalId || null;
    this.posterId = taskData.posterId || null;
    this.assigneeId = taskData.assigneeId || null;
    this.familyId = taskData.familyId || null;
    this.createdAt = taskData.createdAt || new Date();
    this.updatedAt = taskData.updatedAt || new Date();
  }

  static createTask(category, title, description, amount, dueDate, user, selectedChild) {
    return {
      category,
      title: title.trim(),
      description: description ? description.trim() : 'NO DESCRIPTION',
      reward: Number(amount),
      dueDate: new Date(dueDate),
      status: 'new',
      completed: false,
      completedAt: new Date(0),
      weeklyRepeat: false,
      goalId: null,
      posterId: new ObjectId(user.id),
      assigneeId: new ObjectId(selectedChild._id),
      familyId: new ObjectId(user.familyId),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async save() {
    const db = getDB();
    const result = await db.collection('tasks').insertOne(this);
    return result;
  }
  
static async completeTask(taskId) {
  const db = getDB();
  const session = db.client.startSession();
  
  try {
    let result = null;
    
    await session.withTransaction(async () => {
      const task = await db.collection('tasks').findOne(
        { _id: new ObjectId(taskId) },
        { session }
      );
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      await db.collection('tasks').updateOne(
        { _id: task._id },
        { 
          $set: { 
            completed: true, 
            completedAt: new Date(),
            status: 'completed',
            updatedAt: new Date()
          } 
        },
        { session }
      );
      
      let user = null;
      let goalUpdated = false;
      let updatedGoal = null;
      
      if (task.reward && task.assigneeId) {
        const rewardAmount = parseFloat(task.reward);
        const assigneeId = typeof task.assigneeId === 'string' ? new ObjectId(task.assigneeId) : task.assigneeId;
        
        await db.collection('users').updateOne(
          { _id: assigneeId },
          { 
            $inc: { balance: rewardAmount },
            $push: { 
              transactions: {
                type: 'reward',
                amount: rewardAmount,
                description: `Task completed: ${task.title}`,
                date: new Date(),
                taskId: task._id
              } 
            }
          },
          { session }
        );
        
        user = await db.collection('users').findOne({ _id: assigneeId }, { session });
        
        if (task.goalId) {
          const goalId = typeof task.goalId === 'string' ? new ObjectId(task.goalId) : task.goalId;
          const goal = await db.collection('goals').findOne({ _id: goalId }, { session });
          
          if (goal) {
            const remainingNeeded = Math.max(0, goal.price - goal.allocatedAmount);
            
            if (remainingNeeded > 0) {
              const amountToAllocate = Math.min(remainingNeeded, user.balance);
              
              if (amountToAllocate > 0) {
                await db.collection('users').updateOne(
                  { _id: assigneeId },
                  { 
                    $inc: { balance: -amountToAllocate },
                    $push: { 
                      transactions: {
                        type: 'allocation',
                        amount: -amountToAllocate,
                        description: `Auto-allocated to goal: ${goal.title}`,
                        date: new Date(),
                        taskId: task._id,
                        goalId: goalId
                      } 
                    }
                  },
                  { session }
                );
                
                const newAllocated = goal.allocatedAmount + amountToAllocate;
                const newProgress = Math.min(100, Math.round((newAllocated / goal.price) * 100));
                
                await db.collection('goals').updateOne(
                  { _id: goalId },
                  { 
                    $set: { 
                      allocatedAmount: newAllocated,
                      progress: newProgress,
                      updatedAt: new Date(),
                      status: newProgress >= 100 ? 'ready' : goal.status
                    } 
                  },
                  { session }
                );
                
                goalUpdated = true;
                updatedGoal = await db.collection('goals').findOne({ _id: goalId }, { session });
              }
            }
          }
        }
      }
      
      const updatedTask = await db.collection('tasks').findOne(
        { _id: task._id },
        { session }
      );
      
      let finalUserBalance = null;
      if (user) {
        const finalUser = await db.collection('users').findOne(
          { _id: user._id },
          { session }
        );
        finalUserBalance = finalUser.balance;
      }
      
      result = {
        success: true,
        message: 'Task completed successfully',
        task: updatedTask,
        goalUpdated,
        goal: updatedGoal,
        userBalance: finalUserBalance
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}
  static async updateStatus(taskId, newStatus) {
    if (newStatus === 'completed') {
      return this.completeTask(taskId);
    }
    
    const db = getDB();
    const result = await db.collection('tasks').updateOne(
      { _id: new ObjectId(taskId) },
      { 
        $set: { 
          status: newStatus,
          updatedAt: new Date() 
        } 
      }
    );
    
    return { 
      success: result.modifiedCount === 1,
      message: result.modifiedCount === 1 ? 'Task status updated' : 'Task not found or not modified'
    };
  }
}

module.exports = TaskModel;