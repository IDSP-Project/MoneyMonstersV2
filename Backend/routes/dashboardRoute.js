const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');
const { ObjectId } = require('mongodb'); 
const { ensureAuthenticated, checkViewingAsChild } = require('../helpers/authHelpers');
const { fetchGoalsForHome } = require('../helpers/goalsHelpers');
const { fetchFamilyTasksForHome, formatTaskDueDate } = require('../helpers/taskHelpers');
const user = require('../db/userModel');

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    let userId;
    let userType;
    let childId = null;
    
    if (req.viewingChild) {
      userId = req.viewingChild._id || req.viewingChild.id;
      childId = userId;
      userType = 'child';
    } else {
      userId = req.session.user._id || req.session.user.id; 
      userType = req.session.user.accountType;
    }
    
    let tasks = [];
    let goals = [];
    let learningProgress = [];
    const db = getDB();
    
    try {
      if (userType === 'child') {
        const rawTasks = await db.collection('tasks')
          .find({ assigneeId: new ObjectId(userId) })
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();
        
        tasks = rawTasks.map(task => ({
          ...task,
          price: task.reward,
          formattedDue: formatTaskDueDate(task.dueDate),
          status: task.status || (task.completed ? 'completed' : 'new')
        }));
      } else if (userType === 'parent') {
        if (req.session.user.familyId) {
          tasks = await fetchFamilyTasksForHome(req.session.user.familyId);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      tasks = [];
    }
    
    try {
      
      const queryId = new ObjectId(userId);
      
      if (userType === 'child') {
        const childGoals = await db.collection('goals')
          .find({ childId: queryId })
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();
        
        goals = childGoals.map(goal => ({
          ...goal,
          progress: goal.progress || 0,
          targetAmount: goal.targetAmount || 0,
          remainingAmount: (goal.targetAmount || 0) - (goal.progress || 0)
        }));
      } else if (userType === 'parent') {
        if (req.session.user.familyId) {
          const familyGoals = await db.collection('goals')
            .find({ familyId: new ObjectId(req.session.user.familyId) })
            .sort({ createdAt: -1 })
            .limit(3)
            .toArray();
          
          goals = familyGoals.map(goal => ({
            ...goal,
            progress: goal.progress || 0,
            targetAmount: goal.targetAmount || 0,
            remainingAmount: (goal.targetAmount || 0) - (goal.progress || 0)
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      goals = [];
    }
    
    if (userType === 'child') {
      try {
        
        const childUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        const ageGroup = childUser?.ageGroup || 'all';
        
        const modules = await db.collection('learningModules')
          .find({ 
            ageGroup: { $in: [ageGroup, 'all'] },
            active: true 
          })
          .limit(3)
          .toArray();
        
        const progress = await db.collection('learningProgress')
          .find({ userId: new ObjectId(userId) })
          .toArray();
        
        learningProgress = modules.map(module => {
          const userProgress = progress.find(p => 
            p.moduleId.toString() === module._id.toString()
          );
          
          return {
            ...module,
            completed: userProgress?.completed || false,
            percentComplete: userProgress?.percentComplete || 0,
            lastAccessedAt: userProgress?.lastAccessedAt || null
          };
        });
        
      } catch (error) {
        console.error('Error fetching learning content:', error);
        learningProgress = [];
      }
    }
    
 
  res.render('dashboard/home', {
  user: req.session.user,
  tasks,
  goals,
  learningProgress,
  viewingAsChild: req.viewingChild ? true : false,
  viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
  child: req.viewingChild, 
  currentPage: 'dashboard'
});
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('dashboard/home', {
      user: req.session.user,
      tasks: [],
      goals: [],
      learningProgress: [],
      error: 'Failed to load dashboard data',
      currentPage: 'dashboard'
    });
  }
});


// POST /balance/add
router.post("/balance/add", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await user.findById(userId);
    const amount = Number(req.body.amount);

    const newBalance = (user.balance || 0) + amount;

    await User.updateUser(userId, { balance: newBalance });

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error adding balance:", error);
    res.redirect("/dashboard");
  }
});

// POST /balance/remove
router.post("/balance/remove", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    const amount = Number(req.body.amount);

    const newBalance = Math.max(0, (user.balance || 0) - amount); // prevent negative

    await User.updateUser(userId, { balance: newBalance });

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error removing balance:", error);
    res.redirect("/dashboard");
  }
});

module.exports = router;
