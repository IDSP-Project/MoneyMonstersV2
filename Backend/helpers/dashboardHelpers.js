const { ObjectId } = require('mongodb');
const { getDB } = require('../db/connection');
const { findGoalsByChildId, findGoalsByParentId } = require('../helpers/goalsHelpers');
const { fetchFamilyTasksForHome, formatTaskDueDate } = require('../helpers/taskHelpers');


function getActiveUser(req) {
  const result = {
    userId: null,
    userType: null,
    isViewingAsChild: false
  };
  
  if (req.viewingChild) {
    if (req.viewingChild._id) {
      result.userId = req.viewingChild._id;
    } else if (req.viewingChild.id) {
      result.userId = req.viewingChild.id;
    }
    result.userType = 'child';
    result.isViewingAsChild = true;
  } else {
    if (req.session.user._id) {
      result.userId = req.session.user._id;
    } else if (req.session.user.id) {
      result.userId = req.session.user.id;
    }
    result.userType = req.session.user.accountType;
    result.isViewingAsChild = false;
  }
  
  return result;
}


async function fetchTasks(userType, userId, familyId) {
  try {
    const db = getDB();
    
    if (userType === 'child') {
      let userIdObj;
      if (typeof userId === 'string') {
        userIdObj = new ObjectId(userId);
      } else {
        userIdObj = userId;
      }
      
      const rawTasks = await db.collection('tasks')
        .find({ assigneeId: userIdObj })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      
      return rawTasks.map(task => {
        const formattedTask = { ...task };
        formattedTask.price = task.reward;
        formattedTask.formattedDue = formatTaskDueDate(task.dueDate);
        
        if (task.status) {
          formattedTask.status = task.status;
        } else if (task.completed) {
          formattedTask.status = 'completed';
        } else {
          formattedTask.status = 'new';
        }
        
        return formattedTask;
      });
    } 
    
    if (userType === 'parent' && familyId) {
      return await fetchFamilyTasksForHome(familyId);
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

/**
 */
async function fetchLearningModules(userType, userId, childId, familyId) {
  try {
    const db = getDB();
    let userIdObj;
    if (typeof userId === 'string') {
      userIdObj = new ObjectId(userId);
    } else {
      userIdObj = userId;
    }
    
    if (userType === 'child' || childId) {
      let targetId;
      if (childId) {
        targetId = childId;
      } else {
        targetId = userId;
      }
      
      let targetIdObj;
      if (typeof targetId === 'string') {
        targetIdObj = new ObjectId(targetId);
      } else {
        targetIdObj = targetId;
      }
      
      const modules = await db.collection('learnings')
        .find({ assigneeId: targetIdObj })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      
      return modules.map(module => {
        let userProgress = null;
        if (module.userProgress) {
          userProgress = module.userProgress.find(p => 
            p.userId.toString() === targetIdObj.toString()
          );
        }
        
        let completedStatus = false;
        if (userProgress && userProgress.status === 'completed') {
          completedStatus = true;
        }
        
        let statusValue = 'new';
        if (userProgress && userProgress.status) {
          statusValue = userProgress.status;
        }
        
        return {
          _id: module._id,
          title: module.title,
          category: module.category,
          summary: module.summary,
          completed: completedStatus,
          status: statusValue
        };
      });
    }
    
    if (userType === 'parent' && familyId) {
      let familyIdObj;
      if (typeof familyId === 'string') {
        familyIdObj = new ObjectId(familyId);
      } else {
        familyIdObj = familyId;
      }
      
      const familyChildren = await db.collection('users')
        .find({ 
          familyId: familyIdObj,
          accountType: 'child'
        })
        .project({ _id: 1, firstName: 1 })
        .toArray();
      
      if (familyChildren.length === 0) {
        return [];
      }
      
      const childIds = familyChildren.map(c => c._id);
      
      const modules = await db.collection('learnings')
        .find({ 
          $or: [
            { assigneeId: { $in: childIds } },
            { posterId: userIdObj }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      return modules.map(module => {
        let assignedChild = null;
        if (module.assigneeId) {
          assignedChild = familyChildren.find(c => 
            c._id.toString() === module.assigneeId.toString()
          );
        }
        
        let userProgress = null;
        if (module.userProgress && assignedChild) {
          userProgress = module.userProgress.find(p => 
            p.userId.toString() === assignedChild._id.toString()
          );
        }
        
        let childName = 'Unknown';
        if (assignedChild) {
          childName = assignedChild.firstName;
        }
        
        let completedStatus = false;
        if (userProgress && userProgress.status === 'completed') {
          completedStatus = true;
        }
        
        let statusValue = 'new';
        if (userProgress && userProgress.status) {
          statusValue = userProgress.status;
        }
        
        return {
          _id: module._id,
          title: module.title,
          category: module.category,
          childName: childName,
          completed: completedStatus,
          status: statusValue
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching learning content:', error);
    return [];
  }
}


async function updateBalanceInfo(req) {
  try {
    const db = getDB();
    
    if (req.viewingChild && req.viewingChild._id) {
      const childId = req.viewingChild._id;
      let childIdObj;
      
      if (typeof childId === 'string') {
        childIdObj = new ObjectId(childId);
      } else {
        childIdObj = childId;
      }
      
      const childUser = await db.collection('users').findOne({ _id: childIdObj });
      
      if (childUser) {
        if (childUser.balance) {
          req.viewingChild.balance = childUser.balance;
        } else {
          req.viewingChild.balance = 0;
        }
      }
      return;
    }
    
    if (req.session.user) {
      let userId;
      if (req.session.user._id) {
        userId = req.session.user._id;
      } else if (req.session.user.id) {
        userId = req.session.user.id;
      } else {
        return;
      }
      
      let userIdObj;
      if (typeof userId === 'string') {
        userIdObj = new ObjectId(userId);
      } else {
        userIdObj = userId;
      }
      
      const currentUser = await db.collection('users').findOne({ _id: userIdObj });
      
      if (currentUser) {
        if (currentUser.balance) {
          req.session.user.balance = currentUser.balance;
        } else {
          req.session.user.balance = 0;
        }
      }
    }
  } catch (error) {
    console.error('Error updating user balance:', error);
  }
}


async function updateBalance(targetId, amount, isAddition) {
  try {
    const db = getDB();
    let queryId;
    
    if (typeof targetId === 'string') {
      queryId = new ObjectId(targetId);
    } else {
      queryId = targetId;
    }
    
    const user = await db.collection('users').findOne({ _id: queryId });
    
    let newBalance;
    let currentBalance = 0;
    if (user && user.balance) {
      currentBalance = user.balance;
    }
    
    if (isAddition) {
      newBalance = currentBalance + Number(amount);
    } else {
      if (currentBalance - Number(amount) < 0) {
        newBalance = 0;
      } else {
        newBalance = currentBalance - Number(amount);
      }
    }
    
    await db.collection('users').updateOne(
      { _id: queryId },
      { $set: { balance: newBalance } }
    );
    
    return true;
  } catch (error) {
    if (isAddition) {
      console.error('Error adding to balance:', error);
    } else {
      console.error('Error removing from balance:', error);
    }
    return false;
  }
}

module.exports = {
  getActiveUser,
  fetchTasks,
  fetchLearningModules,
  updateBalanceInfo,
  updateBalance
};