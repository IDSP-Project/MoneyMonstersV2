document.addEventListener('DOMContentLoaded', function() {
  initModals();
    
  if (document.querySelector('.addTaskBtn')) {
    setupParentTaskManagement();
  }

  setupLearningHandlers();
  
  document.addEventListener('mousedown', function(e) {
    const openModals = document.querySelectorAll('.baseModal[style*="display: flex"]');
    if (openModals.length === 0) return;
    
    if (e.target.hasAttribute('data-modal-target') || 
        e.target.closest('[data-modal-target]')) {
      return;
    }
    
    const container = document.querySelector('.container');
    if (!container) return;
    
    let clickedInsideModal = false;
    openModals.forEach(modal => {
      if (modal.contains(e.target)) {
        clickedInsideModal = true;
      }
    });
    
    if (!container.contains(e.target) && !clickedInsideModal) {
      openModals.forEach(modal => closeModal(modal.id));
    }
  });
});

function initModals() {
  document.querySelectorAll('.modalClose').forEach(button => {
    button.addEventListener('click', function() {
      const modal = this.closest('.baseModal');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
  
  document.querySelectorAll('.baseModal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });
  
  document.querySelectorAll('.modalBtn.secondary').forEach(button => {
    button.addEventListener('click', function() {
      const modal = this.closest('.baseModal');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
  
  document.querySelectorAll('[data-modal-target]').forEach(trigger => {
    trigger.addEventListener('click', function() {
      const modalId = this.dataset.modalTarget;
      openModal(modalId);
    });
  });
  
  setupGoalModalHandlers();
  setupTaskModalHandlers();
  setupTaskAssignmentHandlers();
  setupAssignGoalHandlers();
  setupLearningHandlers();
}

function setupLearningHandlers() {
  const submitLearningBtn = document.getElementById('submitLearningBtn');
  if (submitLearningBtn) {
    submitLearningBtn.addEventListener('click', function() {
      const blogId = this.dataset.blogId;
      const reflection = document.getElementById('learningReflection').value.trim();
      
      if (!reflection) {
        alert('Please share something you learned before completing!');
        return;
      }
      
      completeAndRedirect(blogId, reflection);
    });
  }
}

async function completeAndRedirect(blogId, reflection = "") {
  try {
    const res = await fetch(`/progress/${blogId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        status: "completed",
        reflection: reflection 
      })
    });

    if (res.ok) {
      closeModal('whatLearnedModal');
      
      openModal('learnSuccessModal');
      
      setTimeout(() => {
        window.location.href = "/learn";
      }, 1500);
    } else {
      alert("Something went wrong marking this complete.");
    }
  } catch (err) {
    console.error("❌ Failed to complete article:", err);
  }
}


function setupGoalModalHandlers() {
  const addGoalBtn = document.querySelector('.addGoalBtnContainer .btn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', function() {
      openModal('addGoalModal');
    });
  }
  
  const goalTypeForm = document.getElementById('goalTypeForm');
  if (goalTypeForm) {
    goalTypeForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const selected = this.goalType.value;
      closeModal('addGoalModal');
      
      if (selected === 'custom') {
        openModal('customGoalModal');
      } else if (selected === 'amazon') {
        openModal('amazonGoalModal');
      }
    });
  }
  
  const customGoalForm = document.getElementById('customGoalForm');
  if (customGoalForm) {
    customGoalForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const data = {
        title: formData.get('goalName'),
        description: formData.get('goalDescription') || 'Custom goal',
        price: parseFloat(formData.get('goalAmount')),
        childId: document.body.dataset.childId
      };
      
      try {
        const response = await fetch('/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.success) {
          closeModal('customGoalModal');
          openModal('successGoalModal');
        } else {
          throw new Error(result.error || 'Failed to create goal');
        }
      } catch (error) {
        console.error('Error creating goal:', error);
        showError(customGoalForm, error.message);
      }
    });
  }
  
  const successDoneBtn = document.getElementById('successGoalDoneBtn');
  if (successDoneBtn) {
    successDoneBtn.addEventListener('click', function() {
      closeModal('successGoalModal');
      window.location.reload();
    });
  }
}

function setupTaskModalHandlers() {
  const assignTaskBtn = document.querySelector('.assignTaskBtn');
  if (assignTaskBtn) {
    assignTaskBtn.addEventListener('click', function() {
      loadAvailableTasks();
      openModal('assignTaskModal');
    });
  }
  
  setupTaskCardListeners();
  setupTaskCompletionHandlers();
}

function setupTaskCardListeners() {
  document.querySelectorAll('.taskCard').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.tagName === 'BUTTON') {
        return;
      }
      
      const taskId = this.dataset.taskId;
      const taskTitle = this.querySelector('h3').textContent;
      const taskDesc = this.dataset.description || 'No description available';
      const goalId = this.dataset.goalId || '';
      const category = this.dataset.category || 'misc';
      
      if (document.body.classList.contains('parentView')) {
        loadAndShowTaskDetails(taskId);
      } else {
        const dueElement = this.querySelector('.dueDate');
        if (dueElement) {
          const taskReward = dueElement.textContent.split('|')[0].trim();
          const taskDue = dueElement.textContent.split('|')[1].trim();
          
          populateTaskModal(taskId, taskTitle, taskDesc, taskReward, taskDue, category, goalId);
          openModal('taskModal');
        }
      }
    });
  });
}

function setupTaskAssignmentHandlers() {
  const assignGoalBtn = document.getElementById('modalAssignGoalBtn');
  if (assignGoalBtn) {
    assignGoalBtn.addEventListener('click', function() {
      const taskId = this.dataset.taskId;
      
      sessionStorage.setItem('currentTaskId', taskId);
      
      closeModal('taskModal');
      
      loadAvailableGoals();
      openModal('assignGoalModal');
    });
  }
}


async function loadAvailableGoals() {
  try {
    const response = await fetch('/goals/available');
    if (!response.ok) {
      throw new Error('Failed to load goals');
    }
    
    const goals = await response.json();
    
    const goalsList = document.querySelector('#assignGoalModal .goalList');
    if (!goalsList) return;
    
    if (goals.length > 0) {
      goalsList.innerHTML = goals.map(goal => `
        <div class="goalRadio">
          <input type="radio" name="goalId" value="${goal._id}" id="goal_${goal._id}">
          <label for="goal_${goal._id}">${goal.title} ($${goal.price ? parseFloat(goal.price).toFixed(2) : '0.00'})</label>
        </div>
      `).join('');
      
      const submitBtn = document.querySelector('#assignGoalModal .confirmBtn');
      if (submitBtn) submitBtn.style.display = 'block';
      
      const assignGoalForm = document.getElementById('assignGoalForm');
      if (assignGoalForm) {
        assignGoalForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const goalId = document.querySelector('input[name="goalId"]:checked')?.value;
          if (!goalId) {
            alert('Please select a goal');
            return;
          }
          
          const taskId = sessionStorage.getItem('currentTaskId');
          if (!taskId) {
            alert('No task selected');
            return;
          }
          
          await assignTaskToGoal(taskId, goalId);
        });
      }
    } else {
      goalsList.innerHTML = `
        <div class="noGoalsMessage">
          <p>You don't have any active goals. Create a goal first!</p>
        </div>
      `;
      
      const submitBtn = document.querySelector('#assignGoalModal .confirmBtn');
      if (submitBtn) submitBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading goals:', error);
  }
}


function setupTaskCompletionHandlers() {
  const startTaskBtn = document.getElementById('modalStartBtn');
  if (startTaskBtn) {
    startTaskBtn.addEventListener('click', function() {
      const taskId = this.dataset.taskId;
      updateTaskStatus(taskId, 'in_progress');
    });
  }
  
  const completeTaskBtn = document.getElementById('modalCompleteBtn');
  if (completeTaskBtn) {
    completeTaskBtn.addEventListener('click', function() {
      const taskId = this.dataset.taskId;
      const goalId = this.dataset.goalId;
      completeTask(taskId, goalId);
    });
  }
}


function setupParentTaskManagement() {
  const addTaskBtn = document.querySelector('.addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', function() {
      openModal('selectTaskTypeModal');
    });
  }

  const createNewTaskBtn = document.getElementById('createNewTaskBtn');
  if (createNewTaskBtn) {
    createNewTaskBtn.addEventListener('click', function() {
      closeModal('assignTaskModal');
      openModal('selectTaskTypeModal');
    });
  }

  setupTaskTypeSelection();
  setupAddTaskFlow();
  setupTaskProgressHandlers();
}

function setupTaskTypeSelection() {
  const taskTypeIcons = document.querySelectorAll('.taskTypeIcon');
  let selectedCategory = null;

  if (taskTypeIcons.length > 0) {
    taskTypeIcons.forEach(icon => {
      icon.addEventListener('click', function() {
        taskTypeIcons.forEach(i => i.classList.remove('selected'));
        this.classList.add('selected');
        selectedCategory = this.dataset.category;
      });
    });

    const confirmTaskTypeBtn = document.getElementById('confirmTaskTypeBtn');
    if (confirmTaskTypeBtn) {
      confirmTaskTypeBtn.addEventListener('click', function() {
        if (!selectedCategory) {
          document.getElementById('taskTypeError').textContent = 'Please select a task type';
          return;
        }
        
        sessionStorage.setItem('selectedTaskCategory', selectedCategory);
        
        const taskDetailsIconCircle = document.getElementById('taskDetailsIconCircle');
        if (taskDetailsIconCircle) {
          const selectedIcon = document.querySelector(`.taskTypeIcon[data-category="${selectedCategory}"] svg`);
          if (selectedIcon) {
            taskDetailsIconCircle.innerHTML = selectedIcon.outerHTML;
          }
        }
        
        closeModal('selectTaskTypeModal');
        openModal('addTaskDetailsModal');
      });
    }

    const cancelTaskTypeBtn = document.getElementById('cancelTaskTypeBtn');
    if (cancelTaskTypeBtn) {
      cancelTaskTypeBtn.addEventListener('click', function() {
        taskTypeIcons.forEach(i => i.classList.remove('selected'));
        selectedCategory = null;
        const errorEl = document.getElementById('taskTypeError');
        if (errorEl) errorEl.textContent = '';
        closeModal('selectTaskTypeModal');
      });
    }
  }
}

function setupAddTaskFlow() {
  const modalContent = document.querySelector('#addTaskDetailsModal .modalContent');
  if (modalContent && !document.getElementById('successOverlay')) {
    const successOverlay = document.createElement('div');
    successOverlay.id = 'successOverlay';
    successOverlay.className = 'successOverlay';
    successOverlay.innerHTML = `
      <div class="successIcon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="successMessage">Task Created Successfully</div>
    `;
    modalContent.appendChild(successOverlay);
  }

  const confirmAddTaskBtn = document.getElementById('confirmAddTaskBtn');
  if (confirmAddTaskBtn) {
    confirmAddTaskBtn.addEventListener('click', async function() {
      const taskData = validateAndGetTaskData();
      if (!taskData) {
        return; 
      }
      
      try {
        const response = await createTask(taskData);
        if (response.success) {
          const successOverlay = document.getElementById('successOverlay');
          if (successOverlay) {
            successOverlay.classList.add('show');
            
            setTimeout(() => {
              successOverlay.classList.remove('show');
              
              document.getElementById('addTaskDetailsModal').querySelectorAll('input').forEach(input => {
                input.value = '';
              });
              
              setTimeout(() => {
                closeModal('addTaskDetailsModal');
                
                if (response.task && document.querySelector('.taskSectionBox')) {
                  appendNewTaskToUI(response.task);
                }
              }, 300);
            }, 1500);
          }
        } else {
          throw new Error(response.error || 'Failed to create task');
        }
      } catch (error) {
        const errorEl = document.getElementById('taskDetailsError');
        if (errorEl) errorEl.textContent = error.message;
      }
    });
  }
}

function appendNewTaskToUI(task) {
  const newTasksSection = document.querySelector('.taskSectionBox');
  if (!newTasksSection) return;
  
  let newTasksList = newTasksSection.querySelector('.taskList');
  if (!newTasksList) {
    const sectionBox = document.createElement('div');
    sectionBox.className = 'taskSectionBox';
    
    const section = document.createElement('div');
    section.className = 'taskSection';
    
    const title = document.createElement('div');
    title.className = 'taskSectionTitle';
    title.textContent = 'Assigned';
    
    newTasksList = document.createElement('div');
    newTasksList.className = 'taskList';
    
    section.appendChild(title);
    section.appendChild(newTasksList);
    sectionBox.appendChild(section);
    
    const container = document.querySelector('.tasksContainer');
    if (container) {
      container.appendChild(sectionBox);
    }
  }
  
  const dueDate = new Date(task.dueDate);
  const formattedDue = dueDate.toLocaleDateString() + ' ' + 
                      dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  let iconHTML = '';
  try {
    const iconTemplate = document.createElement('template');
    const existingIcon = document.querySelector(`.taskTypeIcon[data-category="${task.category}"] svg`);
    if (existingIcon) {
      iconHTML = existingIcon.outerHTML;
    } else {
      iconHTML = '<i class="fas fa-check-circle"></i>';
    }
  } catch (e) {
    iconHTML = '<i class="fas fa-check-circle"></i>';
  }
  
  const taskCard = document.createElement('div');
  taskCard.className = 'taskCard';
  taskCard.dataset.taskId = task._id;
  taskCard.dataset.category = task.category;
  taskCard.dataset.description = task.description || '';
  
  taskCard.innerHTML = `
    <div class="taskInfo">
      <div class="taskIcon">
        ${iconHTML}
      </div>
      <div class="taskText">
        <h3>${task.title}</h3>
        <small class="dueDate" data-due="${dueDate.toISOString()}">$${task.reward ? parseFloat(task.reward).toFixed(2) : '0.00'} | ${formattedDue}</small>
      </div>
    </div>
    <div class="taskStatus">
      <span class="statusBadge new">New</span>
    </div>
  `;
  
  taskCard.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') return;
    
    const taskId = this.dataset.taskId;
    if (document.body.classList.contains('parentView')) {
      loadAndShowTaskDetails(taskId);
    }
  });
  
  newTasksList.prepend(taskCard);
  
  const noTasksMessage = document.querySelector('.noTasksMessage');
  if (noTasksMessage) {
    noTasksMessage.remove();
  }
}


function validateAndGetTaskData() {
  const titleEl = document.getElementById('taskDetailsTitle');
  const descriptionEl = document.getElementById('taskDetailsDescription');
  const amountEl = document.getElementById('taskDetailsAmount');
  const dateEl = document.getElementById('taskDetailsDate');
  const timeEl = document.getElementById('taskDetailsTime');
  const errorEl = document.getElementById('taskDetailsError');
  
  if (!titleEl || !amountEl || !dateEl || !timeEl) return null;
  
  const title = titleEl.value.trim();
  const description = descriptionEl ? descriptionEl.value.trim() : '';
  const amount = amountEl.value;
  const date = dateEl.value;
  const time = timeEl.value;
  
  if (errorEl) errorEl.textContent = '';
  
  if (!title) {
    if (errorEl) errorEl.textContent = 'Please enter a task title';
    return null;
  }
  
  if (!amount || parseFloat(amount) <= 0) {
    if (errorEl) errorEl.textContent = 'Please enter a valid amount';
    return null;
  }
  
  if (!date) {
    if (errorEl) errorEl.textContent = 'Please select a due date';
    return null;
  }
  
  if (!time) {
    if (errorEl) errorEl.textContent = 'Please select a due time';
    return null;
  }
  
  const dueDate = new Date(`${date}T${time}`);
  
  return {
    title,
    description: description || 'No description',
    amount: parseFloat(amount), 
    dueDate,
    category: sessionStorage.getItem('selectedTaskCategory') || 'misc',
    status: 'new'
  };
}

async function createTask(taskData) {
  try {
    const response = await fetch('/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server responded with:', errorText);
      throw new Error(`Server error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error('Failed to create task. Please try again.');
  }
}

function getCategoryIcon(category) {
  const iconElement = document.querySelector(`.taskTypeIcon[data-category="${category}"] svg`);
  return iconElement ? iconElement.outerHTML : '';
}

function formatDueDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function loadAvailableTasks() {
  try {
    const goalId = document.body.dataset.goalId;
    const response = await fetch(`/tasks/available?goalId=${goalId}`);
    const tasks = await response.json();
    
    const taskList = document.querySelector('#assignTaskModal .taskList');
    if (taskList) {
      if (tasks.length > 0) {
        taskList.innerHTML = tasks.map(task => `
          <div class="taskCard" data-task-id="${task._id}">
            <div class="taskInfo">
              <div class="taskText">
                <h3>${task.title}</h3>
                <small>$${task.reward ? parseFloat(task.reward).toFixed(2) : '0.00'}</small>
              </div>
            </div>
            <button class="assignBtn" data-task-id="${task._id}">Assign</button>
          </div>
        `).join('');
        
        document.querySelectorAll('.assignBtn').forEach(btn => {
          btn.addEventListener('click', function() {
            assignTaskToGoal(this.dataset.taskId, goalId);
          });
        });
      } else {
        taskList.innerHTML = `
          <div class="noTasksMessage">
            <p>No tasks available to assign.</p>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Error loading available tasks:', error);
  }
}

function populateTaskModal(taskId, title, desc, reward, due, category, goalId) {
  const titleEl = document.getElementById('modalTaskTitle');
  const descEl = document.getElementById('modalTaskDesc');
  const rewardEl = document.getElementById('modalTaskReward');
  const dueEl = document.getElementById('modalTaskDue');
  const iconEl = document.getElementById('modalTaskIcon');
  const statusEl = document.getElementById('modalTaskStatus')
  const startBtn = document.getElementById('modalStartBtn');
  const completeBtn = document.getElementById('modalCompleteBtn');
  const assignGoalBtn = document.getElementById('modalAssignGoalBtn');
  
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
  if (rewardEl) rewardEl.textContent = reward;
  if (dueEl) dueEl.textContent = due;
  
  if (iconEl) {
    const taskCard = document.querySelector(`.taskCard[data-task-id="${taskId}"]`);
    if (taskCard) {
      const cardIcon = taskCard.querySelector('.taskIcon svg');
      if (cardIcon) {
        iconEl.innerHTML = cardIcon.outerHTML;
      }
      if (statusEl) {
        const cardStatus = taskCard.querySelector('.statusBadge');
        if (cardStatus) {
          statusEl.innerHTML = `<span class="statusBadge ${cardStatus.classList[1]}">${cardStatus.textContent}</span>`;
        }
      }
    }
  }
  
  const taskStatus = document.querySelector(`.taskCard[data-task-id="${taskId}"] .statusBadge`).classList[1];
  
  if (startBtn) {
    startBtn.dataset.taskId = taskId;
    startBtn.style.display = taskStatus === 'new' ? 'block' : 'none';
  }
  
  if (completeBtn) {
    completeBtn.dataset.taskId = taskId;
    completeBtn.dataset.goalId = goalId || '';
    completeBtn.style.display = taskStatus === 'in_progress' ? 'block' : 'none';
  }
  
  if (assignGoalBtn) {
    assignGoalBtn.dataset.taskId = taskId;
    assignGoalBtn.style.display = (taskStatus === 'completed') ? 'none' : 'block';
  }
}

async function loadAndShowTaskDetails(taskId) {
  try {
    const response = await fetch(`/tasks/${taskId}/details`);
    if (!response.ok) {
      throw new Error('Failed to load task details');
    }
    
    const task = await response.json();
    
    const titleEl = document.getElementById('taskProgressTitle');
    const descEl = document.getElementById('taskProgressDescription');
    const rewardEl = document.getElementById('taskProgressReward');
    const dueDateEl = document.getElementById('taskProgressDueDate');
    const statusEl = document.getElementById('taskProgressStatus');
    const childEl = document.getElementById('taskProgressChild');
    const approveBtn = document.getElementById('approveTaskBtn');
    const rejectBtn = document.getElementById('rejectTaskBtn');
    const deleteBtn = document.getElementById('deleteTaskBtn');
    
    if (titleEl) titleEl.textContent = task.title;
    if (descEl) descEl.textContent = task.description || 'No description';
    if (rewardEl) rewardEl.textContent = `$${task.reward ? parseFloat(task.reward).toFixed(2) : '0.00'}`;
    
    if (dueDateEl) {
      const dueDate = new Date(task.dueDate);
      dueDateEl.textContent = dueDate.toLocaleDateString() + ' ' + dueDate.toLocaleTimeString();
    }
    
    if (statusEl) {
      statusEl.textContent = task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ') : 'New';
      statusEl.className = 'statusBadge ' + task.status;
    }
    
    if (childEl) childEl.textContent = task.childName || 'No child assigned';
    
    if (approveBtn) {
      approveBtn.dataset.taskId = taskId;
      approveBtn.style.display = task.status === 'in_progress' ? 'block' : 'none';
    }
    
    if (rejectBtn) {
      rejectBtn.dataset.taskId = taskId;
      rejectBtn.style.display = task.status === 'completed' ? 'block' : 'none';
    }
    
    if (deleteBtn) {
      deleteBtn.dataset.taskId = taskId;
    }
    
    openModal('taskProgressModal');
  } catch (error) {
    console.error('Error loading task details:', error);
  }
}

function setupTaskProgressHandlers() {
  const approveTaskBtn = document.getElementById('approveTaskBtn');
  if (approveTaskBtn) {
    approveTaskBtn.addEventListener('click', function() {
      const taskId = this.dataset.taskId;
      updateTaskStatus(taskId, 'completed', 'Task approved successfully');
    });
  }
  
  const rejectTaskBtn = document.getElementById('rejectTaskBtn');
  if (rejectTaskBtn) {
    rejectTaskBtn.addEventListener('click', function() {
      const taskId = this.dataset.taskId;
      updateTaskStatus(taskId, 'in_progress', 'Task returned to in-progress');
    });
  }
  
  const deleteTaskBtn = document.getElementById('deleteTaskBtn');
  if (deleteTaskBtn) {
    deleteTaskBtn.addEventListener('click', function() {
      const taskId = this.dataset.taskId;
      
      if (confirm('Are you sure you want to delete this task?')) {
        deleteTask(taskId);
      }
    });
  }
}

async function updateTaskStatus(taskId, status) {
  try {
    const response = await fetch(`/tasks/${taskId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    });
    
    const result = await response.json();
    
    if (result.success) {
      if (status === 'in_progress') {
        document.getElementById('modalStartBtn').style.display = 'none';
        document.getElementById('modalCompleteBtn').style.display = 'block';
        
        const modalStatusEl = document.getElementById('modalTaskStatus');
        if (modalStatusEl) {
          modalStatusEl.innerHTML = `<span class="statusBadge in_progress">In Progress</span>`;
        }
      }
      
      const taskCard = document.querySelector(`.taskCard[data-task-id="${taskId}"]`);
      if (taskCard) {
        const statusBadge = taskCard.querySelector('.statusBadge');
        if (statusBadge) {
          statusBadge.classList.remove('new', 'in_progress', 'completed');
          
          statusBadge.classList.add(status);
          
          if (status === 'new') {
            statusBadge.textContent = 'New';
          } else if (status === 'in_progress') {
            statusBadge.textContent = 'In Progress';
          } else if (status === 'completed') {
            statusBadge.textContent = 'Completed';
          }
        }
      }
    } else {
      throw new Error(result.error || 'Failed to update task status');
    }
  } catch (error) {
    console.error('Error updating task status:', error);
    alert('Error updating task status: ' + error.message);
  }
}

async function completeTask(taskId, goalId) {
  try {
    const response = await fetch(`/tasks/${taskId}/complete`, {
      method: 'POST'
    });
    
    const result = await response.json();
    if (result.success) {
      // First update the UI to show the task as completed
      const taskCard = document.querySelector(`.taskCard[data-task-id="${taskId}"]`);
      if (taskCard) {
        const statusBadge = taskCard.querySelector('.statusBadge');
        if (statusBadge) {
          statusBadge.classList.remove('new', 'in_progress');
          statusBadge.classList.add('completed');
          statusBadge.textContent = 'Completed';
        }
      }

      // Update goal progress if goal is assigned
      if (goalId) {
        await fetch(`/goals/${goalId}/update-progress`, {
          method: 'POST'
        });
      }
      
      const modalContent = document.querySelector('#taskModal .modalContent');
      let successOverlay = document.getElementById('completeTaskSuccessOverlay');
      
      if (!successOverlay) {
        successOverlay = document.createElement('div');
        successOverlay.id = 'completeTaskSuccessOverlay';
        successOverlay.className = 'successOverlay';
        successOverlay.innerHTML = `
          <div class="successIcon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="successMessage">Task Marked Complete</div>
        `;
        modalContent.appendChild(successOverlay);
      }
      
      successOverlay.classList.add('show');
      
      const startBtn = document.getElementById('modalStartBtn');
      const completeBtn = document.getElementById('modalCompleteBtn');
      const assignGoalBtn = document.getElementById('modalAssignGoalBtn');
      const cancelBtn = document.getElementById('modalCancelBtn');
      
      if (startBtn) startBtn.style.display = 'none';
      if (completeBtn) completeBtn.style.display = 'none';
      if (assignGoalBtn) assignGoalBtn.style.display = 'none';
      if (cancelBtn) cancelBtn.style.display = 'none';
      
      const modalStatusEl = document.getElementById('modalTaskStatus');
      if (modalStatusEl) {
        modalStatusEl.innerHTML = `<span class="statusBadge completed">Completed</span>`;
      }
      
      setTimeout(() => {
        closeModal('taskModal');
        window.location.reload();
      }, 1500);
    }
  } catch (error) {
    console.error('Error completing task:', error);
    alert('Error completing task: ' + error.message);
  }
}

async function assignTaskToGoal(taskId, goalId) {
  try {
    const response = await fetch(`/tasks/assign-goal/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ goalId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      const successOverlay = document.getElementById('assignGoalSuccessOverlay');
      if (successOverlay) {
        successOverlay.classList.add('show');
        
        setTimeout(() => {
          successOverlay.classList.remove('show');
          
          setTimeout(() => {
            closeModal('assignGoalModal');
            window.location.reload();
          }, 300);
        }, 1500);
      } else {
        closeModal('assignGoalModal');
        alert('Task assigned to goal successfully');
        window.location.reload();
      }
    } else {
      throw new Error(result.error || 'Failed to assign task to goal');
    }
  } catch (error) {
    console.error('Error assigning task to goal:', error);
    alert('Error assigning task to goal: ' + error.message);
  }
}

async function deleteTask(taskId) {
  try {
    const response = await fetch(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      closeModal('taskProgressModal');
      alert('Task deleted successfully');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      throw new Error(result.error || 'Failed to delete task');
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    const errorEl = document.getElementById('taskProgressError');
    if (errorEl) errorEl.textContent = error.message;
  }
}

function showError(form, message) {
  let errorEl = form.querySelector('.errorMessage');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'errorMessage';
    form.insertBefore(errorEl, form.firstChild);
  }
  errorEl.textContent = message;
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

function setupAssignGoalHandlers() {
  const assignGoalModalContent = document.querySelector('#assignGoalModal .modalContent');
  if (assignGoalModalContent && !document.getElementById('assignGoalSuccessOverlay')) {
    const successOverlay = document.createElement('div');
    successOverlay.id = 'assignGoalSuccessOverlay';
    successOverlay.className = 'successOverlay';
    successOverlay.innerHTML = `
      <div class="successIcon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="successMessage">Task Assigned Successfully</div>
    `;
    assignGoalModalContent.appendChild(successOverlay);
  }

  const assignGoalBtn = document.getElementById('modalAssignGoalBtn');
  if (assignGoalBtn) {
    assignGoalBtn.addEventListener('click', function() {
      const taskId = this.dataset.taskId;
      
      sessionStorage.setItem('currentTaskId', taskId);
      
      closeModal('taskModal');
      
      loadAvailableGoals();
      openModal('assignGoalModal');
    });
  }
  
  const assignGoalForm = document.getElementById('assignGoalForm');
  if (assignGoalForm) {
    assignGoalForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const selectedGoal = document.querySelector('input[name="goalId"]:checked');
      if (!selectedGoal) {
        alert('Please select a goal');
        return;
      }
      
      const goalId = selectedGoal.value;
      
      const taskId = sessionStorage.getItem('currentTaskId');
      if (!taskId) {
        alert('No task selected');
        return;
      }
      
      await assignTaskToGoal(taskId, goalId);
    });
  }
  
  const cancelAssignGoalBtn = document.getElementById('cancelAssignGoalModal');
  if (cancelAssignGoalBtn) {
    cancelAssignGoalBtn.addEventListener('click', function() {
      closeModal('assignGoalModal');
    });
  }
}

window.openModal = openModal;
window.closeModal = closeModal;
window.openAssignTaskModal = function() { openModal('assignTaskModal'); };
window.closeAssignTaskModal = function() { closeModal('assignTaskModal'); };
window.completeAndRedirect = completeAndRedirect;