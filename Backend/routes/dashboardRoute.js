const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');
const { ObjectId } = require('mongodb'); 
const { ensureAuthenticated, checkViewingAsChild } = require('../helpers/authHelpers');
const { findGoalsByChildId, findGoalsByParentId, getGoalInitials } = require('../helpers/goalsHelpers');
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
          tasks = tasks.slice(0, 3);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      tasks = [];
    }
    
    try {
      if (userType === 'child') {
        goals = await findGoalsByChildId(userId);
      } else if (userType === 'parent') {
        const familyId = req.session.user.familyId;
        goals = await findGoalsByParentId(userId, familyId);
      }
      
      goals = goals.slice(0, 3);
    } catch (error) {
      console.error('Error fetching goals:', error);
      goals = [];
    }
    
    try {
      if (userType === 'child') {
        const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
        
        const modules = await db.collection('learnings')
          .find({ assigneeId: userIdObj })
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();
        
        learningProgress = modules.map(module => {
          const userProgress = module.userProgress?.find(p => 
            p.userId.toString() === userIdObj.toString()
          );
          
          return {
            _id: module._id,
            title: module.title,
            category: module.category,
            summary: module.summary,
            completed: userProgress?.status === 'completed',
            status: userProgress?.status || 'new'
          };
        });
      } 
      else if (userType === 'parent') {
        if (req.viewingChild) {
          const childIdObj = typeof childId === 'string' ? new ObjectId(childId) : childId;
          
          const modules = await db.collection('learnings')
            .find({ assigneeId: childIdObj })
            .sort({ createdAt: -1 })
            .limit(3)
            .toArray();
            
          learningProgress = modules.map(module => {
            const userProgress = module.userProgress?.find(p => 
              p.userId.toString() === childIdObj.toString()
            );
            
            return {
              _id: module._id,
              title: module.title,
              category: module.category,
              summary: module.summary,
              completed: userProgress?.status === 'completed',
              status: userProgress?.status || 'new'
            };
          });
        } 
        else {
          const familyId = req.session.user.familyId;
          if (!familyId) {
            learningProgress = [];
          } else {
            const familyIdObj = typeof familyId === 'string' ? new ObjectId(familyId) : familyId;
            
            const familyChildren = await db.collection('users')
              .find({ 
                familyId: familyIdObj,
                accountType: 'child'
              })
              .project({ _id: 1, firstName: 1 })
              .toArray();
            
            const childIds = familyChildren.map(c => c._id);
            
            const modules = await db.collection('learnings')
              .find({ 
                $or: [
                  { assigneeId: { $in: childIds } },
                  { posterId: typeof userId === 'string' ? new ObjectId(userId) : userId }
                ]
              })
              .sort({ createdAt: -1 })
              .limit(5)
              .toArray();
            
            learningProgress = modules.map(module => {
              const assignedChild = familyChildren.find(c => 
                c._id.toString() === module.assigneeId.toString()
              );
              
              const userProgress = module.userProgress?.find(p => 
                assignedChild && p.userId.toString() === assignedChild._id.toString()
              );
              
              return {
                _id: module._id,
                title: module.title,
                category: module.category,
                childName: assignedChild?.firstName || 'Unknown',
                completed: userProgress?.status === 'completed',
                status: userProgress?.status || 'new'
              };
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching learning content:', error);
      learningProgress = [];
    }
    
    try {
      const userIdObj = typeof userId === 'string' ? new ObjectId(userId) : userId;
      
      if (req.viewingChild && req.viewingChild._id) {
        const childUser = await db.collection('users').findOne({ 
          _id: userIdObj
        });
        
        if (childUser) {
          req.viewingChild.balance = childUser.balance || 0;
        }
      } 
      else {
        const currentUser = await db.collection('users').findOne({
          _id: userIdObj
        });
        
        if (currentUser) {
          req.session.user.balance = currentUser.balance || 0;
        }
      }
    } catch (error) {
      console.error('Error updating user balance:', error);
    }
    
    res.render('dashboard/home', {
      user: req.session.user, 
      tasks,
      goals,
      learningProgress,
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      viewingChildBalance: req.viewingChild ? req.viewingChild.balance : null,
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
    const db = getDB();
    let targetId;
    
    if (req.viewingChild) {
      targetId = req.viewingChild._id || req.viewingChild.id;
    } else {
      targetId = req.session.user._id || req.session.user.id;
    }
    
    const queryId = typeof targetId === 'string' ? new ObjectId(targetId) : targetId;
    const user = await db.collection('users').findOne({ _id: queryId });
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

router.post("/balance/remove", ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    let targetId;
    
    if (req.viewingChild) {
      targetId = req.viewingChild._id || req.viewingChild.id;
    } else {
      targetId = req.session.user._id || req.session.user.id;
    }
    
    const queryId = typeof targetId === 'string' ? new ObjectId(targetId) : targetId;
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
      
    const children = await db.collection('users').find({
      accountType: 'child',
      familyId: familyId
    }).toArray();
    
    const childMap = Object.fromEntries(children.map(child => [child._id.toString(), child.firstName]));
    const childIds = children.map(c => c._id);
    
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
      currentPage: 'dashboard'
    });
  } catch (error) {
    console.error('Error loading parent responses:', error);
    res.status(500).render('dashboard/parentResponses', { 
      responses: [],
      user: req.session.user,
      currentPage: 'dashboard'
    });
  }
});

module.exports = router;