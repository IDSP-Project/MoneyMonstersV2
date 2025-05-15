const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../helpers/authHelpers');
const { 
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
} = require('../helpers/goalsHelpers');
const { ObjectId } = require('mongodb');
const { getDB } = require('../db/connection');
const User = require('../db/userModel');



router.get('/goals/view/:goalId', ensureAuthenticated, async (req, res) => {
  try {
    const goalId = req.params.goalId;
    const goal = await findGoalById(goalId);
    
    if (!goal) {
      return res.status(404).render('goals/goalsEach', { 
        goal: null, 
        user: req.session.user, 
        error: 'Goal not found', 
        assignedTasks: [],
        assignedAmount: 0
      });
    }
    
    const db = getDB();
    const assignedTasks = await db.collection('tasks').find({ 
      goalId: new ObjectId(goalId) 
    }).toArray();
    
    const assignedAmount = await getAssignedFundsForGoal(goalId);
    
    res.render('goals/goalsEach', { 
      goal, 
      activeGoals: goal,
      user: req.session.user, 
      error: null, 
      assignedTasks,
      assignedAmount,
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild
    });
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).render('goals/goalsEach', { 
      goal: null, 
      user: req.session.user, 
      error: 'Failed to fetch goal', 
      assignedTasks: [],
      assignedAmount: 0,
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild
    });
  }
});

router.get('/goals/:goalId/data', ensureAuthenticated, async (req, res) => {
  try {
    const goalId = req.params.goalId;
    
    const db = getDB();
    const goal = await db.collection('goals').findOne({ _id: new ObjectId(goalId) });
    
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    
    const assignedAmount = await getAssignedFundsForGoal(goalId);
    goal.assignedAmount = assignedAmount;
    
    res.json(goal);
  } catch (error) {
    console.error('Error fetching goal data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch goal data'
    });
  }
});


router.post('/goals/:goalId/update-progress', ensureAuthenticated, async (req, res) => {
  try {
    const goalId = req.params.goalId;
    const result = await updateGoalProgress(goalId);
    
    if (result.success) {
      const updatedGoal = await findGoalById(goalId);
      
      res.json({ 
        success: true,
        goal: updatedGoal
      });
    } else {
      throw new Error('Failed to update goal progress');
    }
  } catch (error) {
    console.error('Error updating goal progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update goal progress' 
    });
  }
});

router.get('/goals/:childId', ensureAuthenticated, async (req, res) => {
  try {
    const goals = await findGoalsByChildId(req.params.childId);
    
    res.render('goals/goals', { 
      goals, 
      activeGoals: goals,
      user: req.session.user,
      childId: req.params.childId,
      currentPage: 'goals'
    });
  } catch (error) {
    console.error('Error fetching child goals:', error);
    res.status(500).render('goals/goals', { 
      goals: [], 
      user: req.session.user,
      error: 'Failed to fetch goals',
      currentPage: 'goals'
    });
  }
});

router.get('/goals', ensureAuthenticated, async (req, res) => {
  try {
    let goals = [];
    let userId;
    let userType;
    
    if (req.viewingChild) {
      userId = req.viewingChild._id || req.viewingChild.id;
      userType = 'child';
    } else {
      userId = req.session.user._id || req.session.user.id;
      userType = req.session.user.accountType;
    }
    
    if (userType === 'child') {
      goals = await findGoalsByChildId(userId);
    } else if (userType === 'parent') {
      const familyId = req.session.user.familyId;
      goals = await findGoalsByParentId(userId, familyId);
    }

    res.render('goals/goals', { 
      goals,
      activeGoals: goals,
      user: req.session.user,
      currentPage: 'goals',
      getInitials: getGoalInitials,
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild 
    });
  } catch (error) {
    res.status(500).render('goals/goals', { 
      goals: [], 
      user: req.session.user,
      error: 'Failed to fetch goals', 
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild,
    });
  }
});

router.post('/add', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const { title, description, price, purchaseLink, childId } = req.body;

    const childObjectId = new ObjectId(childId);
    const childUser = await db.collection('users').findOne({ _id: childObjectId });
    if (!childUser) {
      return res.status(404).json({ success: false, error: 'Child user not found' });
    }
    
    let parentIds = [];
    if (childUser.familyId) {
      const parentsInFamily = await db.collection('users').find({ 
        familyId: childUser.familyId, 
        accountType: 'parent' 
      }).toArray();
      
      parentIds = parentsInFamily.map(parent => parent._id);
    } 
    else if (childUser.parentId) {
      let oldParentIds = childUser.parentId;
      if (!Array.isArray(oldParentIds)) oldParentIds = [oldParentIds];
      parentIds = oldParentIds.map(id => (typeof id === 'string' ? new ObjectId(id) : id));
    }
    
    if (parentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'You must have a parent to create a goal.' });
    }

    const result = await createGoal({
      title,
      description,
      price,
      purchaseLink,
      parentId: parentIds,
      childId,
      totalRequired: price
    });

    res.json(result);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create goal' });
  }
});

router.post('/update/:goalId', ensureAuthenticated, async (req, res) => {
  try {
    const { status, amountAchieved, totalRequired } = req.body;
    const goalId = req.params.goalId;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (amountAchieved !== undefined) updateData.amountAchieved = parseFloat(amountAchieved);
    if (totalRequired !== undefined) updateData.totalRequired = parseFloat(totalRequired);
    
    const result = await updateGoal(goalId, updateData);
    
    if (result.success) {
      res.json({ success: true });
    } else {
      throw new Error('Goal not found or not modified');
    }
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update goal' 
    });
  }
});

router.delete('/:goalId', async (req, res) => {
  try {
    const result = await deleteGoal(req.params.goalId);
    
    if (result.success) {
      res.json({ success: true });
    } else {
      throw new Error('Goal not found');
    }
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete goal',
      currentPage: 'goals',
    });
  }
});


router.post('/goals/:goalId/assign-balance', ensureAuthenticated, async (req, res) => {
  try {
    const goalId = req.params.goalId;
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please enter a valid amount greater than 0'
      });
    }
    
    const goal = await findGoalById(goalId);
    if (!goal) {
      return res.status(404).json({ 
        success: false, 
        error: 'Goal not found'
      });
    }
    
    const userId = req.viewingChild || req.session.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found'
      });
    }
    
    if (user.balance < amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'You do not have enough balance'
      });
    }
    
    const remainingAmount = goal.totalRequired - goal.amountAchieved;
    if (amount > remainingAmount) {
      return res.status(400).json({ 
        success: false, 
        error: 'The amount exceeds what is needed for this goal'
      });
    }
    
    const newAmountAchieved = goal.amountAchieved + parseFloat(amount);
    
    await updateGoal(goalId, {
      amountAchieved: newAmountAchieved,
      progress: (newAmountAchieved / goal.totalRequired) * 100
    });
    
    await User.updateUser(userId, {
      balance: user.balance - parseFloat(amount)
    });
    
    if (req.session.user.id === userId) {
      req.session.user.balance = user.balance - parseFloat(amount);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning balance to goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to assign balance to goal'
    });
  }
});

router.post('/goals/:goalId/request', ensureAuthenticated, async (req, res) => {
  try {
    const goalId = req.params.goalId;
    const goal = await findGoalById(goalId);
    
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    
    const userId = req.session.user._id || req.session.user.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    if (goal.childId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to send request for this goal' });
    }
    
    if (!goal.completed) {
      return res.status(400).json({ success: false, error: 'Goal must be completed to send request' });
    }
    
    if (goal.requestStatus && goal.requestStatus !== 'none') {
      return res.status(400).json({ success: false, error: 'Request already exists for this goal' });
    }
    
    const result = await updateGoal(goalId, { requestStatus: 'pending' });
    
    if (result.success) {
      res.json({ success: true, message: 'Request sent successfully' });
    } else {
      throw new Error('Failed to update goal');
    }
  } catch (error) {
    console.error('Error sending request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/goals/:goalId/request-response', ensureAuthenticated, async (req, res) => {
  try {
    const goalId = req.params.goalId;
    const { response } = req.body; 
    
    if (!response || !['approved', 'denied'].includes(response)) {
      return res.status(400).json({ success: false, error: 'Invalid response' });
    }
    
    const goal = await findGoalById(goalId);
    
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const userId = req.session.user._id || req.session.user.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    
    const isParent = goal.parentId.some(id => id.toString() === userId.toString());
    if (!isParent) {
      return res.status(403).json({ success: false, error: 'Not authorized to respond to this request' });
    }
    
    if (goal.requestStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'No pending request for this goal' });
    }

    const db = getDB();
    const childUser = await db.collection('users').findOne({ _id: new ObjectId(goal.childId) });
    
    if (!childUser) {
      return res.status(404).json({ success: false, error: 'Child user not found' });
    }

    if (response === 'denied') {
      const newBalance = childUser.balance + goal.amountAchieved;
      await db.collection('users').updateOne(
        { _id: new ObjectId(goal.childId) },
        { $set: { balance: newBalance } }
      );

      await updateGoal(goalId, { 
        requestStatus: response,
        amountAchieved: 0,
        progress: 0,
        completed: false,
        completedAt: null
      });
    } else {
      await updateGoal(goalId, { requestStatus: response });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error responding to request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router };