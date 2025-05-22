const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../db/connection');
const { ensureAuthenticated } = require('../helpers/authHelpers');
const Learning = require('../db/learnModel');

router.get('/learn', ensureAuthenticated, async (req, res) => {
  try {
    const rawUserId = req.session.user._id || req.session.user.id;
    const userId = typeof rawUserId === 'string' ? new ObjectId(rawUserId) : rawUserId;
    const userType = req.session.user.accountType;
    
    let modules = [];
    const db = getDB();
    
    if (userType === 'child') {
      modules = await db.collection('learnings')
        .find({ assigneeId: userId })
        .sort({ createdAt: -1 })
        .toArray();
    } else if (req.viewingChild) {
      modules = await db.collection('learnings')
        .find({ assigneeId: new ObjectId(req.viewingChild._id) })
        .sort({ createdAt: -1 })
        .toArray();
    } else {
      const familyChildren = await db.collection('users')
        .find({ 
          familyId: new ObjectId(req.session.user.familyId),
          accountType: 'child'
        })
        .project({ _id: 1 })
        .toArray();
        
      const childIds = familyChildren.map(c => c._id);
      
      modules = await db.collection('learnings')
        .find({ 
          $or: [
            { assigneeId: { $in: childIds } },
            { posterId: userId }
          ]
        })
        .sort({ createdAt: -1 })
        .toArray();
      
      const uniqueIds = new Set();
      modules = modules.filter(module => {
        const id = module._id.toString();
        if (uniqueIds.has(id)) return false;
        uniqueIds.add(id);
        return true;
      });
    }
    
    const progressMap = {};
    const progressUserId = req.viewingChild ? req.viewingChild._id.toString() : userId.toString();
    
    modules.forEach(module => {
      if (module.userProgress && Array.isArray(module.userProgress)) {
        const userProgress = module.userProgress.find(p => p.userId.toString() === progressUserId);
        if (userProgress) {
          progressMap[module._id.toString()] = {
            status: userProgress.status,
            reflection: userProgress.reflection || ''
          };
        }
      }
    });
    
    const modulesWithProgress = modules.map(module => ({
      ...module,
      stringId: module._id.toString(),
      status: progressMap[module._id.toString()]?.status || 'new'  
    }));

    modulesWithProgress.sort((a, b) => {
    const statusOrder = status => {
      const normalized = status?.toLowerCase();
      if (normalized === 'completed' || normalized === 'complete') return 2;
      if (normalized === 'to do') return 1;
      return 0; // 'new' or unknown
    };

    return statusOrder(a.status) - statusOrder(b.status);
    });
    
    res.render("learn/learnHome", {
      blogs: modulesWithProgress,
      blogProgressMap: progressMap,
      user: req.session.user,
      currentPage: 'learn',
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild,
    });
  } catch (error) {
    console.error('Error fetching learning modules:', error);
    res.status(500).render('learn/learnHome', {
      blogs: [],
      user: req.session.user,
      blogProgressMap: {},
      error: 'Failed to fetch learning content',
      currentPage: 'learn',
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild,
    });
  }
});


router.get('/learn/view/:id', ensureAuthenticated, async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    console.error('Invalid ObjectId format:', id);
    return res.status(400).send('Invalid article ID');
  }
  try {
    const db = getDB();
    const blog = await Learning.findById(id);
    
    if (!blog) {
      return res.status(404).send('Learning module not found');
    }
    
     let userId;
    if (req.viewingChild) {
      userId = req.viewingChild._id;
    } else {
      userId = req.session.user._id || req.session.user.id;
    }
    
    if (!userId) {
      return res.status(403).send('User not authenticated properly');
    }
    
    const userObjectId = typeof rawUserId === 'string' ? new ObjectId(userId) : userId;
    const userIdStr = userObjectId.toString();
    
    let userProgress = null;
    if (blog.userProgress && Array.isArray(blog.userProgress)) {
      userProgress = blog.userProgress.find(p => {
        if (!p || !p.userId) return false;
        
        const progressUserId = typeof p.userId === 'string' ? p.userId : p.userId.toString();
        return progressUserId === userIdStr;
      });
    }
    
    const existingResponse = await db.collection('responses').findOne({
      blogId: new ObjectId(id),
      userId: userObjectId
    });
    const hasSubmitted = !!existingResponse;
    
    if (!userProgress && req.session.user.accountType === 'child') {
      const newProgress = {
        userId: userObjectId,
        status: 'to do',
        reflection: '',
        lastAccessedAt: new Date(),
        completedAt: null
      };
      
      await db.collection('learnings').updateOne(
        { _id: new ObjectId(id) },
        { $push: { userProgress: newProgress } }
      );
      
      userProgress = newProgress;
    } else if (userProgress && userProgress.status === 'new') {
      await db.collection('learnings').updateOne(
        { 
          _id: new ObjectId(id),
          "userProgress.userId": userObjectId
        },
        { 
          $set: { 
            "userProgress.$.status": 'to do',
            "userProgress.$.lastAccessedAt": new Date()
          } 
        }
      );
      
      userProgress.status = 'to do';
    }
    
    res.render('learn/learnEach', {
      blog,
      user: req.session.user,
      currentPage: 'learn',
      hasSubmitted,
      progress: userProgress || { status: 'new' },
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild

    });
  } catch (err) {
    console.error('Error loading learning module:', err);
    res.status(500).send('Failed to load learning module');
  }
});

router.post('/progress/:blogId', ensureAuthenticated, async (req, res) => {
  try {
    const { blogId } = req.params;
    const { status, reflection } = req.body;
    const rawUserId = req.session.user?._id || req.session.user?.id;
    
    if (!rawUserId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    
    const userId = typeof rawUserId === "string" ? new ObjectId(rawUserId) : rawUserId;
    
      const result = await Learning.updateStatus(userId, blogId.toString(), 'completed', reflection);
    
    res.json(result);
  } catch (err) {
    console.error('Error updating progress:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/learn/response/:articleId', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const sessionUser = req.session.user;
    
    const rawUserId = sessionUser?._id || sessionUser?.id;
    if (!rawUserId) {
      console.error("No user ID in session.");
      return res.status(403).send("Unauthorized");
    }
    const userId = typeof rawUserId === 'string' ? new ObjectId(rawUserId) : rawUserId;
    const blogId = new ObjectId(req.params.articleId);
    const responseText = req.body.response;
    
    const existing = await db.collection('responses').findOne({
      blogId,
      userId
    });
    
    if (existing) {
      console.log("Response already exists for user:", userId.toString());
      return res.redirect('/learn/view/' + blogId);
    }
    
    await db.collection('responses').insertOne({
      blogId,
      userId,
      content: responseText,
      createdAt: new Date()
    });
    
    const result = await Learning.updateStatus(userId, blogId.toString(), 'completed', responseText);
    
    console.log("Response saved and status updated for user:", userId.toString());
    res.redirect('/learn/view/' + blogId);
  } catch (error) {
    console.error("Error saving response:", error);
    res.status(500).send("Server error");
  }
});

router.get('/learn/new', ensureAuthenticated, (req, res) => {
  if (req.session.user.accountType !== 'parent') {
    return res.redirect('/learn');
  }
    const child = req.viewingChild || null;
  
  res.render('learn/learnNew', { 
    user: req.session.user,
    child: child,  
    viewingAsChild: req.viewingChild ? true : false,
    viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
    currentPage: 'learn'
  }); 
});


router.post('/learn/new', ensureAuthenticated, async (req, res) => {
  if (req.session.user.accountType !== 'parent') {
    return res.redirect('/learn');
  }
  try {
    const db = getDB();
    const { title, category, summary, content, reward } = req.body;
    
    if (!title || !category || !summary || !content) {
      return res.status(400).render('learn/learnNew', { 
        error: 'All fields are required',
        user: req.session.user
      });
    }
    
    let selectedChild;
    if (req.viewingChild) {
      selectedChild = req.viewingChild;
    } else {
      const children = await db.collection('users').find({
        familyId: new ObjectId(req.session.user.familyId),
        accountType: 'child'
      }).toArray();
      
      if (!children.length) {
        return res.status(400).render('learn/learnNew', { 
          error: 'No children found in your family to assign the learning module to.',
          user: req.session.user
        });
      }
      selectedChild = children[0];
    }
    
    const newLearning = {
      category: category,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      reward: Number(reward || 0),
      posterId: new ObjectId(req.session.user._id || req.session.user.id),
      assigneeId: new ObjectId(selectedChild._id),
      familyId: new ObjectId(req.session.user.familyId),
      createdAt: new Date(),
      updatedAt: new Date(),
      userProgress: [{
        userId: new ObjectId(selectedChild._id),
        status: 'new',
        reflection: '',
        lastAccessedAt: new Date(),
        completedAt: null
      }]
    };
    
    const result = await db.collection('learnings').insertOne(newLearning);
    
    if (result.acknowledged) {
      res.redirect('/learn');
    } else {
      throw new Error('Failed to create learning module');
    }
  } catch (error) {
    console.error("Error creating learning module:", error);
    res.status(500).render('learn/learnNew', {
      error: 'Failed to create learning module',
      user: req.session.user
    });
  }
});

module.exports = router;