
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../db/connection');
const Learning = require('../db/learnModel');
const { ensureAuthenticated } = require('../helpers/authHelpers');

// GET /learn
router.get('/learn', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.session.user._id;
    const progressCollection = db.collection("user_blog_progress");

    const blogDocs = await db.collection('learnings').find().sort({ createdAt: -1 }).toArray();
    const progressDocs = await progressCollection.find({ userId: new ObjectId(userId) }).toArray();

    const completedBlogIds = new Set(progressDocs.map(p => p.blogId.toString()));

    const todoBlogs = blogDocs.filter(b => !completedBlogIds.has(b._id.toString()));
    const completedBlogs = blogDocs.filter(b => completedBlogIds.has(b._id.toString()));

    res.render('learn/learnHome', {
      todoBlogs,
      completedBlogs,
      user: req.session.user,
      currentPage: 'learn'
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).render('learn/learnHome', {
      todoBlogs: [],
      completedBlogs: [],
      user: req.session.user,
      currentPage: 'learn',
      error: 'Failed to fetch blogs'
    });
  }
});

// GET /learn/view/:id
router.get('/learn/view/:id', ensureAuthenticated, async (req, res) => {
  const db = getDB();
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    console.error('Invalid ObjectId format:', id);
    return res.status(400).send('Invalid article ID');
  }

  try {
    const blog = await db.collection('learnings').findOne({ _id: new ObjectId(id) });

    if (!blog) {
      return res.status(404).send('Article not found');
    }

    res.render('learn/learnEach', {
      blog,
      user: req.session.user,
      currentPage: 'learn'
    });
  } catch (err) {
    console.error('Error loading article:', err);
    res.status(500).send('Failed to load article');
  }
});

// POST /learn/progress/:blogId
router.post("/progress/:blogId", ensureAuthenticated, async (req, res) => {
  const db = getDB();
  const { blogId } = req.params;
  const { status } = req.body;
  const userId = req.session.user._id;

  try {
    await db.collection("user_blog_progress").updateOne(
      {
        blogId: new ObjectId(blogId),
        userId: new ObjectId(userId)
      },
      {
        $set: {
          blogId: new ObjectId(blogId),
          userId: new ObjectId(userId),
          status
        }
      },
      { upsert: true }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("Error saving progress:", err);
    res.status(500).send("DB update failed");
  }
});

// POST /learn/complete/:id
router.post('/complete/:id', ensureAuthenticated, async (req, res) => {
  const db = getDB();
  const blogId = req.params.id;
  const userId = req.session.user._id;

  try {
    await db.collection("user_blog_progress").updateOne(
      {
        blogId: new ObjectId(blogId),
        userId: new ObjectId(userId)
      },
      {
        $set: {
          blogId: new ObjectId(blogId),
          userId: new ObjectId(userId),
          status: "Complete"
        }
      },
      { upsert: true }
    );

    res.redirect('/learn');
  } catch (err) {
    console.error("Error marking article as complete:", err);
    res.status(500).send("Failed to mark article as complete.");
  }
});

module.exports = router;
