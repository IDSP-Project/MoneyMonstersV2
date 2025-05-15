function showRequestSuccessModal() {
  const overlay = document.getElementById('requestSuccessOverlay');
  if (!overlay) return;
  overlay.classList.add('show');
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }, 1500);
}

async function sendRequest(goalId) {
  try {
    const response = await fetch(`/goals/${goalId}/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      // Show success modal
      showRequestSuccessModal();
    } else {
      throw new Error(data.error || 'Failed to send request');
    }
  } catch (error) {
    console.error('Error sending request:', error);
    alert(error.message || 'Failed to send request');
  }
}

async function respondToRequest(goalId, response) {
  try {
    const result = await fetch(`/goals/${goalId}/request-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ response })
    });

    const data = await result.json();
    
    if (data.success) {
      window.location.reload();
    } else {
      throw new Error(data.error || `Failed to ${response} request`);
    }
  } catch (error) {
    console.error('Error responding to request:', error);
    alert(error.message || `Failed to ${response} request`);
  }
} 