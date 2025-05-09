const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');
const { ObjectId } = require('mongodb');
const { ensureAuthenticated } = require('../helpers/authHelpers');
const { fetchGoalsForHome } = require('../helpers/goalsHelpers');
const User = require("../db/userModel.js");


// Helper to get initials from a string for initials avatar
function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

router.get('/goals', ensureAuthenticated, async (req, res) => {
    try {
      const db = getDB();
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
        goals = await db.collection('goals')
          .find({ childId: userId.toString() })
          .sort({ createdAt: -1 })
          .toArray();
      } else if (userType === 'parent') {
        if (req.session.user.familyId) {
          const childrenInFamily = await db.collection('users').find({ 
            familyId: new ObjectId(req.session.user.familyId), 
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
            .find({ parentId: req.session.user.id })
            .sort({ createdAt: -1 })
            .toArray();
        }
      }
  
      res.render('goals/goals', { 
      goals,
      user: req.session.user,
      currentPage: 'goals',
      getInitials,
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


 router.get('/goals/:childId', ensureAuthenticated, async (req, res) => {
      try {
      const db = getDB();
      const goals = await db.collection('goals')
        .find({ childId: req.params.childId })
        .toArray();
      
      res.render('goals/goals', { 
        goals, 
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

    const newGoal = {
        title,
        description: description || '',
        price: parseFloat(price),
        purchaseLink: purchaseLink || '',
        parentId: parentIds, 
        childId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const result = await db.collection('goals').insertOne(newGoal);
    if (result.acknowledged) {
        res.json({ success: true, goal: newGoal });
    } else {
        throw new Error('Failed to create goal');
    }
} catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create goal' });
}
});


router.post('/update/:goalId', ensureAuthenticated, async (req, res) => {
    try {
      const db = getDB();
      const { status } = req.body;
      const goalId = new ObjectId(req.params.goalId);
  
      const result = await db.collection('goals').updateOne(
        { _id: goalId },
        { 
          $set: { 
            status,
            updatedAt: new Date() 
          }
        }
      );
  
      if (result.modifiedCount === 1) {
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
      const db = getDB();
      const goalId = new ObjectId(req.params.goalId);
  
      const result = await db.collection('goals').deleteOne({ _id: goalId });
  
      if (result.deletedCount === 1) {
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

// Route to view a single goal by ID
router.get('/goals/view/:goalId', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const goalId = req.params.goalId;
    const goal = await db.collection('goals').findOne({ _id: new ObjectId(goalId) });
    if (!goal) {
      return res.status(404).render('goals/goalsEach', { goal: null, user: req.session.user, error: 'Goal not found', assignedTasks: [] });
    }
    const assignedTasks = await db.collection('tasks').find({ goalId: new ObjectId(goalId) }).toArray();
    res.render('goals/goalsEach', { goal, user: req.session.user, error: null, assignedTasks });
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).render('goals/goalsEach', { goal: null, user: req.session.user, error: 'Failed to fetch goal', assignedTasks: [] });
  }
});

module.exports = { router, fetchGoalsForHome };