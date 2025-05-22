document.addEventListener('DOMContentLoaded', function() {
  initProgressBars();
  setupTaskCardListeners();
  
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

async function completeTaskWGoal(taskId, goalId) {
  try {
    
    const completeBtn = document.getElementById('modalCompleteBtn');
    if (completeBtn) {
      completeBtn.disabled = true;
      completeBtn.textContent = 'Completing...';
    }
    
    let initialGoalData = null;
    if (goalId) {
      try {
        const initialResponse = await fetch(`/goals/${goalId}/data`);
        if (initialResponse.ok) {
          initialGoalData = await initialResponse.json();
        }
      } catch (e) {
        console.error('Error fetching initial goal data:', e);
      }
    }
    
    const response = await fetch(`/tasks/${taskId}/complete`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    
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
        
        const updateResponse = await fetch(`/goals/${goalId}/update-progress`, {
          method: 'POST'
        });
        
        if (updateResponse.ok) {
          const updateResult = await updateResponse.json();
          if (updateResult.success && updateResult.goal) {
            const goalData = updateResult.goal;
            
            if (typeof updateProgressBar === 'function') {
              updateProgressBar(
                goalId, 
                goalData.progress,
                goalData.amountAchieved,
                goalData.totalRequired
              );
            }
            
            if (typeof updateGoalUI === 'function') {
              updateGoalUI(goalData);
            }
          } else {            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const goalResponse = await fetch(`/goals/${goalId}/data`);
            if (goalResponse.ok) {
              const goalData = await goalResponse.json();
              
              if (goalData && (!initialGoalData || 
                  initialGoalData.amountAchieved !== goalData.amountAchieved ||
                  initialGoalData.progress !== goalData.progress)) {
                
                
                if (typeof updateProgressBar === 'function') {
                  updateProgressBar(
                    goalId, 
                    goalData.progress,
                    goalData.amountAchieved,
                    goalData.totalRequired
                  );
                }
                
                if (typeof updateGoalUI === 'function') {
                  updateGoalUI(goalData);
                }
              } else {
                setTimeout(() => window.location.reload(), 3000);
              }
            } else {
              console.error(`Failed to fetch goal data: ${goalResponse.status}`);
              setTimeout(() => window.location.reload(), 3000);
            }
          }
        } else {
          console.error(`Failed to update goal progress: ${updateResponse.status}`);
          setTimeout(() => window.location.reload(), 3000);
        }
      }
      
      if (result.userBalance !== undefined) {
        const balanceElements = document.querySelectorAll('.userBalance');
        balanceElements.forEach(element => {
          element.textContent = `$${parseFloat(result.userBalance).toFixed(2)}`;
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
      const assignGoalBtn = document.getElementById('modalAssignGoalBtn');
      
      if (startBtn) startBtn.style.display = 'none';
      if (completeBtn) completeBtn.style.display = 'none';
      if (assignGoalBtn) assignGoalBtn.style.display = 'none';
      
      const modalStatusEl = document.getElementById('modalTaskStatus');
      if (modalStatusEl) {
        modalStatusEl.innerHTML = `<span class="statusBadge completed">Completed</span>`;
      }
      
      setTimeout(() => {
        closeModal('taskModal');

        if (result.goalUpdated && goalId && result.goal) {
          
          const goalElement = document.querySelector(`.goal-${goalId} .goalAmountText`);
          if (goalElement) {
            const displayedAmount = goalElement.textContent.replace('$', '').trim();
            const expectedAmount = parseFloat(result.goal.amountAchieved).toFixed(2);
            
            if (displayedAmount !== expectedAmount) {
              setTimeout(() => window.location.reload(), 3000);
            }
          } else {
            setTimeout(() => window.location.reload(), 3000);
          }
        } else {
          setTimeout(() => window.location.reload(), 3000);
        }
      }, 1500);
    } else {
      throw new Error(result.error || 'Failed to complete task');
    }
  } catch (error) {
    console.error('Error completing task:', error);
    alert('Error completing task: ' + error.message);
    
    const completeBtn = document.getElementById('modalCompleteBtn');
    if (completeBtn) {
      completeBtn.disabled = false;
      completeBtn.textContent = 'Complete Task';
    }
  }
}

function updateGoalUI(goalData) {
  
  const goalId = goalData._id.toString();
  
  const remainingElement = document.querySelector(`.goal-${goalId} .remaining-amount`);
  if (remainingElement) {
    const remaining = Math.max(0, goalData.totalRequired - goalData.amountAchieved);
    remainingElement.textContent = `$${parseFloat(remaining).toFixed(2)}`;
  }
  
  const remainingModalElement = document.getElementById('remainingGoalAmount');
  if (remainingModalElement) {
    const remaining = Math.max(0, goalData.totalRequired - goalData.amountAchieved);
    remainingModalElement.textContent = parseFloat(remaining).toFixed(2);
  }
  
  const amountText = document.querySelector(`.goal-${goalId} .goalAmountText`);
  if (amountText) {
    amountText.textContent = `$${parseFloat(goalData.amountAchieved).toFixed(2)}`;
  }
  
  if (goalData.completed) {
    
    const goalElement = document.querySelector(`.goal-${goalId}`);
    if (goalElement) {
      goalElement.classList.add('completed');
    }
    
    const statusElement = document.querySelector(`.goal-${goalId} .goalStatus`);
    if (statusElement) {
      statusElement.textContent = 'Ready';
      statusElement.classList.add('ready');
    }
  }
}

function refreshAllGoalProgress() {
  
  const goals = document.querySelectorAll('[data-goal-id]');
  
  goals.forEach(goalElement => {
    const goalId = goalElement.dataset.goalId;
    if (goalId) {
      refreshGoalProgress(goalId);
    }
  });
}

function updateProgressBar(goalId, percentage, amountAchieved, totalRequired) {
  const progress = Math.max(0, percentage);
  const progressPath = document.getElementById(`progress-path-${goalId}`);
  
  if (!progressPath) return;
  
  if (progress <= 0) {
    progressPath.style.visibility = 'hidden';
    return;
  }
  
  progressPath.style.visibility = 'visible';
  
  const pathLength = 394.27;
  const dashOffset = pathLength - (pathLength * progress / 100);
  
  progressPath.setAttribute('stroke-dasharray', pathLength);
  progressPath.setAttribute('stroke-dashoffset', dashOffset);
  
  const percentageEl = document.getElementById(`progress-text-${goalId}`);
  if (percentageEl) {
    percentageEl.textContent = `${Math.round(progress)}%`;
  }
  
  if (amountAchieved !== undefined) {
    const amountEl = document.querySelector(`#progress-container-${goalId} .assignedToGoal`);
    if (amountEl) {
      amountEl.textContent = `Earned so far $${parseFloat(amountAchieved).toFixed(2)}`;
    }
  }
}
function refreshGoalProgress(goalId) {
  
  fetch(`/goals/${goalId}/data`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then(goalData => {
      
      updateProgressBar(
        goalId, 
        goalData.progress,
        goalData.amountAchieved,
        goalData.totalRequired
      );
      
      updateGoalUI(goalData);
    })
    .catch(error => console.error(`Error refreshing goal ${goalId} data:`, error));
}

async function refreshGoalData(goalId) {
  
  try {
    const response = await fetch(`/goals/${goalId}/data`);
    
    if (response.ok) {
      const goalData = await response.json();
      
      updateProgressBar(
        goalId,
        goalData.progress,
        goalData.amountAchieved,
        goalData.totalRequired
      );
      
      updateGoalUI(goalData);
    } else {
      console.error(`Failed to fetch goal ${goalId} data: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error refreshing goal ${goalId} data:`, error);
  }
}