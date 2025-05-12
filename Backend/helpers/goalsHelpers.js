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
      progress: parseFloat(goalData.progress || 0)
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
      
      updateData.progress = Math.min(100, (amountAchieved / totalRequired) * 100);
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
    
    const assignedTotal = tasks.reduce((sum, task) => sum + (parseFloat(task.amount) || 0), 0);
    return assignedTotal;
  } catch (error) {
    console.error('Error getting assigned funds for goal:', error);
    return 0;
  }
};

const updateGoalProgress = async (goalId) => {
  try {
    const db = getDB();
    if (typeof goalId === 'string') goalId = new ObjectId(goalId);
    
    const goal = await findGoalById(goalId);
    if (!goal) throw new Error('Goal not found');
    
    const assignedAmount = await getAssignedFundsForGoal(goalId);
    const progress = Math.min(100, (assignedAmount / goal.totalRequired) * 100);
    
    return await updateGoal(goalId, {
      amountAchieved: assignedAmount,
      progress: progress
    });
  } catch (error) {
    console.error('Error updating goal progress:', error);
    return { success: false, error: error.message };
  }
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
  updateGoalProgress
};