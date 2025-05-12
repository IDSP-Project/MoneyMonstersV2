const express = require('express');
const router = express.Router();
const { getDB } = require('../db/connection');
const { ensureAuthenticated } = require('../helpers/authHelpers');
const { fetchTasksForHome, formatTaskDueDate } = require('../helpers/taskHelpers');
const { ObjectId } = require('mongodb');
const TaskModel = require('../db/taskModel');

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
          const parentIds = [...new Set(tasks.map(task => String(task.posterId)))];
          let parentMap = {};
          if (parentIds.length > 0) {
            const parents = await db.collection('users')
              .find({ _id: { $in: parentIds.map(id => new ObjectId(id)) } })
              .toArray();
            parents.forEach(parent => {
              parentMap[String(parent._id)] =
                (parent.firstName && parent.lastName)
                  ? `${parent.firstName} ${parent.lastName}`
                  : parent.name || parent.fullName || parent.username || 'Parent';
            });
          }
          tasks = tasks.map(task => ({
            ...task,
            parentName: parentMap[String(task.posterId)] || '',
          }));
          activeGoals = await db.collection('goals')
            .find({ childId: req.session.user.id, status: 'active' })
            .sort({ createdAt: -1 })
            .toArray();
        }
        else if (req.session.user.accountType === 'parent') {
          let parentTasks = [];
          
          if (req.viewingChild) {
            parentTasks = await db.collection('tasks')
              .find({
                $or: [
                  { assigneeId: new ObjectId(req.viewingChild._id) },
                  { posterId: new ObjectId(req.session.user._id) }
                ]
              })
              .sort({ createdAt: -1 })
              .toArray();
          } else {
            const children = await db.collection('users').find({ 
              familyId: new ObjectId(req.session.user.familyId),
              accountType: 'child'
            }).toArray();
                      
            const childIds = children.map(child => child._id);
            
            parentTasks = await db.collection('tasks')
              .find({
                $or: [
                  { assigneeId: { $in: childIds.map(id => new ObjectId(id)) } },
                  { posterId: new ObjectId(req.session.user._id) }
                ]
              })
              .sort({ createdAt: -1 })
              .toArray();
          }

          const tasks = parentTasks.map(task => ({
            ...task,
            formattedDue: formatTaskDueDate(task.dueDate),
            status: task.status || (task.completed ? 'completed' : 'new')
          }));

          const statusOrder = { new: 0, in_progress: 1, overdue: 2, completed: 3 };
          tasks.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));

          return res.render('tasks/tasksParent', { 
            tasks, 
            user: req.session.user,
            currentPage: 'tasks',
            activeGoals,
            viewingAsChild: req.viewingChild ? true : false,
            viewingChildName: req.viewingChild ? req.viewingChild.firstName : null,
            child: req.viewingChild
          });
        }
      }
  
      tasks = tasks.map(task => ({
        ...task,
        formattedDue: formatTaskDueDate(task.dueDate),
        status: task.status || (task.completed ? 'completed' : 'new')
      }));
  
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

router.get('/tasks/:taskId/details', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const taskId = new ObjectId(req.params.taskId);
    const task = await db.collection('tasks').findOne({ _id: taskId });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    let childName = 'No child assigned';
    if (task.assigneeId) {
      const child = await db.collection('users').findOne({ 
        _id: new ObjectId(task.assigneeId) 
      });
      if (child) {
        childName = child.firstName && child.lastName 
          ? `${child.firstName} ${child.lastName}` 
          : child.username || child.name || 'Child';
      }
    }
    
    const formattedTask = {
      ...task,
      childName,
      formattedDue: formatTaskDueDate(task.dueDate),
      status: task.status || (task.completed ? 'completed' : 'new')
    };
    
    res.json(formattedTask);
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({ error: 'Failed to fetch task details' });
  }
});

router.post('/tasks/:taskId/status', ensureAuthenticated, async (req, res) => {
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
      if (req.viewingChild) {
        query.assigneeId = new ObjectId(req.viewingChild._id);
      } else {
        query.posterId = new ObjectId(req.session.user.id);
      }
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

router.post('/tasks', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const { category, title, description, amount, dueDate } = req.body;
    
    console.log("Request body:", req.body);
    
    const allowedCategories = ['pet', 'cleaning', 'garage', 'garden', 'misc'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (isNaN(amount) || parseFloat(amount) < 0) {
      return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
    }
    if (!dueDate) {
      return res.status(400).json({ success: false, error: 'Due date is required' });
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
        return res.status(400).json({ success: false, error: 'No children found in your family to assign the task.' });
      }
      selectedChild = children[0];
    }

    const newTask = TaskModel.createTask(
      category,
      title,
      description,
      amount,
      dueDate,
      req.session.user,
      selectedChild
    );

    console.log("Task being inserted:", newTask);
    
    const result = await db.collection('tasks').insertOne(newTask);
    
    if (result.acknowledged) {
      res.json({ success: true, task: { ...newTask, _id: result.insertedId } });
    } else {
      throw new Error('Failed to create task');
    }
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create task' });
  }
});

router.post('/tasks/:taskId/complete', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const taskId = new ObjectId(req.params.taskId);
    
    const result = await db.collection('tasks').updateOne(
      { _id: taskId },
      { 
        $set: { 
          status: 'completed',
          completed: true,
          completedAt: new Date()
        } 
      }
    );
    
    if (result.modifiedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Task not found or not modified' });
    }
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ success: false, error: 'Failed to complete task' });
  }
});

router.delete('/tasks/:taskId', ensureAuthenticated, async (req, res) => {
  try {
    const db = getDB();
    const taskId = new ObjectId(req.params.taskId);
    
    const result = await db.collection('tasks').deleteOne({ _id: taskId });
    
    if (result.deletedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Task not found' });
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

module.exports = { router, fetchTasksForHome };