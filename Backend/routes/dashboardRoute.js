const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');
const { ensureAuthenticated, checkViewingAsChild } = require('../helpers/authHelpers');
const { fetchGoalsForHome } = require('../helpers/goalsHelpers')


router.get('/dashboard', ensureAuthenticated, checkViewingAsChild, async (req, res) => {
  try {
    let userId;
    let userType;
    
    if (req.viewingChild) {
      userId = req.viewingChild._id || req.viewingChild.id;
      userType = 'child';
    } else {
      userId = req.session.user._id || req.session.user.id; 
      userType = req.session.user.accountType;
    }
    
    let tasks = [];
    let goals = [];
    let learningProgress = [];
    
    if (userType === 'child') {
      // tasks = await fetchTasksForHome(userId, 'child');
      goals = await fetchGoalsForHome(userId);
      // learningProgress = await fetchLearningProgressForHome(userId);
    } else if (userType === 'parent') {
      // const familyTasks = await fetchFamilyTasksForParent(req.session.user.familyId);
      tasks = familyTasks;
    }
    
    res.render('dashboard/home', {
      user: req.session.user,
      tasks,
      goals,
      learningProgress,
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
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
module.exports = router; 