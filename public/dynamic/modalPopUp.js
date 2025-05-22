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
  
  window.showSuccessOverlay = function(overlayId, callback) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    
    const modalContent = overlay.closest('.modalContent');
    if (modalContent) {
      Array.from(modalContent.children).forEach(child => {
        if (child !== overlay) {
          child.style.display = 'none';
        }
      });
    }
    
    overlay.style.display = 'flex';
    overlay.classList.add('show');
    
    setTimeout(() => {
      overlay.classList.remove('show');
      
      setTimeout(() => {
        if (callback && typeof callback === 'function') {
          callback();
        }
        
        if (modalContent) {
          Array.from(modalContent.children).forEach(child => {
            if (child !== overlay) {
              child.style.display = '';
            }
          });
        }
        
        overlay.style.display = 'none';
      }, 300);
    }, 1500);
  };
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
  setupAssignBalanceHandlers();
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
  const customGoalModalContent = document.querySelector('#customGoalModal .modalContent');
  if (customGoalModalContent && !document.getElementById('goalSuccessOverlay')) {
    const successOverlay = document.createElement('div');
    successOverlay.id = 'goalSuccessOverlay';
    successOverlay.className = 'successOverlay';
    successOverlay.innerHTML = `
      <div class="successIcon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="successMessage">Goal Created Successfully</div>
    `;
    customGoalModalContent.appendChild(successOverlay);
  }

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
          this.reset();
          
          showSuccessOverlay('goalSuccessOverlay', () => {
            closeModal('customGoalModal');
            
            if (result.goal) {
              addGoalToUI(result.goal);
            }
          });
        } else {
          throw new Error(result.error || 'Failed to create goal');
        }
      } catch (error) {
        console.error('Error creating goal:', error);
        showError(customGoalForm, error.message);
      }
    });
  }
}

function addGoalToUI(goal) {

  if (!goal.requestStatus || goal.requestStatus === 'pending') {
    goal.requestStatus = 'none'; 
  }
  
  let goalList = null;
  
  const sectionTabs = Array.from(document.querySelectorAll('.sectionTabs')).find(tab => {
    const text = tab.textContent;
    return text.includes('Goals') && text.includes('Progress') && 
           !text.includes('Pending') && !text.includes('Requests') && !text.includes('Reviewed');
  });
  
  if (sectionTabs) {
    goalList = sectionTabs.nextElementSibling;
    if (goalList && !goalList.classList.contains('goalList')) {
      goalList = null;
    }
  }
  
  if (!goalList) {
    const allGoalLists = document.querySelectorAll('.goalList');
    for (const list of allGoalLists) {
      if (!list.closest('.sentRequestsSection, .requestsSection, .reviewedSection')) {
        goalList = list;
        break;
      }
    }
  }
  
  if (!goalList) {
    const goalsContainer = document.querySelector('.goalsContainer');
    
    if (goalsContainer) {
      const sectionTabs = document.createElement('div');
      sectionTabs.className = 'sectionTabs';
      sectionTabs.innerHTML = `
        <h2>Goals</h2>
        <h2>Progress</h2>
      `;
      
      goalList = document.createElement('div');
      goalList.className = 'goalList';
      
      const addGoalBtn = document.querySelector('.addGoalBtnContainer');
      if (addGoalBtn) {
        goalsContainer.insertBefore(sectionTabs, addGoalBtn);
        goalsContainer.insertBefore(goalList, addGoalBtn);
      } else {
        const existingSections = goalsContainer.querySelectorAll('.sectionTabs, .goalList, .requestsSection, .sentRequestsSection, .reviewedSection');
        if (existingSections.length > 0) {
          const lastSection = existingSections[existingSections.length - 1];
          lastSection.insertAdjacentElement('afterend', sectionTabs);
          sectionTabs.insertAdjacentElement('afterend', goalList);
        } else {
          goalsContainer.appendChild(sectionTabs);
          goalsContainer.appendChild(goalList);
        }
      }
    } else {
      console.error('Could not find goals container to add new goal');
      return;
    }
  }

  
  function getGoalInitials(title) {
    if (!title) return '';
    return title
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  const goalCardLink = document.createElement('a');
  goalCardLink.href = `/goals/view/${goal._id}`;
  goalCardLink.className = 'goalCardLink';
  goalCardLink.setAttribute('aria-label', `View goal: ${goal.title}`);
  
  const goalCard = document.createElement('div');
  goalCard.className = 'goalCard';
  goalCard.dataset.goalId = goal._id;
  
  const progress = goal.progress || 0;
  const progressPercent = Math.min(100, Math.max(0, (progress / goal.price) * 100));
    
  goalCard.innerHTML = `
    <div class="goalInfo">
      ${goal.image ? 
        `<div class="amazonImg"><img src="${goal.image}" alt="Product image for ${goal.title}"></div>` :
        `<div class="initialsAvatar" aria-label="Initials for ${goal.title}">${getGoalInitials(goal.title)}</div>`
      }
      <div class="goalText">
        <h3>${goal.title.length > 14 ? goal.title.substring(0, 15) + '...' : goal.title}</h3>
        <p>${goal.purchaseLink ? 'Amazon Goal' : 'Custom Goal'}</p>
      </div>
    </div>
    <div class="goalProgress">
      <div class="progressBar">
        <div class="progressFill" data-progress="${progressPercent}" style="--progress-width: ${progressPercent}%"></div>
      </div>
      <span aria-label="Progress: ${Math.round(progressPercent)}%">${Math.round(progressPercent)}%</span>
    </div>
  `;
  
  goalCardLink.appendChild(goalCard);
  
  goalList.insertAdjacentElement('afterbegin', goalCardLink);
  
  const noGoalsMessage = document.querySelector('.noGoalsMessage');
  if (noGoalsMessage) {
    noGoalsMessage.remove();
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
          const taskRewardText = dueElement.textContent.split(' ')[0].trim(); 
          const taskDueText = dueElement.textContent.substring(taskRewardText.length).trim();
          
          populateTaskModal(taskId, taskTitle, taskDesc, taskRewardText, taskDueText, category, goalId);
          openModal('taskModal');
        }
      }
    });
  });
}

function setupTaskAssignmentHandlers() {
  const assignTaskModalContent = document.querySelector('#assignTaskModal .modalContent');
  if (assignTaskModalContent && !document.getElementById('assignTaskSuccessOverlay')) {
    const successOverlay = document.createElement('div');
    successOverlay.id = 'assignTaskSuccessOverlay';
    successOverlay.className = 'successOverlay';
    successOverlay.innerHTML = `
      <div class="successIcon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="successMessage">Task Assigned Successfully</div>
    `;
    assignTaskModalContent.appendChild(successOverlay);
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

function createTaskCard(task, formattedDue) {
  
  let iconHTML = '';
  try {
    const existingIcon = document.querySelector(`.taskTypeIcon[data-category="${task.category}"] svg`);
    if (existingIcon) {
      iconHTML = existingIcon.outerHTML;
    } else {
      const similarTaskIcon = document.querySelector(`.taskCard[data-category="${task.category}"] .taskIcon svg`);
      if (similarTaskIcon) {
        iconHTML = similarTaskIcon.outerHTML;
      } else {
        iconHTML = '<i class="fas fa-check-circle"></i>';
      }
    }
  } catch (e) {
    console.error("Error getting icon:", e);
    iconHTML = '<i class="fas fa-check-circle"></i>';
  }
  
  const taskCard = document.createElement('div');
  taskCard.className = 'taskCard';
  taskCard.dataset.taskId = task._id;
  taskCard.dataset.category = task.category;
  taskCard.dataset.description = task.description || '';
  if (task.goalId) {
    taskCard.dataset.goalId = task.goalId;
  }
  
  taskCard.innerHTML = `
    <div class="taskInfo">
      <div class="taskIcon">
        ${iconHTML}
      </div>
      <div class="taskText">
        <h3>${task.title}</h3>
        <small class="dueDate" data-due="${new Date(task.dueDate).toISOString()}">$${task.reward ? parseFloat(task.reward).toFixed(2) : '0.00'} ${formattedDue}</small>
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
    } else {
      const taskTitle = this.querySelector('h3').textContent;
      const taskDesc = this.dataset.description || 'No description available';
      const goalId = this.dataset.goalId || '';
      const category = this.dataset.category || 'misc';
      const dueElement = this.querySelector('.dueDate');
      
      if (dueElement) {
        const taskRewardText = dueElement.textContent.split(' ')[0].trim(); 
        const taskDueText = dueElement.textContent.substring(taskRewardText.length).trim();
        
        populateTaskModal(taskId, taskTitle, taskDesc, taskRewardText, taskDueText, category, goalId);
        openModal('taskModal');
      }
    }
  });
  
  return taskCard;
}

window.createTaskCard = createTaskCard;

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
    confirmAddTaskBtn.onclick = null;
    confirmAddTaskBtn.replaceWith(confirmAddTaskBtn.cloneNode(true));
    
    const newBtn = document.getElementById('confirmAddTaskBtn');
    
    newBtn.addEventListener('click', async function() {
      
      const taskData = validateAndGetTaskData();
      if (!taskData) {
        return; 
      }
      
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
        
        const result = await response.json();
        
        if (result.success) {
          document.getElementById('addTaskDetailsModal').querySelectorAll('input').forEach(input => {
            input.value = '';
          });
          
          showSuccessOverlay('successOverlay', () => {
            closeModal('addTaskDetailsModal');
            
            if (result.task) {
              if (!result.task.reward && taskData.amount) {
                result.task.reward = taskData.amount;
              }
              
              if (!result.task.category && taskData.category) {
                result.task.category = taskData.category || 'misc';
              }
              
              
              const taskList = document.querySelector('.tasksContainer .taskList');
              
              if (taskList) {
                const dueDate = new Date(result.task.dueDate);
                const formattedDue = dueDate.toLocaleDateString() + ' ' + 
                  dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const taskCard = createTaskCard(result.task, formattedDue);
                
                taskList.insertAdjacentElement('afterbegin', taskCard);
                
                const noTasksMessage = document.querySelector('.noTasksMessage');
                if (noTasksMessage) {
                  noTasksMessage.remove();
                  
                  const tasksContainer = document.querySelector('.tasksContainer');
                  if (tasksContainer && !document.querySelector('.sectionTabs')) {
                    const sectionTabs = document.createElement('div');
                    sectionTabs.className = 'sectionTabs';
                    sectionTabs.innerHTML = `
                      <span class="tab tasksTab"><h2>Tasks</h2></span>
                      <span class="tab statusTab"><h2>Status</h2></span>
                    `;
                    tasksContainer.insertBefore(sectionTabs, taskList);
                  }
                }
              } else {
                appendNewTaskToUI(result.task);
              }
            }
          });
        } else {
          throw new Error(result.error || 'Failed to create task');
        }
      } catch (error) {
        console.error("Error creating task:", error);
        const errorEl = document.getElementById('taskDetailsError');
        if (errorEl) errorEl.textContent = error.message;
      }
    });
  }
}

window.setupAddTaskFlow = setupAddTaskFlow;

document.addEventListener('DOMContentLoaded', function() {
  setupAddTaskFlow();
});

function appendNewTaskToUI(task) {
  const taskList = document.querySelector('.tasksContainer .taskList');
  
  if (taskList) {
    const dueDate = new Date(task.dueDate);
    const formattedDue = dueDate.toLocaleDateString() + ' ' + 
      dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const taskCard = createTaskCard(task, formattedDue);
    
    taskList.insertAdjacentElement('afterbegin', taskCard);
    
    const noTasksMessage = document.querySelector('.noTasksMessage');
    if (noTasksMessage) {
      noTasksMessage.remove();
      
      const tasksContainer = document.querySelector('.tasksContainer');
      if (tasksContainer && !document.querySelector('.sectionTabs')) {
        const sectionTabs = document.createElement('div');
        sectionTabs.className = 'sectionTabs';
        sectionTabs.innerHTML = `
          <span class="tab tasksTab"><h2>Tasks</h2></span>
          <span class="tab statusTab"><h2>Status</h2></span>
        `;
        
        if (!taskList) {
          const newTaskList = document.createElement('div');
          newTaskList.className = 'taskList';
          
          tasksContainer.appendChild(sectionTabs);
          tasksContainer.appendChild(newTaskList);
          
          newTaskList.appendChild(taskCard);
        } else {
          tasksContainer.insertBefore(sectionTabs, taskList);
        }
      }
    }
    
    return;
  }
  
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
  
  const taskCard = createTaskCard(task, formattedDue);
  
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
        let formHtml = `<form id="assignTaskForm">`;
        
        tasks.forEach(task => {
          formHtml += `
            <label class="radioOption">
              <input type="radio" name="taskId" value="${task._id}" />
              <span>${task.title} (${task.reward ? parseFloat(task.reward).toFixed(2) : '0.00'})</span>
            </label>
          `;
        });
        
        formHtml += `
          <div class="modalFooter">
            <button type="submit" class="modalBtn primary">Assign</button>
            <button type="button" class="modalBtn secondary" id="cancelAssignTaskModal">Cancel</button>
          </div>
        </form>`;
        
        taskList.innerHTML = formHtml;
        
        const assignTaskForm = document.getElementById('assignTaskForm');
        if (assignTaskForm) {
          assignTaskForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const taskId = document.querySelector('input[name="taskId"]:checked')?.value;
            if (!taskId) {
              alert('Please select a task');
              return;
            }
            
            await assignTaskToGoal(taskId, goalId);
          });
        }
        
        const cancelBtn = document.getElementById('cancelAssignTaskModal');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function() {
            closeModal('assignTaskModal');
          });
        }
      } else {
        taskList.innerHTML = `
          <div class="noTasksMessage">
            <i class="fas fa-tasks"></i>
            <p>No available tasks to assign.</p>
          </div>
          
          <div class="modalFooter">
            <button type="button" class="modalBtn secondary" id="cancelAssignTaskModal">Close</button>
          </div>
        `;
        
        const cancelBtn = document.getElementById('cancelAssignTaskModal');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', function() {
            closeModal('assignTaskModal');
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading available tasks:', error);
    
    if (taskList) {
      taskList.innerHTML = `
        <div class="errorMessage">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load tasks. Please try again.</p>
        </div>
        
        <div class="modalFooter">
          <button type="button" class="modalBtn secondary" id="cancelAssignTaskModal">Close</button>
        </div>
      `;
      
      const cancelBtn = document.getElementById('cancelAssignTaskModal');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
          closeModal('assignTaskModal');
        });
      }
    }
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
    assignGoalBtn.dataset.goalId = goalId || ''; 
    assignGoalBtn.style.display = (taskStatus === 'completed') ? 'none' : 'block';
    
    if (goalId && goalId.trim() !== '') {
      assignGoalBtn.textContent = "Reassign Goal";
    } else {
      assignGoalBtn.textContent = "Assign Goal";
    }
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
    if (rewardEl) rewardEl.textContent = `${task.reward ? parseFloat(task.reward).toFixed(2) : '0.00'}`;
    
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
      const taskCard = document.querySelector(`.taskCard[data-task-id="${taskId}"]`);
      if (taskCard) {
        const statusBadge = taskCard.querySelector('.statusBadge');
        if (statusBadge) {
          statusBadge.classList.remove('new', 'in_progress');
          statusBadge.classList.add('completed');
          statusBadge.textContent = 'Completed';
        }
      }

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
      
      showSuccessOverlay('completeTaskSuccessOverlay', () => {
        closeModal('taskModal');
        window.location.reload();
      });
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
    
    if (response.ok) {
      let result;
      try {
        result = await response.json();
      } catch (e) {
        result = { success: true };
      }
      
      const assignTaskModalVisible = document.getElementById('assignTaskModal')?.style.display === 'flex';
      const assignGoalModalVisible = document.getElementById('assignGoalModal')?.style.display === 'flex';
      
      if (assignTaskModalVisible) {
        showSuccessOverlay('assignTaskSuccessOverlay', () => {
          closeModal('assignTaskModal');
          window.location.reload();
        });
      } else if (assignGoalModalVisible) {
        showSuccessOverlay('assignGoalSuccessOverlay', () => {
          closeModal('assignGoalModal');
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    } else {
      const responseText = await response.text();
      if (responseText.includes("Task not found") || responseText.includes("not modified")) {
        if (document.getElementById('assignTaskModal')?.style.display === 'flex') {
          closeModal('assignTaskModal');
        } else {
          closeModal('assignGoalModal');
        }
        window.location.reload();
      } else {
        throw new Error(responseText || 'Failed to assign task to goal');
      }
    }
  } catch (error) {
    console.error('Error assigning task to goal:', error);
    if (error.message.includes("Task not found") || error.message.includes("not modified")) {
      if (document.getElementById('assignTaskModal')?.style.display === 'flex') {
        closeModal('assignTaskModal');
      } else {
        closeModal('assignGoalModal');
      }
      window.location.reload();
    } else {
      alert('Error assigning task to goal: ' + error.message);
    }
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
      const currentGoalId = this.dataset.goalId;
      
      sessionStorage.setItem('currentTaskId', taskId);
      
      if (currentGoalId && currentGoalId.trim() !== '') {
        this.textContent = "Reassign Goal";
      }
      
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
      sessionStorage.removeItem('currentTaskId');
    });
  }
}

function setupReassignmentHandlers() {
  const confirmReassignYes = document.getElementById('confirmReassignYes');
  if (confirmReassignYes) {
    confirmReassignYes.addEventListener('click', function() {
      closeModal('confirmReassignModal');
      closeModal('taskModal');
      loadAvailableGoals();
      openModal('assignGoalModal');
    });
  }

  const confirmReassignNo = document.getElementById('confirmReassignNo');
  if (confirmReassignNo) {
    confirmReassignNo.addEventListener('click', function() {
      closeModal('confirmReassignModal');
      sessionStorage.removeItem('currentTaskId');
    });
  }
}

function setupAssignBalanceHandlers() {
  const assignBalanceModalContent = document.querySelector('#assignBalanceModal .modalContent');
  if (assignBalanceModalContent && !document.getElementById('assignBalanceSuccessOverlay')) {
    const successOverlay = document.createElement('div');
    successOverlay.id = 'assignBalanceSuccessOverlay';
    successOverlay.className = 'successOverlay';
    successOverlay.innerHTML = `
      <div class="successIcon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="successMessage">Balance Assigned Successfully</div>
    `;
    assignBalanceModalContent.appendChild(successOverlay);
  }

  const assignBalanceBtn = document.querySelector('.assignBalanceBtn');
  if (assignBalanceBtn) {
    assignBalanceBtn.addEventListener('click', function() {
      openModal('assignBalanceModal');
      
      const errorElement = document.getElementById('assignBalanceError');
      if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
      }
      
      const form = document.getElementById('assignBalanceForm');
      if (form) form.reset();
    });
  }
  
  const assignBalanceForm = document.getElementById('assignBalanceForm');
  if (assignBalanceForm) {
    assignBalanceForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const amount = parseFloat(document.getElementById('assignAmount').value);
      const userBalance = parseFloat(document.getElementById('currentUserBalance').textContent);
      const remainingGoalAmount = parseFloat(document.getElementById('remainingGoalAmount').textContent);
      const goalId = document.body.dataset.goalId;
      
      const errorElement = document.getElementById('assignBalanceError');
      
      if (isNaN(amount) || amount <= 0) {
        errorElement.textContent = 'Please enter a valid amount greater than 0.';
        errorElement.style.display = 'block';
        return;
      }
      
      if (amount > userBalance) {
        errorElement.textContent = 'You cannot assign more than your current balance.';
        errorElement.style.display = 'block';
        return;
      }
      
      if (amount > remainingGoalAmount) {
        errorElement.textContent = 'You cannot assign more than the remaining amount needed for this goal.';
        errorElement.style.display = 'block';
        return;
      }
      
      try {
        const response = await fetch(`/goals/${goalId}/assign-balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount })
        });
        
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to assign balance');
        }
        
        const result = await response.json();
        
        if (result.success) {
          showSuccessOverlay('assignBalanceSuccessOverlay', () => {
            closeModal('assignBalanceModal');
            window.location.reload();
          });
        } else {
          throw new Error(result.error || 'Failed to assign balance');
        }
      } catch (error) {
        console.error('Error assigning balance:', error);
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
      }
    });
  }
  
  const cancelAssignBalanceBtn = document.getElementById('cancelAssignBalance');
  if (cancelAssignBalanceBtn) {
    cancelAssignBalanceBtn.addEventListener('click', function() {
      closeModal('assignBalanceModal');
    });
  }
}

window.openModal = openModal;
window.closeModal = closeModal;
window.openAssignTaskModal = function() { openModal('assignTaskModal'); };
window.closeAssignTaskModal = function() { closeModal('assignTaskModal'); };
window.completeAndRedirect = completeAndRedirect;
window.addGoalToUI = addGoalToUI;