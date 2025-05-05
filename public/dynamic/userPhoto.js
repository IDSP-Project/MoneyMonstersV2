document.addEventListener('DOMContentLoaded', function() {
    const photoForm = document.getElementById('profilePhotoForm');
    const fileInput = document.getElementById('profilePhotoInput');
    const profilePhoto = document.querySelector('.profilePhoto');
    
    if (!photoForm || !fileInput || !profilePhoto) return;
    
    profilePhoto.addEventListener('click', function() {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
      if (this.files && this.files[0]) {
        profilePhoto.classList.add('loading');
        
        const formData = new FormData(photoForm);
        
        fetch('/upload-photo', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            const existingIcon = profilePhoto.querySelector('i');
            if (existingIcon) {
              existingIcon.remove();
            }
            
            let img = profilePhoto.querySelector('img');
            if (!img) {
              img = document.createElement('img');
              profilePhoto.appendChild(img);
            }
            
            img.src = data.url + '?t=' + new Date().getTime();
            
            showMessage('Profile photo updated successfully', 'success');
          } else {
            showMessage(data.error || 'Failed to upload photo', 'error');
          }
        })
        .catch(error => {
          showMessage('Error uploading photo', 'error');
          console.error('Error:', error);
        })
        .finally(() => {
          profilePhoto.classList.remove('loading');
        });
      }
    });
    
    function showMessage(message, type) {
      const existingMessages = document.querySelectorAll('.success-message, .error-message');
      existingMessages.forEach(msg => msg.remove());
      
      const messageDiv = document.createElement('div');
      messageDiv.className = `${type}-message`;
      messageDiv.style.display = 'block';
      messageDiv.textContent = message;
      
      const profilePhotoElement = document.querySelector('.profilePhoto');
      profilePhotoElement.parentNode.insertBefore(messageDiv, profilePhotoElement.nextSibling);
      
      setTimeout(() => {
        messageDiv.remove();
      }, 5000);
    }
});