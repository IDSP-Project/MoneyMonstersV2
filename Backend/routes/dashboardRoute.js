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
        req.session.user.balance = childUser?.balance ?? 0;
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
    const db = getDB();
    const userId = req.session.user._id || req.session.user.id;
    const queryId = typeof userId === 'string' ? new ObjectId(userId) : userId;

    const user = await db.collection('users').findOne({ _id: queryId });
//     const user = await user.findById(userId);
//     changed the code so balance add works
    const amount = Number(req.body.amount);

    const newBalance = (user?.balance || 0) + amount;

    await db.collection('users').updateOne(
      { _id: queryId },
      { $set: { balance: newBalance } }
    );

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error adding balance:", error);
    res.redirect("/dashboard");
  }
});


// POST /balance/remove
router.post("/balance/remove", ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user._id || req.session.user.id;
    const queryId = typeof userId === 'string' ? new ObjectId(userId) : userId;

    const user = await db.collection('users').findOne({ _id: queryId });
    const amount = Number(req.body.amount);

    const newBalance = Math.max(0, (user?.balance || 0) - amount);

    await db.collection('users').updateOne(
      { _id: queryId },
      { $set: { balance: newBalance } }
    );

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error removing balance:", error);
    res.redirect("/dashboard");
  }
});


router.get('/dashboard/responses', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();

    const user = req.session.user;
    if (!user || user.accountType !== 'parent' || !user.familyId) {
      return res.status(403).send("Unauthorized or no family assigned");
    }

    const familyId = typeof user.familyId === 'string'
      ? new ObjectId(user.familyId)
      : user.familyId;

    // Find all child users in this family
    const children = await db.collection('users').find({
      accountType: 'child',
      familyId: familyId
    }).toArray();

    const childMap = Object.fromEntries(children.map(child => [child._id.toString(), child.firstName]));
    const childIds = children.map(c => c._id);

    // Get all responses from children in the family
    const responses = await db.collection('responses').find({
      userId: { $in: childIds }
    }).toArray();

    const blogIds = [...new Set(responses.map(r => r.blogId))];
    const blogs = await db.collection('learnings').find({
      _id: { $in: blogIds }
    }).toArray();
    const blogMap = Object.fromEntries(blogs.map(b => [b._id.toString(), b.title]));

    const responseDetails = responses.map(r => ({
      content: r.content,
      createdAt: r.createdAt,
      blogTitle: blogMap[r.blogId.toString()],
      childName: childMap[r.userId?.toString()] || "Unknown"
    }));

    res.render('dashboard/parentResponses', {
    responses: responseDetails,
    user: req.session.user,
    currentPage: 'dashboard' // or 'responses' if you want different highlighting
  });

  } catch (error) {
    console.error('Error loading parent responses:', error);
    res.status(500).render('dashboard/parentResponses', { responses: [] });
  }
});




module.exports = router;
