// Middleware to fetch goals for home page

const { getDB } = require('../db/connection');
const { ObjectId } = require('mongodb');

const fetchGoalsForHome = async (req, res, next) => {
    if (req.session.user) {
      try {
        const db = getDB();
        if (req.session.user.accountType === 'child') {
          res.locals.goals = await db.collection('goals')
            .find({ childId: req.session.user.id })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();
        } else if (req.session.user.accountType === 'parent') {
          res.locals.goals = await db.collection('goals')
            .find({ familyMembers: req.session.user.id })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();
        }
      } catch (error) {
        console.error('Error fetching goals:', error);
        res.locals.goals = [];
      }
    } else {
      res.locals.goals = [];
    }
    next();
  };

module.exports = { fetchGoalsForHome }