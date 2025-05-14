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
    console.log(`Completing task ${taskId} with goal ${goalId}`);
    
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
          console.log('Initial goal state:', initialGoalData);
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
    console.log('Task completion result:', result);
    
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
        console.log(`Explicitly refreshing goal ${goalId} data after task completion`);
        
        const updateResponse = await fetch(`/goals/${goalId}/update-progress`, {
          method: 'POST'
        });
        
        if (updateResponse.ok) {
          const updateResult = await updateResponse.json();
          if (updateResult.success && updateResult.goal) {
            const goalData = updateResult.goal;
            console.log('Updated goal data from update endpoint:', goalData);
            
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
            console.log('No goal data in update response, fetching separately');
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const goalResponse = await fetch(`/goals/${goalId}/data`);
            if (goalResponse.ok) {
              const goalData = await goalResponse.json();
              
              if (goalData && (!initialGoalData || 
                  initialGoalData.amountAchieved !== goalData.amountAchieved ||
                  initialGoalData.progress !== goalData.progress)) {
                
                console.log('Goal data changed, updating UI with:', goalData);
                
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
                console.log('Goal data unchanged or invalid, forcing page reload');
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
          console.log("Server indicated goal was updated, verifying UI update...");
          
          const goalElement = document.querySelector(`.goal-${goalId} .goalAmountText`);
          if (goalElement) {
            const displayedAmount = goalElement.textContent.replace('$', '').trim();
            const expectedAmount = parseFloat(result.goal.amountAchieved).toFixed(2);
            
            console.log("UI verification:", {
              displayedInUI: displayedAmount,
              expectedFromServer: expectedAmount,
              goalElement: goalElement.outerHTML
            });
            
            if (displayedAmount !== expectedAmount) {
              console.log(`UI not updated correctly: displayed=${displayedAmount}, expected=${expectedAmount}`);
              setTimeout(() => window.location.reload(), 3000);
            }
          } else {
            console.log(`Goal element .goal-${goalId} .goalAmountText not found, reloading page`);
            setTimeout(() => window.location.reload(), 3000);
          }
        } else {
          console.log("No goal update indicated or missing data, reloading page");
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
  console.log(`Updating UI for goal ${goalData._id}`);
  
  const goalId = goalData._id.toString();
  
  const remainingElement = document.querySelector(`.goal-${goalId} .remaining-amount`);
  if (remainingElement) {
    const remaining = Math.max(0, goalData.totalRequired - goalData.amountAchieved);
    remainingElement.textContent = `$${parseFloat(remaining).toFixed(2)}`;
    console.log(`Updated remaining amount to $${parseFloat(remaining).toFixed(2)}`);
  }
  
  const remainingModalElement = document.getElementById('remainingGoalAmount');
  if (remainingModalElement) {
    const remaining = Math.max(0, goalData.totalRequired - goalData.amountAchieved);
    remainingModalElement.textContent = parseFloat(remaining).toFixed(2);
    console.log(`Updated modal remaining amount to ${parseFloat(remaining).toFixed(2)}`);
  }
  
  const amountText = document.querySelector(`.goal-${goalId} .goalAmountText`);
  if (amountText) {
    amountText.textContent = `$${parseFloat(goalData.amountAchieved).toFixed(2)}`;
    console.log(`Updated amount text to $${parseFloat(goalData.amountAchieved).toFixed(2)}`);
  }
  
  if (goalData.completed) {
    console.log(`Goal ${goalId} is completed, updating UI to show completion`);
    
    const goalElement = document.querySelector(`.goal-${goalId}`);
    if (goalElement) {
      goalElement.classList.add('completed');
      console.log(`Added completed class to goal element`);
    }
    
    const statusElement = document.querySelector(`.goal-${goalId} .goalStatus`);
    if (statusElement) {
      statusElement.textContent = 'Ready';
      statusElement.classList.add('ready');
      console.log(`Updated status text to 'Ready'`);
    }
  }
}

function refreshAllGoalProgress() {
  console.log('Refreshing all goal progress data');
  
  const goals = document.querySelectorAll('[data-goal-id]');
  console.log(`Found ${goals.length} goals to refresh`);
  
  goals.forEach(goalElement => {
    const goalId = goalElement.dataset.goalId;
    if (goalId) {
      console.log(`Refreshing goal ${goalId}`);
      refreshGoalProgress(goalId);
    }
  });
}

function updateProgressBar(goalId, percentage, amountAchieved, totalRequired) {
  console.log(`Updating progress bar for goal ${goalId} to ${percentage}%`);
  
  const progress = Math.max(0.01, percentage);
  
  const pathLength = 502; 
  const dashArray = pathLength;
  const dashOffset = pathLength - (pathLength * progress / 100);
  
  const progressPath = document.getElementById(`progress-path-${goalId}`);
  if (progressPath) {
    console.log(`Found progress path element, updating to ${dashOffset}`);
    progressPath.setAttribute('stroke-dashoffset', dashOffset);
  } else {
    console.log(`Progress path element not found for goal ${goalId}`);
  }
  
  const progressText = document.getElementById(`progress-text-${goalId}`);
  if (progressText) {
    progressText.textContent = `${progress.toFixed(0)}%`;
    console.log(`Updated progress text to ${progress.toFixed(0)}%`);
  }
  
  const standardProgressBar = document.querySelector(`.goal-${goalId} .goalProgressBar .progress`);
  if (standardProgressBar) {
    console.log(`Found standard progress bar, updating to width ${progress}%`);
    standardProgressBar.style.width = `${progress}%`;
  }
  
  const progressPercentage = document.querySelector(`.goal-${goalId} .goalProgressPercentage`);
  if (progressPercentage) {
    progressPercentage.textContent = `${progress.toFixed(0)}%`;
    console.log(`Updated progress percentage text to ${progress.toFixed(0)}%`);
  }
  
  if (amountAchieved !== undefined && totalRequired !== undefined) {
    const assignedText = document.querySelector(`#progress-container-${goalId} .assignedToGoal`);
    if (assignedText) {
      assignedText.textContent = `$${amountAchieved.toFixed(2)}`;
      console.log(`Updated assigned text to $${amountAchieved.toFixed(2)}`);
    }
    
    const amountText = document.querySelector(`.goal-${goalId} .goalAmountText`);
    if (amountText) {
      amountText.textContent = `$${amountAchieved.toFixed(2)}`;
      console.log(`Updated amount text to $${amountAchieved.toFixed(2)}`);
    }
  }
  
  const container = document.getElementById(`progress-container-${goalId}`);
  if (container) {
    container.dataset.progress = progress;
    console.log(`Updated container data-progress to ${progress}`);
  }
}

function refreshGoalProgress(goalId) {
  console.log(`Fetching fresh data for goal ${goalId}`);
  
  fetch(`/goals/${goalId}/data`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then(goalData => {
      console.log(`Received data for goal ${goalId}:`, goalData);
      
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
  console.log(`Refreshing data for goal ${goalId}`);
  
  try {
    const response = await fetch(`/goals/${goalId}/data`);
    
    if (response.ok) {
      const goalData = await response.json();
      console.log(`Received fresh data for goal ${goalId}:`, goalData);
      
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