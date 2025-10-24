/* ========================================
   DHBNN PWA - Main Application Controller
   ======================================== */

// Import database initialization
import { initDB } from './data-store.js';

// Global application state
const appState = {
    currentPatient: null,
    allPatients: [],
    dbInitialized: false,
    serviceWorkerRegistered: false
};

/**
 * Main application initialization function
 * Called when the DOM is fully loaded
 */
async function initializeApp() {
    console.log('🏥 DHBNN PWA - Starting application initialization...');

    try {
        // Step 1: Register Service Worker
        await registerServiceWorker();

        // Step 2: Initialize IndexedDB
        await initializeDatabase();

        // Step 3: Load page-specific logic
        await loadPageSpecificLogic();
		handleActiveNav();

        // Step 4: Setup global event handlers
        setupGlobalEventHandlers();

        console.log('✓ Application initialization complete');

    } catch (error) {
        console.error('❌ Error during application initialization:', error);
        showErrorNotification('Erreur d\'initialisation de l\'application', error.message);
    }
}

/**
 * Handles highlighting the active link in the navigation bar
 */
function handleActiveNav() {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.parentElement.classList.add('active');
        }
    });
}

/**
 * Register the service worker for offline capabilities
 */
async function registerServiceWorker() {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
        console.warn('⚠ Service Workers are not supported in this browser');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('./service-worker.js', {
            scope: './'
        });

        appState.serviceWorkerRegistered = true;

        console.log('✓ Service Worker registered successfully:', registration.scope);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('🔄 Service Worker update found');

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('✓ New Service Worker installed, page refresh recommended');
                    showUpdateNotification();
                }
            });
        });

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('📨 Message from Service Worker:', event.data);
            
            if (event.data.type === 'CACHE_UPDATED') {
                console.log('✓ Cache updated successfully');
            }
        });

    } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        // Don't throw - app should work without service worker
    }
}

/**
 * Initialize the IndexedDB database
 */
async function initializeDatabase() {
    try {
        await initDB();
        appState.dbInitialized = true;
        console.log('✓ IndexedDB initialized successfully');
    } catch (error) {
        console.error('❌ IndexedDB initialization failed:', error);
        throw new Error('Database initialization failed: ' + error.message);
    }
}

/**
 * Load page-specific JavaScript logic based on current URL,
 * handling both clean URLs (e.g., /patient-list) and full filenames.
 */
async function loadPageSpecificLogic() {
    const path = window.location.pathname;
    console.log(`📄 Evaluating path for logic: ${path}`);

    try {
        // --- THIS IS THE MORE FLEXIBLE LOGIC BLOCK ---
        if (path.endsWith('/') || path.endsWith('index.html') || path.endsWith('index')) {
            const { initializeForm } = await import('./patient-form.js');
            initializeForm();
            console.log('✓ Initialized patient-form.js');

        } else if (path.endsWith('/assessment') || path.endsWith('assessment.html')) {
            const { initializeAssessmentPage } = await import('./assessment-logic.js');
            await initializeAssessmentPage();
            console.log('✓ Initialized assessment-logic.js');

        } else if (path.endsWith('/patient-list') || path.endsWith('patient-list.html')) {
            const { initializePatientListPage } = await import('./patient-list-manager.js');
            await initializePatientListPage();
            console.log('✓ Initialized patient-list-manager.js');

        } else if (path.endsWith('/patient-profile') || path.endsWith('patient-profile.html')) {
            const { initializeProfilePage } = await import('./profile-manager.js');
            await initializeProfilePage();
            console.log('✓ Initialized profile-manager.js');

        } else if (path.endsWith('/stats') || path.endsWith('stats.html')) {
            console.log('Stats page logic not yet implemented.');

        } else {
            console.warn(`⚠ No specific logic handler for path: ${path}`);
        }
        // --- END OF FLEXIBLE BLOCK ---

    } catch (error) {
        console.error(`❌ Error loading page-specific logic for ${path}:`, error);
        throw error;
    }
}

/**
 * Setup global event handlers for the application
 */
function setupGlobalEventHandlers() {
    // Handle online/offline status
    window.addEventListener('online', () => {
        console.log('✓ Network connection restored');
        showNotification('Connexion rétablie', 'success');
    });

    window.addEventListener('offline', () => {
        console.log('⚠ Network connection lost');
        showNotification('Mode hors ligne', 'warning');
    });

    // Handle visibility change (page becomes visible/hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('📱 Page hidden');
        } else {
            console.log('📱 Page visible');
            // Could check for updates here
        }
    });

    // Handle beforeunload (user leaving page)
    window.addEventListener('beforeunload', (event) => {
        // Check if there are unsaved changes
        const hasUnsavedChanges = checkForUnsavedChanges();
        
        if (hasUnsavedChanges) {
            event.preventDefault();
            event.returnValue = ''; // Required for Chrome
            return 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter?';
        }
    });

    console.log('✓ Global event handlers registered');
}

/**
 * Check if there are unsaved changes in the current page
 * @returns {boolean} True if there are unsaved changes
 */
function checkForUnsavedChanges() {
    // This would be implemented by individual page modules
    // For now, return false
    return false;
}

/**
 * Show a temporary notification to the user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, warning, error, info)
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        borderRadius: '8px',
        backgroundColor: type === 'success' ? '#00A878' : 
                        type === 'warning' ? '#FF6F00' : 
                        type === 'error' ? '#DC143C' : '#0066CC',
        color: 'white',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: '10000',
        animation: 'slideInRight 0.3s ease-out',
        maxWidth: '300px'
    });

    // Add to body
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

/**
 * Show error notification to the user
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorNotification(title, message) {
    console.error(`${title}: ${message}`);
    
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 30px; border-radius: 12px; 
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); z-index: 10001; max-width: 400px;">
            <h3 style="color: #DC143C; margin-bottom: 15px;">⚠ ${title}</h3>
            <p style="color: #333; margin-bottom: 20px;">${message}</p>
            <button onclick="this.parentElement.remove()" 
                    style="padding: 10px 20px; background: #0066CC; color: white; 
                           border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                OK
            </button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}

/**
 * Show update notification when new version is available
 */
function showUpdateNotification() {
    const updateDiv = document.createElement('div');
    updateDiv.innerHTML = `
        <div style="position: fixed; bottom: 20px; right: 20px; 
                    background: #0066CC; color: white; padding: 20px; 
                    border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); 
                    z-index: 10000; max-width: 300px;">
            <h4 style="margin: 0 0 10px 0;">🔄 Mise à jour disponible</h4>
            <p style="margin: 0 0 15px 0; font-size: 0.9rem;">
                Une nouvelle version est disponible. Actualisez la page pour l'obtenir.
            </p>
            <button onclick="window.location.reload()" 
                    style="padding: 8px 16px; background: white; color: #0066CC; 
                           border: none; border-radius: 6px; cursor: pointer; 
                           font-weight: 600; margin-right: 10px;">
                Actualiser
            </button>
            <button onclick="this.parentElement.remove()" 
                    style="padding: 8px 16px; background: transparent; color: white; 
                           border: 1px solid white; border-radius: 6px; cursor: pointer;">
                Plus tard
            </button>
        </div>
    `;
    
    document.body.appendChild(updateDiv);
}

/**
 * Show placeholder message for unimplemented pages
 * @param {string} pageTitle - Title of the page
 * @param {string} message - Placeholder message
 */
function showPlaceholderMessage(pageTitle, message) {
    const mainElement = document.querySelector('main');
    
    if (mainElement) {
        mainElement.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 80px; margin-bottom: 20px;">🏗️</div>
                <h2 style="color: #0066CC; margin-bottom: 15px;">${pageTitle}</h2>
                <p style="color: #666; font-size: 1.1rem; margin-bottom: 30px;">${message}</p>
                <a href="index.html" 
                   style="display: inline-block; padding: 12px 30px; background: #0066CC; 
                          color: white; text-decoration: none; border-radius: 8px; 
                          font-weight: 600;">
                    ← Retour à l'enregistrement patient
                </a>
            </div>
        `;
    }
}

/**
 * Get the current application state
 * @returns {Object} Current application state
 */
export function getAppState() {
    return { ...appState };
}

/**
 * Update the current patient in app state
 * @param {Object} patientData - Patient data to set as current
 */
export function setCurrentPatient(patientData) {
    appState.currentPatient = patientData;
    console.log('Current patient updated:', patientData?.patientId);
}

/**
 * Clear the current patient from app state
 */
export function clearCurrentPatient() {
    appState.currentPatient = null;
    console.log('Current patient cleared');
}

// Initialize the application when DOM is ready
window.addEventListener('DOMContentLoaded', initializeApp);

// Add CSS animation keyframes for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export for use in other modules

export { appState, initializeApp, showNotification, showErrorNotification };

