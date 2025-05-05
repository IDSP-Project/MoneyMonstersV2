// Show modal when Add a New Goal button is clicked
const addGoalBtn = document.querySelector('.add-goal-btn-container .btn');
const modal = document.getElementById('addGoalModal');
const cancelBtn = document.getElementById('cancelGoalModal');
const customGoalModal = document.getElementById('customGoalModal');
const goalTypeForm = document.getElementById('goalTypeForm');
const backToTypeModal = document.getElementById('backToTypeModal');
const amazonGoalModal = document.getElementById('amazonGoalModal');
const amazonGoalForm = document.getElementById('amazonGoalForm');
const backToTypeModalAmazon = document.getElementById('backToTypeModalAmazon');

if (addGoalBtn && modal) {
  addGoalBtn.addEventListener('click', function(e) {
    e.preventDefault();
    modal.style.display = 'flex';
  });
}

if (cancelBtn && modal) {
  cancelBtn.addEventListener('click', function() {
    modal.style.display = 'none';
  });
}

if (goalTypeForm && customGoalModal && modal) {
  goalTypeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const selected = goalTypeForm.goalType.value;
    if (selected === 'custom') {
      modal.style.display = 'none';
      customGoalModal.style.display = 'flex';
    } else if (selected === 'amazon') {
      modal.style.display = 'none';
      amazonGoalModal.style.display = 'flex';
    }
  });
}

if (backToTypeModal && customGoalModal && modal) {
  backToTypeModal.addEventListener('click', function() {
    customGoalModal.style.display = 'none';
    modal.style.display = 'flex';
  });
}

if (backToTypeModalAmazon && amazonGoalModal && modal) {
  backToTypeModalAmazon.addEventListener('click', function() {
    amazonGoalModal.style.display = 'none';
    modal.style.display = 'flex';
  });
}

// Close modal when clicking outside the modal content
window.addEventListener('click', function(event) {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

// Close custom modal when clicking outside
window.addEventListener('click', function(event) {
  if (event.target === customGoalModal) {
    customGoalModal.style.display = 'none';
  }
});

// Copy to clipboard functionality
const copyIcon = document.querySelector('.amazon-link-input .copy-icon');
const amazonLinkInput = document.querySelector('.amazon-link-input input');
if (copyIcon && amazonLinkInput) {
  copyIcon.addEventListener('click', function() {
    amazonLinkInput.select();
    document.execCommand('copy');
    copyIcon.classList.add('copied');
    setTimeout(() => copyIcon.classList.remove('copied'), 1000);
  });
}

// Close amazon modal when clicking outside
window.addEventListener('click', function(event) {
  if (event.target === amazonGoalModal) {
    amazonGoalModal.style.display = 'none';
  }
});

if (customGoalForm) {
  customGoalForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = customGoalForm.goalName.value;
    const amount = customGoalForm.goalAmount.value;

    try {
      console.log('Sending goal data:', {
        title: name,
        description: 'Custom goal',
        price: parseFloat(amount),
        childId: document.body.dataset.childId
      });

      const response = await fetch('/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: name,
          description: 'Custom goal',
          price: parseFloat(amount),
          childId: document.body.dataset.childId
        })
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create goal');
      }

      // Close the modal
      customGoalModal.style.display = 'none';
      
      // Refresh the page to show the new goal
      window.location.reload();
    } catch (error) {
      console.error('Error creating goal:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      
      // Show error message
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.textContent = error.message || 'Failed to create goal. Please try again.';
      customGoalForm.insertBefore(errorMessage, customGoalForm.firstChild);
    }
  });
}

if (amazonGoalForm) {
  amazonGoalForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const link = amazonGoalForm.amazonLink.value;
    // For now, just use the link as the name
    confirmGoalName.textContent = link;
    confirmGoalSource.textContent = 'Amazon.ca';
    confirmGoalImg.src = '/images/goal.png';
    amazonGoalModal.style.display = 'none';
  });
}