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
    const rawUserId = req.session.user._id || req.session.user.id;
    const userId = typeof rawUserId === 'string' ? new ObjectId(rawUserId) : rawUserId;

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
router.get('/learn/view/:id', ensureAuthenticated, async (req, res) => {
  const db = getDB();
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    console.error('Invalid ObjectId format:', id);
    return res.status(400).send('Invalid article ID');
  }

  try {
    const blog = await db.collection('learnings').findOne({ _id: new ObjectId(id) });

    const userId = req.session.user._id;
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

    const existingResponse = await db.collection('responses').findOne({
      blogId: new ObjectId(id),
      userId: userObjectId
    });

    const hasSubmitted = !!existingResponse;

    res.render('learn/learnEach', {
      blog,
      user: req.session.user,
      currentPage: 'learn',
      hasSubmitted
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

  const rawUserId = req.session.user?._id || req.session.user?.id;
  if (!rawUserId) {
    console.error("❌ No user ID in session.");
    return res.status(403).send("Unauthorized");
  }

  const userId = typeof rawUserId === "string" ? new ObjectId(rawUserId) : rawUserId;

  try {
    console.log("📝 Saving progress:", { blogId, userId: userId.toString(), status });

    await db.collection("user_blog_progress").updateOne(
      {
        blogId: new ObjectId(blogId),
        userId: userId
      },
      {
        $set: {
          blogId: new ObjectId(blogId),
          userId: userId,
          status: status || "Complete"
        }
      },
      { upsert: true }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error saving progress:", err);
    res.status(500).send("DB update failed");
  }
});


router.post('/response/:articleId', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();

    const sessionUser = req.session.user;
    console.log("👤 Session user:", sessionUser);

    // ✅ Robust check for session + id
    const rawUserId = sessionUser?._id || sessionUser?.id;
    if (!rawUserId) {
      console.error("❌ No user ID in session.");
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
      console.log("🟡 Response already exists for user:", userId.toString());
      return res.redirect('/learn/view/' + blogId);
    }

    await db.collection('responses').insertOne({
      blogId,
      userId,
      content: responseText,
      createdAt: new Date()
    });

    await db.collection('users').updateOne(
      { _id: userId },
      { $inc: { balance: 10 } }
    );

    console.log("✅ Response saved for user:", userId.toString());
    res.redirect('/learn/view/' + blogId);

  } catch (error) {
    console.error("❌ Error saving response:", error);
    res.status(500).send("Server error");
  }
});
router.get('/learn/new', ensureAuthenticated, (req, res) => {
  if (req.session.user.accountType !== 'parent') {
    return res.redirect('/learn'); 
  }
  res.render('learn/learnNew'); 
});
router.post('/learn/new', ensureAuthenticated, async (req, res) => {
  if (req.session.user.accountType !== 'parent') {
    return res.redirect('/learn');
  }

  const db = getDB();
  const { title, category, summary, content, image } = req.body;

  const newArticle = {
    title,
    category,
    summary,
    content,
    image: image || null,
    createdAt: new Date(),
    completedBy: []
  };

  await db.collection('learnings').insertOne(newArticle);

  res.redirect('/learn');
});





module.exports = router;
