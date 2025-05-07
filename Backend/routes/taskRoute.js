const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');
const { ensureAuthenticated } = require('../helpers/authHelpers');
const { fetchTasksForHome, formatTaskDueDate } = require('../helpers/taskHelpers');
const { ObjectId } = require('mongodb');

router.get('/tasks', ensureAuthenticated, async (req, res) => {
    try {
      const db = getDB();
      let tasks = [];
      let activeGoals = [];
      if (req.session.user) {
        if (req.session.user.accountType === 'child') {
          tasks = await db.collection('tasks')
            .find({ assigneeId: new ObjectId(req.session.user.id) })
            .sort({ createdAt: -1 }) 
            .toArray();
          activeGoals = await db.collection('goals')
            .find({ childId: req.session.user.id, status: 'active' })
            .sort({ createdAt: -1 })
            .toArray();
        }
        else if (req.session.user.accountType === 'parent') {
          // Get all children in the parent's family
          const children = await db.collection('users').find({ 
            familyId: new ObjectId(req.session.user.familyId),
            accountType: 'child'
          }).toArray();
                    
          const childIds = children.map(child => child._id);
          
          // Get tasks assigned to these children or created by the parent
          const parentTasks = await db.collection('tasks')
            .find({
              $or: [
                { assigneeId: { $in: childIds.map(id => new ObjectId(id)) } },
                { posterId: new ObjectId(req.session.user._id) }
              ]
            })
            .sort({ createdAt: -1 })
            .toArray();

          // Format tasks
          const tasks = parentTasks.map(task => ({
            ...task,
            formattedDue: formatTaskDueDate(task.dueDate),
            status: task.status || (task.completed ? 'completed' : 'new')
          }));

          // Sort tasks by status: new, in_progress, overdue, completed
          const statusOrder = { new: 0, in_progress: 1, overdue: 2, completed: 3 };
          tasks.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

          return res.render('tasks/tasksParent', { 
            tasks, 
            user: req.session.user,
            currentPage: 'tasks'
          });
        }
      }
  
      tasks = tasks.map(task => ({
        ...task,
        formattedDue: formatTaskDueDate(task.dueDate),
        status: task.status || (task.completed ? 'completed' : 'new')
      }));
  
      // Sort tasks by status: new, in_progress, overdue, completed
      const statusOrder = { new: 0, in_progress: 1, overdue: 2, completed: 3 };
      tasks.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
  
      res.render('tasks/tasks', { 
        tasks, 
        user: req.session.user,
        currentPage: 'tasks',
        activeGoals
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).render('tasks/tasks', { 
        tasks: [], 
        user: req.session.user,
        error: 'Failed to fetch tasks',
        currentPage: 'tasks',
        activeGoals: []
      });
    }
});

router.post('/tasks/update/:taskId', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const taskId = new ObjectId(req.params.taskId);
    const { status } = req.body;
    const result = await db.collection('tasks').updateOne(
      { _id: taskId },
      { $set: { status } }
    );
    if (result.modifiedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Task not found or not modified' });
    }
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

router.post('/tasks/assign-goal/:taskId', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const taskId = new ObjectId(req.params.taskId);
    const { goalId } = req.body;
    if (!goalId) {
      return res.status(400).json({ success: false, error: 'No goalId provided' });
    }
    const result = await db.collection('tasks').updateOne(
      { _id: taskId },
      { $set: { goalId: new ObjectId(goalId) } }
    );
    if (result.modifiedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Task not found or not modified' });
    }
  } catch (error) {
    console.error('Error assigning task to goal:', error);
    res.status(500).json({ success: false, error: 'Failed to assign task to goal' });
  }
});

router.get('/tasks/available', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    let query = {
      $or: [
        { goalId: { $exists: false } },
        { goalId: null }
      ],
      status: { $in: ['new', 'in_progress'] }
    };

    if (req.session.user.accountType === 'child') {
      query.assigneeId = new ObjectId(req.session.user.id);
    } 
    else if (req.session.user.accountType === 'parent') {
      query.posterId = new ObjectId(req.session.user.id);
    }

    const tasks = await db.collection('tasks')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    tasks.forEach(task => {
      if (task.dueDate) {
        task.formattedDue = formatTaskDueDate(task.dueDate);
      }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching available tasks:', error);
    res.status(500).json({ error: 'Failed to fetch available tasks' });
  }
});

module.exports = { router, fetchTasksForHome };