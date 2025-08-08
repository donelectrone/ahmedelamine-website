document.addEventListener('DOMContentLoaded', () => {

  // --- CONFIG & STATE ---
  const STORAGE_KEY = 'saas_auditor_v7';
  let subscriptions = [];
  let currentSort = 'date';
  let currentFilter = 'all';
  
  // --- DOM SELECTORS ---
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  const elements = {
    app: $('#app'), // Used for theme handling
    totalMonthlySpend: $('#totalMonthlySpend'),
    totalAnnualSpend: $('#totalAnnualSpend'),
    potentialSavings: $('#potentialSavings'),
    subscriptionList: $('#subscriptionList'),
    emptyState: $('#emptyState'),
    sortBtn: $('#sortBtn'),
    filterBtn: $('#filterBtn'),
    modal: $('#addSubscriptionModal'),
    modalTitle: $('#modalTitle'),
    modalSubcategoryDescription: $('#modalSubcategoryDescription'),
    subscriptionForm: $('#subscriptionForm'),
    subscriptionName: $('#subscriptionName'),
    subscriptionCost: $('#subscriptionCost'),
    costPeriodToggle: $('#costPeriodToggle'),
    decisionGroup: $('#decision-group'),
    formCategory: $('#formCategory'),
    formSubcategory: $('#formSubcategory'),
    cancelModalBtn: $('#cancelModalBtn'),
    themeToggle: $('#themeToggle'),
    themeIcon: $('#themeIcon'),
  };

  // --- UTILITIES & CORE LOGIC ---
  const formatCurrency = (amount) => Number(amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const saveToLocalStorage = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
  const loadFromLocalStorage = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const getMonthlyCost = (sub) => (sub.period === 'year' ? (sub.cost || 0) / 12 : (sub.cost || 0));

  // --- RENDER FUNCTIONS ---
  const renderKPIs = () => {
    const totalMonthly = subscriptions.reduce((sum, sub) => sum + getMonthlyCost(sub), 0);
    elements.totalMonthlySpend.textContent = formatCurrency(totalMonthly);
    elements.totalAnnualSpend.textContent = formatCurrency(totalMonthly * 12);
    const potentialSavings = subscriptions.reduce((sum, sub) => sum + (sub.decision === 'Cut' ? getMonthlyCost(sub) * 12 : 0), 0);
    elements.potentialSavings.textContent = formatCurrency(potentialSavings);
  };

  const highlightMemoryJoggerChips = () => {
    const usedSubcategories = new Set(subscriptions.map(s => s.subcategory));
    $$('.chip').forEach(chip => chip.classList.toggle('highlighted', usedSubcategories.has(chip.dataset.subcategory)));
  };

  const renderSubscriptionList = () => {
    let processedSubs = [...subscriptions];
    if (currentFilter === 'cut') {
      processedSubs = processedSubs.filter(sub => sub.decision === 'Cut');
    }
    processedSubs.sort(currentSort === 'cost' ? (a, b) => getMonthlyCost(b) - getMonthlyCost(a) : (a, b) => b.id - a.id);

    if (processedSubs.length === 0) {
      const message = currentFilter === 'cut' ? "No subscriptions are marked to 'Cut'." : "Click a subcategory to add your first subscription.";
      elements.emptyState.innerHTML = `<p>${message}</p>`;
      elements.subscriptionList.innerHTML = '';
      elements.subscriptionList.appendChild(elements.emptyState);
      elements.emptyState.style.display = 'block';
      return;
    }

    elements.emptyState.style.display = 'none';
    elements.subscriptionList.innerHTML = processedSubs.map(sub => {
      const monthlyCost = getMonthlyCost(sub);
      const yearlyCost = monthlyCost * 12;
      const priceHTML = sub.period === 'month' 
        ? `<strong>${formatCurrency(monthlyCost)}/mo</strong> <span class="muted-price">(${formatCurrency(yearlyCost)}/yr)</span>`
        : `<strong>${formatCurrency(yearlyCost)}/yr</strong> <span class="muted-price">(${formatCurrency(monthlyCost)}/mo)</span>`;

      const badgeClass = sub.decision.toLowerCase();
      const badgeHTML = `<span class="badge ${badgeClass}">${sub.decision}</span>`;

      return `
        <div class="sub-item" data-id="${sub.id}">
          <div class="meta">
            <div class="avatar">${sub.name.slice(0, 2).toUpperCase()}</div>
            <div class="info">
              <div class="name">${sub.name}</div>
              <div class="sub">${sub.category} &bull; ${sub.subcategory}</div>
            </div>
          </div>
          <div class="right">
            ${badgeHTML}
            <div class="price">${priceHTML}</div>
            <button class="trash" data-id="${sub.id}" title="Remove">🗑️</button>
          </div>
        </div>`;
    }).join('');

    elements.subscriptionList.querySelectorAll('.trash').forEach(button => {
        button.addEventListener('click', () => {
            const id = parseInt(button.dataset.id, 10);
            handleDeleteClick(id);
        });
    });
  };

  const rerenderAll = () => {
    renderKPIs(); 
    renderSubscriptionList();
    highlightMemoryJoggerChips();
  };

  // --- EVENT HANDLERS ---
  const handleSortClick = () => {
    currentSort = currentSort === 'date' ? 'cost' : 'date';
    elements.sortBtn.textContent = currentSort === 'cost' ? "Sort by Date" : "Sort by Cost";
    elements.sortBtn.classList.toggle('active', currentSort === 'cost');
    renderSubscriptionList();
  };

  const handleFilterClick = () => {
    currentFilter = currentFilter === 'all' ? 'cut' : 'all';
    elements.filterBtn.textContent = currentFilter === 'cut' ? "Show All" : "Filter 'Cut' Only";
    elements.filterBtn.classList.toggle('active', currentFilter === 'cut');
    renderSubscriptionList();
  };
  
  const openModal = (chipElement) => {
    elements.subscriptionForm.reset();
    $$('#decision-group .choice-button').forEach(btn => btn.classList.remove('selected'));
    $('#decision-group .choice-button[data-value="Keep"]').classList.add('selected');
    elements.costPeriodToggle.dataset.period = 'month';
    elements.costPeriodToggle.textContent = '/month';
    
    const category = chipElement.dataset.category;
    const subcategory = chipElement.dataset.subcategory;
    const description = chipElement.dataset.description;

    elements.modalTitle.textContent = `Add to: ${subcategory}`;
    elements.modalSubcategoryDescription.textContent = description || '';
    elements.formCategory.value = category;
    elements.formSubcategory.value = subcategory;
    elements.modal.style.display = 'flex';
    elements.subscriptionName.focus();
  };

  const closeModal = () => elements.modal.style.display = 'none';

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const cost = parseFloat(elements.subscriptionCost.value);
    const selectedDecision = elements.decisionGroup.querySelector('.selected')?.dataset.value;

    if (!elements.subscriptionName.value.trim() || isNaN(cost) || cost < 0 || !selectedDecision) {
      alert('Please fill out all fields with valid values.');
      return;
    }
    const newSubscription = {
      id: Date.now(),
      name: elements.subscriptionName.value.trim(),
      cost: cost,
      period: elements.costPeriodToggle.dataset.period,
      decision: selectedDecision,
      category: elements.formCategory.value,
      subcategory: elements.formSubcategory.value,
    };
    subscriptions.push(newSubscription);
    saveToLocalStorage();
    rerenderAll();
    closeModal();
  };

  const handleDeleteClick = (id) => {
    const subToDelete = subscriptions.find(s => s.id === id);
    if (subToDelete && confirm(`Are you sure you want to remove "${subToDelete.name}"?`)) {
      subscriptions = subscriptions.filter(sub => sub.id !== id);
      saveToLocalStorage();
      rerenderAll();
    }
  };
  
  // --- THEME SWITCHER LOGIC (CORRECTED) ---
  const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      elements.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
      localStorage.setItem('saas_theme', theme);
  };
  
  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  };

  // --- INITIALIZATION ---
  const init = () => {
    // Correctly set initial theme
    const savedTheme = localStorage.getItem('saas_theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }

    // Load subscriptions from local storage
    subscriptions = loadFromLocalStorage();
    
    // Render everything on startup
    rerenderAll();

    // Attach all event listeners
    elements.decisionGroup.addEventListener('click', (e) => {
      if (e.target.matches('.choice-button')) {
        $$('#decision-group .choice-button').forEach(btn => btn.classList.remove('selected'));
        e.target.classList.add('selected');
      }
    });

    $$('.chip').forEach(chip => {
      chip.addEventListener('click', () => openModal(chip));
    });
    
    elements.sortBtn.addEventListener('click', handleSortClick);
    elements.filterBtn.addEventListener('click', handleFilterClick);
    elements.subscriptionForm.addEventListener('submit', handleFormSubmit);
    
    elements.costPeriodToggle.addEventListener('click', () => {
        const isMonth = elements.costPeriodToggle.dataset.period === 'month';
        elements.costPeriodToggle.dataset.period = isMonth ? 'year' : 'month';
        elements.costPeriodToggle.textContent = isMonth ? '/year' : '/month';
    });
    
    elements.cancelModalBtn.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (e) => { if (e.target === elements.modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    elements.themeToggle.addEventListener('click', toggleTheme);
  };

  // Run the application
  init();
});
