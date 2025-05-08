document.addEventListener('DOMContentLoaded', function() {
    const editUserArea = document.querySelector('.thisUser');
    if (editUserArea) {
      editUserArea.addEventListener('click', function(event) {
        const link = editUserArea.querySelector('a');
        if (link) {
          window.location.href = link.href;
        }
      });
    }
    
    const logoutArea = document.querySelector('.logout');
    if (logoutArea) {
      logoutArea.addEventListener('click', function(event) {
        const link = logoutArea.querySelector('a');
        if (link) {
          window.location.href = link.href;
        }
      });
    }
    
    const links = document.querySelectorAll('.thisUser a, .logout a');
    links.forEach(link => {
      link.addEventListener('click', function(event) {
        event.stopPropagation();
      });
    });
  });