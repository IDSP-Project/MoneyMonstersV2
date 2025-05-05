document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const submitButton = document.getElementById('submitButton');
    const forgotPasswordLink = document.querySelector('.forgot-password a');
    const showPasswordLink = document.querySelectorAll('.showPassword');
  
    
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        alert('Forgot password functionality coming soon!');
      });
    }
    
    
    if (loginForm && loginForm.dataset.useAjax === 'true') {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (formError) {
          formError.style.display = 'none';
        }
        
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Logging in...';
        }
        
        const formData = new FormData(loginForm);
        const formDataJson = {};
        formData.forEach((value, key) => formDataJson[key] = value);
        
        fetch('/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formDataJson)
        })
        .then(response => response.json())
        .then(data => {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
          }
          
          if (data.success) {
            if (data.redirect) {
              window.location.href = data.redirect;
            }
          } else if (formError) {
            formError.textContent = data.error || 'Login failed';
            formError.style.display = 'block';
          }
        })
        .catch(error => {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
          }
          
          if (formError) {
            formError.textContent = 'An error occurred. Please try again.';
            formError.style.display = 'block';
          }
          console.error('Error:', error);
        });
      });
    }
  });