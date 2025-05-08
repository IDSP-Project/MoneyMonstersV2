// Modal functions
function openAssignTaskModal() {
  const modal = document.getElementById('assignTaskModal');
  modal.style.display = 'flex';
  loadAvailableTasks();
}

function closeAssignTaskModal() {
  const modal = document.getElementById('assignTaskModal');
  modal.style.display = 'none';
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.taskId = task._id;

  const taskInfo = document.createElement('div');
  taskInfo.className = 'task-info';

  const icon = document.createElement('i');
  icon.className = `fa-solid ${getTaskIcon(task.category)} task-icon`;

  const taskText = document.createElement('div');
  taskText.className = 'task-text';

  const title = document.createElement('h3');
  title.textContent = task.title;

  const details = document.createElement('small');
  details.className = 'due-date';
  details.dataset.due = task.dueDate;
  details.textContent = `$${task.reward.toFixed(2)} | ${task.formattedDue || ''}`;

  const assignBtn = document.createElement('button');
  assignBtn.className = 'assign-btn';
  assignBtn.textContent = 'Assign';
  assignBtn.onclick = () => assignTask(task._id);

  taskText.appendChild(title);
  taskText.appendChild(details);
  taskInfo.appendChild(icon);
  taskInfo.appendChild(taskText);
  card.appendChild(taskInfo);
  card.appendChild(assignBtn);

  return card;
}

function createNoTasksMessage() {
  const container = document.createElement('div');
  container.className = 'no-tasks-message';

  const icon = document.createElement('i');
  icon.className = 'fas fa-tasks';

  const heading = document.createElement('h2');
  heading.textContent = 'No Available Tasks';

  const message = document.createElement('p');
  message.textContent = 'There are no tasks available to assign to this goal.';

  container.appendChild(icon);
  container.appendChild(heading);
  container.appendChild(message);

  return container;
}

function createErrorMessage() {
  const container = document.createElement('div');
  container.className = 'error-message';
  container.textContent = 'Failed to load tasks. Please try again.';
  return container;
}

function clearTaskList(taskList) {
  while (taskList.firstChild) {
    taskList.removeChild(taskList.firstChild);
  }
}

async function loadAvailableTasks() {
  try {
    const response = await fetch('/tasks/available');
    const tasks = await response.json();
    const taskList = document.querySelector('#assignTaskModal .task-list');
    
    clearTaskList(taskList);
    
    if (tasks.length === 0) {
      taskList.appendChild(createNoTasksMessage());
      return;
    }

    tasks.forEach(task => {
      taskList.appendChild(createTaskCard(task));
    });

    if (typeof formatDueDates === 'function') {
      formatDueDates();
    }
  } catch (error) {
    console.error('Error loading available tasks:', error);
    const taskList = document.querySelector('#assignTaskModal .task-list');
    clearTaskList(taskList);
    taskList.appendChild(createErrorMessage());
  }
}

function getTaskIcon(category) {
  switch(category) {
    case 'pet': return 'fa-dog';
    case 'cleaning': return 'fa-broom';
    case 'garage': return 'fa-warehouse';
    case 'garden': return 'fa-leaf';
    case 'misc': return 'fa-circle-check';
    default: return 'fa-list-check';
  }
}

async function assignTask(taskId) {
  const goalId = document.body.dataset.goalId;
  try {
    const response = await fetch('/tasks/assign-goal/' + taskId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ goalId })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to assign task');
    }

    closeAssignTaskModal();
    window.location.reload();
  } catch (error) {
    console.error('Error assigning task:', error);
    const errorMessage = error.message || 'Failed to assign task. Please try again.';
    alert(errorMessage);
  }
}

window.onclick = function(event) {
  const modal = document.getElementById('assignTaskModal');
  if (event.target === modal) {
    closeAssignTaskModal();
  }
}

window.openAssignTaskModal = openAssignTaskModal;
window.closeAssignTaskModal = closeAssignTaskModal; 