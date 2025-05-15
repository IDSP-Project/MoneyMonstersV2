function formatDueDateForUser(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueDay - nowDay;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const dueTime = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) {
    return `By ${dueTime}, Today`;
  } else if (diffDays === 1) {
    return `By ${dueTime}, Tomorrow`;
  } else if (diffDays > 1 && diffDays < 7) {
    const weekday = due.toLocaleDateString([], { weekday: 'long' });
    return `By ${dueTime}, ${weekday}`;
  } else if (diffDays === -1) {
    return 'Yesterday';
  } else if (diffDays < -1) {
    return `${Math.abs(diffDays)} Days Ago`;
  } else {
    return `By ${dueTime}, ${due.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.due-date').forEach(el => {
    const utcDate = el.dataset.due;
    if (utcDate) {
      const date = new Date(utcDate);
      const oldText = el.textContent.split('|')[0] + '| ';
      el.textContent = oldText + formatDueDateForUser(date);
    }
  });
}); 