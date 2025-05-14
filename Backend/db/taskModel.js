const { ObjectId } = require('mongodb');
const { getDB } = require('../db/connection');
const Goal = require('../db/goalModel');

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
  
    try {
        console.log(`Starting task completion for taskId: ${taskId}`);
        
        const taskObjectId = typeof taskId === 'string' ? new ObjectId(taskId) : taskId;
        const task = await db.collection('tasks').findOne({ _id: taskObjectId });
        
        if (!task) {
            throw new Error('Task not found');
        }
        
        console.log(`Found task: ${task.title} with reward: ${task.reward}`);
        
        await db.collection('tasks').updateOne(
            { _id: task._id },
            { 
                $set: { 
                    completed: true, 
                    completedAt: new Date(),
                    status: 'completed',
                    updatedAt: new Date()
                } 
            }
        );
        
        console.log(`Task marked as completed`);
        
        let user = null;
        let goalUpdated = false;
        let updatedGoal = null;
        
        if (task.reward && task.assigneeId) {
            const rewardAmount = parseFloat(task.reward);
            const assigneeId = typeof task.assigneeId === 'string' ? 
                new ObjectId(task.assigneeId) : task.assigneeId;
            
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
                }
            );
            
            console.log(`Added ${rewardAmount} to user balance`);
            
            user = await db.collection('users').findOne({ _id: assigneeId });
            
            if (task.goalId) {
                const goalId = typeof task.goalId === 'string' ? 
                    new ObjectId(task.goalId) : task.goalId;
                
                console.log(`Processing goal ${goalId.toString()} allocation`);
                
                const goal = await db.collection('goals').findOne({ _id: goalId });
                
                if (goal) {
                    console.log(`Found goal: ${goal.title}`);
                    console.log(`Current goal state: amountAchieved=${goal.amountAchieved}, progress=${goal.progress}, completed=${goal.completed}`);
                    
                    const currentAmount = parseFloat(goal.amountAchieved || 0);
                    const taskAmount = parseFloat(task.reward || 0);
                    const newAmount = currentAmount + taskAmount;
                    const targetAmount = parseFloat(goal.totalRequired || goal.price || 0);
                    const newProgress = Math.min(100, Math.round((newAmount / targetAmount) * 100));
                    const isCompleted = newAmount >= targetAmount;
                    
                    console.log(`Goal update calculation:`, {
                        goalId: goalId.toString(),
                        currentAmount,
                        taskAmount,
                        newAmount,
                        targetAmount,
                        newProgress,
                        isCompleted
                    });
                    
                    await db.collection('users').updateOne(
                        { _id: assigneeId },
                        { 
                            $inc: { balance: -taskAmount },
                            $push: { 
                                transactions: {
                                    type: 'allocation',
                                    amount: -taskAmount,
                                    description: `Auto-allocated to goal: ${goal.title}`,
                                    date: new Date(),
                                    taskId: task._id,
                                    goalId: goalId
                                } 
                            }
                        }
                    );
                    
                    console.log(`Deducted ${taskAmount} from user balance for goal allocation`);
                    
                    // Use the Goal model instead of direct DB operations
                    const goalObj = new Goal(goal);
                    goalObj.addReward(taskAmount);
                    const saveResult = await goalObj.save();
                    
                    console.log(`Goal updated using Goal model, result:`, saveResult);
                    
                    updatedGoal = await db.collection('goals').findOne({ _id: goalId });
                    console.log(`Updated goal state:`, {
                        amountAchieved: updatedGoal.amountAchieved,
                        progress: updatedGoal.progress,
                        completed: updatedGoal.completed
                    });
                    
                    goalUpdated = true;
                } else {
                    console.error(`Goal with ID ${goalId.toString()} not found`);
                }
            }
        }
        
        let finalUserBalance = null;
        if (user) {
            const finalUser = await db.collection('users').findOne({ _id: user._id });
            finalUserBalance = finalUser.balance;
        }
        
        return {
            success: true,
            message: 'Task completed successfully',
            task: await db.collection('tasks').findOne({ _id: task._id }),
            goalUpdated,
            goal: updatedGoal,
            userBalance: finalUserBalance
        };
    } catch (error) {
        console.error('Error in completeTask:', error);
        throw error;
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