/* ========================================
   DHBNN PWA - Patient Profile Manager Module
   ======================================== */

// Import data store functions
import { getPatient, updatePatient } from './data-store.js';

import { getPatient, updatePatient, deletePatient } from './data-store.js';

import { getParamFromUrl } from './utils.js';

// Module-level variables
let currentPatientId = null;
let currentPatientData = null;

/**
 * Initialize the patient profile page
 */
export async function initializeProfilePage() {
    console.log('Initializing patient profile page...');
    try {
        showLoadingOverlay(true);
        // Change it to this:
		currentPatientId = parseInt(getParamFromUrl('patientId'), 10);
        if (!currentPatientId) throw new Error('Patient ID not found in URL');

        currentPatientData = await getPatient(currentPatientId);
        if (!currentPatientData) throw new Error(`Patient with ID ${currentPatientId} not found`);

        renderPatientHeader(currentPatientData);
        renderPatientSummary(currentPatientData);
        renderInitialTreatment(currentPatientData);
        renderEvolutionAssessment(currentPatientData);
        renderPhotoGallery(currentPatientData);
        renderComplicationsManagement(currentPatientData);
        renderPreventionRecommendations(currentPatientData);
        setupEventListeners();

        showLoadingOverlay(false);
        console.log('Patient profile page initialized successfully');
    } catch (error) {
        console.error('Error initializing profile page:', error);
        showLoadingOverlay(false);
        alert(`Erreur lors du chargement du profil:\n\n${error.message}`);
        window.location.href = 'patient-list.html';
    }
}


function renderPatientHeader(patientData) {
    const display = document.getElementById('patient-name-display');
    if (display) {
        display.textContent = `${patientData.nom || ''} ${patientData.prenom || ''}`.trim();
    }
}

/**
 * Renders the patient summary section, now including the initial lesion photo.
 * @param {Object} patientData - Patient data object
 */
function renderPatientSummary(patientData) {
    const summaryDisplay = document.getElementById('patient-summary-display');
    if (!summaryDisplay) return;

    // --- NEW LOGIC FOR DISPLAYING THE PHOTO ---
    // Check if an initial lesion photo exists in the patient's data.
    let photoHtml = '';
    if (patientData.presentation && patientData.presentation.initialLesionPhoto) {
        photoHtml = `
            <div class="summary-photo">
                <img src="${patientData.presentation.initialLesionPhoto}" alt="Photo initiale de la lésion">
                <div class="photo-caption">Photo Initiale (J0)</div>
            </div>
        `;
    } else {
        // If no photo, show a placeholder.
        photoHtml = `<div class="summary-photo-placeholder">📷</div>`;
    }
    // --- END OF NEW LOGIC ---

    let antecedentsHtml = Object.entries(patientData.antecedents || {})
        .filter(([_, value]) => value)
        .map(([key]) => `<span class="detail-tag">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>`)
        .join(' ');
    if (!antecedentsHtml) antecedentsHtml = '<span style="color: var(--text-secondary);">Aucun</span>';

    // Updated innerHTML to include the photoHtml variable
    summaryDisplay.innerHTML = `
        ${photoHtml}
        <div class="summary-group">
            <div class="summary-group-title">Informations</div>
			<div class="summary-item"><span class="summary-label">Sexe:</span><span class="summary-value">${patientData.sexe || 'N/A'}</span></div>
            <div class="summary-item"><span class="summary-label">Âge:</span><span class="summary-value">${patientData.age || 'N/A'} ans</span></div>
            <div class="summary-item"><span class="summary-label">IMC:</span><span class="summary-value">${patientData.bmi || 'N/A'}</span></div>
            <div class="summary-item"><span class="summary-label">Récidives:</span><span class="summary-value">${patientData.nombreRecidives || 0}</span></div>
        </div>
        <div class="summary-group">
            <div class="summary-group-title">Antécédents & Facteurs de Risque</div>
            <div class="summary-tags">${antecedentsHtml}</div>
        </div>
    `;
}
function renderInitialTreatment(patientData) {
    const display = document.getElementById('initial-treatment-display');
    if (!display) return;
    if (!patientData.assessment?.treatmentPlan) {
        display.innerHTML = '<p class="placeholder-text">Aucune évaluation initiale enregistrée.</p>';
        return;
    }
    const { treatmentPlan, dateAssessed } = patientData.assessment;
    const settingText = treatmentPlan.setting === 'hospital' ? 'Hospitalisation' : 'Ambulatoire';
    display.innerHTML = `
        <p><strong>Date d'évaluation:</strong> ${new Date(dateAssessed).toLocaleString('fr-FR')}</p>
        <p><strong>Plan:</strong> <span style="font-weight:700;">${settingText}</span></p>
    `;
}

function renderEvolutionAssessment(patientData) {
    const controlsDiv = document.getElementById('evolution-assessment-controls');
    const outcomeDiv = document.getElementById('evolution-outcome-display');
    if (!controlsDiv || !outcomeDiv) return;

    if (patientData.followUp?.evolution) {
        controlsDiv.style.display = 'none';
        const isFavorable = patientData.followUp.evolution === 'favorable';
        outcomeDiv.innerHTML = `<div class="evolution-outcome-card ${isFavorable ? 'favorable' : 'unfavorable'}">Évolution <strong>${isFavorable ? 'Favorable' : 'Défavorable'}</strong> enregistrée le ${new Date(patientData.followUp.dateAssessed).toLocaleDateString('fr-FR')}</div>`;
        outcomeDiv.style.display = 'block';
    } else {
        controlsDiv.style.display = 'block';
        outcomeDiv.style.display = 'none';
    }
}

function renderPhotoGallery(patientData) {
    const galleryDiv = document.getElementById('photo-gallery');
    if (!galleryDiv) return;
    if (!patientData.photos || patientData.photos.length === 0) {
        galleryDiv.innerHTML = `<div class="gallery-empty">🖼️<p>Aucune photo de suivi ajoutée.</p></div>`;
        return;
    }
    galleryDiv.innerHTML = patientData.photos.map((photo, index) => `
        <div class="photo-item" data-photo-index="${index}">
            <img src="${photo.imageData}" alt="${photo.description}">
            <div class="photo-info">
                <div class="photo-date">${new Date(photo.date).toLocaleString('fr-FR')}</div>
                <div class="photo-description">${photo.description}</div>
            </div>
            <button class="photo-delete-btn" title="Supprimer">×</button>
        </div>
    `).join('');
}

function renderComplicationsManagement(patientData) {
    const section = document.getElementById('complications-management-section');
    const display = document.getElementById('complications-display');
    if (!section || !display) return;

    if (patientData.followUp?.evolution === 'defavorable') {
        section.style.display = 'block';
        display.innerHTML = `
            <div class="subsection-card">
                <h3>Rechercher</h3>
                <ul class="recommendation-list">
                    <li>Les signes d’alarmes (l’évolution vers la fasciite nécrosantes)</li>
                    <li>Posologie inadéquate ou diffusion inadéquate (oedème, artériopathie)</li>
                    <li>Abcès ou autres complications locales</li>
                    <li>Germe résistant</li>
                </ul>
            </div>
            <div class="subsection-card">
                <h3>Prise en charge</h3>
                <p><strong>Complications générales:</strong></p>
                <ul style="padding-left: 20px; margin-top: 5px; margin-bottom: 15px;">
                    <li><strong>Choc septique ou toxinique:</strong> transfert en réanimation + PEC médico-chirurgicale en cas de DHBN-FN</li>
                    <li><strong>Décompensation d’une comorbidité:</strong> prise en charge spécialisée</li>
                </ul>
                <p><strong>Complications locales:</strong></p>
                <ul style="padding-left: 20px; margin-top: 5px;">
                    <li><strong>Abcès:</strong>
                        <ul style="padding-left: 20px; margin-top: 5px; list-style-type: circle;">
                           <li>Abcès de moins de 0,4 cm de profondeur : tenter un traitement médical</li>
                           <li>Abcès immature au sein d’une dermohypodermite : application de compresses chaudes, pas plus de 36h puis incision</li>
                           <li>Abcès mur (fluctuation) : traitement chirurgical</li>
                           <li>+ Une antibiothérapie antistaphylococcique pour tous les cas jusqu’à 5 jours après le geste chirurgical (cefazoline 80 à 100 mg/kg/j ou pristinamycine 1g/8h ou cotrimoxazole (800/160mg /8 à 12h)).</li>
                        </ul>
                    </li>
                    <li style="margin-top: 10px;"><strong>Nécrose superficielle:</strong> ablation des tissus dévitalisés + antibiothérapie ciblée</li>
                    <li><strong>TVP:</strong> anticoagulation curative + contention élastique dégressive</li>
                    <li><strong>Complications ostéoarticulaires:</strong> prise en charge médico-chirurgicale + adaptation de l’antibiothérapie en fonction des résultats des prélèvements</li>
                </ul>
                <hr style="margin: 15px 0;">
                <p><strong>En cas de germe résistant:</strong> Adaptation de l’antibiothérapie en fonctions des résultats des prélèvements</p>
                <p><strong>Posologie inadéquate:</strong> Adaptation de la posologie (majoration en cas d’artériopathie, décharge pour réduire l’oedème)</p>
            </div>
        `;
    } else {
        section.style.display = 'none';
    }
}

function renderPreventionRecommendations(patientData) {
    const display = document.getElementById('prevention-recommendations-display');
    if (!display) return;
    const requiresProphylaxis = patientData.nombreRecidives >= 2;
    let prophylaxisHtml;
    if (requiresProphylaxis) {
        prophylaxisHtml = `
            <p style="color: var(--danger-color); font-weight: 600;">Antibioprophylaxie indiquée (≥ 2 épisodes au cours des 12 derniers mois):</p>
            <ul style="padding-left: 20px; margin-top: 10px;">
                <li><strong>Benzylpénicilline G retard:</strong> (2,4MUI toutes les 2 à 4 semaines)</li>
                <li><strong>ou Pénicilline V per os:</strong> (1 à 2MUI/j) selon le poids, en 2 prises</li>
                <li><strong>ou Azithromycine:</strong> (250 mg/j) si allergie à la pénicilline</li>
            </ul>
        `;
    } else {
        prophylaxisHtml = `<p>Antibioprophylaxie <strong>non indiquée</strong> pour le moment (moins de 2 épisodes au cours des 12 derniers mois).</p>`;
    }
    display.innerHTML = `
        <div class="subsection-card">
            <h3>Prévention des Récidives</h3>
            <div class="prevention-content">
                <p><strong>Prise en charge des facteurs de risque de DHBNN.</strong></p>
                <p>Antibioprophylaxie si facteurs de risque non contrôlables ou non résolutifs, et à partir de 2 épisodes au cours des 12 derniers mois.</p>
                <div class="treatment-card" style="margin-top: 15px; padding: 15px;">
                    ${prophylaxisHtml}
                </div>
            </div>
        </div>
    `;
    updateCureChecklist(patientData);
}

function updateCureChecklist(patientData) {
    const cureCard = document.querySelector('.cure-card');
    const confirmationDiv = document.getElementById('cure-confirmation');
    if (!cureCard || !confirmationDiv) return;
    if (patientData.status === 'cured') {
        cureCard.style.opacity = '0.6';
        cureCard.style.pointerEvents = 'none';
        confirmationDiv.innerHTML = `<h4 style="color: var(--success-color);">✓ Patient Marqué comme Guéri le ${new Date(patientData.cureDate).toLocaleDateString('fr-FR')}</h4>`;
        confirmationDiv.style.display = 'block';
    } else {
        cureCard.style.opacity = '1';
        cureCard.style.pointerEvents = 'auto';
        confirmationDiv.style.display = 'none';
    }
}

function setupEventListeners() {
    document.getElementById('back-to-list-btn')?.addEventListener('click', () => window.location.href = 'patient-list.html');
	document.getElementById('delete-patient-btn')?.addEventListener('click', handleDeletePatient);
    document.getElementById('edit-patient-btn')?.addEventListener('click', () => window.location.href = `index.html?patientId=${currentPatientId}`);
    document.getElementById('photo-upload-input')?.addEventListener('change', handlePhotoInputChange);
    document.getElementById('upload-photo-btn')?.addEventListener('click', handlePhotoUpload);
    document.querySelectorAll('input[name="evolution"]').forEach(radio => radio.addEventListener('change', () => {
        document.getElementById('validate-evolution-btn').disabled = false;
    }));
    document.getElementById('validate-evolution-btn')?.addEventListener('click', handleEvolutionValidation);
    document.querySelectorAll('.cure-checkbox').forEach(checkbox => checkbox.addEventListener('change', () => {
        document.getElementById('mark-as-cured-btn').disabled = !Array.from(document.querySelectorAll('.cure-checkbox')).every(cb => cb.checked);
    }));
    document.getElementById('mark-as-cured-btn')?.addEventListener('click', handleMarkAsCured);
    document.getElementById('photo-gallery')?.addEventListener('click', e => {
        if (e.target.classList.contains('photo-delete-btn')) {
            deletePhoto(parseInt(e.target.closest('.photo-item').dataset.photoIndex, 10));
        }
    });
}

function handlePhotoInputChange(event) {
    document.getElementById('upload-photo-btn').disabled = !(event.target.files?.length > 0);
}

async function handlePhotoUpload() {
    const photoInput = document.getElementById('photo-upload-input');
    const descriptionInput = document.getElementById('photo-description-input');
    const file = photoInput.files[0];
    if (!file) return;
    try {
        const imageData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
        const photo = { date: new Date().toISOString(), description: descriptionInput.value.trim(), imageData };
        if (!currentPatientData.photos) currentPatientData.photos = [];
        currentPatientData.photos.push(photo);
        await updatePatient(currentPatientData);
        photoInput.value = '';
        descriptionInput.value = '';
        renderPhotoGallery(currentPatientData);
    } catch (error) {
        console.error('Error uploading photo:', error);
    }
}

async function deletePhoto(photoIndex) {
    if (!confirm('Supprimer cette photo ?')) return;
    currentPatientData.photos.splice(photoIndex, 1);
    await updatePatient(currentPatientData);
    renderPhotoGallery(currentPatientData);
}

async function handleEvolutionValidation() {
    const evolution = document.querySelector('input[name="evolution"]:checked')?.value;
    if (!evolution) return;
    currentPatientData.followUp = { dateAssessed: new Date().toISOString(), evolution };
    await updatePatient(currentPatientData);
    renderEvolutionAssessment(currentPatientData);
    renderComplicationsManagement(currentPatientData);
}

async function handleMarkAsCured() {
    if (!confirm('Confirmer la guérison complète du patient ?')) return;
    currentPatientData.status = 'cured';
    currentPatientData.cureDate = new Date().toISOString();
    await updatePatient(currentPatientData);
    renderPreventionRecommendations(currentPatientData);
}

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';

}

async function handleDeletePatient() {
    if (!currentPatientData) return;

    const patientName = `${currentPatientData.nom} ${currentPatientData.prenom}`;
    // Use a double confirmation to prevent accidental deletion
    if (prompt(`Pour confirmer la suppression, veuillez taper le nom complet du patient : "${patientName}"`) !== patientName) {
        alert('La saisie ne correspond pas. Suppression annulée.');
        return;
    }

    try {
        await deletePatient(currentPatientId);
        alert('Patient supprimé avec succès.');
        window.location.href = 'patient-list.html'; // Redirect to the patient list
    } catch (error) {
        console.error('Error deleting patient:', error);
        alert('Une erreur est survenue lors de la suppression du patient.');
    }
}

