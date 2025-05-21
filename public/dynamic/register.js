document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('registerForm') || 
               document.getElementById('editForm') || 
               document.getElementById('resetPasswordForm');
  
  if (!form) return;
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
      
      const passwordInputId = toggleElement.getAttribute('data-toggle-password');
      const passwordInput = document.getElementById(passwordInputId);
      
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleElement.textContent = 'Hide password?';
      } else {
        passwordInput.type = 'password';
        toggleElement.textContent = 'Show password?';
      }
    }
  });
  
  if (emailInput && ['registerForm', 'editForm'].includes(form.id)) {
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

  if (passwordInput) {
    let passwordTimer;
    passwordInput.addEventListener('input', function() {
      clearTimeout(passwordTimer);
      passwordTimer = setTimeout(() => {
        validatePassword(this.value);
      }, 300);
    });
  }
  
  if (confirmPasswordInput && passwordInput) {
    let confirmTimer;
    confirmPasswordInput.addEventListener('input', function() {
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => {
        if (this.value === '') {
          hideErrorMessage();
          return;
        }
        
        fetch('/validate-password-match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            password: passwordInput.value, 
            confirmPassword: this.value 
          })
        })
        .then(response => response.json())
        .then(data => {
          if (!data.valid) {
            showErrorMessage(data.message);
            confirmPasswordInput.classList.add('is-invalid');
            confirmPasswordInput.classList.remove('is-valid');
          } else {
            hideErrorMessage();
            confirmPasswordInput.classList.add('is-valid');
            confirmPasswordInput.classList.remove('is-invalid');
          }
        })
        .catch(error => {
          console.error('Error validating password match:', error);
        });
      }, 300);
    });
  }

  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (passwordInput && confirmPasswordInput) {
        const passwordValid = await validatePassword(passwordInput.value);
        if (!passwordValid) return;
        
        const passwordsMatch = await validatePasswordMatch(passwordInput.value, confirmPasswordInput.value);
        if (!passwordsMatch) return;
      }
      
      if (emailInput && ['registerForm', 'editForm'].includes(form.id)) {
        const email = emailInput.value.trim();
        
        if (form.id === 'editForm' && email === originalEmail) {
          hideInputError(emailInput);
        } else {
          const isValid = await validateEmail(email);
          if (!isValid) return;
        }
      }
      
      if (form.getAttribute('data-use-ajax') === 'true') {
        try {
          const formData = new FormData(form);
          const formObject = {};
          
          formData.forEach((value, key) => {
            formObject[key] = value;
          });
          
          const response = await fetch(form.action, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(formObject)
          });
          
          if (response.redirected) {
            window.location.href = response.url;
            return;
          }
          
          if (!response.ok) {
            const errorData = await response.json();
            showErrorMessage(errorData.error || 'An error occurred');
            return;
          }
          
          const data = await response.json();
          
          if (data.redirect) {
            window.location.href = data.redirect;
          } else {
            this.submit();
          }
        } catch (error) {
          console.error('Error in form submission:', error);
          this.submit();
        }
      } else {
        this.submit();
      }
    });
  }
      
  async function validatePassword(password) {
    if (!password) {
      showErrorMessage('Password is required');
      passwordInput.classList.add('is-invalid');
      passwordInput.classList.remove('is-valid');
      return false;
    }
    
    try {
      const response = await fetch('/validate-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (!data.valid) {
        showErrorMessage(data.message);
        passwordInput.classList.add('is-invalid');
        passwordInput.classList.remove('is-valid');
        return false;
      } else {
        hideErrorMessage(); 
        passwordInput.classList.add('is-valid');
        passwordInput.classList.remove('is-invalid');
        return true;
      }
    } catch (error) {
      console.error('Error validating password:', error);
      showErrorMessage('Error validating password');
      passwordInput.classList.add('is-invalid');
      passwordInput.classList.remove('is-valid');
      return false;
    }
  }

  function hideInputError(input) {
    input.classList.remove('is-invalid', 'is-valid');
    hideErrorMessage();
  }
  
  async function validatePasswordMatch(password, confirmPassword) {
    if (!confirmPassword) {
      showErrorMessage('Please confirm your password');
      confirmPasswordInput.classList.add('is-invalid');
      confirmPasswordInput.classList.remove('is-valid');
      return false;
    }
    
    try {
      const response = await fetch('/validate-password-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ password, confirmPassword })
      });
      
      const data = await response.json();
      
      if (!data.valid) {
        showErrorMessage(data.message);
        confirmPasswordInput.classList.add('is-invalid');
        confirmPasswordInput.classList.remove('is-valid');
        return false;
      } else {
        hideErrorMessage();
        confirmPasswordInput.classList.add('is-valid');
        confirmPasswordInput.classList.remove('is-invalid');
        return true;
      }
    } catch (error) {
      console.error('Error validating password match:', error);
      showErrorMessage('Error validating password match');
      confirmPasswordInput.classList.add('is-invalid');
      confirmPasswordInput.classList.remove('is-valid');
      return false;
    }
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
        emailInput.classList.add('is-invalid');
        emailInput.classList.remove('is-valid');
        return false;
      } else {
        hideErrorMessage();
        emailInput.classList.add('is-valid');
        emailInput.classList.remove('is-invalid');
        return true;
      }
    } catch (error) {
      console.error('Error checking email:', error);
      showErrorMessage('Error checking email availability');
      emailInput.classList.add('is-invalid');
      emailInput.classList.remove('is-valid');
      return false;
    }
  }
  
  function showErrorMessage(message) {
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.id = 'formError';
      
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