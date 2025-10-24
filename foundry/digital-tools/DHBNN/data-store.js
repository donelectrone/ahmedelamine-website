/* ========================================
   DHBNN PWA - IndexedDB Data Store Module
   ======================================== */

// Database configuration
const DB_NAME = 'dhbnnDB';
const DB_VERSION = 1;
const STORE_NAME = 'patients';

// Global database reference
let db = null;

/**
 * Initialize the IndexedDB database
 * Creates the database and object store if they don't exist
 * @returns {Promise} Resolves when database is successfully opened/upgraded
 */
export function initDB() {
    return new Promise((resolve, reject) => {
        // Check if IndexedDB is supported
        if (!window.indexedDB) {
            const error = new Error('IndexedDB is not supported in this browser');
            console.error(error);
            reject(error);
            return;
        }

        // Open database connection
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Handle database upgrade (creation or version change)
        request.onupgradeneeded = (event) => {
            console.log('Database upgrade needed - creating object store');
            db = event.target.result;

            // Create the patients object store if it doesn't exist
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: 'patientId',
                    autoIncrement: true
                });

                // Create indexes for common queries (optional but recommended)
                objectStore.createIndex('nom', 'nom', { unique: false });
                objectStore.createIndex('prenom', 'prenom', { unique: false });
                objectStore.createIndex('dateCreated', 'dateCreated', { unique: false });

                console.log('Object store "patients" created successfully');
            }
        };

        // Handle successful database opening
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully');
            resolve(db);
        };

        // Handle database opening errors
        request.onerror = (event) => {
            const error = new Error(`Database error: ${event.target.error}`);
            console.error(error);
            reject(error);
        };

        // Handle blocked database (rare case)
        request.onblocked = (event) => {
            console.warn('Database open request blocked. Please close other tabs with this application.');
        };
    });
}

/**
 * Add a new patient record to the database
 * @param {Object} patientData - Patient data object
 * @returns {Promise<number>} Resolves with the auto-generated patientId
 */
export function addPatient(patientData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            const error = new Error('Database not initialized. Call initDB() first.');
            console.error(error);
            reject(error);
            return;
        }

        // Add creation timestamp if not present
        if (!patientData.dateCreated) {
            patientData.dateCreated = new Date().toISOString();
        }

        // Add last modified timestamp
        patientData.dateModified = new Date().toISOString();

        // Start a transaction
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);

        // Add the patient data
        const request = objectStore.add(patientData);

        request.onsuccess = (event) => {
            const patientId = event.target.result;
            console.log(`Patient added successfully with ID: ${patientId}`);
            resolve(patientId);
        };

        request.onerror = (event) => {
            const error = new Error(`Error adding patient: ${event.target.error}`);
            console.error(error);
            reject(error);
        };

        transaction.onerror = (event) => {
            const error = new Error(`Transaction error: ${event.target.error}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Retrieve a patient record by ID
 * @param {number} patientId - The ID of the patient to retrieve
 * @returns {Promise<Object|null>} Resolves with patient data or null if not found
 */
export function getPatient(patientId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            const error = new Error('Database not initialized. Call initDB() first.');
            console.error(error);
            reject(error);
            return;
        }

        // Start a transaction
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);

        // Get the patient data
        const request = objectStore.get(patientId);

        request.onsuccess = (event) => {
            const patientData = event.target.result;
            if (patientData) {
                console.log(`Patient ${patientId} retrieved successfully`);
                resolve(patientData);
            } else {
                console.log(`Patient ${patientId} not found`);
                resolve(null);
            }
        };

        request.onerror = (event) => {
            const error = new Error(`Error retrieving patient: ${event.target.error}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Retrieve all patient records
 * @returns {Promise<Array>} Resolves with an array of all patient records
 */
export function getAllPatients() {
    return new Promise((resolve, reject) => {
        if (!db) {
            const error = new Error('Database not initialized. Call initDB() first.');
            console.error(error);
            reject(error);
            return;
        }

        // Start a transaction
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);

        // Get all patient records
        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            const patients = event.target.result || [];
            console.log(`Retrieved ${patients.length} patient record(s)`);
            resolve(patients);
        };

        request.onerror = (event) => {
            const error = new Error(`Error retrieving all patients: ${event.target.error}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Update an existing patient record
 * @param {Object} patientData - Patient data object (must include patientId)
 * @returns {Promise} Resolves when update is successful
 */
export function updatePatient(patientData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            const error = new Error('Database not initialized. Call initDB() first.');
            console.error(error);
            reject(error);
            return;
        }

        if (!patientData.patientId) {
            const error = new Error('Patient data must include patientId for updates');
            console.error(error);
            reject(error);
            return;
        }

        // Update last modified timestamp
        patientData.dateModified = new Date().toISOString();

        // Start a transaction
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);

        // Update the patient data (put will update if key exists)
        const request = objectStore.put(patientData);

        request.onsuccess = (event) => {
            console.log(`Patient ${patientData.patientId} updated successfully`);
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            const error = new Error(`Error updating patient: ${event.target.error}`);
            console.error(error);
            reject(error);
        };

        transaction.onerror = (event) => {
            const error = new Error(`Transaction error: ${event.target.error}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Delete a patient record by ID
 * @param {number} patientId - The ID of the patient to delete
 * @returns {Promise} Resolves when deletion is successful
 */
export function deletePatient(patientId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            const error = new Error('Database not initialized. Call initDB() first.');
            console.error(error);
            reject(error);
            return;
        }

        // Start a transaction
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);

        // Delete the patient record
        const request = objectStore.delete(patientId);

        request.onsuccess = (event) => {
            console.log(`Patient ${patientId} deleted successfully`);
            resolve();
        };

        request.onerror = (event) => {
            const error = new Error(`Error deleting patient: ${event.target.error}`);
            console.error(error);
            reject(error);
        };

        transaction.onerror = (event) => {
            const error = new Error(`Transaction error: ${event.target.error}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Search patients by name (case-insensitive partial match)
 * @param {string} searchTerm - Search term for name matching
 * @returns {Promise<Array>} Resolves with array of matching patients
 */
export function searchPatients(searchTerm) {
    return new Promise((resolve, reject) => {
        if (!db) {
            const error = new Error('Database not initialized. Call initDB() first.');
            console.error(error);
            reject(error);
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            const allPatients = event.target.result || [];
            const searchLower = searchTerm.toLowerCase();
            
            // Filter patients by name (case-insensitive)
            const matchingPatients = allPatients.filter(patient => {
                const fullName = `${patient.nom || ''} ${patient.prenom || ''}`.toLowerCase();
                return fullName.includes(searchLower);
            });

            console.log(`Found ${matchingPatients.length} patient(s) matching "${searchTerm}"`);
            resolve(matchingPatients);
        };

        request.onerror = (event) => {
            const error = new Error(`Error searching patients: ${event.target.error}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Clear all patient records (use with caution!)
 * @returns {Promise} Resolves when all records are cleared
 */
export function clearAllPatients() {
    return new Promise((resolve, reject) => {
        if (!db) {
            const error = new Error('Database not initialized. Call initDB() first.');
            console.error(error);
            reject(error);
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.clear();

        request.onsuccess = () => {
            console.log('All patient records cleared');
            resolve();
        };

        request.onerror = (event) => {
            const error = new Error(`Error clearing patients: ${event.target.error}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Get the count of patient records
 * @returns {Promise<number>} Resolves with the total number of patients
 */
export function getPatientCount() {
    return new Promise((resolve, reject) => {
        if (!db) {
            const error = new Error('Database not initialized. Call initDB() first.');
            console.error(error);
            reject(error);
            return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.count();

        request.onsuccess = (event) => {
            const count = event.target.result;
            console.log(`Total patient records: ${count}`);
            resolve(count);
        };

        request.onerror = (event) => {
            const error = new Error(`Error counting patients: ${event.target.error}`);
            console.error(error);
            reject(error);
        };
    });
}

/**
 * Close the database connection
 */
export function closeDB() {
    if (db) {
        db.close();
        db = null;
        console.log('Database connection closed');
    }
}