const { getDB } = require('../db/connection');
const { ObjectId } = require('mongodb');
const User = require("../db/userModel.js");

const fetchGoalsForHome = async (userId, accountType = 'child') => {
  try {
    const db = getDB();
    let goals = [];
    
    if (accountType === 'child') {
      goals = await db.collection('goals')
        .find({ childId: userId })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
    } else if (accountType === 'parent') {
      goals = await db.collection('goals')
        .find({ familyMembers: userId })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
    }
    
    return goals;
  } catch (error) {
    console.error('Error fetching goals:', error);
    return [];
  }
};

module.exports = { fetchGoalsForHome }