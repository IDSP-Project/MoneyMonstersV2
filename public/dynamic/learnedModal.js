// learned Model Logic

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
  function getCategoryIconHTML(category) {
    switch(category) {
      case 'pet': return '<i class="fa-solid fa-dog"></i>';
      case 'cleaning': return '<i class="fa-solid fa-broom"></i>';
      case 'garage': return '<i class="fa-solid fa-warehouse"></i>';
      case 'garden': return '<i class="fa-solid fa-leaf"></i>';
      case 'misc': return '<i class="fa-solid fa-circle-check"></i>';
      default: return '<i class="fa-solid fa-list-check"></i>';
    }
  }

  // Open details modal after confirming category
  if (confirmTaskTypeBtn && addTaskDetailsModal) {
    confirmTaskTypeBtn.addEventListener('click', function() {
      if (!selectedCategory) {
        if (taskTypeError) taskTypeError.textContent = 'Please select a category.';
        return;
      }
      if (taskTypeError) taskTypeError.textContent = '';
      // Set icon in details modal
      if (taskDetailsIconCircle) {
        taskDetailsIconCircle.innerHTML = getCategoryIconHTML(selectedCategory);
      }
      // Show details modal, hide category modal
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
        if (modalGoalInfo) {
          let goalTitle = '';
          let rewardAmount = reward.replace('$', '').trim();
          if (card.dataset.goalId && card.dataset.goalId !== '') {
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