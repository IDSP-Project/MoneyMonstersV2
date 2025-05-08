function updateProgressBar(percentage) {
  document.querySelector('.progress-percentage').textContent = percentage + '%';
  
  const progressPath = document.querySelector('.progressBar svg path:nth-child(2)');
  
  if (progressPath) {
    const startPoint = { x: 14, y: 139.091 }; 
    
    if (percentage <= 0) {
      progressPath.setAttribute('d', `M${startPoint.x} ${startPoint.y}`);
    } else if (percentage >= 100) {
      progressPath.setAttribute('d', 'M14 139.091C14 122.675 17.2591 106.421 23.5912 91.2555C29.9233 76.0899 39.2044 62.31 50.9046 50.7027C62.6048 39.0953 76.4949 29.8879 91.782 23.606C107.069 17.3243 123.453 14.0911 140 14.0911C156.547 14.0911 172.931 17.3243 188.218 23.6061C203.505 29.888 217.395 39.0954 229.095 50.7028C240.796 62.31 250.077 76.09 256.409 91.2556C262.741 106.421 266 122.675 266 139.091');
    } else {
      let endAngle = (percentage / 100) * 3.6 * 100;
      
      if (percentage <= 25) {
        progressPath.setAttribute('d', `M14 139.091C14 112.698 22.4242 86.9834 38.0655 65.6296`);
      } else if (percentage <= 50) {
        progressPath.setAttribute('d', `M14 139.091C14 112.698 22.4242 86.9834 38.0655 65.6296C53.707 44.276 75.7629 28.3795 101.073 20.2179`);
      } else if (percentage <= 75) {
        progressPath.setAttribute('d', `M14 139.091C14 112.698 22.4242 86.9834 38.0655 65.6296C53.707 44.276 75.7629 28.3795 101.073 20.2179C126.384 12.0564 153.65 12.0486 178.965 20.1955`);
      } else {
        progressPath.setAttribute('d', `M14 139.091C14 112.698 22.4242 86.9834 38.0655 65.6296C53.707 44.276 75.7629 28.3795 101.073 20.2179C126.384 12.0564 153.65 12.0486 178.965 20.1955C204.281 28.3424 226.345 44.2262 242 65.5708`);
      }
    }
  }
}

function calculateGoalPercentage() {
  const goalPrice = parseFloat(document.querySelector('.goal-price').textContent.replace('Target: $', '').trim()) || 0;
  
  let completedAmount = 0;
  const completedTasks = document.querySelectorAll('.task-card .task-status .status-badge.complete');
  completedTasks.forEach(task => {
    const taskCard = task.closest('.task-card');
    const rewardText = taskCard.querySelector('.due-date').textContent;
    const reward = parseFloat(rewardText.split('|')[0].replace('$', '').trim()) || 0;
    completedAmount += reward;
  });
  
  let percentage = goalPrice > 0 ? Math.round((completedAmount / goalPrice) * 100) : 0;
  percentage = Math.min(percentage, 100);
  
  return percentage;
}

function updateGoalProgress() {
  const percentage = calculateGoalPercentage();
  updateProgressBar(percentage);
}

document.addEventListener('DOMContentLoaded', function() {
  updateGoalProgress();
  
  document.addEventListener('taskStatusChanged', updateGoalProgress);
});