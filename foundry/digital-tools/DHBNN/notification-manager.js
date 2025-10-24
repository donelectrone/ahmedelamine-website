/* ========================================
   DHBNN PWA - Notification Manager
   Handles scheduling and managing notifications.
   ======================================== */

/**
 * Requests permission from the user to show notifications.
 * This should be called based on a user action, like a button click.
 * @returns {Promise<boolean>} Resolves with true if permission is granted, false otherwise.
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notification');
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        console.log('Notification permission granted.');
        return true;
    } else {
        console.log('Notification permission denied.');
        return false;
    }
}

/**
 * Schedules a follow-up notification. If permission is not granted,
 * it will automatically ask the user for it first.
 * @param {number} patientId - The ID of the patient for the follow-up.
 * @param {string} patientName - The full name of the patient.
 * @param {number} delayInMs - The delay in milliseconds from now.
 */
export async function scheduleFollowUpNotification(patientId, patientName, delayInMs) {
    // Check if notifications are supported at all.
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('Notifications or Service Workers are not supported in this browser.');
        return; // Exit the function if not supported.
    }

    // --- THIS IS THE NEW, SMARTER LOGIC ---
    // Check the current permission status.
    let permission = Notification.permission;

    // If permission is 'default', it means the user hasn't been asked yet. So, ask them now.
    if (permission === 'default') {
        console.log('Requesting notification permission...');
        permission = await Notification.requestPermission();
    }

    // If permission is denied, log a message and exit.
    if (permission === 'denied') {
        console.log('Notification permission has been denied. Cannot schedule notification.');
        alert('L\'autorisation d\'afficher les notifications a été refusée. Veuillez l\'activer dans les paramètres de votre navigateur pour recevoir des rappels.');
        return;
    }
    // --- END OF NEW LOGIC ---


    // If we get here, it means permission is 'granted'.
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
        console.error('Service Worker registration not found.');
        return;
    }

    const title = 'Suivi Patient Requis';
    const options = {
        body: `Le patient ${patientName} nécessite une évaluation de suivi de 48h.`,
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-192x192.png',
        tag: `patient-follow-up-${patientId}`,
        data: {
            url: `./patient-profile.html?patientId=${patientId}`
        }
    };

    setTimeout(() => {
        registration.showNotification(title, options);
        console.log(`Showing notification for patient ${patientId}`);
    }, delayInMs);

    console.log(`Notification for patient ${patientId} scheduled in ${delayInMs / 1000} seconds.`);
}