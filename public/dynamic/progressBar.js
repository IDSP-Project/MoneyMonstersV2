document.addEventListener('DOMContentLoaded', function() {
  initProgressBars();
  
  setupTaskListeners();
});

function initProgressBars() {
  const progressContainers = document.querySelectorAll('.progressContainer');
  
  progressContainers.forEach(container => {
    const goalId = container.id.split('-').pop();
    const currentProgress = parseFloat(container.dataset.progress);
    
    updateProgressBar(goalId, 0.01);
    setTimeout(() => {
      updateProgressBar(goalId, currentProgress);
    }, 300);
  });
}

function setupTaskListeners() {
  const completeTaskButtons = document.querySelectorAll('.complete-task-btn');
  completeTaskButtons.forEach(button => {
    button.addEventListener('click', function() {
      const taskId = this.dataset.taskId;
      const goalId = this.dataset.goalId;
      
      fetch(`/tasks/${taskId}/complete`, {
        method: 'POST'
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          fetch(`/goals/${goalId}/update-progress`, {
            method: 'POST'
          })
          .then(response => response.json())
          .then(goalData => {
            if (goalData.success) {
              fetch(`/goals/${goalId}/data`)
                .then(response => response.json())
                .then(updatedGoal => {
                  updateProgressBar(
                    goalId, 
                    updatedGoal.progress,
                    updatedGoal.amountAchieved,
                    updatedGoal.totalRequired
                  );
                });
            }
          });
        }
      });
    });
  });
}

function updateProgressBar(goalId, percentage, amountAchieved, totalRequired) {
  const progress = Math.max(0.01, percentage);
  
  const pathLength = 502;
  const dashArray = pathLength;
  const dashOffset = pathLength - (pathLength * progress / 100);
  
  const progressPath = document.getElementById(`progress-path-${goalId}`);
  if (progressPath) {
    progressPath.setAttribute('stroke-dashoffset', dashOffset);
  }
  
  const progressText = document.getElementById(`progress-text-${goalId}`);
  if (progressText) {
    progressText.textContent = `${progress.toFixed(0)}%`;
  }
  
  if (amountAchieved !== undefined && totalRequired !== undefined) {
    const assignedText = document.querySelector(`#progress-container-${goalId} .assignedToGoal`);
    if (assignedText) {
      assignedText.textContent = `$${amountAchieved.toFixed(2)} / $${totalRequired.toFixed(2)}`;
    }
  }
  
  const container = document.getElementById(`progress-container-${goalId}`);
  if (container) {
    container.dataset.progress = progress;
  }
}