document.addEventListener('DOMContentLoaded', function() {
    const editUserArea = document.querySelector('.editUser');
    if (editUserArea) {
      editUserArea.addEventListener('click', function(event) {
        const link = editUserArea.querySelector('a');
        if (link) {
          console.log('Update Profile area clicked, navigating to:', link.href);
          window.location.href = link.href;
        }
      });
    }
    
    const logoutArea = document.querySelector('.logout');
    if (logoutArea) {
      logoutArea.addEventListener('click', function(event) {
        const link = logoutArea.querySelector('a');
        if (link) {
          console.log('Logout area clicked, navigating to:', link.href);
          window.location.href = link.href;
        }
      });
    }
    
    const links = document.querySelectorAll('.editUser a, .logout a');
    links.forEach(link => {
      link.addEventListener('click', function(event) {
        event.stopPropagation();
      });
    });
  });