const express = require('express');
const router = express.Router();
const User = require('../db/userModel'); // your custom User class
const { ensureAuthenticated } = require('../helpers/authHelpers');

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

// GET /dashboard
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    if (!userId) throw new Error("No user ID in session");

    const fullUser = await User.findById(userId);

    if (!fullUser) throw new Error("User not found");

    res.render('dashboard/home', {
      user: fullUser,
      currentPage: 'dashboard',
      getInitials
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('dashboard/home', {
      user: {},
      error: 'Failed to load dashboard',
      currentPage: 'dashboard',
      getInitials
    });
  }
});

// POST /balance/add
router.post("/balance/add", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    const amount = Number(req.body.amount);

    const newBalance = (user.balance || 0) + amount;

    await User.updateUser(userId, { balance: newBalance });

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error adding balance:", error);
    res.redirect("/dashboard");
  }
});

// POST /balance/remove
router.post("/balance/remove", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);
    const amount = Number(req.body.amount);

    const newBalance = Math.max(0, (user.balance || 0) - amount); // prevent negative

    await User.updateUser(userId, { balance: newBalance });

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error removing balance:", error);
    res.redirect("/dashboard");
  }
});

module.exports = router;
