// Using an IIFE (Immediately Invoked Function Expression) to avoid polluting the global scope
(() => {
    // --- 1. DOM ELEMENT REFERENCES ---
    // A single object to hold all references to DOM elements for easy access
    const UIElements = {
        views: {
            setup: document.getElementById('setup-screen'),
            swiping: document.getElementById('swiping-screen'),
            ranking: document.getElementById('ranking-screen'),
            handoff: document.getElementById('handoff-screen'),
            results: document.getElementById('results-screen'),
        },
        setup: {
            onePlayerBtn: document.getElementById('one-player-btn'),
            twoPlayerBtn: document.getElementById('two-player-btn'),
            parent1Input: document.getElementById('parent1-name'),
            parent2Input: document.getElementById('parent2-name'),
            genderFilter: document.getElementById('game-gender-filter'),
            letterFilter: document.getElementById('letter-filter-container'),
            startGameBtn: document.getElementById('start-game-btn'),
        },
        swiping: {
            turnIndicator: document.getElementById('turn-indicator'),
            deckContainer: document.getElementById('swipe-deck'),
            cardPlaceholder: document.getElementById('name-card-placeholder'),
            undoBtn: document.getElementById('undo-btn'),
            viewListBtn: document.getElementById('view-list-btn'),
            finishSwipeBtn: document.getElementById('finish-swipe-btn'),
        },
        ranking: {
            choiceA: document.getElementById('choice-a'),
            choiceB: document.getElementById('choice-b'),
            progress: document.getElementById('ranking-progress'),
        },
        handoff: {
            message: document.getElementById('handoff-message'),
            nextPlayerBtn: document.getElementById('next-player-btn'),
        },
        results: {
            subtitle: document.getElementById('results-subtitle'),
            listContainer: document.getElementById('final-list-container'),
            restartBtn: document.getElementById('restart-btn'),
        },
        modal: {
            container: document.getElementById('liked-list-modal'),
            closeBtn: document.querySelector('.close-btn'),
            listUl: document.getElementById('liked-list-ul'),
        }
    };

    // --- 2. STATE MANAGEMENT ---
    // The single source of truth for the application's state
    let state = {
        allNames: [], // This will be populated from names.json
        isTwoPlayer: false,
        parent1: 'الأم',
        parent2: 'الأب',
        currentPlayer: 1,
        deck: [],
        likedNames: { 1: [], 2: [] },
        discardedActions: { 1: [], 2: [] },
        rankedLists: { 1: [], 2: [] },
    };

    // --- 3. DATA FETCHING ---
    /**
     * Loads the names from the external JSON file.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async function loadNames() {
        try {
            const response = await fetch('names.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            state.allNames = await response.json();
            return true;
        } catch (error) {
            console.error("Could not load names database:", error);
            UIElements.swiping.cardPlaceholder.innerHTML = `<p>خطأ فادح: لم نتمكن من تحميل قائمة الأسماء. الرجاء المحاولة مرة أخرى لاحقاً.</p>`;
            return false;
        }
    }

    // --- 4. SETUP AND NAVIGATION ---

    /**
     * Initializes the setup screen, populates filters, and attaches initial event listeners.
     */
    function initializeSetupScreen() {
        const letters = "ابتثجحخدذرزسشصضطظعغفقكلمنهويآ".split('').sort();
		const container = UIElements.setup.letterFilter;
			letters.forEach(letter => {
				const label = document.createElement('label');
				const checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				checkbox.value = letter;
				
				label.appendChild(checkbox);
				label.appendChild(document.createTextNode(letter));
				container.appendChild(label);
			});
			
			const selectAllBtn = document.getElementById('select-all-letters-btn');
			const deselectAllBtn = document.getElementById('deselect-all-letters-btn');
			const allLetterCheckboxes = document.querySelectorAll('#letter-filter-container input[type="checkbox"]');

			selectAllBtn.addEventListener('click', (e) => {
				e.preventDefault(); // Prevent any default button behavior
				allLetterCheckboxes.forEach(checkbox => {
					checkbox.checked = true;
				});
			});

			deselectAllBtn.addEventListener('click', (e) => {
				e.preventDefault(); // Prevent any default button behavior
				allLetterCheckboxes.forEach(checkbox => {
					checkbox.checked = false;
				});
			});

        UIElements.setup.onePlayerBtn.addEventListener('click', () => togglePlayers(false));
        UIElements.setup.twoPlayerBtn.addEventListener('click', () => togglePlayers(true));
        UIElements.setup.startGameBtn.addEventListener('click', startGame);
        UIElements.results.restartBtn.addEventListener('click', () => location.reload());
    }

    /**
     * Toggles the UI between one and two-player modes.
     * @param {boolean} isTwo - True for two players, false for one.
     */
    function togglePlayers(isTwo) {
        state.isTwoPlayer = isTwo;
        UIElements.setup.onePlayerBtn.classList.toggle('active', !isTwo);
        UIElements.setup.twoPlayerBtn.classList.toggle('active', isTwo);
        UIElements.setup.parent2Input.style.display = isTwo ? 'inline-block' : 'none';
    }

    /**
     * Hides all views and shows the specified view.
     * @param {string} viewName - The key of the view to show (e.g., 'setup', 'swiping').
     */
    function changeView(viewName) {
        for (const key in UIElements.views) {
            UIElements.views[key].style.display = 'none';
        }
        UIElements.views[viewName].style.display = 'block';
    }

    // --- 5. GAME FLOW ---

    /**
     * Gathers settings from the setup screen, prepares the deck, and starts the game.
     */
    function startGame() {
        state.parent1 = UIElements.setup.parent1Input.value || 'الأم';
        state.parent2 = UIElements.setup.parent2Input.value || 'الأب';
        prepareDeck();
        startSwiping();
    }

    /**
     * Filters the main names list based on user criteria and shuffles the resulting deck.
     */
function prepareDeck() {
    // --- 1. Get filter values from the UI ---
    const selectedGender = UIElements.setup.genderFilter.value;
    
    // Get all checked letter checkboxes
    const selectedLetterNodes = document.querySelectorAll('#letter-filter-container input:checked');
    // Create an array of the selected letters (e.g., ['أ', 'ب'])
    const selectedLetters = Array.from(selectedLetterNodes).map(node => node.value);

    // --- 2. Filter the main names list ---
    state.deck = state.allNames.filter(name => {
        
        // --- GENDER MATCH LOGIC ---
        let genderMatch = false;
        switch (selectedGender) {
            case 'all':
                genderMatch = true;
                break;
            case 'male-mixed':
                genderMatch = name.g === 'm' || name.g === 'x';
                break;
            case 'female-mixed':
                genderMatch = name.g === 'f' || name.g === 'x';
                break;
            default: // This handles 'm', 'f', and 'x' individually
                genderMatch = name.g === selectedGender;
                break;
        }

        // --- LETTER MATCH LOGIC ---
        // If no letters are checked, it's a match (show all). Otherwise, check if the name's first letter is in our selected array.
        const letterMatch = selectedLetters.length === 0 || selectedLetters.includes(name.l[0]);
        
        // --- FINAL DECISION ---
        // A name is kept only if BOTH conditions are true
        return genderMatch && letterMatch;
    });

    // --- 3. Shuffle the resulting deck ---
    state.deck.sort(() => Math.random() - 0.5);
}

    // --- 6. SWIPING LOGIC ---

    /**
     * Sets up the UI and event listeners for the swiping phase.
     */
    function startSwiping() {
        const playerName = state.currentPlayer === 1 ? state.parent1 : state.parent2;
        UIElements.swiping.turnIndicator.textContent = `دورك يا ${playerName}`;
        changeView('swiping');
        renderInitialDeck();
		updateSwipeStats();

        UIElements.swiping.undoBtn.addEventListener('click', undoSwipe);
        UIElements.swiping.finishSwipeBtn.addEventListener('click', finishSwiping);
        UIElements.swiping.viewListBtn.addEventListener('click', showLikedListModal);
        UIElements.modal.closeBtn.addEventListener('click', () => UIElements.modal.container.style.display = "none");
        window.addEventListener('click', (event) => {
            if (event.target == UIElements.modal.container) {
                UIElements.modal.container.style.display = "none";
            }
        });
    }
	
	function updateSwipeStats() {
		const player = state.currentPlayer;
		const likedCount = state.likedNames[player].length;
		// Discarded is total actions minus liked ones
		const discardedCount = state.discardedActions[player].length - likedCount; 
		const remainingCount = state.deck.length;
		const totalCount = likedCount + discardedCount + remainingCount;

		const statsContainer = document.getElementById('swipe-stats');
		if (!statsContainer) return; // Safety check

		statsContainer.innerHTML = `
			<div class="stat-item" title="أسماء أعجبتك">
				<span>${likedCount}</span> 👍
			</div>
			<div class="stat-item" title="أسماء تجاهلتها">
				<span>${discardedCount}</span> 👎
			</div>
			<div class="stat-item" title="الأسماء المتبقية">
				<span>${remainingCount}</span>  restante
			</div>
			<div class="stat-item" title="المجموع الكلي">
				<span>${totalCount}</span> Total
			</div>
		`;
	}	
	
	
	function appendNextCard() {
    // The next card to add is the one that will be 3rd in line.
    // Since the deck is visually upside down, this is at index deck.length - 3.
    const nextCardIndex = state.deck.length - 3;
    if (nextCardIndex < 0) return; // No more cards to add to the stack

    const name = state.deck[nextCardIndex];
    
    const card = document.createElement('div');
    card.className = 'name-card';
    card.innerHTML = `
        <h2>${name.l}</h2>
		<p class="latin-name">${name.a}</p>
        <p class="origin">${name.o}</p>
        <p class="meaning">${name.m}</p>
    `;
    
    // Use prepend to add it as the first child in the DOM, which makes it the bottom card visually.
    UIElements.swiping.deckContainer.prepend(card);
}

    /**
     * Renders the name cards into the DOM from the current deck.
     */

/**
 * Renders the initial virtualized stack of cards when the swiping screen first loads.
 */
	function renderInitialDeck() {
		UIElements.swiping.deckContainer.innerHTML = ''; 

		if (state.deck.length === 0) {
			UIElements.swiping.deckContainer.innerHTML = `<div class="name-card"><p>لم يتم العثور على أسماء تطابق هذا الفلتر.</p></div>`;
			return;
		}

		// Only render up to the top 3 cards from the deck for performance.
		const initialCards = state.deck.slice(-3);

		initialCards.forEach(name => {
			const card = document.createElement('div');
			card.className = 'name-card';
			card.innerHTML = `
				<h2>${name.l}</h2>
				<p class="latin-name">${name.a}</p>
				<p class="origin">${name.o}</p>
				<p class="meaning">${name.m}</p>
			`;
			UIElements.swiping.deckContainer.appendChild(card);
		});

		attachCardInteraction();
	}

    /**
     * Attaches mouse and touch event listeners to the top card for dragging.
     */
    function attachCardInteraction() {
        const cards = document.querySelectorAll('.name-card');
        const activeCard = cards[cards.length - 1];
        if (!activeCard) return;

        let startPoint = { x: 0 };
        let isDragging = false;

        function onDragStart(e) {
            if (!activeCard) return;
            isDragging = true;
            activeCard.classList.add('dragging');
            startPoint.x = e.pageX || e.touches[0].pageX;
        }

        function onDragMove(e) {
            if (!isDragging || !activeCard) return;
            e.preventDefault();
            const currentX = e.pageX || e.touches[0].pageX;
            const diffX = currentX - startPoint.x;
            const rotate = diffX / 15;
            activeCard.style.transform = `translateX(${diffX}px) rotate(${rotate}deg)`;
        }

        function onDragEnd(e) {
            if (!isDragging || !activeCard) return;
            isDragging = false;
            activeCard.classList.remove('dragging');
            const rect = activeCard.getBoundingClientRect();
            const threshold = rect.width * 0.4;

            if (rect.left < window.innerWidth / 2 - threshold) {
                handleSwipe('left');
            } else if (rect.right > window.innerWidth / 2 + threshold) {
                handleSwipe('right');
            } else {
                activeCard.style.transform = ''; // Reset position
            }
        }

        // Mouse events
        activeCard.addEventListener('mousedown', onDragStart);
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        // Touch events
        activeCard.addEventListener('touchstart', onDragStart, { passive: true });
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
    }
    
    /**
     * Processes a swipe, updates state, and triggers the fly-off animation.
     * @param {string} direction - 'left' or 'right'.
     */
	 
	/**
	 * Processes a swipe, updates state, and animates the cards seamlessly.
	 */
	function handleSwipe(direction) {
		if (state.deck.length === 0) return;

		// --- State Update ---
		const swipedName = state.deck.pop();
		const player = state.currentPlayer;
		const liked = direction === 'right';

		if (liked) {
			state.likedNames[player].push(swipedName);
		}
		state.discardedActions[player].push({ name: swipedName, liked: liked });
		
		// --- DOM Animation ---
		const cardElement = UIElements.swiping.deckContainer.querySelector('.name-card:last-child');
		if (cardElement) {
			cardElement.classList.add(liked ? 'swiped-right' : 'swiped-left');
			
			// After the fly-off animation, surgically update the DOM.
			setTimeout(() => {
				cardElement.remove();  // 1. Remove the swiped card.
				appendNextCard();      // 2. Add the next card to the bottom of the stack.
				attachCardInteraction(); // 3. Attach listeners to the new top card.
			}, 250); // Duration must match CSS transition
		}
		
		updateSwipeStats();
	}


    /**
     * Reverts the last swipe action.
     */
	function undoSwipe() {
		const player = state.currentPlayer;
		if (state.discardedActions[player].length === 0) return;

		const lastAction = state.discardedActions[player].pop();
		state.deck.push(lastAction.name); // Put the name object back in the deck

		if (lastAction.liked) {
			state.likedNames[player].pop(); // If it was liked, remove it from the liked list
		}
		
		// Re-render the virtualized card stack and update stats
		renderInitialDeck(); 
		updateSwipeStats();
	}

    /**
     * Shows the modal with the current player's liked names.
     */
    function showLikedListModal() {
        const player = state.currentPlayer;
        UIElements.modal.listUl.innerHTML = '';
        if (state.likedNames[player].length > 0) {
            state.likedNames[player].forEach(name => {
                const li = document.createElement('li');
                li.textContent = name.l;
                UIElements.modal.listUl.appendChild(li);
            });
        } else {
            UIElements.modal.listUl.innerHTML = '<li>لم تختر أي أسماء بعد.</li>';
        }
        UIElements.modal.container.style.display = 'flex';
    }

    /**
     * Ends the swiping phase and moves to ranking or the next turn.
     */
    function finishSwiping() {
        if (state.likedNames[state.currentPlayer].length < 2) {
            // Not enough names to rank, save the list as is and proceed
            state.rankedLists[state.currentPlayer] = state.likedNames[state.currentPlayer];
            endCurrentPlayerTurn();
        } else {
            startRanking();
        }
    }

    // --- 7. RANKING LOGIC ("This vs That") ---
    // An object to manage the state of the ranking process (Binary Insertion Sort)
    const ranker = {
        list: [],
        sorted: [],
        unsorted: [],
        candidate: null,
        comparisonIndex: 0,
        
        init: function(namesToRank) {
            this.list = [...namesToRank]; // Make a copy
            this.sorted = [];
            this.unsorted = [...this.list]; // Copy again for the unsorted pile
            this.candidate = null;
            this.comparisonIndex = 0;
            this.nextRound();
        },

        nextRound: function() {
            if (this.candidate === null && this.unsorted.length > 0) {
                this.candidate = this.unsorted.shift();
                this.comparisonIndex = 0;
            }

            if (this.comparisonIndex >= this.sorted.length) {
                // We've compared against all sorted items, so it's the 'least preferred' so far
                this.sorted.push(this.candidate);
                this.candidate = null;
                return this.nextRound();
            }

            if (this.candidate) {
                this.presentComparison();
            } else {
                // Finished ranking
                state.rankedLists[state.currentPlayer] = this.sorted;
                endCurrentPlayerTurn();
            }
        },

        presentComparison: function() {
            UIElements.ranking.choiceA.textContent = this.candidate.l;
            UIElements.ranking.choiceB.textContent = this.sorted[this.comparisonIndex].l;
            
            const total = this.list.length;
            const done = this.sorted.length;
            UIElements.ranking.progress.textContent = `ترتيب ${done + 1} من ${total} أسماء...`;
        },

        choose: function(choice) { // 'a' or 'b'
            if (choice === 'a') { // Candidate (A) is preferred
                this.sorted.splice(this.comparisonIndex, 0, this.candidate);
                this.candidate = null;
            } else { // Already sorted item (B) is preferred
                this.comparisonIndex++;
            }
            this.nextRound();
        }
    };

    /**
     * Starts the ranking phase for the current player.
     */
    function startRanking() {
        changeView('ranking');
        ranker.init(state.likedNames[state.currentPlayer]);
        UIElements.ranking.choiceA.onclick = () => ranker.choose('a');
        UIElements.ranking.choiceB.onclick = () => ranker.choose('b');
    }

    // --- 8. END OF TURN & FINAL RESULTS ---

    /**
     * Determines the next step after a player finishes their turn.
     */
    function endCurrentPlayerTurn() {
        if (state.isTwoPlayer && state.currentPlayer === 1) {
            state.currentPlayer = 2;
            const nextPlayerName = state.parent2;
            UIElements.handoff.message.textContent = `الآن جاء دورك يا ${nextPlayerName}!`;
            changeView('handoff');
            UIElements.handoff.nextPlayerBtn.onclick = () => {
                prepareDeck();
                startSwiping();
            };
        } else {
            showFinalResults();
        }
    }

    /**
     * Calculates and displays the final results for one or two players.
     */
    function showFinalResults() {
        changeView('results');
        const listContainer = UIElements.results.listContainer;
        listContainer.innerHTML = '';

        if (!state.isTwoPlayer) {
            UIElements.results.subtitle.textContent = 'قائمتك النهائية المرتبة:';
            const ul = document.createElement('ul');
            if(state.rankedLists[1].length === 0) {
                 ul.innerHTML = '<li>لم تختر أي أسماء.</li>';
            } else {
                state.rankedLists[1].forEach(name => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span class="final-name">${name.l}</span>`;
                    ul.appendChild(li);
                });
            }
            listContainer.appendChild(ul);
            return;
        }

        // Two-player result calculation
        UIElements.results.subtitle.textContent = 'الأسماء التي اتفق عليها كلاكما، مرتبة حسب التوافق:';
        const p1List = state.rankedLists[1];
        const p2List = state.rankedLists[2];
        const commonNames = [];

        p1List.forEach((name, p1Index) => {
            const p2Index = p2List.findIndex(n => n.a === name.a);
            if (p2Index !== -1) {
                commonNames.push({
                    nameObj: name,
                    score: p1Index + 1 + p2Index + 1 // Score is sum of ranks
                });
            }
        });

        commonNames.sort((a, b) => a.score - b.score);

        if (commonNames.length === 0) {
            listContainer.innerHTML = '<h3>للأسف، لم تتفقا على أي اسم. حاولوا مرة أخرى بفلتر أوسع!</h3>';
            return;
        }

        const ul = document.createElement('ul');
        commonNames.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="final-name">${item.nameObj.l}</span>
                <span class="final-score">النقاط: ${item.score}</span>
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    }

    // --- 9. APP INITIALIZATION ---
    /**
     * The main function that starts the application.
     */
    async function init() {
        const loaded = await loadNames();
        if (loaded) {
            initializeSetupScreen();
        }
    }

    // Start the application
    init();


})();
