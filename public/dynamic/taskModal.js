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
  let currentTaskGoalId = null;
  let pendingAssign = null;

  // Add New Task modal logic for parent tasks page
  const addTaskBtn = document.querySelector('.add-task-btn');
  const selectTaskTypeModal = document.getElementById('selectTaskTypeModal');
  const cancelTaskTypeBtn = document.getElementById('cancelTaskTypeBtn');
  const taskTypeIcons = document.querySelectorAll('.task-type-icon');

  if (addTaskBtn && selectTaskTypeModal) {
    addTaskBtn.addEventListener('click', function(e) {
      e.preventDefault();
      selectTaskTypeModal.style.display = 'flex';
    });
  }

  if (cancelTaskTypeBtn && selectTaskTypeModal) {
    cancelTaskTypeBtn.addEventListener('click', function() {
      selectTaskTypeModal.style.display = 'none';
    });
  }

  window.addEventListener('click', function(event) {
    if (event.target === selectTaskTypeModal) {
      selectTaskTypeModal.style.display = 'none';
    }
  });

  // Highlight selected category icon
  if (taskTypeIcons.length > 0) {
    taskTypeIcons.forEach(icon => {
      icon.addEventListener('click', function() {
        taskTypeIcons.forEach(i => i.classList.remove('selected'));
        this.classList.add('selected');
      });
    });
  }

  function getIconHTML(category) {
    let iconClass = 'fa-solid ';
    switch(category) {
      case 'dog': iconClass += 'fa-dog'; break;
      case 'house': iconClass += 'fa-house'; break;
      case 'babysit': iconClass += 'fa-baby'; break;
      case 'plants': iconClass += 'fa-leaf'; break;
      default: iconClass += 'fa-list-check';
    }
    return `<i class="${iconClass} task-icon"></i>`;
  }

  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', function() {
      const title = card.querySelector('.task-text h3').textContent;
      const desc = card.dataset.description || '';
      const reward = card.querySelector('.task-text small').textContent.split('|')[0].trim();
      const due = card.querySelector('.due-date').textContent.split('|')[1] ? card.querySelector('.due-date').textContent.split('|')[1].trim() : '';
      const iconHTML = card.querySelector('.task-icon').outerHTML;
      const status = card.querySelector('.status-badge') ? card.querySelector('.status-badge').classList[1] : '';
      const category = card.querySelector('.task-icon').classList.contains('fa-dog') ? 'dog' :
                       card.querySelector('.task-icon').classList.contains('fa-house') ? 'house' :
                       card.querySelector('.task-icon').classList.contains('fa-baby') ? 'babysit' :
                       card.querySelector('.task-icon').classList.contains('fa-leaf') ? 'plants' : 'other';

      modalIcon.innerHTML = getIconHTML(category);
      modalTitle.textContent = title;
      modalDesc.textContent = desc;
      modalReward.textContent = reward;
      modalDue.textContent = due;

      currentTaskGoalId = card.dataset.goalId || null;

      if (status === 'new') {
        modalActions.style.display = 'flex';
        modalCancelBtn.style.display = 'inline-block';
        modalStartBtn.style.display = 'inline-block';
        modalCompleteBtn.style.display = 'none';
        modalAssignGoalBtn.style.display = 'none';
      } else if (status === 'in_progress') {
        modalActions.style.display = 'flex';
        modalCancelBtn.style.display = 'inline-block';
        modalStartBtn.style.display = 'none';
        modalCompleteBtn.style.display = 'inline-block';
        modalAssignGoalBtn.style.display = 'inline-block';
      } else {
        modalActions.style.display = 'none';
        modalStartBtn.style.display = 'none';
        modalCompleteBtn.style.display = 'none';
        modalAssignGoalBtn.style.display = 'none';
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