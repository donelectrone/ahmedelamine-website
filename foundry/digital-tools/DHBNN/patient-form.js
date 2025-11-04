/* ========================================
   DHBNN PWA - Patient Form Logic Module
   ======================================== */

// Import data store functions
import { addPatient, updatePatient, getPatient } from './data-store.js';

// Global variable to track if we're editing an existing patient
let currentPatientId = null;
let initialLesionPhotoData = null;
let selectedRegions = new Set(); //
/**
 * Initialize the form - set up event listeners and load existing data if editing
 */
function initializeForm() {
    console.log('Initializing patient registration form...');

    // Check if we're editing an existing patient
    const urlParams = new URLSearchParams(window.location.search);
    const editPatientId = urlParams.get('patientId');
    
    if (editPatientId) {
        currentPatientId = parseInt(editPatientId);
        loadPatientData(currentPatientId);
    }

	
	setupPhotoUpload();
	
    // Set up conditional field toggles
    setupConditionalFields();

    // Set up form action buttons
    setupActionButtons();

    // Set up form field change tracking
    setupFormChangeTracking();

	setupBodyMap();

    console.log('Form initialization complete');
}


/**
 * Sets up the logic for the interactive hotspot body map.
 */
function setupBodyMap() {
    const container = document.getElementById('body-diagram-container');
    if (!container) {
        console.error('Body diagram container not found!');
        return;
    }

    // Use event delegation on the container
    container.addEventListener('click', (event) => {
        const clickedEl = event.target;

        // Check if the user clicked on an actual hotspot
        if (clickedEl.classList.contains('body-hotspot')) {
            const regionName = clickedEl.dataset.region; // Get the user-friendly name

            // Toggle the 'selected' class to change its color
            clickedEl.classList.toggle('selected');

            // Add or remove the region from our set of selected regions
            if (selectedRegions.has(regionName)) {
                selectedRegions.delete(regionName);
            } else {
                selectedRegions.add(regionName);
            }
            
            // For debugging: show what's currently selected in the console
            console.log('Selected Regions:', Array.from(selectedRegions));
        }
    });
}

/**
 * Sets up the logic for the initial lesion photo upload.
 */
function setupPhotoUpload() {
    const photoInput = document.getElementById('initial-lesion-photo-input');
    const removeBtn = document.getElementById('remove-lesion-photo-btn');

    if (photoInput) {
        photoInput.addEventListener('change', handleLesionPhotoSelect);
    }
    if (removeBtn) {
        removeBtn.addEventListener('click', handleRemoveLesionPhoto);
    }
}

/**
 * Handles the file selection, converts image to Base64, and shows a preview.
 */
async function handleLesionPhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Convert the image file to a format we can save (Base64)
    initialLesionPhotoData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
    
    // Show the preview of the selected image
    document.getElementById('lesion-preview-image').src = initialLesionPhotoData;
    document.getElementById('initial-photo-preview').style.display = 'block';
}

/**
 * Handles removing the selected photo and hiding the preview.
 */
function handleRemoveLesionPhoto() {
    initialLesionPhotoData = null; // Clear the saved photo data
    document.getElementById('initial-lesion-photo-input').value = ''; // Reset the file input
    document.getElementById('initial-photo-preview').style.display = 'none';
    document.getElementById('lesion-preview-image').src = '';
}

/**
 * Set up event listeners for conditional fields
 * Manages the visibility of conditional input fields based on checkbox state
 */
function setupConditionalFields() {
    // Toggle for Traitement Antibiotique Actuel
    const chkAtbActuel = document.getElementById('chk-atb-actuel');
    const atbDetails = document.getElementById('current-atb-details');
    
    if (chkAtbActuel && atbDetails) {
        chkAtbActuel.addEventListener('change', (e) => {
            toggleConditionalField(atbDetails, e.target.checked);
            
            // Clear fields if unchecked
            if (!e.target.checked) {
                const typeInput = document.getElementById('input-atb-type');
                const durationInput = document.getElementById('input-atb-duration');
                if (typeInput) typeInput.value = '';
                if (durationInput) durationInput.value = '';
            }
        });
    }

    // Toggle for Inoculation Aquatique (water type)
    const chkInoculation = document.getElementById('chk-entry-inoculation');
    const inoculationDetails = document.getElementById('inoculation-water-details');
    
    if (chkInoculation && inoculationDetails) {
        chkInoculation.addEventListener('change', (e) => {
            toggleConditionalField(inoculationDetails, e.target.checked);
            
            // Clear radio buttons if unchecked
            if (!e.target.checked) {
                document.querySelectorAll('input[name="water-type"]').forEach(radio => {
                    radio.checked = false;
                });
            }
        });
    }

    // Toggle for Autre Porte d'Entrée
    const chkEntryAutre = document.getElementById('chk-entry-autre');
    const entryAutreDetails = document.getElementById('entry-other-details');
    
    if (chkEntryAutre && entryAutreDetails) {
        chkEntryAutre.addEventListener('change', (e) => {
            toggleConditionalField(entryAutreDetails, e.target.checked);
            
            // Clear field if unchecked
            if (!e.target.checked) {
                const detailsInput = document.getElementById('input-entry-other-details');
                if (detailsInput) detailsInput.value = '';
            }
        });
    }
}

/**
 * Helper function to toggle conditional field visibility with animation
 * @param {HTMLElement} element - The element to show/hide
 * @param {boolean} show - Whether to show or hide the element
 */
function toggleConditionalField(element, show) {
    if (!element) return;
    
    if (show) {
        element.style.display = 'block';
        // Trigger reflow for animation
        element.offsetHeight;
        element.classList.add('visible');
    } else {
        element.classList.remove('visible');
        // Wait for animation to complete before hiding
        setTimeout(() => {
            element.style.display = 'none';
        }, 300);
    }
}

/**
 * Set up event listeners for action buttons
 */
function setupActionButtons() {
    const saveBtn = document.getElementById('save-patient-btn');
    const continueBtn = document.getElementById('continue-assessment-btn');

    if (saveBtn) {
        saveBtn.addEventListener('click', handleSavePatient);
    }

    if (continueBtn) {
        continueBtn.addEventListener('click', handleContinueAssessment);
    }
}

/**
 * Set up form change tracking for auto-save indication
 */
function setupFormChangeTracking() {
    const form = document.getElementById('patient-registration-form');
    
    if (form) {
        form.addEventListener('change', () => {
            // Could add visual indication that form has unsaved changes
            console.log('Form data changed');
        });
    }
}

/**
 * Collect all form data into a structured object that matches the profile page's expectations.
 * @returns {Object} Complete patient data object
 */
function collectFormData() {
    const formData = {
        // Demographics
        nom: document.getElementById('input-nom')?.value.trim() || '',
        prenom: document.getElementById('input-prenom')?.value.trim() || '',
		sexe: document.querySelector('input[name="sexe"]:checked')?.value || null,
        age: parseInt(document.getElementById('input-age')?.value) || null,
        poids: parseFloat(document.getElementById('input-poids')?.value) || null,
        taille: parseFloat(document.getElementById('input-taille')?.value) || null,
        profession: document.getElementById('input-profession')?.value.trim() || '',

        // Medical History
        antecedents: {
            diabete: document.getElementById('chk-diabete')?.checked || false,
            hta: document.getElementById('chk-hta')?.checked || false,
            insuffisanceCardiaque: document.getElementById('chk-insuffisance-cardiaque')?.checked || false,
            insuffisanceRenale: document.getElementById('chk-insuffisance-renale')?.checked || false,
            arteriopathie: document.getElementById('chk-arteriopathie')?.checked || false,
            insuffisanceVeineuse: document.getElementById('chk-insuffisance-veineuse')?.checked || false,
            insuffisanceLymphatique: document.getElementById('chk-insuffisance-lymphatique')?.checked || false,
            immunodepression: document.getElementById('chk-immunodepression')?.checked || false,
            chirurgieRecente: document.getElementById('chk-chirurgie-recente')?.checked || false,
            hospitalisationRecente: document.getElementById('chk-hospitalisation-recente')?.checked || false,
            traitementAntiInflammatoire: document.getElementById('chk-anti-inflammatoire')?.checked || false,
        },
        traitementAntibiotique: {
            actuel: document.getElementById('chk-atb-actuel')?.checked || false,
            type: document.getElementById('chk-atb-actuel')?.checked ? document.getElementById('input-atb-type')?.value.trim() : '',
            dureeJours: document.getElementById('chk-atb-actuel')?.checked ? parseInt(document.getElementById('input-atb-duration')?.value) : null
        },
        nombreRecidives: parseInt(document.getElementById('input-recidive-number')?.value) || 0,

        // Current Presentation
        presentation: {
            initialLesionPhoto: initialLesionPhotoData, // The photo data
            localisationNotes: document.getElementById('localization-notes')?.value.trim() || '',
			selectedRegions: Array.from(selectedRegions),
            porteEntree: {
                intertrigo: document.getElementById('chk-entry-intertrigo')?.checked || false,
                plaie: document.getElementById('chk-entry-plaie')?.checked || false,
                piqureInsecte: document.getElementById('chk-entry-piqure')?.checked || false,
                morsureGriffure: document.getElementById('chk-entry-morsure')?.checked || false,
                inoculationAquatique: document.getElementById('chk-entry-inoculation')?.checked || false,
                typeEau: document.getElementById('chk-entry-inoculation')?.checked ? document.querySelector('input[name="water-type"]:checked')?.value : '',
                autre: document.getElementById('chk-entry-autre')?.checked || false,
                autreDetails: document.getElementById('chk-entry-autre')?.checked ? document.getElementById('input-entry-other-details')?.value.trim() : ''
            },
            symptomes: {
                fievre: document.getElementById('chk-fievre')?.checked || false,
                adenopathie: document.getElementById('chk-adenopathie')?.checked || false
            }
        },

        // Timestamps
        dateCreated: new Date().toISOString()
    };

    // Calculate BMI
    if (formData.poids && formData.taille) {
        const heightInMeters = formData.taille / 100;
        formData.bmi = parseFloat((formData.poids / (heightInMeters * heightInMeters)).toFixed(2));
    }
	
	if (currentPatientId) {
        formData.patientId = currentPatientId;
    }

    return formData;
}

/**
 * Get the value of a selected radio button by name
 * @param {string} name - Radio button group name
 * @returns {string|null} Selected value or null
 */
function getSelectedRadioValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : null;
}

/**
 * Validate form data
 * @param {Object} formData - Patient data to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateForm(formData) {
    const errors = [];

    // Required fields validation
    if (!formData.nom || formData.nom.length === 0) {
        errors.push('Le nom est requis');
    }

    if (!formData.prenom || formData.prenom.length === 0) {
        errors.push('Le prénom est requis');
    }

    if (!formData.age || formData.age <= 0 || formData.age > 150) {
        errors.push('L\'âge doit être un nombre valide entre 1 et 150');
    }

    if (!formData.poids || formData.poids <= 0) {
        errors.push('Le poids doit être un nombre valide supérieur à 0');
    }

    if (!formData.taille || formData.taille <= 0) {
        errors.push('La taille doit être un nombre valide supérieur à 0');
    }

    // Validate antibiotic treatment details if checked
    if (formData.traitementAntibiotique.actuel) {
        if (!formData.traitementAntibiotique.type || formData.traitementAntibiotique.type.length === 0) {
            errors.push('Le type d\'antibiotique est requis si un traitement est en cours');
        }
        if (!formData.traitementAntibiotique.dureeJours || formData.traitementAntibiotique.dureeJours <= 0) {
            errors.push('La durée du traitement antibiotique doit être spécifiée');
        }
    }

    // Validate water type if aquatic inoculation is selected
    if (formData.presentation.porteEntree.inoculationAquatique) {
        if (!formData.presentation.porteEntree.typeEau) {
            errors.push('Le type d\'eau doit être spécifié pour l\'inoculation aquatique');
        }
    }

    // Validate "Autre" details if selected
    if (formData.presentation.porteEntree.autre) {
        if (!formData.presentation.porteEntree.autreDetails || formData.presentation.porteEntree.autreDetails.length === 0) {
            errors.push('Les détails de la porte d\'entrée "Autre" doivent être spécifiés');
        }
    }

    // Check if at least one porte d'entrée is selected
    const porteEntreeSelected = Object.entries(formData.presentation.porteEntree)
        .filter(([key]) => !['typeEau', 'autreDetails'].includes(key))
        .some(([_, value]) => value === true);
    
    if (!porteEntreeSelected) {
        errors.push('Au moins une porte d\'entrée doit être sélectionnée');
    }

    // Display errors if any
    if (errors.length > 0) {
        const errorMessage = 'Erreurs de validation:\n\n' + errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');
        alert(errorMessage);
        return false;
    }

    return true;
}

/**
 * Handle save patient button click
 */
async function handleSavePatient() {
    console.log('Save patient button clicked');

    try {
        // Show loading state
        const saveBtn = document.getElementById('save-patient-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Enregistrement...';
        saveBtn.disabled = true;

        // Collect and validate form data
        const formData = collectFormData();
        
        if (!validateForm(formData)) {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            return;
        }

        // Save or update patient
        let patientId;
        if (currentPatientId) {
            await updatePatient(formData);
            patientId = currentPatientId;
            alert(`✓ Patient mis à jour avec succès!\n\nID: ${patientId}\nNom: ${formData.nom} ${formData.prenom}`);
        } else {
            patientId = await addPatient(formData);
            currentPatientId = patientId;
            alert(`✓ Patient enregistré avec succès!\n\nID: ${patientId}\nNom: ${formData.nom} ${formData.prenom}`);
            
            // Update URL to reflect that we're now editing this patient
            const newUrl = `${window.location.pathname}?patientId=${patientId}`;
            window.history.pushState({ patientId }, '', newUrl);
        }

        // Reset button state
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;

        console.log('Patient saved successfully:', patientId);

    } catch (error) {
        console.error('Error saving patient:', error);
        alert(`❌ Erreur lors de l'enregistrement du patient:\n\n${error.message}`);
        
        // Reset button state
        const saveBtn = document.getElementById('save-patient-btn');
        saveBtn.textContent = 'Enregistrer Patient';
        saveBtn.disabled = false;
    }
}

/**
 * Handle continue to assessment button click
 */
async function handleContinueAssessment() {
    console.log('Continue to assessment button clicked');

    try {
        // Show loading state
        const continueBtn = document.getElementById('continue-assessment-btn');
        const originalText = continueBtn.textContent;
        continueBtn.textContent = 'Enregistrement...';
        continueBtn.disabled = true;

        // Collect and validate form data
        const formData = collectFormData();
        
        if (!validateForm(formData)) {
            continueBtn.textContent = originalText;
            continueBtn.disabled = false;
            return;
        }

        // Save or update patient
        let patientId;
        if (currentPatientId) {
            await updatePatient(formData);
            patientId = currentPatientId;
        } else {
            patientId = await addPatient(formData);
            currentPatientId = patientId;
        }

        console.log('Patient saved, navigating to assessment:', patientId);

        // Store patient ID in localStorage for the assessment page
        localStorage.setItem('currentPatientId', patientId);

        // Navigate to assessment page
        window.location.href = `/assessment.html?patientId=${patientId}`;

    } catch (error) {
        console.error('Error saving patient:', error);
        alert(`❌ Erreur lors de l'enregistrement du patient:\n\n${error.message}`);
        
        // Reset button state
        const continueBtn = document.getElementById('continue-assessment-btn');
        continueBtn.textContent = originalText;
        continueBtn.disabled = false;
    }
}

/**
 * Load existing patient data into the form
 * @param {number} patientId - ID of the patient to load
 */
async function loadPatientData(patientId) {
    console.log('Loading patient data for ID:', patientId);

    try {
        const patientData = await getPatient(patientId);
        
        if (!patientData) {
            alert('Patient non trouvé');
            return;
        }

        // Populate demographics
        document.getElementById('input-nom').value = patientData.nom || '';
        document.getElementById('input-prenom').value = patientData.prenom || '';
        document.getElementById('input-age').value = patientData.age || '';
        document.getElementById('input-poids').value = patientData.poids || '';
        document.getElementById('input-taille').value = patientData.taille || '';
        document.getElementById('input-profession').value = patientData.profession || '';

        // Populate antecedents
        if (patientData.antecedents) {
            Object.entries(patientData.antecedents).forEach(([key, value]) => {
                const checkbox = document.getElementById(`chk-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
                if (checkbox) {
                    checkbox.checked = value;
                }
            });
        }

        // Populate antibiotic treatment
        if (patientData.traitementAntibiotique) {
            const chkAtb = document.getElementById('chk-atb-actuel');
            if (chkAtb) {
                chkAtb.checked = patientData.traitementAntibiotique.actuel;
                if (patientData.traitementAntibiotique.actuel) {
                    document.getElementById('current-atb-details').style.display = 'block';
                    document.getElementById('input-atb-type').value = patientData.traitementAntibiotique.type || '';
                    document.getElementById('input-atb-duration').value = patientData.traitementAntibiotique.dureeJours || '';
                }
            }
        }

        // Populate recurrence
        document.getElementById('input-recidive-number').value = patientData.nombreRecidives || 0;

        // Populate presentation data
        if (patientData.presentation) {
            document.getElementById('localization-notes').value = patientData.presentation.localisationNotes || '';

            // Populate porte d'entrée
            if (patientData.presentation.porteEntree) {
                const pe = patientData.presentation.porteEntree;
                
                document.getElementById('chk-entry-intertrigo').checked = pe.intertrigo || false;
                document.getElementById('chk-entry-plaie').checked = pe.plaie || false;
                document.getElementById('chk-entry-piqure').checked = pe.piqureInsecte || false;
                document.getElementById('chk-entry-morsure').checked = pe.morsureGriffure || false;
                
                const chkInoculation = document.getElementById('chk-entry-inoculation');
                chkInoculation.checked = pe.inoculationAquatique || false;
                if (pe.inoculationAquatique && pe.typeEau) {
                    document.getElementById('inoculation-water-details').style.display = 'block';
                    const radioButton = document.getElementById(`radio-eau-${pe.typeEau}`);
                    if (radioButton) {
                        radioButton.checked = true;
                    }
                }

                const chkAutre = document.getElementById('chk-entry-autre');
                chkAutre.checked = pe.autre || false;
                if (pe.autre && pe.autreDetails) {
                    document.getElementById('entry-other-details').style.display = 'block';
                    document.getElementById('input-entry-other-details').value = pe.autreDetails;
                }
            }

            // Populate symptoms
            if (patientData.presentation.symptomes) {
                document.getElementById('chk-fievre').checked = patientData.presentation.symptomes.fievre || false;
                document.getElementById('chk-adenopathie').checked = patientData.presentation.symptomes.adenopathie || false;
            }
        }

        console.log('Patient data loaded successfully');

    } catch (error) {
        console.error('Error loading patient data:', error);
        alert(`Erreur lors du chargement des données du patient:\n\n${error.message}`);
    }
}

// Initialize form when DOM is ready
document.addEventListener('DOMContentLoaded', initializeForm);

// Export functions for testing or external use
export {
    initializeForm,
    collectFormData,
    validateForm,
    handleSavePatient,
    handleContinueAssessment

};

