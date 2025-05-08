// Task Modal Logic

document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('taskModal');
  const modalIcon = document.getElementById('modalTaskIcon');
  const modalTitle = document.getElementById('modalTaskTitle');
  const modalDesc = document.getElementById('modalTaskDesc');
  const modalReward = document.getElementById('modalTaskReward');
  const modalDue = document.getElementById('modalTaskDue');
  const modalActions = document.getElementById('modalTaskActions');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const modalStartBtn = document.getElementById('modalStartBtn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCompleteBtn = document.getElementById('modalCompleteBtn');
  const modalAssignGoalBtn = document.getElementById('modalAssignGoalBtn');
  const assignGoalModal = document.getElementById('assignGoalModal');
  const cancelAssignGoalModalBtn = document.getElementById('cancelAssignGoalModal');
  const assignGoalForm = document.getElementById('assignGoalForm');
  const confirmReassignModal = document.getElementById('confirmReassignModal');
  const confirmReassignMsg = document.getElementById('confirmReassignMsg');
  const confirmReassignYes = document.getElementById('confirmReassignYes');
  const confirmReassignNo = document.getElementById('confirmReassignNo');
  const taskTypeError = document.getElementById('taskTypeError');
  const modalBackBtn = document.getElementById('modalBackBtn');
  const modalGoalInfo = document.getElementById('modalGoalInfo');
  const modalConfirmedBy = document.getElementById('modalConfirmedBy');
  let currentTaskGoalId = null;
  let pendingAssign = null;

  // Add New Task modal logic for parent tasks page
  const addTaskBtn = document.querySelector('.add-task-btn');
  const selectTaskTypeModal = document.getElementById('selectTaskTypeModal');
  const cancelTaskTypeBtn = document.getElementById('cancelTaskTypeBtn');
  const confirmTaskTypeBtn = document.getElementById('confirmTaskTypeBtn');
  const taskTypeIcons = document.querySelectorAll('.task-type-icon');

  // Task details modal
  const addTaskDetailsModal = document.getElementById('addTaskDetailsModal');
  const taskDetailsIconCircle = document.getElementById('taskDetailsIconCircle');
  const cancelAddTaskBtn = document.getElementById('cancelAddTaskBtn');
  const confirmAddTaskBtn = document.getElementById('confirmAddTaskBtn');
  const taskDetailsDescription = document.getElementById('taskDetailsDescription');
  const taskDetailsAmount = document.getElementById('taskDetailsAmount');
  const taskDetailsDate = document.getElementById('taskDetailsDate');
  const taskDetailsTime = document.getElementById('taskDetailsTime');

  let selectedCategory = null;

  if (addTaskBtn && selectTaskTypeModal) {
    addTaskBtn.addEventListener('click', function(e) {
      e.preventDefault();
      selectTaskTypeModal.style.display = 'flex';
    });
  }

  if (cancelTaskTypeBtn && selectTaskTypeModal) {
    cancelTaskTypeBtn.addEventListener('click', function() {
      selectTaskTypeModal.style.display = 'none';
      selectedCategory = null;
      taskTypeIcons.forEach(i => i.classList.remove('selected'));
      if (taskTypeError) taskTypeError.textContent = '';
    });
  }

  if (taskTypeIcons.length > 0) {
    taskTypeIcons.forEach(icon => {
      icon.addEventListener('click', function() {
        taskTypeIcons.forEach(i => i.classList.remove('selected'));
        this.classList.add('selected');
        selectedCategory = this.getAttribute('data-category');
        if (taskTypeError) taskTypeError.textContent = '';
      });
    });
  }

  // Icon HTML mapping
function getCategoryIconHTML(category, size = 30) {
  switch(category) {
    case 'pet': 
      return `<svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="20" fill="#89A3B2"/>
        <path d="M24.3125 7L24.0625 7.65625L21.3125 15H13.625C12.7109 15 11.8438 15.2578 11.125 15.7188L8.71875 13.2812L7.28125 14.7188L9.71875 17.125C9.25781 17.8438 9 18.7109 9 19.625C9 20.1289 9.08594 20.6445 9.25 21.125L9.96875 23.2188L9.03125 26.75L9 26.875V32H11V27.125L11.9688 23.4688L12.0312 23.1562L11.9375 22.875L11.125 20.4688C11.0352 20.1992 11 19.9102 11 19.625C11 18.1562 12.1562 17 13.625 17H21.6562L25 20.2812V17.4688L23.1875 15.6875L25.25 10.1562L25.5 10.5312L25.7812 11H27.6562L30.7188 13.3125L29.875 15H26V20.875L25.0625 23.6875L25 23.8438V27.125L26 31.125V32H28V30.875L27 26.875V24.125L27.9375 21.3125L28 21.1562V17H31.125L33.2812 12.6875L32.5938 12.1875L28.3438 9H26.9062L25.9375 7.46875L25.6562 7H24.3125ZM14.2188 22L13 26.875V32H15V27.125L15.7812 24H16.7188C17.0703 24.2344 18.3125 25 20 25H21V27.125L22 31.125V32H24V30.875L23 26.875V23H20C18.9375 23 17.5625 22.1562 17.5625 22.1562L17.3125 22H14.2188Z" fill="#00475F"/>
      </svg>`;
    case 'cleaning': 
      return `<svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="20" fill="#C8BAA2"/>
        <path d="M32.2812 6.28125L22.2812 16.2812L21 15V14.9688L20.9688 14.9375C20.3281 14.3672 19.4922 14.0938 18.6875 14.0938C17.8828 14.0938 17.1055 14.3945 16.5 15L16.3438 15.125L15.8438 15.625L15.5 15.9062L6.375 23L5.5 23.7188L16.2812 34.5L17 33.625L24.0625 24.5625L24.0938 24.5938L25.0938 23.5938H25.125L25.1562 23.5625C26.2969 22.2773 26.3047 20.3047 25.0938 19.0938L23.7188 17.7188L33.7188 7.71875L32.2812 6.28125ZM18.6875 16.0938C18.9961 16.0859 19.3359 16.1914 19.5938 16.4062C19.6055 16.4141 19.6133 16.4297 19.625 16.4375L23.6875 20.5C24.0625 20.875 24.0977 21.6719 23.6875 22.1875C23.6719 22.207 23.6719 22.2305 23.6562 22.25L23.3438 22.5312L17.5625 16.75L17.9062 16.4062C18.0977 16.2148 18.3789 16.1016 18.6875 16.0938ZM16.0312 18.0312L21.9688 23.9688L16.0938 31.4688L14.6562 30.0312L16.8125 27.7812L15.375 26.4062L13.25 28.625L11.9375 27.3125L15.8125 23.4062L14.4062 22L10.5 25.875L8.53125 23.9062L16.0312 18.0312Z" fill="#844D00"/>
      </svg>`;
    case 'garage': 
      return `<svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="20" fill="#BDBDBD"/>
        <path d="M20 8.90625L7.625 14.0625L7 14.3438V31H33V14.3438L32.375 14.0625L20 8.90625ZM20 11.0938L31 15.6875V29H29V18H11V29H9V15.6875L20 11.0938ZM13 20H27V29H13V20Z" fill="#555555"/>
      </svg>`;
    case 'garden': 
      return `<svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="20" fill="#89B289"/>
        <path d="M19.0938 8C19.0938 8 17.8867 9.66406 18.25 12.2812C18.5273 14.2617 20.1797 15.5039 21.0938 16.0312C21.125 16.9844 21.1016 17.957 21 18.9375C20.5391 17.8125 19.5078 15.8438 17.5938 15.1562C15.7344 14.4844 13.375 15.3438 13.375 15.3438C13.6914 17.6602 15.2109 19.4609 17.6875 19.9062C19.2734 20.1914 20.332 20.0078 20.875 19.875C20.625 21.5469 20.1641 23.1992 19.5 24.6875C19.1406 23.582 17.9883 21.3203 14.6562 20.9375C12.6992 20.7148 10.8438 21.9375 10.8438 21.9375C10.8438 21.9375 12.0352 26.2188 15.875 26.2188C17.4336 26.2188 18.4648 25.8633 19.0625 25.5938C19.0312 25.6562 19.0039 25.7188 18.9688 25.7812C17.2617 28.8633 14.5586 31 10.4688 31V32C14.9141 32 18.0117 29.5586 19.8438 26.25C19.957 26.0469 20.0508 25.8359 20.1562 25.625C20.4297 25.832 21.9141 26.875 24.8438 26.875C28.082 26.875 29.5312 23.2188 29.5312 23.2188C29.5312 23.2188 27.9141 21.875 25.4375 21.875C23.0938 21.875 21.3398 23.7422 20.5312 24.8125C21.1758 23.3047 21.6289 21.6797 21.875 20.0312C22.0508 20.0664 25.3945 20.668 27.2812 18.75C29.2188 16.7812 28.9062 14.9688 28.9062 14.9688C28.9062 14.9688 25.6484 14.5039 23.875 16.125C22.7578 17.1484 22.168 18.8477 21.9375 19.625C22.1133 18.2969 22.1523 16.9727 22.0938 15.6875C22.4492 15.0312 22.9375 13.9102 22.9375 12.4375C22.9375 9.24219 19.0938 8 19.0938 8Z" fill="#005F00"/>
      </svg>`;
    case 'misc': 
      return `<svg width="30" height="30" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="40" height="40" rx="20" fill="#B2898A"/>
        <path d="M21.375 6.75C13.2759 6.75 6.75 13.2759 6.75 21.375C6.75 29.4741 13.2759 36 21.375 36C29.4741 36 36 29.4741 36 21.375C36 19.8018 35.7891 18.2329 35.2266 16.7695L33.3984 18.5625C33.6226 19.4634 33.75 20.3643 33.75 21.375C33.75 28.2393 28.2393 33.75 21.375 33.75C14.5107 33.75 9 28.2393 9 21.375C9 14.5107 14.5107 9 21.375 9C24.75 9 27.7822 10.3447 29.918 12.4805L31.5 10.8984C28.9116 8.31006 25.3125 6.75 21.375 6.75ZM34.0664 11.5664L21.375 24.2578L16.5586 19.4414L14.9414 21.0586L20.5664 26.6836L21.375 27.457L22.1836 26.6836L35.6836 13.1836L34.0664 11.5664Z" fill="#5F0002"/>
      </svg>`;
default: 
      return `<svg width="30" height="30" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="40" height="40" rx="20" fill="#B2898A"/>
        <path d="M21.375 6.75C13.2759 6.75 6.75 13.2759 6.75 21.375C6.75 29.4741 13.2759 36 21.375 36C29.4741 36 36 29.4741 36 21.375C36 19.8018 35.7891 18.2329 35.2266 16.7695L33.3984 18.5625C33.6226 19.4634 33.75 20.3643 33.75 21.375C33.75 28.2393 28.2393 33.75 21.375 33.75C14.5107 33.75 9 28.2393 9 21.375C9 14.5107 14.5107 9 21.375 9C24.75 9 27.7822 10.3447 29.918 12.4805L31.5 10.8984C28.9116 8.31006 25.3125 6.75 21.375 6.75ZM34.0664 11.5664L21.375 24.2578L16.5586 19.4414L14.9414 21.0586L20.5664 26.6836L21.375 27.457L22.1836 26.6836L35.6836 13.1836L34.0664 11.5664Z" fill="#5F0002"/>
      </svg>`;    }
  }

if (confirmTaskTypeBtn && addTaskDetailsModal) {
  confirmTaskTypeBtn.addEventListener('click', function() {
    if (!selectedCategory) {
      if (taskTypeError) taskTypeError.textContent = 'Please select a category.';
      return;
    }
    if (taskTypeError) taskTypeError.textContent = '';
    
    const selectedIconContainer = document.querySelector(`.task-type-icon[data-category="${selectedCategory}"]`);
    const selectedSvg = selectedIconContainer ? selectedIconContainer.querySelector('svg') : null;
    
    if (taskDetailsIconCircle) {
      taskDetailsIconCircle.innerHTML = '';
      
      if (selectedSvg) {
        const svgClone = selectedSvg.cloneNode(true);
        
        svgClone.setAttribute('width', '30');
        svgClone.setAttribute('height', '30');
        
        taskDetailsIconCircle.appendChild(svgClone);
      } else {
        taskDetailsIconCircle.innerHTML = getCategoryIconHTML(selectedCategory);
      }
    }
    
    selectTaskTypeModal.style.display = 'none';
    addTaskDetailsModal.style.display = 'flex';
  });
}

  // Cancel details modal
  if (cancelAddTaskBtn && addTaskDetailsModal) {
    cancelAddTaskBtn.addEventListener('click', function() {
      addTaskDetailsModal.style.display = 'none';
      // Optionally clear fields
      taskDetailsDescription.value = '';
      taskDetailsAmount.value = '';
      taskDetailsDate.value = '';
      taskDetailsTime.value = '';
      // Optionally reset selectedCategory
      // selectedCategory = null;
    });
  }

  // (Optional) Confirm details modal
  if (confirmAddTaskBtn && addTaskDetailsModal) {
    confirmAddTaskBtn.addEventListener('click', async function() {
      // Collect values
      const description = taskDetailsDescription.value.trim();
      const amount = parseFloat(taskDetailsAmount.value);
      const dueDateValue = taskDetailsDate.value;
      const dueTimeValue = taskDetailsTime.value;
      let dueDate;
      if (dueDateValue && dueTimeValue) {
        dueDate = new Date(`${dueDateValue}T${dueTimeValue}:00`);
      } else if (dueDateValue) {
        dueDate = new Date(`${dueDateValue}T00:00:00`);
      } else {
        dueDate = null;
      }
      if (!selectedCategory || !description || isNaN(amount) || amount < 0 || !dueDate) {
        alert('Please fill in all fields with valid values.');
        return;
      }
      try {
        const response = await fetch('/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: selectedCategory,
            description,
            amount,
            dueDate
          })
        });
        if (response.ok) {
          addTaskDetailsModal.style.display = 'none';
          // Optionally clear fields
          taskDetailsDescription.value = '';
          taskDetailsAmount.value = '';
          taskDetailsDate.value = '';
          taskDetailsTime.value = '';
          // Optionally reload the page or update the task list
          window.location.reload();
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to create task.');
        }
      } catch (err) {
        alert('Error creating task.');
      }
    });
  }

  window.addEventListener('click', function(event) {
    // Category modal
    if (selectTaskTypeModal && event.target === selectTaskTypeModal) {
      selectTaskTypeModal.style.display = 'none';
      selectedCategory = null;
      taskTypeIcons.forEach(i => i.classList.remove('selected'));
      if (taskTypeError) taskTypeError.textContent = '';
    }
    // Details modal
    if (addTaskDetailsModal && event.target === addTaskDetailsModal) {
      addTaskDetailsModal.style.display = 'none';
      taskDetailsDescription.value = '';
      taskDetailsAmount.value = '';
      taskDetailsDate.value = '';
      taskDetailsTime.value = '';
    }
  });

  function getIconHTML(category) {
    let iconClass = 'fa-solid ';
    switch(category) {
      case 'pet': iconClass += 'fa-dog'; break;
      case 'cleaning': iconClass += 'fa-broom'; break;
      case 'garage': iconClass += 'fa-warehouse'; break;
      case 'garden': iconClass += 'fa-leaf'; break;
      case 'misc': iconClass += 'fa-circle-check'; break;
      default: iconClass += 'fa-list-check';
    }
    return `<i class="${iconClass} child-task-modal-main-icon"></i>`;
  }

  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', function() {
      const title = card.querySelector('.task-text h3').textContent;
      const desc = card.dataset.description || '';
      const reward = card.querySelector('.task-text small').textContent.split('|')[0].trim();
      const due = card.querySelector('.due-date').textContent.split('|')[1] ? card.querySelector('.due-date').textContent.split('|')[1].trim() : '';
      let category = 'misc';
      if (card.querySelector('.task-icon').classList.contains('fa-dog')) category = 'pet';
      else if (card.querySelector('.task-icon').classList.contains('fa-broom')) category = 'cleaning';
      else if (card.querySelector('.task-icon').classList.contains('fa-warehouse')) category = 'garage';
      else if (card.querySelector('.task-icon').classList.contains('fa-leaf')) category = 'garden';
      else if (card.querySelector('.task-icon').classList.contains('fa-circle-check')) category = 'misc';
      else category = 'misc';
      modalIcon.innerHTML = getIconHTML(category);
      modalTitle.textContent = title;
      modalDesc.textContent = desc;
      modalReward.textContent = reward;
      modalDue.textContent = due;

      currentTaskGoalId = card.dataset.goalId || null;

      // Get status from status-badge class
      let status = '';
      const badge = card.querySelector('.status-badge');
      if (badge && badge.classList.length > 1) {
        status = badge.classList[1];
      }

      if (status === 'new' || status === 'in_progress') {
        modalActions.style.display = 'flex';
        modalCancelBtn.style.display = 'inline-block';
        modalStartBtn.style.display = status === 'new' ? 'inline-block' : 'none';
        modalCompleteBtn.style.display = status === 'in_progress' ? 'inline-block' : 'none';
        modalAssignGoalBtn.style.display = 'inline-block';
        if (modalBackBtn) modalBackBtn.style.display = 'none';
      } else if (status === 'completed') {
        modalActions.style.display = 'none';
        modalStartBtn.style.display = 'none';
        modalCompleteBtn.style.display = 'none';
        modalAssignGoalBtn.style.display = 'none';
        if (modalBackBtn) modalBackBtn.style.display = 'block';
        // Set confirmed by info for completed status
        if (modalConfirmedBy) {
          const parentName = card.dataset.parentName || '';
          if (parentName) {
            modalConfirmedBy.textContent = `Confirmed - ${parentName}`;
          } else {
            modalConfirmedBy.textContent = '';
          }
        }
        // Set goal info for completed status
        if (modalGoalInfo) {
          let goalTitle = '';
          let rewardAmount = reward.replace('$', '').trim();
          // Try to get goal title from the card if available
          if (card.dataset.goalId && card.dataset.goalId !== '') {
            // Try to find the goal title from the assignGoalForm
            let foundTitle = '';
            if (assignGoalForm) {
              const goalRadio = assignGoalForm.querySelector(`input[value='${card.dataset.goalId}']`);
              if (goalRadio) {
                const span = goalRadio.parentElement.querySelector('span');
                if (span) foundTitle = span.textContent;
              }
            }
            goalTitle = foundTitle || 'Goal';
            modalGoalInfo.textContent = `$${rewardAmount} Added towards ${goalTitle}`;
          } else {
            modalGoalInfo.textContent = "NO GOAL ASSIGNED";
          }
        }
      } else {
        modalActions.style.display = 'none';
        modalStartBtn.style.display = 'none';
        modalCompleteBtn.style.display = 'none';
        modalAssignGoalBtn.style.display = 'none';
        if (modalBackBtn) modalBackBtn.style.display = 'none';
        if (modalConfirmedBy) modalConfirmedBy.textContent = '';
        if (modalGoalInfo) modalGoalInfo.textContent = '';
      }

      modal.dataset.taskId = card.dataset.taskId;

      modal.style.display = 'flex';
    });
  });

  function closeModal() {
    modal.style.display = 'none';
  }
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
  if (modalBackBtn) modalBackBtn.addEventListener('click', closeModal);
  window.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });

  if (modalStartBtn) modalStartBtn.addEventListener('click', async function() {
    const taskId = modal.dataset.taskId;
    if (!taskId) return;
    try {
      const response = await fetch(`/tasks/update/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' })
      });
      if (response.ok) {
        const card = document.querySelector(`.task-card[data-task-id='${taskId}']`);
        if (card) {
          const badge = card.querySelector('.status-badge');
          badge.textContent = 'In Progress';
          badge.className = 'status-badge in_progress';
        }
        modal.style.display = 'none';
      } else {
        alert('Failed to update task status.');
      }
    } catch (err) {
      alert('Error updating task status.');
    }
  });

  if (modalCompleteBtn) modalCompleteBtn.addEventListener('click', async function() {
    const taskId = modal.dataset.taskId;
    if (!taskId) return;
    try {
      const response = await fetch(`/tasks/update/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      if (response.ok) {
        const card = document.querySelector(`.task-card[data-task-id='${taskId}']`);
        if (card) {
          const badge = card.querySelector('.status-badge');
          badge.textContent = 'Completed';
          badge.className = 'status-badge completed';
          // Move the card to the end of the task-list
          const taskList = card.closest('.task-list');
          if (taskList) {
            taskList.appendChild(card);
          }
        }
        modal.style.display = 'none';
      } else {
        alert('Failed to mark task as completed.');
      }
    } catch (err) {
      alert('Error marking task as completed.');
    }
  });

  if (modalAssignGoalBtn) modalAssignGoalBtn.addEventListener('click', function() {
    modal.style.display = 'none';
    if (currentTaskGoalId) {
      let currentGoalTitle = '';
      if (assignGoalForm) {
        const currentGoalLabel = assignGoalForm.querySelector(`input[value='${currentTaskGoalId}']`);
        if (currentGoalLabel) {
          const span = currentGoalLabel.parentElement.querySelector('span');
          if (span) currentGoalTitle = span.textContent;
        }
      }
      confirmReassignMsg.textContent = currentGoalTitle
        ? `You assigned the task to "${currentGoalTitle}" goal. Are you sure you want to change the goal?`
        : 'This task is already assigned to a goal. Are you sure you want to change it?';
      confirmReassignModal.style.display = 'flex';
      pendingAssign = { openAssignModal: true };
    } else {
      assignGoalModal.style.display = 'flex';
    }
  });

  if (cancelAssignGoalModalBtn) {
    cancelAssignGoalModalBtn.addEventListener('click', function() {
      assignGoalModal.style.display = 'none';
    });
  }
  window.addEventListener('click', function(e) {
    if (e.target === assignGoalModal) assignGoalModal.style.display = 'none';
  });

  if (assignGoalForm) {
    assignGoalForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const taskId = modal.dataset.taskId;
      const selectedGoal = assignGoalForm.querySelector('input[name="goalId"]:checked');
      if (!selectedGoal) {
        alert('Please select a goal to assign.');
        return;
      }
      if (currentTaskGoalId && currentTaskGoalId !== selectedGoal.value && !pendingAssign) {
        const currentGoalLabel = assignGoalForm.querySelector(`input[value='${currentTaskGoalId}']`);
        let currentGoalTitle = '';
        if (currentGoalLabel) {
          const span = currentGoalLabel.parentElement.querySelector('span');
          if (span) currentGoalTitle = span.textContent;
        }
        confirmReassignMsg.textContent = currentGoalTitle
          ? `You assigned the task to "${currentGoalTitle}" goal. Are you sure you want to change the goal?`
          : 'This task is already assigned to a goal. Are you sure you want to change it?';
        confirmReassignModal.style.display = 'flex';
        pendingAssign = { taskId, goalId: selectedGoal.value };
        return;
      }
      await assignTaskToGoal(taskId, selectedGoal.value);
    });
  }

  async function assignTaskToGoal(taskId, goalId) {
    try {
      const response = await fetch(`/tasks/assign-goal/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId })
      });
      if (response.ok) {
        assignGoalModal.style.display = 'none';
        confirmReassignModal.style.display = 'none';
        const card = document.querySelector(`.task-card[data-task-id='${taskId}']`);
        if (card) {
          card.setAttribute('data-goal-id', goalId);
        }
        currentTaskGoalId = goalId;
      } else {
        alert('Failed to assign task to goal.');
      }
    } catch (err) {
      alert('Error assigning task to goal.');
    }
  }

  if (confirmReassignYes) {
    confirmReassignYes.addEventListener('click', async function() {
      if (pendingAssign && pendingAssign.openAssignModal) {
        confirmReassignModal.style.display = 'none';
        assignGoalModal.style.display = 'flex';
        pendingAssign = null;
        return;
      }
      if (pendingAssign) {
        await assignTaskToGoal(pendingAssign.taskId, pendingAssign.goalId);
        pendingAssign = null;
      }
    });
  }
  if (confirmReassignNo) {
    confirmReassignNo.addEventListener('click', function() {
      confirmReassignModal.style.display = 'none';
      pendingAssign = null;
    });
  }
}); 