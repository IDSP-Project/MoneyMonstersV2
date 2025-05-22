const { getDB } = require('../db/connection');
const { ObjectId } = require('mongodb');
const User = require("../db/userModel.js");
const Goal = require("../db/goalModel.js");

const fetchGoalsForHome = async (userId, accountType = 'child') => {
  try {
    const db = getDB();
    let goals = [];
    
    if (accountType === 'child') {
      goals = await db.collection('goals')
        .find({ childId: userId.toString() })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
    } else if (accountType === 'parent') {
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      
      if (user && user.familyId) {
        const childrenInFamily = await db.collection('users').find({ 
          familyId: user.familyId, 
          accountType: 'child' 
        }).toArray();
        
        const childIds = childrenInFamily.map(child => child._id.toString());
        
        if (childIds.length > 0) {
          goals = await db.collection('goals')
            .find({ childId: { $in: childIds } })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();
        }
      } else {
        goals = await db.collection('goals')
          .find({ parentId: userId })
          .sort({ createdAt: -1 })
          .limit(1)
          .toArray();
      }
    }
    
    return goals;
  } catch (error) {
    console.error('Error fetching goals:', error);
    return [];
  }
};

function getGoalInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const findGoalById = async (goalId) => {
  try {
    const db = getDB();
    if (typeof goalId === 'string') goalId = new ObjectId(goalId);
    const goal = await db.collection('goals').findOne({ _id: goalId });
    return goal;
  } catch (error) {
    console.error('Error finding goal by ID:', error);
    return null;
  }
};

const findGoalsByChildId = async (childId) => {
  try {
    const db = getDB();
    const goals = await db.collection('goals')
      .find({ childId: childId.toString() })
      .sort({ createdAt: -1 })
      .toArray();
    return goals;
  } catch (error) {
    console.error('Error finding goals by child ID:', error);
    return [];
  }
};

const findGoalsByParentId = async (parentId, familyId = null) => {
  try {
    const db = getDB();
    let goals = [];
    
    if (familyId) {
      const childrenInFamily = await db.collection('users').find({ 
        familyId: new ObjectId(familyId), 
        accountType: 'child' 
      }).toArray();
      
      const childIds = childrenInFamily.map(child => child._id.toString());
      
      if (childIds.length > 0) {
        goals = await db.collection('goals')
          .find({ childId: { $in: childIds } })
          .sort({ createdAt: -1 })
          .toArray();
      }
    } else {
      goals = await db.collection('goals')
        .find({ parentId: parentId })
        .sort({ createdAt: -1 })
        .toArray();
    }
    
    return goals;
  } catch (error) {
    console.error('Error finding goals by parent ID:', error);
    return [];
  }
};

const createGoal = async (goalData) => {
  try {
    const db = getDB();
    
    const newGoal = {
      title: goalData.title,
      description: goalData.description || '',
      price: parseFloat(goalData.price),
      purchaseLink: goalData.purchaseLink || '',
      parentId: goalData.parentId,
      childId: goalData.childId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      totalRequired: parseFloat(goalData.totalRequired || goalData.price),
      amountAchieved: parseFloat(goalData.amountAchieved || 0),
      progress: parseFloat(goalData.progress || 0),
      completed: false,              
      completedAt: null,
      requestStatus: 'none'
    };
    
    const result = await db.collection('goals').insertOne(newGoal);
    if (result.acknowledged) {
      return { success: true, goal: {...newGoal, _id: result.insertedId} };
    } else {
      throw new Error('Failed to create goal');
    }
  } catch (error) {
    console.error('Error creating goal:', error);
    return { success: false, error: error.message };
  }
};

const updateGoal = async (goalId, updateData) => {
  try {
    const db = getDB();
    if (typeof goalId === 'string') goalId = new ObjectId(goalId);
    
    updateData.updatedAt = new Date();
    
    if (updateData.amountAchieved !== undefined || updateData.totalRequired !== undefined) {
      const currentGoal = await findGoalById(goalId);
      if (!currentGoal) throw new Error('Goal not found');
      
      const totalRequired = updateData.totalRequired !== undefined 
        ? parseFloat(updateData.totalRequired) 
        : currentGoal.totalRequired;
        
      const amountAchieved = updateData.amountAchieved !== undefined 
        ? parseFloat(updateData.amountAchieved) 
        : currentGoal.amountAchieved;
      
      const newProgress = Math.min(100, Math.round((amountAchieved / totalRequired) * 100));
      updateData.progress = newProgress;
      
      const isCompleted = newProgress >= 100;
      updateData.completed = isCompleted;
      
      if (isCompleted && !currentGoal.completed) {
        updateData.completedAt = new Date();
        
        if (currentGoal.status !== 'ready') {
          updateData.status = 'ready';
        }
      }
    }
    
    const result = await db.collection('goals').updateOne(
      { _id: goalId },
      { $set: updateData }
    );
    
    return { 
      success: result.modifiedCount === 1,
      modifiedCount: result.modifiedCount 
    };
  } catch (error) {
    console.error('Error updating goal:', error);
    return { success: false, error: error.message };
  }
};

const deleteGoal = async (goalId) => {
  try {
    const db = getDB();
    if (typeof goalId === 'string') goalId = new ObjectId(goalId);
    
    const result = await db.collection('goals').deleteOne({ _id: goalId });
    return { 
      success: result.deletedCount === 1,
      deletedCount: result.deletedCount 
    };
  } catch (error) {
    console.error('Error deleting goal:', error);
    return { success: false, error: error.message };
  }
};

const getAssignedFundsForGoal = async (goalId) => {
  try {
    const db = getDB();
    if (typeof goalId === 'string') goalId = new ObjectId(goalId);
    
    const tasks = await db.collection('tasks').find({
      goalId: goalId,
      status: 'completed'
    }).toArray();
    
    const assignedTotal = tasks.reduce((sum, task) => sum + (parseFloat(task.reward) || 0), 0);
    return assignedTotal;
  } catch (error) {
    console.error('Error getting assigned funds for goal:', error);
    return 0;
  }
};

const updateGoalProgress = async (goalId, options = {}) => {
  try {
    const db = getDB();
    if (typeof goalId === 'string') goalId = new ObjectId(goalId);
    
    if (options.existingGoal && options.skipCalculation) {
      return { success: true, goal: options.existingGoal };
    }
    
    const goal = await findGoalById(goalId);
    if (!goal) throw new Error('Goal not found');
    

    if (goal.uniqueMarker && goal.uniqueMarker.includes('task-') &&
        goal.lastUpdateSource === 'taskCompletion') {
      const lastUpdateTime = new Date(goal.lastUpdateTimestamp || goal.updatedAt);
      const now = new Date();
      const secondsSinceUpdate = (now - lastUpdateTime) / 1000;
      
      if (secondsSinceUpdate < 5) {
        return { 
          success: true, 
          message: 'Skipped update to preserve task completion changes',
          goal: goal
        };
      }
    }
    
    const assignedAmount = await getAssignedFundsForGoal(goalId);
    const progress = Math.min(100, Math.round((assignedAmount / goal.totalRequired) * 100));
    
    
    if (Math.abs(assignedAmount - goal.amountAchieved) < 0.01 && 
        Math.abs(progress - goal.progress) < 1) {
      return { 
        success: true, 
        message: 'No change needed',
        goal: goal
      };
    }
    
    const isCompleted = progress >= 100;
    const updateObj = {
      amountAchieved: assignedAmount,
      progress: progress,
      completed: isCompleted,
      lastUpdateSource: 'taskCalculation',
      lastUpdateTimestamp: new Date().toISOString()
    };
    
    if (isCompleted && !goal.completed) {
      updateObj.completedAt = new Date();
      
      if (goal.status !== 'ready') {
        updateObj.status = 'ready';
      }
    }
    
    updateObj.uniqueMarker = `calculation-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
    const updateResult = await updateGoal(goalId, updateObj);
    
    const updatedGoal = await findGoalById(goalId);
    return { 
      ...updateResult,
      goal: updatedGoal 
    };
  } catch (error) {
    console.error('Error updating goal progress:', error);
    return { success: false, error: error.message };
  }
};

const isGoalCompleted = async (goalId) => {
  try {
    const goal = await findGoalById(goalId);
    if (!goal) return false;
    
    return goal.completed === true;
  } catch (error) {
    console.error('Error checking if goal is completed:', error);
    return false;
  }
};

const findPendingRequests = async (childIds) => {
  const db = getDB();
  const ids = childIds.map(id => id.toString());
  return db.collection('goals')
    .find({ childId: { $in: ids }, requestStatus: 'pending' })
    .sort({ createdAt: -1 })
    .toArray();
};

module.exports = {
  fetchGoalsForHome,
  getGoalInitials,
  findGoalById,
  findGoalsByChildId,
  findGoalsByParentId,
  createGoal,
  updateGoal,
  deleteGoal,
  getAssignedFundsForGoal,
  updateGoalProgress,
  isGoalCompleted,
  findPendingRequests
};