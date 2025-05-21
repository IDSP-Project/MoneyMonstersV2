
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../helpers/authHelpers');
const { getGoalInitials, findGoalsByChildId, findGoalsByParentId } = require('../helpers/goalsHelpers');
const dashboardHelpers = require('../helpers/dashboardHelpers');

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const activeUserInfo = dashboardHelpers.getActiveUser(req);
    const userId = activeUserInfo.userId;
    const userType = activeUserInfo.userType;
    const isViewingAsChild = activeUserInfo.isViewingAsChild;
    
    const familyId = req.session.user.familyId;
    const childId = isViewingAsChild ? userId : null;
    
    let tasks = [];
    let goals = [];
    let learningProgress = [];
    
    tasks = await dashboardHelpers.fetchTasks(userType, userId, familyId);
    
    if (userType === 'child') {
      goals = await findGoalsByChildId(userId);
    } else {
      goals = await findGoalsByParentId(userId, familyId);
    }
    goals = goals.slice(0, 3);
    
    learningProgress = await dashboardHelpers.fetchLearningModules(userType, userId, childId, familyId);
    
    await dashboardHelpers.updateBalanceInfo(req);
    
    res.render('dashboard/home', {
      user: req.session.user, 
      tasks,
      goals,
      learningProgress,
      viewingAsChild: isViewingAsChild,
      child: req.viewingChild,
      currentPage: 'dashboard',
      getInitials: getGoalInitials 
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

router.post("/balance/add", ensureAuthenticated, async (req, res) => {
  try {
    let targetId;
    
    if (req.viewingChild) {
      if (req.viewingChild._id) {
        targetId = req.viewingChild._id;
      } else if (req.viewingChild.id) {
        targetId = req.viewingChild.id;
      }
    } else {
      if (req.session.user._id) {
        targetId = req.session.user._id;
      } else if (req.session.user.id) {
        targetId = req.session.user.id;
      }
    }
    
    await dashboardHelpers.updateBalance(targetId, Number(req.body.amount), true);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error adding balance:", error);
    res.redirect("/dashboard");
  }
});

router.post("/balance/remove", ensureAuthenticated, async (req, res) => {
  try {
    let targetId;
    
    if (req.viewingChild) {
      if (req.viewingChild._id) {
        targetId = req.viewingChild._id;
      } else if (req.viewingChild.id) {
        targetId = req.viewingChild.id;
      }
    } else {
      if (req.session.user._id) {
        targetId = req.session.user._id;
      } else if (req.session.user.id) {
        targetId = req.session.user.id;
      }
    }
    
    await dashboardHelpers.updateBalance(targetId, Number(req.body.amount), false);
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error removing balance:", error);
    res.redirect("/dashboard");
  }
});

module.exports = router;