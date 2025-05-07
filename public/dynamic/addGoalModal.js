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

window.addEventListener('click', function(event) {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

window.addEventListener('click', function(event) {
  if (event.target === customGoalModal) {
    customGoalModal.style.display = 'none';
  }
});

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
    const description = customGoalForm.goalDescription.value.trim();

    try {
      const response = await fetch('/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: name,
          description: description || 'Custom goal',
          price: parseFloat(amount),
          childId: document.body.dataset.childId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create goal');
      }

      // Show success modal
      showSuccessGoalModal();
    } catch (error) {
      console.error('Error creating goal:', error);
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.textContent = error.message || 'Failed to create goal. Please try again.';
      customGoalForm.insertBefore(errorMessage, customGoalForm.firstChild);
    }
  });
}

function showSuccessGoalModal() {
  const modal = document.getElementById('successGoalModal');
  if (modal) {
    modal.classList.add('show');
    const doneBtn = document.getElementById('successGoalDoneBtn');
    if (doneBtn) {
      doneBtn.onclick = function() {
        modal.classList.remove('show');
        window.location.reload();
      };
    }
  }
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