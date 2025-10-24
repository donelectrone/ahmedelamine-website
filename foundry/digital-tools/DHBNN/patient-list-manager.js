/* ========================================
   DHBNN PWA - Patient List Manager Module
   Search, filter, and display all patients
   ======================================== */

// Import data store functions
import { getAllPatients, getPatientCount, searchPatients } from './data-store.js';

// Module-level variables
let allPatients = [];
let filteredPatients = [];
let currentFilter = 'all';
let currentSort = 'recent';
let searchQuery = '';

/**
 * Initialize the patient list page
 * Main entry point called by main.js
 */
export async function initializePatientListPage() {
    console.log('Initializing patient list page...');

    try {
        // Show loading state
        showLoadingState(true);

        // Load all patients from database
        await loadPatients();

        // Render statistics
        renderStatistics();

        // Apply initial filter and sort
        applyFilterAndSort();

        // Render patient list
        renderPatientList();

        // Set up event listeners
        setupEventListeners();

        // Hide loading state
        showLoadingState(false);
		
		handleAboutPopup();

        console.log('Patient list page initialized successfully');

    } catch (error) {
        console.error('Error initializing patient list page:', error);
        showLoadingState(false);
        showError('Erreur lors du chargement de la liste des patients', error.message);
    }
}

/**
 * Load all patients from the database
 */
async function loadPatients() {
    try {
        allPatients = await getAllPatients();
        filteredPatients = [...allPatients];
        console.log(`Loaded ${allPatients.length} patients`);
    } catch (error) {
        console.error('Error loading patients:', error);
        throw error;
    }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('patient-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Add new patient button
    const addBtn = document.getElementById('add-new-patient-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // Filter select
    const filterSelect = document.getElementById('filter-status');
    if (filterSelect) {
        filterSelect.addEventListener('change', handleFilterChange);
    }

    // Sort select
    const sortSelect = document.getElementById('sort-by');
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSortChange);
    }

    console.log('Event listeners attached');
}

/**
 * Handle search input
 * @param {Event} event - Input event
 */
function handleSearch(event) {
    searchQuery = event.target.value.trim().toLowerCase();
    console.log('Search query:', searchQuery);
    
    applyFilterAndSort();
    renderPatientList();
}

/**
 * Handle filter change
 * @param {Event} event - Change event
 */
function handleFilterChange(event) {
    currentFilter = event.target.value;
    console.log('Filter changed to:', currentFilter);
    
    applyFilterAndSort();
    renderPatientList();
}

/**
 * Handle sort change
 * @param {Event} event - Change event
 */
function handleSortChange(event) {
    currentSort = event.target.value;
    console.log('Sort changed to:', currentSort);
    
    applyFilterAndSort();
    renderPatientList();
}

/**
 * Apply current filter and sort settings
 */
function applyFilterAndSort() {
    // Start with all patients
    filteredPatients = [...allPatients];

    // Apply search filter
    if (searchQuery) {
        filteredPatients = filteredPatients.filter(patient => {
            const fullName = `${patient.nom || ''} ${patient.prenom || ''}`.toLowerCase();
            return fullName.includes(searchQuery);
        });
    }

    // Apply status filter
    filteredPatients = filteredPatients.filter(patient => {
        switch (currentFilter) {
            case 'all':
                return true;
            case 'new':
                return !patient.assessment; // No assessment done yet
            case 'ambulatory':
                return patient.assessment?.treatmentPlan?.setting === 'ambulatory';
            case 'hospitalized':
                return patient.assessment?.treatmentPlan?.setting === 'hospital';
            case 'followup':
                return patient.assessment && !patient.followUp; // Assessment done but no follow-up
            case 'cured':
                return patient.status === 'cured';
            default:
                return true;
        }
    });

    // Apply sort
    filteredPatients.sort((a, b) => {
        switch (currentSort) {
            case 'recent':
                return new Date(b.dateCreated) - new Date(a.dateCreated);
            case 'oldest':
                return new Date(a.dateCreated) - new Date(b.dateCreated);
            case 'name-asc':
                return (a.nom || '').localeCompare(b.nom || '');
            case 'name-desc':
                return (b.nom || '').localeCompare(a.nom || '');
            case 'severity':
                // Sort by severity: severe > hospitalized > ambulatory > new > cured
                const severityOrder = { severe: 0, hospitalized: 1, ambulatory: 2, new: 3, cured: 4 };
                const aStatus = getPatientStatus(a);
                const bStatus = getPatientStatus(b);
                return (severityOrder[aStatus] || 5) - (severityOrder[bStatus] || 5);
            default:
                return 0;
        }
    });

    console.log(`Filtered to ${filteredPatients.length} patients`);
}

/**
 * Render statistics summary cards
 */
function renderStatistics() {
    // Total patients
    const totalCount = document.getElementById('total-patients-count');
    if (totalCount) {
        totalCount.textContent = allPatients.length;
    }

    // Hospitalized count
    const hospitalizedCount = allPatients.filter(p => 
        p.assessment?.treatmentPlan?.setting === 'hospital' && p.status !== 'cured'
    ).length;
    const hospitalizedEl = document.getElementById('hospitalized-count');
    if (hospitalizedEl) {
        hospitalizedEl.textContent = hospitalizedCount;
    }

    // Ambulatory count
    const ambulatoryCount = allPatients.filter(p => 
        p.assessment?.treatmentPlan?.setting === 'ambulatory' && p.status !== 'cured'
    ).length;
    const ambulatoryEl = document.getElementById('ambulatory-count');
    if (ambulatoryEl) {
        ambulatoryEl.textContent = ambulatoryCount;
    }

    // Follow-up pending count
    const followupCount = allPatients.filter(p => 
        p.assessment && !p.followUp && p.status !== 'cured'
    ).length;
    const followupEl = document.getElementById('followup-pending-count');
    if (followupEl) {
        followupEl.textContent = followupCount;
    }
}

/**
 * Render the patient list
 */
function renderPatientList() {
    const listElement = document.getElementById('patient-list');
    const emptyMessage = document.getElementById('empty-list-message');
    const noResultsMessage = document.getElementById('no-results-message');

    if (!listElement) return;

    // Check if we have any patients at all
    if (allPatients.length === 0) {
        listElement.style.display = 'none';
        if (emptyMessage) emptyMessage.style.display = 'block';
        if (noResultsMessage) noResultsMessage.style.display = 'none';
        return;
    }

    // Check if filter/search returned no results
    if (filteredPatients.length === 0) {
        listElement.style.display = 'none';
        if (emptyMessage) emptyMessage.style.display = 'none';
        if (noResultsMessage) noResultsMessage.style.display = 'block';
        return;
    }

    // Hide empty/no results messages
    if (emptyMessage) emptyMessage.style.display = 'none';
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    listElement.style.display = 'block';

    // Build patient list HTML
    let html = '';
    
    filteredPatients.forEach(patient => {
        html += createPatientListItem(patient);
    });

    listElement.innerHTML = html;

    // Add click listeners to patient items
    const patientItems = listElement.querySelectorAll('.patient-list-item');
    patientItems.forEach(item => {
        item.addEventListener('click', () => {
            const patientId = item.getAttribute('data-patient-id');
            window.location.href = `patient-profile.html?patientId=${patientId}`;
        });
    });
}

/**
 * Create HTML for a single patient list item
 * @param {Object} patient - Patient data
 * @returns {string} HTML string
 */
function createPatientListItem(patient) {
    const fullName = `${patient.nom || ''}, ${patient.prenom || ''}`;
    const initials = getInitials(patient);
    const age = patient.age || 'N/A';
    const registrationDate = new Date(patient.dateCreated).toLocaleDateString('fr-FR');
    
    // Determine patient status
    const status = getPatientStatus(patient);
    const statusBadge = getStatusBadge(status);

    // Collect tags (comorbidities, location, etc.)
    const tags = getPatientTags(patient);

    return `
        <li class="patient-list-item" data-patient-id="${patient.patientId}">
            <div class="patient-item-header">
                <div class="patient-avatar">${initials}</div>
                <div class="patient-main-info">
                    <div class="patient-item-name">${fullName}</div>
                    <div class="patient-item-meta">
                        <span class="meta-item">🎂 ${age} ans</span>
                        <span class="meta-item">📅 ${registrationDate}</span>
                    </div>
                </div>
                ${statusBadge}
            </div>
            ${tags.length > 0 ? `
                <div class="patient-item-details">
                    ${tags.map(tag => `<span class="detail-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="patient-item-actions">
                <span class="action-icon">→</span>
            </div>
        </li>
    `;
}

/**
 * Get patient initials for avatar
 * @param {Object} patient - Patient data
 * @returns {string} Initials
 */
function getInitials(patient) {
    const firstInitial = (patient.prenom || 'P')[0].toUpperCase();
    const lastInitial = (patient.nom || 'N')[0].toUpperCase();
    return `${firstInitial}${lastInitial}`;
}

/**
 * Determine patient status
 * @param {Object} patient - Patient data
 * @returns {string} Status code
 */
function getPatientStatus(patient) {
    // Cured
    if (patient.status === 'cured') {
        return 'cured';
    }

    // Has assessment
    if (patient.assessment) {
        // Check if severe
        if (patient.assessment.severitySigns?.hasSeveritySigns) {
            return 'severe';
        }
        
        // Check treatment setting
        if (patient.assessment.treatmentPlan?.setting === 'hospital') {
            return 'hospitalized';
        }
        
        if (patient.assessment.treatmentPlan?.setting === 'ambulatory') {
            // Check if follow-up is pending
            if (!patient.followUp) {
                return 'followup';
            }
            return 'ambulatory';
        }
    }

    // No assessment yet
    return 'new';
}

/**
 * Get status badge HTML
 * @param {string} status - Status code
 * @returns {string} Badge HTML
 */
function getStatusBadge(status) {
    const badges = {
        new: '<div class="patient-status-badge status-new">Nouveau</div>',
        ambulatory: '<div class="patient-status-badge status-ambulatory">Ambulatoire</div>',
        hospitalized: '<div class="patient-status-badge status-hospitalized">Hospitalisé</div>',
        followup: '<div class="patient-status-badge status-followup">Suivi 48h</div>',
        cured: '<div class="patient-status-badge status-cured">Guéri</div>',
        severe: '<div class="patient-status-badge status-severe">Grave</div>'
    };

    return badges[status] || '';
}

/**
 * Get relevant tags for patient
 * @param {Object} patient - Patient data
 * @returns {Array<string>} Array of tag strings
 */
function getPatientTags(patient) {
    const tags = [];

    // Add key comorbidities
    if (patient.antecedents) {
        if (patient.antecedents.diabete) tags.push('Diabète');
        if (patient.antecedents.hta) tags.push('HTA');
        if (patient.antecedents.immunodepression) tags.push('Immunodépression');
    }

    // Add recurrence info
    if (patient.nombreRecidives > 0) {
        tags.push(`🔄 ${patient.nombreRecidives} récidive${patient.nombreRecidives > 1 ? 's' : ''}`);
    }

    // Add location if available
    if (patient.presentation?.localisationNotes) {
        const location = patient.presentation.localisationNotes.substring(0, 30);
        tags.push(`📍 ${location}${location.length >= 30 ? '...' : ''}`);
    }

    // Limit to 4 tags for clean display
    return tags.slice(0, 4);
}

/**
 * Show loading state
 * @param {boolean} show - Whether to show loading state
 */
function showLoadingState(show) {
    const loadingDiv = document.getElementById('loading-patients');
    const listDiv = document.getElementById('patient-list');
    const emptyDiv = document.getElementById('empty-list-message');
    const noResultsDiv = document.getElementById('no-results-message');

    if (loadingDiv) {
        loadingDiv.style.display = show ? 'block' : 'none';
    }

    if (show) {
        if (listDiv) listDiv.style.display = 'none';
        if (emptyDiv) emptyDiv.style.display = 'none';
        if (noResultsDiv) noResultsDiv.style.display = 'none';
    }
}

/**
 * Show error message
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showError(title, message) {
    alert(`❌ ${title}\n\n${message}`);
}

/**
 * Refresh the patient list
 * Useful for updating after data changes
 */
export async function refreshPatientList() {
    console.log('Refreshing patient list...');
    
    try {
        showLoadingState(true);
        await loadPatients();
        renderStatistics();
        applyFilterAndSort();
        renderPatientList();
        showLoadingState(false);
    } catch (error) {
        console.error('Error refreshing patient list:', error);
        showLoadingState(false);
    }
}

// Export functions for external use
export {
    loadPatients,
    renderPatientList,
    renderStatistics
};

/**
 * Manages the "About" popup logic, showing it on the 5th and 25th app open.
 */
function handleAboutPopup() {
    const modal = document.getElementById('about-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (!modal || !closeModalBtn) return;

    // Counter logic
    let appOpenCount = parseInt(localStorage.getItem('appOpenCount') || '0');
    appOpenCount++;
    localStorage.setItem('appOpenCount', appOpenCount);

    console.log(`App has been opened ${appOpenCount} times.`);

    // Trigger conditions
    if (appOpenCount === 2 || appOpenCount === 20) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('visible'), 10);
    }

    // Close button logic
    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.style.display = 'none', 300);
    });

}

/**
 * Manages the PWA installation button.
 * Listens for the browser's install prompt event and shows our custom button.
 */
function setupInstallButton() {
    let deferredInstallPrompt = null;
    const installButton = document.getElementById('install-pwa-btn');

    window.addEventListener('beforeinstallprompt', (event) => {
        // Prevent the default mini-infobar from appearing on mobile
        event.preventDefault();
        
        // Stash the event so it can be triggered later.
        deferredInstallPrompt = event;
        
        // Show our custom install button.
        if (installButton) {
            installButton.style.display = 'block';
        }
    });

    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredInstallPrompt) {
                // The prompt has already been used or wasn't available.
                return;
            }
            
            // Show the browser's official install prompt.
            deferredInstallPrompt.prompt();
            
            // Wait for the user to respond to the prompt.
            const { outcome } = await deferredInstallPrompt.userChoice;
            
            console.log(`User response to the install prompt: ${outcome}`);
            
            // We've used the prompt, and can't use it again. Hide the button.
            deferredInstallPrompt = null;
            installButton.style.display = 'none';
        });
    }
}
