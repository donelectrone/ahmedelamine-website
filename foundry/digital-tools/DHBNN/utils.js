/* ========================================
   DHBNN PWA - Utility Functions Module
   ======================================== */

/**
 * Parses the URL of the current page to get a specific query parameter.
 * For example, if the URL is "...?patientId=123", getParamFromUrl('patientId') will return 123.
 * @param {string} paramName - The name of the parameter to get (e.g., 'patientId').
 * @returns {string|null} The value of the parameter, or null if not found.
 */
export function getParamFromUrl(paramName) {
    const urlParams = new URLSearchParams(window.location.search);
    const paramValue = urlParams.get(paramName);
    return paramValue ? paramValue : null;
}

/**
 * Formats a date timestamp or string into a readable format (e.g., "DD/MM/YYYY").
 * @param {string|number} dateInput - The date to format (ISO string or timestamp).
 * @returns {string} The formatted date.
 */
export function formatDate(dateInput) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}