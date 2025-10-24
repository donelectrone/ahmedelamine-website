/* ========================================
   DHBNN PWA - Assessment Logic Module
   Clinical Decision Tree Implementation
   ======================================== */

// Import data store functions
import { getPatient, updatePatient } from './data-store.js';

import { getParamFromUrl } from './utils.js';

// At the top of assessment-logic.js
import { scheduleFollowUpNotification } from './notification-manager.js';

// Module-level variables
let currentPatientId = null;
let currentPatientData = null;

/**
 * Initialize the assessment page
 * Main entry point called by main.js
 */
export async function initializeAssessmentPage() {
    console.log('Initializing assessment page...');

    try {
        // Show loading overlay
        showLoadingOverlay(true);

        // Step 1: Get patient ID from URL
        currentPatientId = parseInt(getParamFromUrl('patientId'), 10);
        
        if (!currentPatientId) {
            throw new Error('Patient ID not found in URL');
        }

        // Step 2: Load patient data
        currentPatientData = await getPatient(currentPatientId);
        
        if (!currentPatientData) {
            throw new Error(`Patient with ID ${currentPatientId} not found`);
        }

        // Step 3: Display patient information
        displayPatientInfo(currentPatientData);

        // Step 4: Load existing assessment if available
        loadExistingAssessment(currentPatientData);

        // Step 5: Set up event listeners
        setupEventListeners();

        // Step 6: Initial evaluation
        evaluateAssessment();

        // Hide loading overlay
        showLoadingOverlay(false);

        console.log('Assessment page initialized successfully');

    } catch (error) {
        console.error('Error initializing assessment page:', error);
        showLoadingOverlay(false);
        alert(`Erreur lors du chargement de l'évaluation:\n\n${error.message}`);
        
        // Redirect back to patient list
        setTimeout(() => {
            window.location.href = 'patient-list.html';
        }, 2000);
    }
}



/**
 * Display patient information in the header
 * @param {Object} patientData - Patient data object
 */
function displayPatientInfo(patientData) {
    const patientNameDisplay = document.getElementById('patient-name-display');
    const patientDetailsDisplay = document.getElementById('patient-details-display');
    
    if (patientNameDisplay) {
        const fullName = `${patientData.nom || ''} ${patientData.prenom || ''}`.trim();
        patientNameDisplay.textContent = fullName || 'Patient Inconnu';
    }

    if (patientDetailsDisplay) {
        const details = [];
        if (patientData.age) details.push(`${patientData.age} ans`);
        if (patientData.bmi) details.push(`IMC: ${patientData.bmi}`);
        if (patientData.dateCreated) {
            const date = new Date(patientData.dateCreated);
            details.push(`Enregistré: ${date.toLocaleDateString('fr-FR')}`);
        }
        patientDetailsDisplay.textContent = details.join(' • ');
    }
}

/**
 * Load existing assessment data if available
 * @param {Object} patientData - Patient data object
 */
function loadExistingAssessment(patientData) {
    if (!patientData.assessment) return;

    const assessment = patientData.assessment;

    // Load severity signs
    if (assessment.severitySigns) {
        document.getElementById('chk-sepsis').checked = assessment.severitySigns.sepsis || false;
        document.getElementById('chk-intense-pain').checked = assessment.severitySigns.intensePain || false;
        document.getElementById('chk-local-severity').checked = assessment.severitySigns.localSeverity || false;
        document.getElementById('chk-rapid-extension').checked = assessment.severitySigns.rapidExtension || false;
    }

    // Load hospitalization criteria
    if (assessment.hospitalizationCriteria) {
        document.getElementById('chk-comorbidity').checked = assessment.hospitalizationCriteria.comorbidity || false;
        document.getElementById('chk-morbid-obesity').checked = assessment.hospitalizationCriteria.morbidObesity || false;
        document.getElementById('chk-long-term-meds').checked = assessment.hospitalizationCriteria.longTermMeds || false;
        document.getElementById('chk-social-context').checked = assessment.hospitalizationCriteria.socialContext || false;
        document.getElementById('chk-diagnostic-doubt').checked = assessment.hospitalizationCriteria.diagnosticDoubt || false;
    }

    console.log('Existing assessment data loaded');
}

/**
 * Set up event listeners for all interactive elements
 */
function setupEventListeners() {
    // Severity checkboxes
    const severityCheckboxes = document.querySelectorAll('.severity-checkbox');
    severityCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', evaluateAssessment);
    });

    // Hospitalization checkboxes
    const hospitalizationCheckboxes = document.querySelectorAll('.hospitalization-checkbox');
    hospitalizationCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', evaluateAssessment);
    });

    // Confirm treatment button
    const confirmBtn = document.getElementById('confirm-treatment-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', saveAssessment);
    }

    // Back to list button
    const backBtn = document.getElementById('back-to-patient-list-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'patient-list.html';
        });
    }

    console.log('Event listeners attached');
}

/**
 * Core assessment evaluation function - implements DHBNN decision tree
 * Called whenever any checkbox changes
 */
function evaluateAssessment() {
    console.log('Evaluating assessment...');

    // Step 1: Check for severity signs
    const hasSeveritySigns = checkSeveritySigns();

    // Step 2: Display severity outcome
    displaySeverityOutcome(hasSeveritySigns);

    // Step 3: Check hospitalization criteria (only if no severity signs)
    let needsHospitalization = false;
    if (!hasSeveritySigns) {
        needsHospitalization = checkHospitalizationCriteria();
    }

    // Step 4: Determine and display final treatment recommendation
    displayTreatmentRecommendation(hasSeveritySigns, needsHospitalization);
}

/**
 * Check if any severity signs are present
 * @returns {boolean} True if any severity sign is checked
 */
function checkSeveritySigns() {
    const sepsis = document.getElementById('chk-sepsis')?.checked || false;
    const intensePain = document.getElementById('chk-intense-pain')?.checked || false;
    const localSeverity = document.getElementById('chk-local-severity')?.checked || false;
    const rapidExtension = document.getElementById('chk-rapid-extension')?.checked || false;

    return sepsis || intensePain || localSeverity || rapidExtension;
}

/**
 * Check if any hospitalization criteria are met
 * @returns {boolean} True if any criterion is checked
 */
function checkHospitalizationCriteria() {
    const comorbidity = document.getElementById('chk-comorbidity')?.checked || false;
    const morbidObesity = document.getElementById('chk-morbid-obesity')?.checked || false;
    const longTermMeds = document.getElementById('chk-long-term-meds')?.checked || false;
    const socialContext = document.getElementById('chk-social-context')?.checked || false;
    const diagnosticDoubt = document.getElementById('chk-diagnostic-doubt')?.checked || false;

    return comorbidity || morbidObesity || longTermMeds || socialContext || diagnosticDoubt;
}

/**
 * Displays the severity assessment outcome using the EXACT original medical text.
 * @param {boolean} hasSeveritySigns - Whether severity signs are present
 */
function displaySeverityOutcome(hasSeveritySigns) {
    const outcomeDiv = document.getElementById('severity-outcome');
    const hospitalizationSection = document.getElementById('hospitalization-criteria');
    if (!outcomeDiv) return;

    if (hasSeveritySigns) {
        // --- THIS BLOCK NOW USES YOUR EXACT TEXT ---
        outcomeDiv.className = 'outcome-display severity-alert';
        outcomeDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 3rem;">🚨</div>
                <div>
                    <h3 style="color: var(--danger-color); margin: 0 0 8px 0; font-size: 1.3rem;">
                        Présence de Signes de Gravité
                    </h3>
                    <p style="margin: 0; font-weight: 600;">
                        Suspicion de DHBN-FN
                    </p>
                </div>
            </div>
            <div style="background: rgba(255, 255, 255, 0.8); padding: 15px; border-radius: 8px; margin-top: 15px;">
                <ul style="margin: 0; padding-left: 20px; list-style: none; font-size: 1.1rem; font-weight: 600; line-height: 2.0;">
                    <li style="position: relative; padding-left: 25px;">
                        <span style="position: absolute; left: 0;">→</span>
                        Hospitalisation en réanimation
                    </li>
                    <li style="position: relative; padding-left: 25px;">
                        <span style="position: absolute; left: 0;">→</span>
                        Urgence médico-chirurgicale
                    </li>
                </ul>
            </div>
        `;

        if (hospitalizationSection) {
            hospitalizationSection.style.display = 'none';
        }

    } else {
        // This part for "no severity" is correct and remains the same.
        outcomeDiv.className = 'outcome-display no-severity';
        outcomeDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 2rem;">✓</div>
                <div>
                    <h3 style="color: var(--success-color); margin: 0 0 5px 0; font-size: 1.1rem;">
                        Absence de Signes de Gravité
                    </h3>
                    <p style="margin: 0; color: var(--text-secondary);">
                        Poursuivre avec les critères d'hospitalisation.
                    </p>
                </div>
            </div>
        `;

        if (hospitalizationSection) {
            hospitalizationSection.style.display = 'block';
        }
    }
}

/**
 * Determines and displays the final, detailed treatment recommendation
 * by analyzing patient data for all "Cas Particuliers".
 * @param {boolean} hasSeveritySigns - Whether severity signs are present
 * @param {boolean} needsHospitalization - Whether hospitalization criteria are met
 */
function displayTreatmentRecommendation(hasSeveritySigns, needsHospitalization) {
    const recommendationDiv = document.getElementById('treatment-recommendation');
    if (!recommendationDiv) return;

    // This is the core data object for our "smart" engine.
    const patient = currentPatientData;

    let recommendation = {
        title: '',
        settingIcon: '',
        primaryAntibiotic: [],
        alternativeAntibiotic: [],
        specialNotes: [],
        duration: "7 jours",
        mesures: [
            "Repos au lit avec surélévation du membre atteint",
            "Traitement de la porte d’entrée",
            "Antalgiques si besoin (paracétamol)",
            "Arrêt total des AINS",
            "Surveillance quotidienne de la fièvre et des signes locaux"
        ]
    };

    // === START OF DECISION TREE LOGIC ===

    if (hasSeveritySigns) {
        // --- SEVERE CASE (DHBN-FN) ---
        recommendation.title = "URGENCE MÉDICO-CHIRURGICALE";
        recommendation.settingIcon = '🚨';
        recommendation.primaryAntibiotic.push("Hospitalisation en réanimation");
        recommendation.primaryAntibiotic.push("Prise en charge médico-chirurgicale");
        recommendation.mesures.unshift("Avis chirurgical immédiat et exploration");

    } else {
        const isHospitalized = needsHospitalization;
        recommendation.title = isHospitalized ? "TRAITEMENT À L'HÔPITAL" : "TRAITEM'ENT AMBULATOIRE";
        recommendation.settingIcon = isHospitalized ? '🏥' : '🏠';

        // --- STANDARD TREATMENT (Base case) ---
        const amoxDosage = `Amoxicilline 50 mg/kg/j (max 6 g/j)`;
        const pristinaDosage = `Pristinamycine 1g x 3/jour`;
        recommendation.primaryAntibiotic.push(amoxDosage);
        recommendation.alternativeAntibiotic.push(pristinaDosage);

        // --- CHECK FOR "CAS PARTICULIERS" (Exceptions) ---

        // 1. Morsure, Griffure, Piqûre
        if (patient.presentation.porteEntree.morsureGriffure || patient.presentation.porteEntree.piqureInsecte) {
            recommendation.primaryAntibiotic = ["Amoxicilline – Acide Clavulanique 1g/8h"];
            recommendation.alternativeAntibiotic = ["Doxycycline 100mg/12h"];
            recommendation.duration = "5 jours";
            recommendation.specialNotes.push("Couverture contre Pasteurella multocida.");
        }

        // 2. Inoculation Aquatique
        if (patient.presentation.porteEntree.inoculationAquatique) {
            if (patient.presentation.porteEntree.typeEau === 'douce') {
                recommendation.primaryAntibiotic = ["Doxycycline 100mg/12h + Ciprofloxacine 500mg/12h"];
                recommendation.alternativeAntibiotic = [];
                recommendation.specialNotes.push("Couverture contre Aeromonas spp.");
            } else if (patient.presentation.porteEntree.typeEau === 'mer') {
                recommendation.primaryAntibiotic = ["Doxycycline 100mg/12h + Cefotaxime 2g/8h (ou Ceftriaxone 2g/24h)"];
                recommendation.alternativeAntibiotic = [];
                recommendation.specialNotes.push("Couverture contre Vibrio spp.");
            }
        }

        // 3. Patient Diabétique (avec IPPD - Infection de Plaie du Pied Diabétique)
        // Note: We assume any "plaie" in a diabetic is an IPPD for this logic.
        if (patient.antecedents.diabete && patient.presentation.porteEntree.plaie) {
            recommendation.specialNotes.push("Patient diabétique avec plaie (IPPD) : Schéma thérapeutique adapté.");
            // This would require knowing the age of the wound, which we don't collect.
            // We will use the more severe case as a default.
            recommendation.primaryAntibiotic = ["Amoxicilline – Acide Clavulanique 1-2g/8h"];
            recommendation.alternativeAntibiotic = ["Ceftriaxone 1g/j + Metronidazole 500mg/8h (si allergie non grave)"];
            recommendation.duration = "10-14 jours";
            recommendation.specialNotes.push("Si allergie grave à la pénicilline : Avis infectiologique requis.");
        }

        // 4. Sujet Obèse
        if (patient.bmi && patient.bmi >= 30) {
            // We can't calculate the exact dose here, but we can add a warning.
            recommendation.specialNotes.push("Patient obèse : Adapter la posologie au poids ajusté.");
        }
        
        // 5. Artériopathie
        if (patient.antecedents.arteriopathie) {
            recommendation.specialNotes.push("Artériopathie : Majoration de la posologie à envisager.");
        }

        // 6. Insuffisance Rénale
        if (patient.antecedents.insuffisanceRenale) {
            recommendation.specialNotes.push("Insuffisance rénale : Adaptation posologique selon la clairance de la créatinine est nécessaire.");
        }
    }

    // === END OF DECISION TREE LOGIC ===


    // --- Build the final HTML to display the recommendation ---
    let html = `
        <div class="treatment-card ${needsHospitalization || hasSeveritySigns ? 'hospital-treatment' : ''}">
            <div class="treatment-header ${needsHospitalization || hasSeveritySigns ? 'hospital' : ''}">
                <span style="font-size: 1.5rem;">${recommendation.settingIcon}</span>
                <span>${recommendation.title}</span>
            </div>
            
            <div class="treatment-section">
                <div class="treatment-section-title">Antibiothérapie Recommandée:</div>
                <div class="treatment-section-content">
                    <strong>1ère intention:</strong> ${recommendation.primaryAntibiotic.join('<br>')}
                    ${recommendation.alternativeAntibiotic.length > 0 ? `<br><strong>Alternative (si allergie):</strong> ${recommendation.alternativeAntibiotic.join('<br>')}` : ''}
                </div>
            </div>

            <div class="treatment-section">
                <div class="treatment-section-title">Durée du Traitement:</div>
                <div class="treatment-section-content">${recommendation.duration}</div>
            </div>

            ${recommendation.specialNotes.length > 0 ? `
            <div class="treatment-section">
                <div class="treatment-section-title" style="color: var(--warning-color);">⚠️ Notes Spécifiques:</div>
                <ul class="treatment-list" style="color: var(--warning-color);">
                    ${recommendation.specialNotes.map(note => `<li>${note}</li>`).join('')}
                </ul>
            </div>
            ` : ''}

            <div class="treatment-section">
                <div class="treatment-section-title">Mesures d'Accompagnement:</div>
                <ul class="treatment-list">
                    ${recommendation.mesures.map(mesure => `<li>${mesure}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    recommendationDiv.innerHTML = html;
}
/**
 * Save the assessment results to the patient record
 */
async function saveAssessment() {
    console.log('Saving assessment...');

    try {
        // Show loading state
        const confirmBtn = document.getElementById('confirm-treatment-btn');
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = 'Enregistrement...';
        confirmBtn.disabled = true;

        // --- FIX IS HERE ---
        // Step 1: Calculate all conditions BEFORE building the object.
        const hasSeveritySigns = checkSeveritySigns();
        const needsHospitalization = checkHospitalizationCriteria();
        const treatmentSetting = (hasSeveritySigns || needsHospitalization) ? 'hospital' : 'ambulatory';
        const currentStatus = hasSeveritySigns ? 'severe' : (needsHospitalization ? 'hospitalized' : 'ambulatory');

        // Step 2: Now, build the assessmentData object using the pre-calculated variables.
        const assessmentData = {
            dateAssessed: new Date().toISOString(),
            
            severitySigns: {
                sepsis: document.getElementById('chk-sepsis')?.checked || false,
                intensePain: document.getElementById('chk-intense-pain')?.checked || false,
                localSeverity: document.getElementById('chk-local-severity')?.checked || false,
                rapidExtension: document.getElementById('chk-rapid-extension')?.checked || false,
                hasSeveritySigns: hasSeveritySigns // Use the variable
            },

            hospitalizationCriteria: {
                comorbidity: document.getElementById('chk-comorbidity')?.checked || false,
                morbidObesity: document.getElementById('chk-morbid-obesity')?.checked || false,
                longTermMeds: document.getElementById('chk-long-term-meds')?.checked || false,
                socialContext: document.getElementById('chk-social-context')?.checked || false,
                diagnosticDoubt: document.getElementById('chk-diagnostic-doubt')?.checked || false,
                needsHospitalization: needsHospitalization // Use the variable
            },

            treatmentPlan: {
                setting: treatmentSetting, // Use the variable
                isUrgent: hasSeveritySigns, // Use the variable
                primaryAntibiotic: 'Amoxicilline 1g x 3/jour',
                alternativeAntibiotic: 'Pristinamycine 1g x 3/jour',
                duration: '7 jours minimum',
                followUpRequired: true,
                followUpDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48h from now
            }
        };

        // Update patient record
        const updatedPatientData = {
            ...currentPatientData,
            assessment: assessmentData,
            status: currentStatus, // Update the top-level status
            lastModified: new Date().toISOString()
        };
        // --- END OF FIX ---

        await updatePatient(updatedPatientData);

        console.log('Assessment saved successfully');
		
			// Schedule the notification if it's not a severe emergency case
		if (!assessmentData.treatmentPlan.isUrgent) {
			const patientName = `${currentPatientData.nom} ${currentPatientData.prenom}`;
			// For testing, you can schedule it for 10 seconds (10 * 1000)
			// For production, use 48 * 60 * 60 * 1000
			const delay = 10 * 1000; // 10 SECONDS FOR TESTING
			await scheduleFollowUpNotification(currentPatientId, patientName, delay);
		}

        // Show success message
        alert(`✓ Évaluation enregistrée avec succès!\n\nTraitement: ${assessmentData.treatmentPlan.setting === 'hospital' ? 'Hospitalisation' : 'Ambulatoire'}\n\nSuivi programmé dans 48h.`);

        // Navigate to patient profile
        window.location.href = `patient-profile.html?patientId=${currentPatientId}`;

    } catch (error) {
        console.error('Error saving assessment:', error);
        alert(`❌ Erreur lors de l'enregistrement:\n\n${error.message}`);

        // Reset button state
        const confirmBtn = document.getElementById('confirm-treatment-btn');
        confirmBtn.textContent = 'Confirmer & Programmer Suivi 48h';
        confirmBtn.disabled = false;
    }
}

/**
 * Show or hide the loading overlay
 * @param {boolean} show - Whether to show or hide the overlay
 */
function showLoadingOverlay(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Export functions for use by main.js
export {
    evaluateAssessment,
    saveAssessment
};