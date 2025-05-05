const { getDB } = require('../db/connection');
const { ObjectId } = require('mongodb');

// Middleware to fetch tasks for home page
const fetchTasksForHome = async (req, res, next) => {
    if (req.session.user) {
      try {
        const db = getDB();
        
        if (req.session.user.accountType === 'child') {
          res.locals.tasks = await db.collection('tasks')
            .find({ assigneeId: new ObjectId(req.session.user.id) })
            .sort({ createdAt: -1 })
            .limit(3)
            .toArray();
        } else if (req.session.user.accountType === 'parent') {
          res.locals.tasks = await db.collection('tasks')
            .find({ posterId: new ObjectId(req.session.user.id) })
            .sort({ createdAt: -1 })
            .limit(3)
            .toArray();
        }
  
        // Format tasks for display
        res.locals.tasks = res.locals.tasks.map(task => {
          return {
            ...task,
            price: task.reward,
            formattedDue: formatTaskDueDate(task.dueDate),
            status: task.status || (task.completed ? 'completed' : 'new')
          };
        });
      } catch (error) {
        console.error('Error fetching tasks:', error);
        res.locals.tasks = [];
      }
    } else {
      res.locals.tasks = [];
    }
    next();
  };

function formatTaskDueDate(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  // Remove time for day comparison
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueDay - nowDay;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const dueTime = due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) {
    return `By ${dueTime}, Today`;
  } else if (diffDays === 1) {
    return `By ${dueTime}, Tomorrow`;
  } else if (diffDays > 1 && diffDays < 7) {
    const weekday = due.toLocaleDateString('en-US', { weekday: 'long' });
    return `By ${dueTime}, ${weekday}`;
  } else if (diffDays === -1) {
    return 'Yesterday';
  } else if (diffDays < -1) {
    return `${Math.abs(diffDays)} Days Ago`;
  } else {
    return `By ${dueTime}, ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
}

module.exports = { fetchTasksForHome, formatTaskDueDate }; 