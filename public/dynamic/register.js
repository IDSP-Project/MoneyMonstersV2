document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('registerForm') || document.getElementById('editForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  let originalEmail = null;
  if (emailInput && form.id === 'editForm') {
    originalEmail = emailInput.value;
  }
  
  document.addEventListener('click', function(e) {
    const toggleElement = e.target.closest('[data-toggle-password]');
    if (toggleElement) {
      e.preventDefault();
      alert("Show password functionality coming soon!");
    }
  });
  
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', function() {
      if (passwordInput.value && this.value) {
        if (passwordInput.value !== this.value) {
          showErrorMessage('Passwords do not match');
          confirmPasswordInput.classList.add('validated-invalid');
          confirmPasswordInput.classList.remove('validated-valid');
        } else {
          hideErrorMessage();
          confirmPasswordInput.classList.add('validated-valid');
          confirmPasswordInput.classList.remove('validated-invalid');
        }
      }
    });
  }
  
  if (emailInput) {
    emailInput.addEventListener('blur', async function() {
      const email = this.value.trim();
      
      if (form.id === 'editForm' && email === originalEmail) {
        hideErrorMessage();
        return;
      }
      
      if (email === '') {
        showErrorMessage('Email is required');
        return;
      }
      
      validateEmail(email);
    });
  }
  
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (form.id === 'registerForm' && passwordInput && confirmPasswordInput) {
        if (passwordInput.value !== confirmPasswordInput.value) {
          showErrorMessage('Passwords do not match');
          return;
        }
      }
      
      if (emailInput) {
        const email = emailInput.value.trim();
        
        if (form.id === 'editForm' && email === originalEmail) {
          hideErrorMessage();
          this.submit();
          return;
        }
        
        const isValid = await validateEmail(email);
        if (!isValid) {
          return;
        }
      }
      
      hideErrorMessage();
      this.submit();
    });
  }
  
  async function validateEmail(email) {
    try {
      const response = await fetch('/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.exists) {
        showErrorMessage(data.message);
        return false;
      } else {
        hideErrorMessage();
        return true;
      }
    } catch (error) {
      console.error('Error checking email:', error);
      showErrorMessage('Error checking email availability');
      return false;
    }
  }
  
  function showErrorMessage(message) {
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      
      if (form && form.parentNode) {
        form.parentNode.insertBefore(errorDiv, form);
      }
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
  
  function hideErrorMessage() {
    const errorDiv = document.querySelector('.error-message');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }
});