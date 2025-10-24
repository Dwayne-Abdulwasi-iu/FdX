// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// API Base URL - automatically detects if running on Live Server
const API_BASE_URL = (function() {
    try {
        if (window.location.hostname === '127.0.0.1' && window.location.port === '5500') {
            return 'http://localhost:3002';
        }
        return '';
    } catch (e) {
        console.warn('Error detecting API base URL:', e);
        return '';
    }
})();

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Global error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    console.error('URL:', e.filename, 'Line:', e.lineno);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
});

// Additional safety: override any problematic window.location changes
const originalLocationAssign = window.location.assign;
window.location.assign = function(url) {
    if (url && (url.includes('%22') || url.includes('undefined') || url === '\"')) {
        console.error('Blocked malformed URL assignment:', url);
        return;
    }
    return originalLocationAssign.call(this, url);
};

// Prevent navigation to malformed URLs
document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && (target.getAttribute('href') === '#' || target.getAttribute('href') === '"' || target.getAttribute('href') === "'")) {
        e.preventDefault();
        e.stopPropagation();
        console.warn('Prevented navigation to malformed URL:', target.getAttribute('href'));
        return false;
    }
}, true);

// Initialize application
function initializeApp() {
    initializeNavigation();
    initializeAuth();
    initializeForms();
    initializeModals();
    
    // Check if user is logged in
    if (authToken) {
        checkAuthStatus();
    }
}

// Navigation functionality
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const target = this.getAttribute('href');
            if (target && target.startsWith('#') && target.length > 1) {
                scrollToSection(target.substring(1));
            }
            return false;
        });
    });
    
    // Close mobile menu when clicking on links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Smooth scroll to section
function scrollToSection(sectionId) {
    if (!sectionId || typeof sectionId !== 'string') {
        console.warn('Invalid section ID:', sectionId);
        return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
        const navbar = document.querySelector('.navbar');
        const navHeight = navbar ? navbar.offsetHeight : 0;
        const elementPosition = element.offsetTop - navHeight;
        
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    } else {
        console.warn('Element not found:', sectionId);
    }
}

// Authentication functions
function initializeAuth() {
    // Update UI based on auth status
    updateAuthUI();
}

function checkAuthStatus() {
    if (!authToken) return;
    
    fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Auth check failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            currentUser = data.user;
            updateAuthUI();
        } else {
            logout();
        }
    })
    .catch(error => {
        console.error('Auth check error:', error);
        logout();
    });
}

function updateAuthUI() {
    const loginBtn = document.querySelector('.btn-login');
    
    if (currentUser && loginBtn) {
        loginBtn.textContent = `Hi, ${currentUser.firstName}`;
        loginBtn.onclick = showUserMenu;
    }
}

function showUserMenu() {
    // Create user dropdown menu
    const existingMenu = document.querySelector('.user-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }
    
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
        <div class="user-menu-content">
            <div class="user-info">
                <strong>${currentUser.firstName} ${currentUser.lastName}</strong>
                <small>${currentUser.email}</small>
            </div>
            <ul class="user-menu-list">
                <li><a href="javascript:void(0)" onclick="showMyShipments(); return false;">My Shipments</a></li>
                <li><a href="javascript:void(0)" onclick="showProfile(); return false;">Profile</a></li>
                ${currentUser.role === 'admin' ? '<li><a href="javascript:void(0)" onclick="showAdminDashboard(); return false;">Admin Dashboard</a></li>' : ''}
                <li><a href="javascript:void(0)" onclick="logout(); return false;">Logout</a></li>
            </ul>
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function logout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    
    const loginBtn = document.querySelector('.btn-login');
    if (loginBtn) {
        loginBtn.textContent = 'Login';
        loginBtn.onclick = showLoginModal;
    }
    
    showToast('Logged out successfully', 'success');
}

// Form initialization
function initializeForms() {
    // Rate calculation form
    const rateForm = document.getElementById('rateForm');
    if (rateForm) {
        rateForm.addEventListener('submit', handleRateCalculation);
    }
    
    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }
    
    // Contact message validation
    const contactMessage = document.getElementById('contactMessage');
    if (contactMessage) {
        contactMessage.addEventListener('input', validateContactMessage);
        // Run validation on page load
        validateContactMessage();
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// Rate calculation
function handleRateCalculation(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const data = {
        weight: parseFloat(formData.get('weight')),
        dimensions: {
            length: parseFloat(formData.get('length')),
            width: parseFloat(formData.get('width')),
            height: parseFloat(formData.get('height'))
        },
        senderZip: formData.get('fromZip'),
        recipientZip: formData.get('toZip'),
        service: formData.get('service'),
        value: parseFloat(formData.get('value')) || 0
    };
    
    fetch(`${API_BASE_URL}/api/shipments/calculate-rate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            displayRateResults(data.rate);
        } else {
            showToast(data.message || 'Error calculating rate', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Rate calculation error:', error);
        showToast('Error calculating shipping rate', 'error');
    });
}

function displayRateResults(rate) {
    const resultsDiv = document.getElementById('rateResults');
    if (!resultsDiv) return;
    
    const deliveryDate = new Date(rate.estimatedDelivery).toLocaleDateString();
    
    resultsDiv.innerHTML = `
        <div class="rate-display">
            <div>
                <div class="rate-service">${rate.service.toUpperCase()}</div>
                <p>Estimated Delivery: ${deliveryDate}</p>
            </div>
            <div class="rate-price">$${rate.cost.toFixed(2)}</div>
        </div>
        <div class="rate-details">
            <p><strong>Chargeable Weight:</strong> ${rate.chargeableWeight} lbs</p>
            <p><strong>Distance Factor:</strong> ${rate.details.distanceMultiplier}</p>
            <p><strong>Base Rate:</strong> $${rate.details.baseRate}</p>
        </div>
        <button class="btn-primary" onclick="proceedToShip('${rate.service}', ${rate.cost})">
            Create Shipment
        </button>
    `;
    
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function proceedToShip(service, cost) {
    if (!currentUser) {
        showToast('Please login to create a shipment', 'warning');
        showLoginModal();
        return;
    }
    
    // Create shipment modal (simplified version)
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'shipmentModal';
    modal.innerHTML = `
        <div class="modal-content shipment-modal">
            <div class="modal-header">
                <h2><i class="fas fa-shipping-fast"></i> Create New Shipment</h2>
                <span class="close" onclick="closeModal('shipmentModal')">&times;</span>
            </div>
            <div class="modal-body">
                <form id="shipmentForm">
                    <div class="shipment-section">
                        <h3><i class="fas fa-user"></i> Recipient Information</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label><i class="fas fa-user"></i> Recipient Name</label>
                                <input type="text" name="recipient.name" placeholder="John Doe" required>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-envelope"></i> Email Address</label>
                                <input type="email" name="recipient.email" placeholder="john.doe@email.com" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-phone"></i> Phone Number</label>
                            <input type="tel" name="recipient.phone" placeholder="(555) 123-4567" required>
                        </div>
                    </div>
                    
                    <div class="shipment-section">
                        <h3><i class="fas fa-map-marker-alt"></i> Delivery Address</h3>
                        <div class="form-group">
                            <label><i class="fas fa-road"></i> Street Address</label>
                            <input type="text" name="recipient.address.street" placeholder="123 Main Street, Apt 4B" required>
                        </div>
                        <div class="form-row three-col">
                            <div class="form-group">
                                <label><i class="fas fa-city"></i> City</label>
                                <input type="text" name="recipient.address.city" placeholder="New York" required>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-flag"></i> State</label>
                                <input type="text" name="recipient.address.state" placeholder="NY" maxlength="2" required>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-mail-bulk"></i> ZIP Code</label>
                                <input type="text" name="recipient.address.zipCode" placeholder="10001" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shipment-section">
                        <h3><i class="fas fa-box"></i> Package Details</h3>
                        <div class="form-group">
                            <label><i class="fas fa-clipboard-list"></i> Package Description</label>
                            <textarea name="package.description" placeholder="Describe what's in the package..." rows="3" required></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label><i class="fas fa-dollar-sign"></i> Package Value ($)</label>
                                <input type="number" name="package.value" step="0.01" min="0" placeholder="100.00" required>
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-tags"></i> Package Category</label>
                                <select name="package.category" required>
                                    <option value="">Select Category</option>
                                    <option value="documents">📄 Documents</option>
                                    <option value="electronics">📱 Electronics</option>
                                    <option value="clothing">👕 Clothing</option>
                                    <option value="books">📚 Books</option>
                                    <option value="fragile">🔔 Fragile Items</option>
                                    <option value="other">📦 Other</option>
                                </select>
                            </div>
                        </div>
                        <div class="dimensions-section">
                            <h4><i class="fas fa-ruler-combined"></i> Package Dimensions (inches)</h4>
                            <div class="form-row three-col">
                                <div class="form-group">
                                    <label>Length</label>
                                    <input type="number" name="package.dimensions.length" step="0.1" min="1" placeholder="12.0" required>
                                </div>
                                <div class="form-group">
                                    <label>Width</label>
                                    <input type="number" name="package.dimensions.width" step="0.1" min="1" placeholder="8.0" required>
                                </div>
                                <div class="form-group">
                                    <label>Height</label>
                                    <input type="number" name="package.dimensions.height" step="0.1" min="1" placeholder="4.0" required>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shipment-section">
                        <h3><i class="fas fa-credit-card"></i> Payment & Summary</h3>
                        <div class="form-group">
                            <label><i class="fas fa-payment"></i> Payment Method</label>
                            <select name="payment.method" required>
                                <option value="">Select Payment Method</option>
                                <option value="credit_card">💳 Credit Card</option>
                                <option value="debit_card">💳 Debit Card</option>
                                <option value="paypal">🅿️ PayPal</option>
                            </select>
                        </div>
                        <div class="shipment-summary">
                            <h4><i class="fas fa-receipt"></i> Shipment Summary</h4>
                            <div class="summary-grid">
                                <div class="summary-item">
                                    <span class="summary-label">Service Type:</span>
                                    <span class="summary-value">${service.toUpperCase()}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Shipping Cost:</span>
                                    <span class="summary-value cost-highlight">$${cost.toFixed(2)}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-label">Package Weight:</span>
                                    <span class="summary-value">${document.getElementById('rateForm').weight.value} lbs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('shipmentModal')">Cancel</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-shipping-fast"></i> Create Shipment</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('shipmentModal');
    
    // Handle form submission
    document.getElementById('shipmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);
        
        const formData = new FormData(e.target);
        
        // Calculate estimated delivery based on service type
        const deliveryDays = {
            'standard': 7,
            'express': 3,
            'overnight': 1,
            'international': 14
        };
        
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays[service]);
        
        const shipmentData = {
            recipient: {
                name: formData.get('recipient.name'),
                email: formData.get('recipient.email'),
                phone: formData.get('recipient.phone'),
                address: {
                    street: formData.get('recipient.address.street'),
                    city: formData.get('recipient.address.city'),
                    state: formData.get('recipient.address.state'),
                    zipCode: formData.get('recipient.address.zipCode'),
                    country: 'USA'
                }
            },
            package: {
                description: formData.get('package.description'),
                weight: parseFloat(document.getElementById('rateForm').weight.value),
                value: parseFloat(formData.get('package.value')),
                dimensions: {
                    length: parseFloat(formData.get('package.dimensions.length')),
                    width: parseFloat(formData.get('package.dimensions.width')),
                    height: parseFloat(formData.get('package.dimensions.height'))
                },
                category: formData.get('package.category') || 'other'
            },
            service: {
                type: service,
                cost: cost,
                estimatedDelivery: estimatedDelivery.toISOString()
            },
            payment: {
                method: formData.get('payment.method'),
                status: 'paid'
            }
        };
        
        console.log('Sending shipment data:', JSON.stringify(shipmentData, null, 2));
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/shipments/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(shipmentData)
            });
            
            const data = await response.json();
            showLoading(false);
            
            if (data.success) {
                showToast(`Shipment created! Tracking: ${data.shipment.trackingNumber}`, 'success');
                closeModal('shipmentModal');
                modal.remove();
            } else {
                console.error('Shipment creation failed:', data);
                if (data.errors && data.errors.length > 0) {
                    const errorMessages = data.errors.map(err => err.msg).join(', ');
                    showToast(`Validation errors: ${errorMessages}`, 'error');
                } else {
                    showToast(data.message || 'Error creating shipment', 'error');
                }
            }
        } catch (error) {
            showLoading(false);
            console.error('Shipment creation error:', error);
            showToast('Error creating shipment', 'error');
        }
    });
}

// Tracking functionality
function quickTrack() {
    const trackingNumber = document.getElementById('quickTrackInput').value.trim();
    trackPackage(trackingNumber);
}

function trackPackage(trackingNumber = null) {
    const input = trackingNumber || document.getElementById('trackingInput').value.trim();
    
    if (!input) {
        showToast('Please enter a tracking number', 'warning');
        return;
    }
    
    if (input.length < 8) {
        showToast('Tracking number must be at least 8 characters', 'warning');
        return;
    }
    
    showLoading(true);
    
    fetch(`${API_BASE_URL}/api/tracking/${input}`)
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            displayTrackingResults(data.tracking);
        } else {
            showToast(data.message || 'Package not found', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Tracking error:', error);
        showToast('Error retrieving tracking information', 'error');
    });
}

function toggleTrackingHistory() {
    const historyContent = document.getElementById('historyContent');
    const toggleIcon = document.getElementById('historyToggleIcon');
    
    if (historyContent && toggleIcon) {
        const isCollapsed = historyContent.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            historyContent.classList.remove('collapsed');
            historyContent.style.maxHeight = historyContent.scrollHeight + 'px';
            historyContent.style.opacity = '1';
            historyContent.style.padding = '25px';
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-up');
        } else {
            // Collapse
            historyContent.classList.add('collapsed');
            historyContent.style.maxHeight = '0px';
            historyContent.style.opacity = '0';
            historyContent.style.padding = '0 25px';
            toggleIcon.classList.remove('fa-chevron-up');
            toggleIcon.classList.add('fa-chevron-down');
        }
    }
}

function toggleHistoryUpdate(detailsId, cardId) {
    const details = document.getElementById(detailsId);
    const expandIcon = document.getElementById(`expand-${cardId}`);
    
    if (details && expandIcon) {
        const isCollapsed = details.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            details.classList.remove('collapsed');
            details.style.maxHeight = details.scrollHeight + 'px';
            details.style.opacity = '1';
            expandIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
        } else {
            // Collapse
            details.classList.add('collapsed');
            details.style.maxHeight = '0px';
            details.style.opacity = '0';
            expandIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
        }
    }
}

function closeHistoryUpdate(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
        // Add fade-out animation
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateX(100%)';
        
        // Remove the card after animation
        setTimeout(() => {
            card.style.display = 'none';
        }, 300);
    }
}

// Initialize history as expanded when page loads
function initializeTrackingHistory() {
    setTimeout(() => {
        const historyContent = document.getElementById('historyContent');
        const toggleIcon = document.getElementById('historyToggleIcon');
        
        if (historyContent && toggleIcon) {
            historyContent.style.maxHeight = historyContent.scrollHeight + 'px';
            historyContent.style.opacity = '1';
            historyContent.style.padding = '25px';
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-up');
        }
    }, 100);
}

function displayTrackingResults(tracking) {
    const resultsDiv = document.getElementById('trackingResults');
    if (!resultsDiv) return;
    
    const estimatedDelivery = new Date(tracking.service.estimatedDelivery).toLocaleDateString();
    const lastUpdated = new Date(tracking.dates.lastUpdated).toLocaleString();
    
    // Get the latest status update information BEFORE reversing the array
    const latestUpdate = tracking.status.history && tracking.status.history.length > 0 
        ? tracking.status.history[tracking.status.history.length - 1] 
        : null;
    
    console.log('Latest update:', latestUpdate); // Debug log
    
    const currentEstimatedArrival = latestUpdate?.estimatedArrival 
        ? new Date(latestUpdate.estimatedArrival).toLocaleString()
        : estimatedDelivery;
    
    const isCurrentlyHeld = latestUpdate?.isHeld || false;
    const currentLocation = latestUpdate?.location || 'Processing Center';
    const currentTransportation = latestUpdate?.transportationType || null;
    const currentVehicle = latestUpdate?.vehicleId || null;
    const holdReason = latestUpdate?.holdReason || null;
    
    let historyHTML = '';
    if (tracking.status.history && tracking.status.history.length > 0) {
        historyHTML = tracking.status.history.slice().reverse().map((item, index) => {
            const timestamp = new Date(item.timestamp).toLocaleString();
            const transportIcon = getTransportIcon(item.transportationType);
            const itemId = `history-item-${index}`;
            const detailsId = `history-details-${index}`;
            
            return `
                <div class="history-update-card ${item.isHeld ? 'held-item' : ''}" id="${itemId}">
                    <div class="update-header" onclick="toggleHistoryUpdate('${detailsId}', '${itemId}')">
                        <div class="update-summary">
                            <div class="update-icon">
                                <i class="fas fa-${getStatusIcon(item.status)}"></i>
                            </div>
                            <div class="update-title">
                                <h4>${formatStatus(item.status)} ${item.isHeld ? '<span class="hold-badge">HELD</span>' : ''}</h4>
                                <p class="update-timestamp">
                                    <i class="fas fa-clock"></i> ${timestamp}
                                    ${item.location ? ` • <i class="fas fa-map-marker-alt"></i> ${item.location}` : ''}
                                </p>
                            </div>
                        </div>
                        <div class="update-controls">
                            <span class="expand-icon" id="expand-${itemId}">
                                <i class="fas fa-chevron-down"></i>
                            </span>
                            <button class="close-update-btn" onclick="closeHistoryUpdate('${itemId}'); event.stopPropagation();" title="Hide this update">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="update-details collapsed" id="${detailsId}">
                        <div class="details-content">
                            <div class="detail-row">
                                <div class="detail-item">
                                    <i class="fas fa-clipboard-list"></i>
                                    <div>
                                        <span class="detail-label">Description</span>
                                        <span class="detail-value">${item.description}</span>
                                    </div>
                                </div>
                                ${item.location ? `
                                    <div class="detail-item">
                                        <i class="fas fa-map-marker-alt"></i>
                                        <div>
                                            <span class="detail-label">Location</span>
                                            <span class="detail-value">${item.location}</span>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            
                            ${item.transportationType || item.vehicleId || item.estimatedArrival ? `
                                <div class="detail-row">
                                    ${item.transportationType ? `
                                        <div class="detail-item">
                                            <i class="fas fa-${transportIcon}"></i>
                                            <div>
                                                <span class="detail-label">Transportation</span>
                                                <span class="detail-value">${item.transportationType.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    ` : ''}
                                    ${item.vehicleId ? `
                                        <div class="detail-item">
                                            <i class="fas fa-barcode"></i>
                                            <div>
                                                <span class="detail-label">Vehicle/Container</span>
                                                <span class="detail-value">${item.vehicleId}</span>
                                            </div>
                                        </div>
                                    ` : ''}
                                    ${item.estimatedArrival ? `
                                        <div class="detail-item">
                                            <i class="fas fa-calendar-alt"></i>
                                            <div>
                                                <span class="detail-label">Est. Arrival</span>
                                                <span class="detail-value">${new Date(item.estimatedArrival).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                            
                            ${item.isHeld && item.holdReason ? `
                                <div class="hold-details">
                                    <div class="detail-item hold-info">
                                        <i class="fas fa-pause-circle"></i>
                                        <div>
                                            <span class="detail-label">Hold Reason</span>
                                            <span class="detail-value">${item.holdReason}</span>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    resultsDiv.innerHTML = `
        <div class="tracking-status">
            <div class="status-main">
                <h3>Package Status: ${formatStatus(tracking.status.current)} ${isCurrentlyHeld ? '<span class="hold-badge">HELD</span>' : ''}</h3>
                <p><strong>Tracking #:</strong> ${tracking.trackingNumber}</p>
                <p><strong>To:</strong> ${tracking.recipient.name}, ${tracking.recipient.city}, ${tracking.recipient.state}</p>
            </div>
            <div class="status-details">
                <p><strong>Service:</strong> ${tracking.service.type.toUpperCase()}</p>
                <p><strong>Est. Arrival:</strong> ${currentEstimatedArrival}</p>
            </div>
        </div>
        
        <div class="current-status-info">
            <h4><i class="fas fa-info-circle"></i> Current Status Details</h4>
            <div class="status-grid">
                <div class="status-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <strong>Current Location</strong>
                        <p>${currentLocation}</p>
                    </div>
                </div>
                ${latestUpdate?.estimatedArrival ? `
                    <div class="status-item">
                        <i class="fas fa-calendar-check"></i>
                        <div>
                            <strong>Updated Estimated Arrival</strong>
                            <p>${new Date(latestUpdate.estimatedArrival).toLocaleString()}</p>
                        </div>
                    </div>
                ` : ''}
                ${currentTransportation ? `
                    <div class="status-item">
                        <i class="fas fa-${getTransportIcon(currentTransportation)}"></i>
                        <div>
                            <strong>Transportation Type</strong>
                            <p>${currentTransportation.toUpperCase()}</p>
                        </div>
                    </div>
                ` : ''}
                ${currentVehicle ? `
                    <div class="status-item">
                        <i class="fas fa-barcode"></i>
                        <div>
                            <strong>Vehicle/Container ID</strong>
                            <p>${currentVehicle}</p>
                        </div>
                    </div>
                ` : ''}
                ${isCurrentlyHeld ? `
                    <div class="status-item hold-info">
                        <i class="fas fa-pause-circle"></i>
                        <div>
                            <strong>Package Status</strong>
                            <p>CURRENTLY HELD</p>
                        </div>
                    </div>
                ` : ''}
                ${isCurrentlyHeld && holdReason ? `
                    <div class="status-item hold-info">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Hold Reason</strong>
                            <p>${holdReason}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="tracking-progress">
            <p><strong>Progress: ${tracking.status.progress}%</strong></p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${tracking.status.progress}%"></div>
            </div>
        </div>
        
        <div class="package-info">
            <p><strong>Package:</strong> ${tracking.package.description} (${tracking.package.weight} lbs)</p>
            <p><strong>Last Updated:</strong> ${lastUpdated}</p>
        </div>
        
        ${historyHTML ? `
            <div class="tracking-history">
                <div class="history-header" onclick="toggleTrackingHistory()">
                    <h4><i class="fas fa-history"></i> Tracking History</h4>
                    <button class="history-toggle-btn" type="button">
                        <i class="fas fa-chevron-down" id="historyToggleIcon"></i>
                    </button>
                </div>
                <div class="history-content" id="historyContent">
                    ${historyHTML}
                </div>
            </div>
        ` : ''}
    `;
    
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
    
    // Initialize history as expanded
    initializeTrackingHistory();
}

function getStatusIcon(status) {
    const icons = {
        'pending': 'clock',
        'confirmed': 'check-circle',
        'picked_up': 'truck-pickup',
        'in_transit': 'truck',
        'out_for_delivery': 'shipping-fast',
        'delivered': 'check-circle',
        'exception': 'exclamation-triangle',
        'returned': 'undo'
    };
    return icons[status] || 'info-circle';
}

function getTransportIcon(transportType) {
    const icons = {
        'truck': 'truck',
        'plane': 'plane',
        'ship': 'ship',
        'train': 'train',
        'van': 'shuttle-van',
        'motorcycle': 'motorcycle',
        'warehouse': 'warehouse'
    };
    return icons[transportType] || 'truck';
}

function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'confirmed': 'Confirmed',
        'picked_up': 'Picked Up',
        'in_transit': 'In Transit',
        'out_for_delivery': 'Out for Delivery',
        'delivered': 'Delivered',
        'exception': 'Exception',
        'returned': 'Returned'
    };
    return statusMap[status] || status;
}

// Contact form validation
function validateContactMessage() {
    const messageField = document.getElementById('contactMessage');
    const submitBtn = document.getElementById('contactSubmitBtn');
    
    if (messageField && submitBtn) {
        const messageLength = messageField.value.trim().length;
        submitBtn.disabled = messageLength < 3;
        
        if (messageLength < 3) {
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        } else {
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    }
}

// Contact form handler
function handleContactForm(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        subject: formData.get('subject'),
        message: formData.get('message')
    };
    
    fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactData)
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            showToast(data.message, 'success');
            e.target.reset();
        } else {
            showToast(data.message || 'Error sending message', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Contact form error:', error);
        showToast('Error sending message. Please try again.', 'error');
    });
}

// Authentication handlers
function handleLogin(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            updateAuthUI();
            closeModal('loginModal');
            showToast(`Welcome back, ${data.user.firstName}!`, 'success');
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Login error:', error);
        showToast('Login error. Please try again.', 'error');
    });
}

function handleRegister(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const registerData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        address: {
            street: formData.get('address.street'),
            city: formData.get('address.city'),
            state: formData.get('address.state'),
            zipCode: formData.get('address.zipCode'),
            country: 'USA'
        }
    };
    
    fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerData)
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            updateAuthUI();
            closeModal('registerModal');
            showToast(`Welcome to FedeX, ${data.user.firstName}!`, 'success');
        } else {
            if (data.errors && data.errors.length > 0) {
                data.errors.forEach(error => {
                    showToast(error.msg, 'error');
                });
            } else {
                showToast(data.message || 'Registration failed', 'error');
            }
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Registration error:', error);
        showToast('Registration error. Please try again.', 'error');
    });
}

// Modal functions
function initializeModals() {
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="block"]');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
}

function showLoginModal() {
    closeModal('registerModal');
    showModal('loginModal');
}

function showRegisterModal() {
    closeModal('loginModal');
    showModal('registerModal');
}

function showAdminRegisterModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'adminRegisterModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('adminRegisterModal')">&times;</span>
            <h2><i class="fas fa-user-shield"></i> Admin Registration</h2>
            <p style="color: #666; margin-bottom: 20px;">Create an admin account to access the dashboard</p>
            <form id="adminRegisterForm">
                <div class="form-group">
                    <label>First Name</label>
                    <input type="text" name="firstName" value="Admin" required>
                </div>
                <div class="form-group">
                    <label>Last Name</label>
                    <input type="text" name="lastName" value="User" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value="admin@fedex.com" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" value="admin123" required>
                </div>
                <div class="form-group">
                    <label>Phone (10+ digits)</label>
                    <input type="tel" name="phone" value="1234567890" required>
                </div>
                <div class="form-group">
                    <label>Street Address</label>
                    <input type="text" name="address.street" required>
                </div>
                <div class="form-group">
                    <label>Street Address</label>
                    <input type="text" name="address.street" value="123 Admin Street" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>City</label>
                        <input type="text" name="address.city" value="Admin City" required>
                    </div>
                    <div class="form-group">
                        <label>State</label>
                        <input type="text" name="address.state" value="CA" required maxlength="2">
                    </div>
                    <div class="form-group">
                        <label>ZIP Code</label>
                        <input type="text" name="address.zipCode" value="12345" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Admin Key</label>
                    <input type="password" name="adminKey" value="FEDEX_ADMIN_2025" required>
                    <small style="color: #666;">Admin key: FEDEX_ADMIN_2025</small>
                </div>
                <button type="submit" class="btn-primary">Create Admin Account</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('adminRegisterModal');
    
    document.getElementById('adminRegisterForm').addEventListener('submit', handleAdminRegister);
}

function handleAdminRegister(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const adminData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        address: {
            street: formData.get('address.street'),
            city: formData.get('address.city'),
            state: formData.get('address.state'),
            zipCode: formData.get('address.zipCode')
        },
        adminKey: formData.get('adminKey')
    };
    
    fetch(`${API_BASE_URL}/api/auth/register-admin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(adminData)
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            updateAuthUI();
            closeModal('adminRegisterModal');
            document.getElementById('adminRegisterModal').remove();
            showToast(`Welcome Admin ${data.user.firstName}! You now have admin access.`, 'success');
        } else {
            if (data.errors && data.errors.length > 0) {
                data.errors.forEach(error => {
                    showToast(error.msg, 'error');
                });
            } else {
                showToast(data.message || 'Admin registration failed', 'error');
            }
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Admin registration error:', error);
        showToast('Admin registration error. Please try again.', 'error');
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Clear form data
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// User features (placeholder functions)
function showMyShipments() {
    if (!currentUser) {
        showToast('Please login first', 'warning');
        return;
    }
    
    // Remove user menu
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) userMenu.remove();
    
    showLoading(true);
    
    fetch(`${API_BASE_URL}/api/shipments/my-shipments`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            displayMyShipments(data.shipments);
        } else {
            showToast('Error loading shipments', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error loading shipments:', error);
        showToast('Error loading shipments', 'error');
    });
}

function getStatusClass(status) {
    const statusClasses = {
        'pending': 'status-pending',
        'confirmed': 'status-confirmed', 
        'picked_up': 'status-picked-up',
        'in_transit': 'status-in-transit',
        'out_for_delivery': 'status-out-for-delivery',
        'delivered': 'status-delivered',
        'exception': 'status-exception',
        'returned': 'status-returned'
    };
    return statusClasses[status] || 'status-default';
}

function displayMyShipments(shipments) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'shipmentsModal';
    modal.innerHTML = `
        <div class="modal-content my-shipments-modal">
            <div class="modal-header">
                <h2><i class="fas fa-boxes"></i> My Shipments</h2>
                <span class="close" onclick="closeModal('shipmentsModal')">&times;</span>
            </div>
            <div class="modal-body">
                ${shipments.length === 0 ? `
                    <div class="empty-shipments">
                        <i class="fas fa-shipping-fast empty-icon"></i>
                        <h3>No Shipments Found</h3>
                        <p>You haven't created any shipments yet. Create your first shipment to get started!</p>
                        <button onclick="closeModal('shipmentsModal'); showShippingRateForm();" class="btn-primary">
                            <i class="fas fa-plus"></i> Create Shipment
                        </button>
                    </div>
                ` : `
                    <div class="shipments-summary">
                        <div class="summary-stats">
                            <div class="stat-item">
                                <i class="fas fa-boxes"></i>
                                <div>
                                    <span class="stat-number">${shipments.length}</span>
                                    <span class="stat-label">Total Shipments</span>
                                </div>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-truck"></i>
                                <div>
                                    <span class="stat-number">${shipments.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status.current)).length}</span>
                                    <span class="stat-label">In Transit</span>
                                </div>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-check-circle"></i>
                                <div>
                                    <span class="stat-number">${shipments.filter(s => s.status.current === 'delivered').length}</span>
                                    <span class="stat-label">Delivered</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="shipments-list">
                        ${shipments.map(shipment => {
                            const statusClass = getStatusClass(shipment.status.current);
                            const statusIcon = getStatusIcon(shipment.status.current);
                            const lastUpdate = shipment.status.history && shipment.status.history.length > 0 
                                ? shipment.status.history[shipment.status.history.length - 1] 
                                : null;
                            
                            return `
                                <div class="my-shipment-card ${statusClass}">
                                    <div class="shipment-header">
                                        <div class="tracking-info">
                                            <h3><i class="fas fa-barcode"></i> ${shipment.trackingNumber}</h3>
                                            <div class="status-badge ${statusClass}">
                                                <i class="fas fa-${statusIcon}"></i>
                                                ${formatStatus(shipment.status.current)}
                                                ${lastUpdate?.isHeld ? '<span class="hold-indicator">HELD</span>' : ''}
                                            </div>
                                        </div>
                                        <div class="shipment-actions">
                                            <button onclick="trackPackage('${shipment.trackingNumber}')" class="btn-track">
                                                <i class="fas fa-search"></i> Track
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div class="shipment-details">
                                        <div class="detail-section">
                                            <div class="detail-item">
                                                <i class="fas fa-user"></i>
                                                <div>
                                                    <span class="detail-label">Recipient</span>
                                                    <span class="detail-value">${shipment.recipient.name}</span>
                                                </div>
                                            </div>
                                            <div class="detail-item">
                                                <i class="fas fa-map-marker-alt"></i>
                                                <div>
                                                    <span class="detail-label">Destination</span>
                                                    <span class="detail-value">${shipment.recipient.address.city}, ${shipment.recipient.address.state}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="detail-section">
                                            <div class="detail-item">
                                                <i class="fas fa-shipping-fast"></i>
                                                <div>
                                                    <span class="detail-label">Service</span>
                                                    <span class="detail-value">${shipment.service.type.toUpperCase()}</span>
                                                </div>
                                            </div>
                                            <div class="detail-item">
                                                <i class="fas fa-calendar"></i>
                                                <div>
                                                    <span class="detail-label">Est. Delivery</span>
                                                    <span class="detail-value">${new Date(shipment.service.estimatedDelivery).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        ${lastUpdate?.location ? `
                                            <div class="detail-section">
                                                <div class="detail-item">
                                                    <i class="fas fa-location-dot"></i>
                                                    <div>
                                                        <span class="detail-label">Last Location</span>
                                                        <span class="detail-value">${lastUpdate.location}</span>
                                                    </div>
                                                </div>
                                                <div class="detail-item">
                                                    <i class="fas fa-clock"></i>
                                                    <div>
                                                        <span class="detail-label">Last Update</span>
                                                        <span class="detail-value">${new Date(lastUpdate.timestamp).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    <div class="shipment-footer">
                                        <div class="cost-info">
                                            <span class="cost-label">Shipping Cost:</span>
                                            <span class="cost-value">$${shipment.service.cost?.toFixed(2) || 'N/A'}</span>
                                        </div>
                                        <div class="date-info">
                                            <span class="date-label">Shipped:</span>
                                            <span class="date-value">${new Date(shipment.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('shipmentsModal');
}

function showProfile() {
    if (!currentUser) {
        showToast('Please login first', 'warning');
        return;
    }
    
    // Remove user menu
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) userMenu.remove();
    
    // Fetch current user profile
    showLoading(true);
    
    fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            displayProfileModal(data.user);
        } else {
            showToast('Error loading profile', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error loading profile:', error);
        showToast('Error loading profile', 'error');
    });
}

function displayProfileModal(user) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'profileModal';
    modal.innerHTML = `
        <div class="modal-content profile-modal">
            <div class="modal-header">
                <h2><i class="fas fa-user-circle"></i> My Profile</h2>
                <span class="close" onclick="closeModal('profileModal')">&times;</span>
            </div>
            <div class="modal-body">
                <form id="profileForm">
                    <div class="profile-section">
                        <h3><i class="fas fa-user"></i> Personal Information</h3>
                        <div class="form-row">
                            <div class="form-group half-width">
                                <label><i class="fas fa-user"></i> First Name</label>
                                <input type="text" name="firstName" value="${user.firstName}" required>
                            </div>
                            <div class="form-group half-width">
                                <label><i class="fas fa-user"></i> Last Name</label>
                                <input type="text" name="lastName" value="${user.lastName}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-envelope"></i> Email Address</label>
                            <input type="email" value="${user.email}" disabled class="disabled-field">
                            <small class="field-note">Email cannot be changed</small>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-phone"></i> Phone Number</label>
                            <input type="tel" name="phone" value="${user.phone || ''}" placeholder="(555) 123-4567" required>
                        </div>
                    </div>
                    
                    <div class="profile-section">
                        <h3><i class="fas fa-map-marker-alt"></i> Address Information</h3>
                        <div class="form-group">
                            <label><i class="fas fa-road"></i> Street Address</label>
                            <input type="text" name="address.street" value="${user.address?.street || ''}" placeholder="123 Main Street" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group half-width">
                                <label><i class="fas fa-city"></i> City</label>
                                <input type="text" name="address.city" value="${user.address?.city || ''}" placeholder="New York" required>
                            </div>
                            <div class="form-group quarter-width">
                                <label><i class="fas fa-flag"></i> State</label>
                                <input type="text" name="address.state" value="${user.address?.state || ''}" placeholder="NY" required maxlength="2">
                            </div>
                            <div class="form-group quarter-width">
                                <label><i class="fas fa-mail-bulk"></i> ZIP Code</label>
                                <input type="text" name="address.zipCode" value="${user.address?.zipCode || ''}" placeholder="10001" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('profileModal')">Cancel</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Update Profile</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('profileModal');
    
    // Handle form submission
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);
        
        const formData = new FormData(e.target);
        const profileData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            phone: formData.get('phone'),
            address: {
                street: formData.get('address.street'),
                city: formData.get('address.city'),
                state: formData.get('address.state'),
                zipCode: formData.get('address.zipCode')
            }
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(profileData)
            });
            
            const data = await response.json();
            showLoading(false);
            
            if (data.success) {
                currentUser = data.user;
                updateAuthUI();
                showToast('Profile updated successfully!', 'success');
                closeModal('profileModal');
                modal.remove();
            } else {
                showToast(data.message || 'Error updating profile', 'error');
            }
        } catch (error) {
            showLoading(false);
            console.error('Profile update error:', error);
            showToast('Error updating profile', 'error');
        }
    });
}

function showAdminDashboard() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return;
    }
    
    // Remove user menu
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) userMenu.remove();
    
    showLoading(true);
    
    fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            displayAdminDashboard(data.stats);
        } else {
            showToast('Error loading dashboard', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard', 'error');
    });
}

function displayAdminDashboard(stats) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'adminModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <span class="close" onclick="closeModal('adminModal')">&times;</span>
            <h2>Admin Dashboard</h2>
            <div class="admin-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
                <div class="stat-card" style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3>${stats.shipments.total}</h3>
                    <p>Total Shipments</p>
                </div>
                <div class="stat-card" style="background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3>${stats.shipments.delivered}</h3>
                    <p>Delivered</p>
                </div>
                <div class="stat-card" style="background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3>${stats.shipments.inTransit}</h3>
                    <p>In Transit</p>
                </div>
                <div class="stat-card" style="background: #f8d7da; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3>${stats.shipments.pending}</h3>
                    <p>Pending</p>
                </div>
                <div class="stat-card" style="background: #d1ecf1; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3>${stats.users.total}</h3>
                    <p>Total Users</p>
                </div>
                <div class="stat-card" style="background: #d4edda; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3>$${stats.revenue.total?.toFixed(2) || '0.00'}</h3>
                    <p>Total Revenue</p>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="loadAdminShipments()" class="btn-primary" style="margin: 5px;">Manage Shipments</button>
                <button onclick="loadCustomerSupport()" class="btn-primary" style="margin: 5px;">
                    <i class="fas fa-headset"></i> Customer Support
                </button>
                <button onclick="loadAdminUsers()" class="btn-primary" style="margin: 5px;">Manage Users</button>
                <button onclick="showAdminRegisterModal()" class="btn-secondary" style="margin: 5px; background: #dc3545; border-color: #dc3545;">
                    <i class="fas fa-user-shield"></i> Admin Setup
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('adminModal');
}

function loadAdminShipments(page = 1, status = 'all', search = '') {
    showLoading(true);
    
    const params = new URLSearchParams({
        page: page,
        limit: 20,
        status: status,
        search: search
    });
    
    fetch(`${API_BASE_URL}/api/shipments/admin/all-shipments?${params}`, {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            displayAdminShipments(data.shipments, data.pagination);
        } else {
            showToast('Error loading shipments', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error loading shipments:', error);
        showToast('Error loading shipments', 'error');
    });
}

function displayAdminShipments(shipments) {
    const modalContent = document.querySelector('#adminModal .modal-content');
    modalContent.innerHTML = `
        <span class="close" onclick="closeModal('adminModal')">&times;</span>
        <h2>Manage Shipments</h2>
        <button onclick="showAdminDashboard()" class="btn-secondary" style="margin-bottom: 15px;">← Back to Dashboard</button>
        <div class="shipments-controls" style="margin-bottom: 20px;">
            <input type="text" id="shipmentSearch" placeholder="Search by tracking number, name, or email..." style="padding: 8px; width: 300px; margin-right: 10px;">
            <select id="statusFilter" onchange="filterShipments()" style="padding: 8px; margin-right: 10px;">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="picked_up">Picked Up</option>
                <option value="in_transit">In Transit</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="exception">Exception</option>
            </select>
            <button onclick="searchShipments()" class="btn-primary" style="padding: 8px 15px;">Search</button>
        </div>
        <div class="shipments-list">
            ${shipments.map(shipment => `
                <div class="shipment-item" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 250px;">
                            <h4 style="margin: 0 0 10px 0; color: #667eea;">${shipment.trackingNumber}</h4>
                            <p style="margin: 5px 0;"><strong>From:</strong> ${shipment.sender?.name || 'N/A'}</p>
                            <p style="margin: 5px 0;"><strong>To:</strong> ${shipment.recipient.name}</p>
                            <p style="margin: 5px 0;"><strong>Status:</strong> <span class="status-badge status-${shipment.status.current}">${formatStatus(shipment.status.current)}</span></p>
                            <p style="margin: 5px 0;"><strong>Service:</strong> ${shipment.service.type.toUpperCase()}</p>
                            ${shipment.status.history && shipment.status.history.length > 0 ? `
                                <p style="margin: 5px 0;"><strong>Last Update:</strong> ${shipment.status.history[shipment.status.history.length - 1].location || 'Processing Center'}</p>
                            ` : ''}
                        </div>
                        <div style="text-align: right; min-width: 200px;">
                            <p style="margin: 5px 0;"><strong>$${shipment.service.cost?.toFixed(2) || 'N/A'}</strong></p>
                            <p style="margin: 5px 0; font-size: 0.9em; color: #666;">${new Date(shipment.createdAt).toLocaleDateString()}</p>
                            <button onclick="showStatusUpdateModal('${shipment.trackingNumber}')" class="btn-primary" style="padding: 8px 12px; margin: 5px 0; font-size: 0.9em;">
                                Update Status
                            </button>
                            <button onclick="viewShipmentDetails('${shipment.trackingNumber}')" class="btn-secondary" style="padding: 8px 12px; margin: 5px 0; font-size: 0.9em;">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Show detailed status update modal
function showStatusUpdateModal(trackingNumber) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'statusUpdateModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Update Shipment Status</h2>
                <span class="close" onclick="closeModal('statusUpdateModal')">&times;</span>
            </div>
            <div class="modal-body">
                <form id="statusUpdateForm">
                    <input type="hidden" name="trackingNumber" value="${trackingNumber}">
                    
                    <h3>Status Information</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Status *</label>
                            <select name="status" required>
                                <option value="">Select Status</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="picked_up">Picked Up</option>
                                <option value="in_transit">In Transit</option>
                                <option value="out_for_delivery">Out for Delivery</option>
                                <option value="delivered">Delivered</option>
                                <option value="exception">Exception</option>
                                <option value="returned">Returned</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Location *</label>
                            <input type="text" name="location" required placeholder="Current location">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Description *</label>
                        <textarea name="description" required rows="3" placeholder="Status update description"></textarea>
                    </div>
                    
                    <h3>Transportation Details</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Transportation Type</label>
                            <select name="transportationType">
                                <option value="">Not specified</option>
                                <option value="truck">Truck</option>
                                <option value="plane">Plane</option>
                                <option value="ship">Ship</option>
                                <option value="train">Train</option>
                                <option value="van">Van</option>
                                <option value="motorcycle">Motorcycle</option>
                                <option value="warehouse">Warehouse</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Vehicle ID</label>
                            <input type="text" name="vehicleId" placeholder="Vehicle/Container ID">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Estimated Arrival</label>
                        <input type="datetime-local" name="estimatedArrival">
                    </div>
                    
                    <h3>Hold Information</h3>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" name="isHeld" onchange="toggleHoldReason(this)">
                            Package is currently held
                        </label>
                    </div>
                    
                    <div class="form-group" id="holdReasonGroup" style="display: none;">
                        <label>Hold Reason</label>
                        <textarea name="holdReason" rows="2" placeholder="Reason for holding package"></textarea>
                    </div>
                    
                    <div style="margin-top: 20px; text-align: right;">
                        <button type="button" onclick="closeModal('statusUpdateModal')" class="btn-secondary" style="margin-right: 10px;">Cancel</button>
                        <button type="submit" class="btn-primary">Update Status</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('statusUpdateModal');
    
    // Handle form submission
    document.getElementById('statusUpdateForm').addEventListener('submit', handleStatusUpdate);
}

// Toggle hold reason field
function toggleHoldReason(checkbox) {
    const holdReasonGroup = document.getElementById('holdReasonGroup');
    if (checkbox.checked) {
        holdReasonGroup.style.display = 'block';
        holdReasonGroup.querySelector('textarea').required = true;
    } else {
        holdReasonGroup.style.display = 'none';
        holdReasonGroup.querySelector('textarea').required = false;
        holdReasonGroup.querySelector('textarea').value = '';
    }
}

// Handle status update form submission
async function handleStatusUpdate(e) {
    e.preventDefault();
    showLoading(true);
    
    const formData = new FormData(e.target);
    const trackingNumber = formData.get('trackingNumber');
    
    const updateData = {
        status: formData.get('status'),
        location: formData.get('location'),
        description: formData.get('description'),
        transportationType: formData.get('transportationType') || null,
        vehicleId: formData.get('vehicleId') || null,
        estimatedArrival: formData.get('estimatedArrival') || null,
        isHeld: formData.get('isHeld') === 'on',
        holdReason: formData.get('holdReason') || null
    };
    
    console.log('Updating status for:', trackingNumber, updateData);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shipments/admin/update-status/${trackingNumber}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        showLoading(false);
        
        if (data.success) {
            showToast('Shipment status updated successfully!', 'success');
            closeModal('statusUpdateModal');
            document.getElementById('statusUpdateModal').remove();
            loadAdminShipments(); // Refresh the list
        } else {
            showToast(data.message || 'Error updating status', 'error');
        }
    } catch (error) {
        showLoading(false);
        console.error('Status update error:', error);
        showToast('Error updating shipment status', 'error');
    }
}

// Search and filter functions
function searchShipments() {
    const search = document.getElementById('shipmentSearch').value;
    const status = document.getElementById('statusFilter').value;
    loadAdminShipments(1, status, search);
}

function filterShipments() {
    searchShipments();
}

// View detailed shipment information
function viewShipmentDetails(trackingNumber) {
    // This will use the existing tracking functionality but in admin context
    trackPackage(trackingNumber);
}

function updateShipmentStatus(trackingNumber, newStatus) {
    if (!newStatus) return;
    
    showLoading(true);
    
    fetch(`${API_BASE_URL}/api/shipments/admin/update-status/${trackingNumber}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            status: newStatus,
            description: newStatus === 'confirmed' ? 'Shipment status awaiting confirmation' : `Status updated to ${newStatus} by admin`
        })
    })
    .then(response => response.json())
    .then(data => {
        showLoading(false);
        if (data.success) {
            showToast('Status updated successfully!', 'success');
            loadAdminShipments(); // Refresh the list
        } else {
            showToast('Error updating status', 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        console.error('Error updating status:', error);
        showToast('Error updating status', 'error');
    });
}

// Utility functions
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; margin-left: 10px;">&times;</button>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Scroll animations (intersection observer)
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.service-card, .feature-item, .stat-item').forEach(el => {
        observer.observe(el);
    });
}

// Initialize scroll animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeScrollAnimations, 500);
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Add CSS for scroll effects and animations
const style = document.createElement('style');
style.textContent = `
    .navbar.scrolled {
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .user-menu {
        position: fixed;
        top: 70px;
        right: 20px;
        z-index: 2000;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        min-width: 200px;
        animation: fadeInDown 0.3s ease;
    }
    
    .user-menu-content {
        padding: 20px;
    }
    
    .user-info {
        padding-bottom: 15px;
        border-bottom: 1px solid #eee;
        margin-bottom: 15px;
    }
    
    .user-info strong {
        display: block;
        color: #333;
    }
    
    .user-info small {
        color: #666;
        font-size: 0.9rem;
    }
    
    .user-menu-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    
    .user-menu-list li {
        margin-bottom: 8px;
    }
    
    .user-menu-list a {
        text-decoration: none;
        color: #333;
        display: block;
        padding: 8px 0;
        border-radius: 4px;
        transition: color 0.3s ease;
    }
    
    .user-menu-list a:hover {
        color: #667eea;
    }
    
    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Admin Registration Modal Styles */
    #adminRegisterModal .modal-content {
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    #adminRegisterModal h2 {
        color: #dc3545;
        text-align: center;
        margin-bottom: 10px;
    }
    
    #adminRegisterModal p {
        text-align: center;
        margin-bottom: 25px;
        font-size: 0.9rem;
    }
    
    .form-row {
        display: grid;
        grid-template-columns: 1fr 100px 120px;
        gap: 15px;
        margin-bottom: 15px;
    }
    
    .form-group {
        margin-bottom: 15px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: #333;
    }
    
    .form-group input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        transition: border-color 0.3s ease;
    }
    
    .form-group input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
    }
    
    .form-group small {
        display: block;
        margin-top: 5px;
        font-size: 0.8rem;
        color: #666;
    }
    
    .btn-admin {
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.3s ease;
    }
    
    .btn-admin:hover {
        background: #c82333;
    }
    
    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
        }
        
        #adminRegisterModal .modal-content {
            margin: 20px;
            max-width: calc(100% - 40px);
        }
    }
`;
document.head.appendChild(style);// Customer Support Functions
function loadCustomerSupport() {
    // Check if user is authenticated
    if (!authToken) {
        showToast('Please login to access customer support', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'supportModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1200px; width: 95%; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h2><i class="fas fa-headset"></i> Customer Support</h2>
                <span class="close" onclick="closeModal('supportModal')">&times;</span>
            </div>
            <div class="modal-body">
                <div class="support-stats">
                    <div class="stat-card">
                        <div class="stat-icon new">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="newMessagesCount">0</h3>
                            <p>New Messages</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon progress">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="inProgressCount">0</h3>
                            <p>In Progress</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon resolved">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="resolvedCount">0</h3>
                            <p>Resolved</p>
                        </div>
                    </div>
                </div>
                
                <div class="support-filters">
                    <div class="filter-group">
                        <select id="statusFilter" onchange="filterSupportMessages()">
                            <option value="">All Status</option>
                            <option value="new">New</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    <div class="search-group">
                        <input type="text" id="supportSearch" placeholder="Search messages...">
                        <button onclick="refreshSupportMessages()" class="refresh-btn">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
                
                <div class="support-messages" id="supportMessagesList">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading messages...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('supportModal');
    loadSupportMessages();
}

let currentSupportPage = 1;
let supportFilters = { status: '', search: '' };

async function loadSupportMessages(page = 1) {
    try {
        showLoading(true);
        const params = new URLSearchParams({ page, limit: 20, ...supportFilters });
        const response = await fetch(`${API_BASE_URL}/api/contact/admin/messages?${params}`, {
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
        });
        
        if (response.status === 401) {
            showToast('Authentication failed. Please login again.', 'error');
            logout();
            return;
        }
        
        const result = await response.json();
        if (result.success) {
            displaySupportMessages(result.data.messages);
            updateSupportStats(result.data.stats);
        } else {
            showToast(result.message || 'Error loading messages', 'error');
        }
    } catch (error) {
        console.error('Error loading support messages:', error);
        showToast('Error loading messages', 'error');
    } finally {
        showLoading(false);
    }
}

function displaySupportMessages(messages) {
    const container = document.getElementById('supportMessagesList');
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="no-messages"><i class="fas fa-inbox fa-3x"></i><h3>No Messages Found</h3></div>';
        return;
    }
    container.innerHTML = messages.map(message => `
        <div class="support-message-card status-${message.status}" onclick="viewSupportMessage('${message._id}')">
            <div class="message-header">
                <div class="message-info">
                    <h4>${message.name}</h4>
                    <div class="message-meta">
                        <span>${message.reference}</span> • 
                        <span>${message.subject}</span> • 
                        <span>${message.email}</span>
                    </div>
                </div>
                <div class="message-status">
                    <span class="status-badge status-${message.status}">${message.status.toUpperCase()}</span>
                </div>
            </div>
            <div class="message-preview">
                <p>${message.message.length > 120 ? message.message.substring(0, 120) + '...' : message.message}</p>
            </div>
            <div class="message-footer">
                <small>Created: ${new Date(message.createdAt).toLocaleDateString()}</small>
                <small>Responses: ${message.responses.length}</small>
            </div>
        </div>
    `).join('');
}

function updateSupportStats(stats) {
    if (document.getElementById('newMessagesCount')) {
        document.getElementById('newMessagesCount').textContent = stats.new || 0;
        document.getElementById('inProgressCount').textContent = stats['in-progress'] || 0;
        document.getElementById('resolvedCount').textContent = stats.resolved || 0;
    }
}

function filterSupportMessages() {
    supportFilters.status = document.getElementById('statusFilter').value;
    supportFilters.search = document.getElementById('supportSearch').value;
    loadSupportMessages(1);
}

function refreshSupportMessages() {
    loadSupportMessages(currentSupportPage);
}

async function viewSupportMessage(messageId) {
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/contact/admin/messages/${messageId}`, {
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
        });
        
        if (response.status === 401) {
            showToast('Authentication failed. Please login again.', 'error');
            logout();
            return;
        }
        
        const result = await response.json();
        if (result.success) {
            showMessageDetailModal(result.data);
        } else {
            showToast(result.message || 'Error loading message', 'error');
        }
    } catch (error) {
        console.error('Error loading support message:', error);
        showToast('Error loading message', 'error');
    } finally {
        showLoading(false);
    }
}

function showMessageDetailModal(message) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'messageDetailModal';
    
    const statusColors = {
        'new': '#007bff',
        'in-progress': '#ffc107', 
        'resolved': '#28a745',
        'closed': '#6c757d'
    };
    
    const priorityColors = {
        'low': '#28a745',
        'medium': '#ffc107',
        'high': '#fd7e14',
        'urgent': '#dc3545'
    };
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; width: 90%;">
            <div class="modal-header">
                <h2><i class="fas fa-envelope-open"></i> Message Details</h2>
                <span class="close" onclick="closeModal('messageDetailModal')">&times;</span>
            </div>
            <div class="modal-body">
                <div class="message-detail-header">
                    <div class="message-info">
                        <h3>${message.name}</h3>
                        <p><i class="fas fa-envelope"></i> ${message.email}</p>
                        ${message.phone ? `<p><i class="fas fa-phone"></i> ${message.phone}</p>` : ''}
                        <p><i class="fas fa-hashtag"></i> ${message.reference}</p>
                    </div>
                    <div class="message-badges">
                        <span class="status-badge" style="background-color: ${statusColors[message.status] || '#6c757d'}">
                            ${message.status.toUpperCase()}
                        </span>
                        <span class="priority-badge" style="background-color: ${priorityColors[message.priority] || '#6c757d'}">
                            ${message.priority ? message.priority.toUpperCase() : 'NORMAL'}
                        </span>
                    </div>
                </div>
                
                <div class="message-content">
                    <h4>Subject: ${message.subject}</h4>
                    <div class="message-text">
                        <p>${message.message}</p>
                    </div>
                </div>
                
                <div class="message-meta">
                    <p><strong>Received:</strong> ${new Date(message.createdAt).toLocaleString()}</p>
                    ${message.assignedTo ? `<p><strong>Assigned to:</strong> ${message.assignedTo.firstName} ${message.assignedTo.lastName}</p>` : ''}
                </div>
                
                ${message.responses && message.responses.length > 0 ? `
                    <div class="message-responses">
                        ${(() => {
                            const customerResponses = message.responses.filter(r => !r.isInternal);
                            const internalNotes = message.responses.filter(r => r.isInternal);
                            
                            let html = '';
                            
                            if (customerResponses.length > 0) {
                                html += `
                                    <h4><i class="fas fa-comments"></i> Customer Responses (${customerResponses.length})</h4>
                                    <div class="customer-responses">
                                        ${customerResponses.map(response => `
                                            <div class="response-item customer-response">
                                                <div class="response-header">
                                                    <strong>${response.adminName || 'Admin'}</strong>
                                                    <span class="response-date">${new Date(response.timestamp || response.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div class="response-text">${response.message}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                            }
                            
                            if (internalNotes.length > 0) {
                                html += `
                                    <h4><i class="fas fa-sticky-note"></i> Internal Notes (${internalNotes.length})</h4>
                                    <div class="internal-notes">
                                        ${internalNotes.map(note => `
                                            <div class="response-item internal-note">
                                                <div class="response-header">
                                                    <div class="response-info">
                                                        <strong>${note.adminName || 'Admin'}</strong>
                                                        <span class="response-date">${new Date(note.timestamp || note.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <div class="response-badges">
                                                        <span class="internal-badge">Internal</span>
                                                        <button class="delete-note-btn" onclick="deleteInternalNote('${message._id}', '${note._id}')" title="Delete this note">
                                                            <i class="fas fa-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="response-text">${note.message}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                `;
                            }
                            
                            return html;
                        })()
                        }
                    </div>
                ` : ''}
                
                <div class="message-actions">
                    <button class="btn-secondary" onclick="closeModal('messageDetailModal')">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn-primary" onclick="showResponseForm('${message._id}')">
                        <i class="fas fa-reply"></i> Add Response
                    </button>
                    <button class="btn-warning" onclick="updateMessageStatus('${message._id}')">
                        <i class="fas fa-edit"></i> Update Status
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('messageDetailModal');
}

function showResponseForm(messageId) {
    // TODO: Implement response form modal
    showToast('Response form coming soon!', 'info');
}

function updateMessageStatus(messageId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'statusUpdateModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; width: 90%;">
            <div class="modal-header">
                <h2><i class="fas fa-edit"></i> Update Message Status</h2>
                <span class="close" onclick="closeModal('statusUpdateModal')">&times;</span>
            </div>
            <div class="modal-body">
                <form id="statusUpdateForm">
                    <div class="form-group">
                        <label for="messageStatus">Status:</label>
                        <select id="messageStatus" required>
                            <option value="new">New</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="messagePriority">Priority:</label>
                        <select id="messagePriority">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="statusNotes">Notes (optional):</label>
                        <textarea id="statusNotes" rows="3" placeholder="Add any notes about this status change..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('statusUpdateModal')">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Update Status
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('statusUpdateModal');
    
    // Handle form submission
    document.getElementById('statusUpdateForm').addEventListener('submit', (e) => {
        e.preventDefault();
        submitStatusUpdate(messageId);
    });
}

async function deleteInternalNote(messageId, responseId) {
    if (!confirm('Are you sure you want to delete this internal note? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/contact/admin/messages/${messageId}/responses/${responseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            showToast('Authentication failed. Please login again.', 'error');
            logout();
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Internal note deleted successfully', 'success');
            
            // Refresh the message details with updated data
            if (result.data) {
                closeModal('messageDetailModal');
                showMessageDetailModal(result.data);
            }
            
            // Refresh the customer support data
            loadCustomerSupport();
        } else {
            showToast(result.message || 'Failed to delete note', 'error');
        }
    } catch (error) {
        console.error('Delete note error:', error);
        showToast('Error deleting note', 'error');
    } finally {
        showLoading(false);
    }
}

async function submitStatusUpdate(messageId) {
    const status = document.getElementById('messageStatus').value;
    const priority = document.getElementById('messagePriority').value;
    const notes = document.getElementById('statusNotes').value.trim();
    
    try {
        showLoading(true);
        
        const updateData = { status, priority };
        if (notes) {
            updateData.notes = notes;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/contact/admin/messages/${messageId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.status === 401) {
            showToast('Authentication failed. Please login again.', 'error');
            logout();
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Message status updated to ${status.toUpperCase()}`, 'success');
            closeModal('statusUpdateModal');
            
            // Refresh the message details with updated data
            if (result.data) {
                closeModal('messageDetailModal');
                showMessageDetailModal(result.data);
            }
            
            // Refresh the customer support data
            loadCustomerSupport();
        } else {
            showToast(result.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Status update error:', error);
        showToast('Error updating status', 'error');
    } finally {
        showLoading(false);
    }
}

function loadAdminUsers() {
    // Check if user is authenticated and has admin role
    if (!authToken) {
        showToast('Please login to access user management', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'adminUsersModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px; width: 95%; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h2><i class="fas fa-users"></i> User Management</h2>
                <span class="close" onclick="closeModal('adminUsersModal')">&times;</span>
            </div>
            <div class="modal-body">
                <div class="user-management-stats">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: #007bff;">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="totalUsersCount">0</h3>
                            <p>Total Users</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: #28a745;">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="adminUsersCount">0</h3>
                            <p>Admin Users</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: #ffc107;">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="customerUsersCount">0</h3>
                            <p>Customers</p>
                        </div>
                    </div>
                </div>
                
                <div class="user-filters">
                    <div class="filter-group">
                        <select id="roleFilter" onchange="filterUsers()">
                            <option value="">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="staff">Staff</option>
                            <option value="customer">Customer</option>
                        </select>
                        <select id="verifiedFilter" onchange="filterUsers()">
                            <option value="">All Status</option>
                            <option value="true">Verified</option>
                            <option value="false">Unverified</option>
                        </select>
                    </div>
                    <div class="search-group">
                        <input type="text" id="userSearch" placeholder="Search users..." oninput="searchUsers()" onkeypress="if(event.key==='Enter') filterUsers()">
                        <button onclick="clearFilters()" class="clear-btn" title="Clear all filters">
                            <i class="fas fa-times"></i>
                        </button>
                        <button onclick="refreshUsers()" class="refresh-btn">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button onclick="verifyAllUsers()" class="verify-btn" style="background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 4px; margin-left: 10px; cursor: pointer;">
                            <i class="fas fa-check-circle"></i> Verify All
                        </button>
                    </div>
                </div>
                <div class="users-results-info" style="margin: 10px 0; font-size: 14px; color: #666;"></div>
                
                <div class="users-list" id="adminUsersList">
                    <div class="loading-placeholder">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading users...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showModal('adminUsersModal');
    
    // Load real user statistics and user list
    loadUserStats();
    loadUsersList();
}

async function loadUserStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
        });
        
        if (response.status === 401) {
            showToast('Authentication failed. Please login again.', 'error');
            logout();
            return;
        }
        
        const result = await response.json();
        if (result.success) {
            document.getElementById('totalUsersCount').textContent = result.data.total;
            document.getElementById('adminUsersCount').textContent = result.data.admin;
            document.getElementById('customerUsersCount').textContent = result.data.customer;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
        document.getElementById('totalUsersCount').textContent = 'Error';
        document.getElementById('adminUsersCount').textContent = 'Error';
        document.getElementById('customerUsersCount').textContent = 'Error';
    }
}

async function loadUsersList(filters = {}) {
    try {
        showLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams({ page: 1, limit: 20 });
        if (filters.role) params.append('role', filters.role);
        if (filters.search) params.append('search', filters.search);
        if (filters.verified !== undefined) params.append('verified', filters.verified);
        
        const response = await fetch(`${API_BASE_URL}/api/admin/users?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
        });
        
        if (response.status === 401) {
            showToast('Authentication failed. Please login again.', 'error');
            logout();
            return;
        }
        
        const result = await response.json();
        if (result.success) {
            displayUsersList(result.users);
            
            // Update results count
            const resultsInfo = document.querySelector('.users-results-info');
            if (resultsInfo) {
                const filterText = Object.keys(filters).length > 0 ? ' (filtered)' : '';
                resultsInfo.textContent = `Showing ${result.users.length} of ${result.pagination.total} users${filterText}`;
            }
        } else {
            document.getElementById('adminUsersList').innerHTML = `
                <div class="no-users">
                    <i class="fas fa-exclamation-triangle fa-3x"></i>
                    <h3>Error Loading Users</h3>
                    <p>${result.message || 'Unable to load user list'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading users list:', error);
        document.getElementById('adminUsersList').innerHTML = `
            <div class="no-users">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h3>Error Loading Users</h3>
                <p>Unable to connect to server</p>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

function displayUsersList(users) {
    const container = document.getElementById('adminUsersList');
    
    if (!users || users.length === 0) {
        container.innerHTML = `
            <div class="no-users">
                <i class="fas fa-users fa-3x"></i>
                <h3>No Users Found</h3>
                <p>No users match the current filters.</p>
            </div>
        `;
        return;
    }
    
    const roleColors = {
        'admin': '#dc3545',
        'staff': '#ffc107', 
        'customer': '#28a745'
    };
    
    container.innerHTML = users.map(user => `
        <div class="user-card">
            <div class="user-header">
                <div class="user-info">
                    <h4>${user.firstName} ${user.lastName}</h4>
                    <p><i class="fas fa-envelope"></i> ${user.email}</p>
                    ${user.phone ? `<p><i class="fas fa-phone"></i> ${user.phone}</p>` : ''}
                </div>
                <div class="user-role">
                    <span class="role-badge" style="background-color: ${roleColors[user.role] || '#6c757d'}">
                        ${user.role.toUpperCase()}
                    </span>
                </div>
            </div>
            <div class="user-meta">
                <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                <div class="user-status">
                    <span><strong>Status:</strong> ${user.isVerified ? 'Verified' : 'Unverified'}</span>
                    ${!user.isVerified ? `
                        <button onclick="verifyUser('${user._id}', '${user.firstName} ${user.lastName}')" 
                                class="verify-single-btn" title="Verify this user">
                            <i class="fas fa-check"></i> Verify
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function filterUsers() {
    const roleFilter = document.getElementById('roleFilter').value;
    const searchFilter = document.getElementById('userSearch').value.trim();
    const verifiedFilter = document.getElementById('verifiedFilter')?.value;
    
    const filters = {};
    if (roleFilter) filters.role = roleFilter;
    if (searchFilter) filters.search = searchFilter;
    if (verifiedFilter) filters.verified = verifiedFilter;
    
    // Show loading state
    const usersList = document.getElementById('usersList');
    if (usersList) {
        usersList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Filtering users...</div>';
    }
    
    loadUsersList(filters);
}

// Add debounced search function
let searchTimeout;
function searchUsers() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        filterUsers();
    }, 500);
}

function clearFilters() {
    document.getElementById('roleFilter').value = '';
    document.getElementById('userSearch').value = '';
    if (document.getElementById('verifiedFilter')) {
        document.getElementById('verifiedFilter').value = '';
    }
    filterUsers();
    showToast('Filters cleared', 'info');
}

function refreshUsers() {
    // Clear all filters first
    document.getElementById('roleFilter').value = '';
    document.getElementById('userSearch').value = '';
    if (document.getElementById('verifiedFilter')) {
        document.getElementById('verifiedFilter').value = '';
    }
    
    // Reload data
    loadUserStats();
    loadUsersList(); // Load without filters
    showToast('User data refreshed!', 'success');
}

// Verify individual user
async function verifyUser(userId, userName) {
    if (!confirm(`Are you sure you want to verify ${userName}?`)) {
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/verify`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            showToast('Authentication failed. Please login again.', 'error');
            logout();
            return;
        }
        
        const result = await response.json();
        if (result.success) {
            showToast(result.message, 'success');
            refreshUsers();
        } else {
            showToast(result.message || 'Failed to verify user', 'error');
        }
    } catch (error) {
        console.error('Verify user error:', error);
        showToast('Error verifying user', 'error');
    } finally {
        showLoading(false);
    }
}

async function verifyAllUsers() {
    if (!confirm('Are you sure you want to verify all unverified users? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/admin/users/verify-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
        });
        
        if (response.status === 401) {
            showToast('Authentication failed. Please login again.', 'error');
            logout();
            return;
        }
        
        const result = await response.json();
        if (result.success) {
            showToast(`Successfully verified ${result.modifiedCount} users!`, 'success');
            refreshUsers(); // Refresh the user list to show updated status
        } else {
            showToast(result.message || 'Error verifying users', 'error');
        }
    } catch (error) {
        console.error('Error verifying all users:', error);
        showToast('Error verifying users. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}
