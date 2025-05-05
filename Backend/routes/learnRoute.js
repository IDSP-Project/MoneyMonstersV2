const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../db/connection');
const Learning = require('../db/learnModel');
const { ensureAuthenticated } = require('../helpers/authHelpers');


router.get('/learn', ensureAuthenticated, async (req, res) => {
    try {
      const db = getDB();
      let blogs = [];

      if (req.session.user) {
        if (req.session.user.accountType === 'child') {
          blogs = await db.collection('learnings')
            .find({})
            .sort({ createdAt: -1 }) 
            .toArray();
        }
        else if (req.session.user.accountType === 'parent') {
          blogs = await db.collection('learnings')
            .find({})
            .sort({ createdAt: -1 }) 
            .toArray();
        }
      }
        res.render('learn/learnHome', { 
          blogs, 
          user: req.session.user,
          currentPage: 'learn',
        });
    } catch (error) {
      console.error('Error fetching blogs:', error);
      res.status(500).render('learn/learnHome', { 
        blogs: [], 
        user: req.session.user,
        error: 'Failed to fetch blogs',
        currentPage: 'learn',
      });
    }
  });

  router.get('/learn/view/:id', async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      console.error('Invalid ObjectId format:', id);
      return res.status(400).send('Invalid article ID');
    }
  
    try {
      const blog = await Learning.findById(req.params.id);
      if (!blog) return res.status(404).send('Article not found');
      res.render('learn/learnEach', { blog, user: req.session.user, currentPage: 'learn'
      });
    } catch (err) {
      console.error('Invalid ID:', err);
      res.status(400).send('Invalid article ID');
    }
  });
  module.exports = router;