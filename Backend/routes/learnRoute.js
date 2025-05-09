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

    const blogDocs = await db.collection('learnings')
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    const blogs = blogDocs.map(blog => ({
      ...blog,
      stringId: blog._id.toString()
    }));

    const progressDocs = await progressCollection.find({
      userId: new ObjectId(userId)
    }).toArray();

    const blogProgressMap = {};
    progressDocs.forEach(doc => {
      blogProgressMap[doc.blogId.toString()] = doc.status;
    });

    res.render("learn/learnHome", {
      blogs,
      blogProgressMap,
      user: req.session.user,
      currentPage: 'learn',
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild,
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).render('learn/learnHome', {
      blogs: [],
      user: req.session.user,
      blogProgressMap: {},
      error: 'Failed to fetch blogs',
      currentPage: 'learn',
      viewingAsChild: req.viewingChild ? true : false,
      viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
      child: req.viewingChild,
        });
  }
});

// GET /learn/view/:id
router.get('/learn/view/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) {
    console.error('Invalid ObjectId format:', id);
    return res.status(400).send('Invalid article ID');
  }

  try {
    const blog = await Learning.findById(req.params.id);
    if (!blog) return res.status(404).send('Article not found');

    res.render('learn/learnEach', {
      blog,
      user: req.session.user,
      currentPage: 'learn'
    });
  } catch (err) {
    console.error('Invalid ID:', err);
    res.status(400).send('Invalid article ID');
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

module.exports = router;
