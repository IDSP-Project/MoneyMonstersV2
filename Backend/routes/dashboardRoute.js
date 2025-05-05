const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');
const { ensureAuthenticated } = require('../helpers/authHelpers')

// Helper to get initials from a string for initials avatar
function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

router.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
      res.render('dashboard/home', { 
        user: req.session.user,
        currentPage: 'dashboard',
        getInitials
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      res.status(500).render('dashboard/home', { 
        user: req.session.user,
        error: 'Failed to load dashboard', 
        currentPage: 'dashboard',
      });
    }
});

module.exports = router; 