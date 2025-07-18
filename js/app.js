/**
 * LinguaStory v01 - Interactive French Learning Application
 * Main application logic and state management
 */

class LinguaStoryApp {
    constructor() {
        // Application state
        this.state = {
            currentLanguage: 'en', // en, sk, de, es
            showTranslations: false,
            currentChapter: null,
            chapters: [],
            userProgress: this.loadProgress(),
            isLoading: true
        };
        
        // DOM elements
        this.elements = {};
        
        // Data cache
        this.data = {
            chapters: {},
            grammar: {},
            vocabulary: {}
        };
        
        // Bind methods
        this.bindMethods();
    }
    
    bindMethods() {
        this.init = this.init.bind(this);
        this.loadData = this.loadData.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.renderChapterList = this.renderChapterList.bind(this);
        this.loadChapter = this.loadChapter.bind(this);
        this.toggleTranslations = this.toggleTranslations.bind(this);
        this.switchLanguage = this.switchLanguage.bind(this);
    }
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing LinguaStory v01...');
        
        try {
            // Load saved user preferences
            this.loadSavedState();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Load application data
            await this.loadData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Render initial UI
            this.renderChapterList();
            
            // Hide loading screen
            this.hideLoading();
            
            console.log('LinguaStory v01 initialized successfully');
        } catch (error) {
            console.error('Failed to initialize LinguaStory:', error);
            this.showError('Failed to load application. Please refresh the page.');
        }
    }
    
    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        this.elements = {
            loading: document.getElementById('loading'),
            app: document.getElementById('app'),
            chapterList: document.getElementById('chapterList'),
            chapterContent: document.getElementById('chapterContent'),
            exerciseContent: document.getElementById('exerciseContent'),
            welcomeScreen: document.getElementById('welcomeScreen'),
            startStoryBtn: document.getElementById('startStoryBtn'),
            translationToggle: document.getElementById('translationToggle'),
            langButtons: document.querySelectorAll('.lang-btn'),
            progressBar: document.querySelector('.progress-fill'),
            progressText: document.querySelector('.progress-text'),
            grammarTooltip: document.getElementById('grammarTooltip'),
            vocabularyBtn: document.getElementById('vocabularyBtn'),
            grammarBtn: document.getElementById('grammarBtn'),
            exercisesBtn: document.getElementById('exercisesBtn')
        };
    }
    
    /**
     * Load application data from JSON files
     */
    async loadData() {
        try {
            // Load chapter overview
            const chaptersResponse = await fetch('./chapters.json');
            if (!chaptersResponse.ok) throw new Error('Failed to load chapters');
            this.state.chapters = await chaptersResponse.json();
            
            // Load individual chapter data
            for (const chapter of this.state.chapters) {
                const chapterResponse = await fetch(`./${chapter.id}.json`);
                if (chapterResponse.ok) {
                    this.data.chapters[chapter.id] = await chapterResponse.json();
                }
            }
            
            console.log('Data loaded successfully:', {
                chapters: this.state.chapters.length,
                chapterData: Object.keys(this.data.chapters).length
            });
            
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Start story button
        if (this.elements.startStoryBtn) {
            this.elements.startStoryBtn.addEventListener('click', () => {
                this.loadChapter('ch1');
            });
        }
        
        // Translation toggle
        if (this.elements.translationToggle) {
            this.elements.translationToggle.addEventListener('click', this.toggleTranslations);
        }
        
        // Language switcher
        this.elements.langButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                if (lang) {
                    this.switchLanguage(lang);
                }
            });
        });
        
        // Quick action buttons
        if (this.elements.vocabularyBtn) {
            this.elements.vocabularyBtn.addEventListener('click', () => {
                this.showVocabulary();
            });
        }
        
        if (this.elements.grammarBtn) {
            this.elements.grammarBtn.addEventListener('click', () => {
                this.showGrammarGuide();
            });
        }
        
        if (this.elements.exercisesBtn) {
            this.elements.exercisesBtn.addEventListener('click', () => {
                this.showExercises();
            });
        }
        
        // Grammar highlights (delegated event listener)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('grammar-highlight')) {
                this.showGrammarTooltip(e.target);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 't' && e.ctrlKey) {
                e.preventDefault();
                this.toggleTranslations();
            }
        });
    }
    
    /**
     * Render chapter list in sidebar
     */
    renderChapterList() {
        if (!this.elements.chapterList || !this.state.chapters) return;
        
        const currentLang = this.state.currentLanguage;
        
        this.elements.chapterList.innerHTML = this.state.chapters.map(chapter => {
            const title = chapter[`title${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`] || chapter.title;
            const description = chapter[`description${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`] || chapter.description;
            const isCompleted = this.state.userProgress.completedChapters.includes(chapter.id);
            const isActive = this.state.currentChapter === chapter.id;
            
            let statusClass = '';
            if (isCompleted) statusClass = 'completed';
            else if (isActive) statusClass = 'active';
            
            return `
                <div class="chapter-item ${statusClass}" data-chapter="${chapter.id}">
                    <div class="chapter-title">${title}</div>
                    <div class="chapter-description">${description}</div>
                    <div class="chapter-meta">
                        <span>📚 ${chapter.vocabularyCount} words</span>
                        <span>⏱️ ${chapter.estimatedTime} min</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click listeners to chapter items
        this.elements.chapterList.querySelectorAll('.chapter-item').forEach(item => {
            item.addEventListener('click', () => {
                const chapterId = item.dataset.chapter;
                this.loadChapter(chapterId);
            });
        });
        
        // Update progress
        this.updateProgress();
    }
    
    /**
     * Load and display a specific chapter
     */
    async loadChapter(chapterId) {
        try {
            console.log(`Loading chapter: ${chapterId}`);
            
            const chapterData = this.data.chapters[chapterId];
            if (!chapterData) {
                throw new Error(`Chapter data not found: ${chapterId}`);
            }
            
            // Update state
            this.state.currentChapter = chapterId;
            
            // Hide welcome screen, show chapter content
            if (this.elements.welcomeScreen) {
                this.elements.welcomeScreen.style.display = 'none';
            }
            if (this.elements.chapterContent) {
                this.elements.chapterContent.style.display = 'block';
            }
            
            // Render chapter content
            this.renderChapterContent(chapterData);
            
            // Update sidebar
            this.renderChapterList();
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error loading chapter:', error);
            this.showError(`Failed to load chapter: ${chapterId}`);
        }
    }
    
    /**
     * Render chapter content
     */
    renderChapterContent(chapterData) {
        if (!this.elements.chapterContent) return;
        
        const currentLang = this.state.currentLanguage;
        const title = chapterData[`title${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`] || chapterData.title;
        
        // Get story text
        const storyFr = chapterData.content.story.fr || '';
        const storyTranslation = chapterData.content.story[currentLang] || '';
        
        // Split story into paragraphs and add translations
        const storyParagraphs = storyFr.split('\n\n').map((paragraph, index) => {
            const translationParagraphs = storyTranslation.split('\n\n');
            const translation = translationParagraphs[index] || '';
            
            return `
                <p>${paragraph}</p>
                ${translation ? `<p class="translation ${this.state.showTranslations ? 'show' : ''}">${translation}</p>` : ''}
            `;
        }).join('');
        
        this.elements.chapterContent.innerHTML = `
            <div class="chapter-header">
                <div class="chapter-number">Chapter ${chapterData.number}</div>
                <h1 class="chapter-title">${title}</h1>
                <div class="chapter-meta">
                    <span>📚 Level ${chapterData.level}</span>
                    <span>⏱️ ${chapterData.estimatedTime} minutes</span>
                    <span>🎯 ${chapterData.vocabularyCount} new words</span>
                </div>
            </div>
            
            <div class="story-text">
                ${storyParagraphs}
            </div>
            
            <div class="chapter-navigation">
                <button class="nav-btn" onclick="app.navigateChapter('prev')">← Previous</button>
                <button class="nav-btn" onclick="app.navigateChapter('next')">Next →</button>
            </div>
        `;
    }
    
    /**
     * Toggle translation visibility
     */
    toggleTranslations() {
        this.state.showTranslations = !this.state.showTranslations;
        
        // Update button state
        if (this.elements.translationToggle) {
            this.elements.translationToggle.classList.toggle('active', this.state.showTranslations);
            const toggleText = this.elements.translationToggle.querySelector('.toggle-text');
            if (toggleText) {
                toggleText.textContent = this.state.showTranslations ? 'Hide Translations' : 'Show Translations';
            }
        }
        
        // Update visible translations
        const translations = document.querySelectorAll('.translation');
        translations.forEach(translation => {
            translation.classList.toggle('show', this.state.showTranslations);
        });
        
        // Save preference
        localStorage.setItem('linguastory_show_translations', this.state.showTranslations);
        
        console.log('Translations toggled:', this.state.showTranslations);
    }
    
    /**
     * Switch application language
     */
    switchLanguage(lang) {
        console.log(`Switching language to: ${lang}`);
        
        this.state.currentLanguage = lang;
        
        // Update language buttons
        this.elements.langButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        // Re-render content
        this.renderChapterList();
        if (this.state.currentChapter) {
            const chapterData = this.data.chapters[this.state.currentChapter];
            if (chapterData) {
                this.renderChapterContent(chapterData);
            }
        }
        
        // Save preference
        localStorage.setItem('linguastory_language', lang);
    }
    
    /**
     * Navigate between chapters
     */
    navigateChapter(direction) {
        const currentIndex = this.state.chapters.findIndex(ch => ch.id === this.state.currentChapter);
        let newIndex;
        
        if (direction === 'next') {
            newIndex = currentIndex + 1;
        } else if (direction === 'prev') {
            newIndex = currentIndex - 1;
        }
        
        if (newIndex >= 0 && newIndex < this.state.chapters.length) {
            const newChapterId = this.state.chapters[newIndex].id;
            this.loadChapter(newChapterId);
        }
    }
    
    /**
     * Update progress display
     */
    updateProgress() {
        const completed = this.state.userProgress.completedChapters.length;
        const total = this.state.chapters.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${percentage}%`;
        }
        
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${completed} of ${total} chapters completed`;
        }
    }
    
    /**
     * Load user progress from localStorage
     */
    loadProgress() {
        const saved = localStorage.getItem('linguastory_progress');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse saved progress');
            }
        }
        
        return {
            completedChapters: [],
            currentChapter: null,
            lastAccessed: null
        };
    }
    
    /**
     * Save user progress to localStorage
     */
    saveProgress() {
        try {
            localStorage.setItem('linguastory_progress', JSON.stringify(this.state.userProgress));
        } catch (e) {
            console.warn('Failed to save progress');
        }
    }
    
    /**
     * Mark chapter as completed
     */
    completeChapter(chapterId) {
        if (!this.state.userProgress.completedChapters.includes(chapterId)) {
            this.state.userProgress.completedChapters.push(chapterId);
            this.saveProgress();
            this.updateProgress();
            this.renderChapterList();
        }
    }

    /**
     * Show grammar tooltip
     */
    showGrammarTooltip(element) {
        const grammarId = element.getAttribute('data-grammar');
        if (!grammarId) {
            console.warn('No grammar ID found for element:', element);
            return;
        }
        
        // Get grammar data (in a real app, this would come from a grammar database)
        const grammarData = this.getGrammarExplanation(grammarId);
        if (!grammarData) {
            console.warn('No grammar data found for ID:', grammarId);
            return;
        }
        
        const tooltip = document.getElementById('grammarTooltip');
        if (!tooltip) return;
        
        const currentLang = this.state.currentLanguage;
        const title = grammarData[`title${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`] || grammarData.title;
        const explanation = grammarData[`explanation${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`] || grammarData.explanation;
        
        // Update tooltip content
        const tooltipTitle = tooltip.querySelector('.tooltip-title');
        const tooltipBody = tooltip.querySelector('.tooltip-body');
        
        if (tooltipTitle) tooltipTitle.textContent = title;
        if (tooltipBody) tooltipBody.innerHTML = explanation;
        
        // Position tooltip near the clicked element
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        tooltip.style.display = 'block';
        
        // Close tooltip when clicking close button or outside
        const closeBtn = tooltip.querySelector('.tooltip-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideGrammarTooltip();
        }
        
        // Close when clicking outside
        document.addEventListener('click', this.hideGrammarTooltipHandler, true);
        
        console.log('Grammar tooltip shown for:', grammarId);
    }
    
    /**
     * Hide grammar tooltip
     */
    hideGrammarTooltip() {
        const tooltip = document.getElementById('grammarTooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        document.removeEventListener('click', this.hideGrammarTooltipHandler, true);
    }
    
    /**
     * Grammar tooltip click handler
     */
    hideGrammarTooltipHandler = (e) => {
        const tooltip = document.getElementById('grammarTooltip');
        if (tooltip && !tooltip.contains(e.target) && !e.target.classList.contains('grammar-highlight')) {
            this.hideGrammarTooltip();
        }
    }
    
    /**
     * Get grammar explanation by ID
     */
    getGrammarExplanation(grammarId) {
        // Basic grammar explanations - in a real app, this would be a comprehensive database
        const grammarDatabase = {
            'gr1': {
                title: 'Present Tense Verbs',
                titleEn: 'Present Tense Verbs',
                titleSk: 'Prítomný čas slovies',
                titleDe: 'Präsens Verben',
                titleEs: 'Verbos en presente',
                explanation: 'Regular verbs in present tense follow patterns: -er verbs (parler → je parle), -ir verbs (finir → je finis), -re verbs (vendre → je vends)',
                explanationEn: 'Regular verbs in present tense follow patterns: -er verbs (parler → je parle), -ir verbs (finir → je finis), -re verbs (vendre → je vends)',
                explanationSk: 'Pravidelné slovesá v prítomnom čase nasledujú vzory: -er slovesá (parler → je parle), -ir slovesá (finir → je finis), -re slovesá (vendre → je vends)',
                explanationDe: 'Regelmäßige Verben im Präsens folgen Mustern: -er Verben (parler → je parle), -ir Verben (finir → je finis), -re Verben (vendre → je vends)',
                explanationEs: 'Los verbos regulares en presente siguen patrones: verbos en -er (parler → je parle), verbos en -ir (finir → je finis), verbos en -re (vendre → je vends)'
            },
            'gr2': {
                title: 'Être (to be)',
                titleEn: 'Être (to be)',
                titleSk: 'Être (byť)',
                titleDe: 'Être (sein)',
                titleEs: 'Être (ser/estar)',
                explanation: 'je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont',
                explanationEn: 'je suis (I am), tu es (you are), il/elle est (he/she is), nous sommes (we are), vous êtes (you are), ils/elles sont (they are)',
                explanationSk: 'je suis (som), tu es (si), il/elle est (je), nous sommes (sme), vous êtes (ste), ils/elles sont (sú)',
                explanationDe: 'je suis (ich bin), tu es (du bist), il/elle est (er/sie ist), nous sommes (wir sind), vous êtes (ihr seid), ils/elles sont (sie sind)',
                explanationEs: 'je suis (soy/estoy), tu es (eres/estás), il/elle est (es/está), nous sommes (somos/estamos), vous êtes (sois/estáis), ils/elles sont (son/están)'
            },
            'gr3': {
                title: 'Questions with Qu\'est-ce que',
                titleEn: 'Questions with Qu\'est-ce que',
                titleSk: 'Otázky s Qu\'est-ce que',
                titleDe: 'Fragen mit Qu\'est-ce que',
                titleEs: 'Preguntas con Qu\'est-ce que',
                explanation: 'Qu\'est-ce que means "what" and is used to ask questions: Qu\'est-ce que tu fais? (What are you doing?)',
                explanationEn: 'Qu\'est-ce que means "what" and is used to ask questions: Qu\'est-ce que tu fais? (What are you doing?)',
                explanationSk: 'Qu\'est-ce que znamená "čo" a používa sa na kladenie otázok: Qu\'est-ce que tu fais? (Čo robíš?)',
                explanationDe: 'Qu\'est-ce que bedeutet "was" und wird für Fragen verwendet: Qu\'est-ce que tu fais? (Was machst du?)',
                explanationEs: 'Qu\'est-ce que significa "qué" y se usa para hacer preguntas: Qu\'est-ce que tu fais? (¿Qué haces?)'
            }
        };
        
        return grammarDatabase[grammarId] || null;
    }
    
    /**
     * Show vocabulary from current chapter
     */
    showVocabulary() {
        if (!this.state.currentChapter) {
            this.showError('Please select a chapter first');
            return;
        }
        
        const chapterData = this.data.chapters[this.state.currentChapter];
        if (!chapterData || !chapterData.content.vocabulary) {
            this.showError('No vocabulary available for this chapter');
            return;
        }
        
        const currentLang = this.state.currentLanguage;
        const vocabulary = chapterData.content.vocabulary;
        
        const vocabularyHTML = `
            <div class="vocabulary-content">
                <div class="content-header">
                    <h2>📚 Vocabulary - Chapter ${chapterData.number}</h2>
                    <button class="close-btn" onclick="app.closeContentView()">✕</button>
                </div>
                <div class="vocabulary-list">
                    ${vocabulary.map(word => `
                        <div class="vocabulary-item">
                            <div class="word-french">${word.fr}</div>
                            <div class="word-pronunciation">${word.pronunciation}</div>
                            <div class="word-translation">${word[currentLang] || word.en}</div>
                            <div class="word-example">"${word.example}"</div>
                            ${word.note ? `<div class="word-note">💡 ${word.note}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.showContentView(vocabularyHTML);
    }
    
    /**
     * Show grammar guide
     */
    showGrammarGuide() {
        if (!this.state.currentChapter) {
            this.showError('Please select a chapter first');
            return;
        }
        
        const chapterData = this.data.chapters[this.state.currentChapter];
        if (!chapterData) {
            this.showError('No chapter data available');
            return;
        }
        
        const grammarFocus = chapterData.grammarFocus || [];
        const currentLang = this.state.currentLanguage;
        
        const grammarHTML = `
            <div class="grammar-content">
                <div class="content-header">
                    <h2>📖 Grammar Guide - Chapter ${chapterData.number}</h2>
                    <button class="close-btn" onclick="app.closeContentView()">✕</button>
                </div>
                <div class="grammar-list">
                    ${grammarFocus.map(grammarId => {
                        const grammarData = this.getGrammarExplanation(grammarId);
                        if (!grammarData) return '';
                        
                        const title = grammarData[`title${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`] || grammarData.title;
                        const explanation = grammarData[`explanation${currentLang.charAt(0).toUpperCase() + currentLang.slice(1)}`] || grammarData.explanation;
                        
                        return `
                            <div class="grammar-item">
                                <h3>${title}</h3>
                                <p>${explanation}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        this.showContentView(grammarHTML);
    }
    
    /**
     * Show exercises for current chapter
     */
    showExercises() {
        if (!this.state.currentChapter) {
            this.showError('Please select a chapter first');
            return;
        }
        
        const chapterData = this.data.chapters[this.state.currentChapter];
        if (!chapterData || !chapterData.content.exercises) {
            this.showError('No exercises available for this chapter');
            return;
        }
        
        const currentLang = this.state.currentLanguage;
        const exercises = chapterData.content.exercises;
        
        const exercisesHTML = `
            <div class="exercises-content">
                <div class="content-header">
                    <h2>✏️ Practice Exercises - Chapter ${chapterData.number}</h2>
                    <button class="close-btn" onclick="app.closeContentView()">✕</button>
                </div>
                <div class="exercises-list">
                    ${exercises.map((exercise, index) => this.renderExercise(exercise, index, currentLang)).join('')}
                </div>
            </div>
        `;
        
        this.showContentView(exercisesHTML);
    }
    
    /**
     * Render individual exercise
     */
    renderExercise(exercise, index, currentLang) {
        const question = exercise.question[currentLang] || exercise.question.fr;
        
        switch (exercise.type) {
            case 'multiple-choice':
                return `
                    <div class="exercise-item" data-exercise="${index}">
                        <h4>Question ${index + 1}</h4>
                        <p class="exercise-question">${question}</p>
                        <div class="exercise-options">
                            ${exercise.options.map((option, optIndex) => `
                                <button class="option-btn" data-option="${optIndex}" onclick="app.selectOption(${index}, ${optIndex})">
                                    ${option[currentLang] || option.fr}
                                </button>
                            `).join('')}
                        </div>
                        <div class="exercise-feedback" id="feedback-${index}" style="display: none;"></div>
                        <button class="check-btn" onclick="app.checkAnswer(${index})" style="display: none;">Check Answer</button>
                    </div>
                `;
                
            case 'fill-blank':
                return `
                    <div class="exercise-item" data-exercise="${index}">
                        <h4>Question ${index + 1}</h4>
                        <p class="exercise-question">${question}</p>
                        <div class="exercise-input">
                            <input type="text" class="blank-input" data-exercise="${index}" placeholder="Type your answer...">
                        </div>
                        <div class="exercise-feedback" id="feedback-${index}" style="display: none;"></div>
                        <button class="check-btn" onclick="app.checkFillBlank(${index})">Check Answer</button>
                        ${exercise.hint ? `<div class="exercise-hint">💡 Hint: ${exercise.hint[currentLang] || exercise.hint.fr}</div>` : ''}
                    </div>
                `;
                
            default:
                return `
                    <div class="exercise-item">
                        <p>Exercise type "${exercise.type}" not yet implemented.</p>
                    </div>
                `;
        }
    }
    
    /**
     * Show content in main area
     */
    showContentView(htmlContent) {
        // Hide other screens
        if (this.elements.welcomeScreen) {
            this.elements.welcomeScreen.style.display = 'none';
        }
        if (this.elements.chapterContent) {
            this.elements.chapterContent.style.display = 'none';
        }
        
        // Show exercise content
        if (this.elements.exerciseContent) {
            this.elements.exerciseContent.innerHTML = htmlContent;
            this.elements.exerciseContent.style.display = 'block';
        }
    }
    
    /**
     * Close content view and return to previous screen
     */
    closeContentView() {
        if (this.elements.exerciseContent) {
            this.elements.exerciseContent.style.display = 'none';
        }
        
        // Show appropriate previous screen
        if (this.state.currentChapter) {
            if (this.elements.chapterContent) {
                this.elements.chapterContent.style.display = 'block';
            }
        } else {
            if (this.elements.welcomeScreen) {
                this.elements.welcomeScreen.style.display = 'block';
            }
        }
    }
    
    /**
     * Handle multiple choice option selection
     */
    selectOption(exerciseIndex, optionIndex) {
        const exerciseElement = document.querySelector(`[data-exercise="${exerciseIndex}"]`);
        if (!exerciseElement) return;
        
        // Remove previous selections
        const options = exerciseElement.querySelectorAll('.option-btn');
        options.forEach(btn => btn.classList.remove('selected'));
        
        // Mark selected option
        const selectedBtn = exerciseElement.querySelector(`[data-option="${optionIndex}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        // Show check button
        const checkBtn = exerciseElement.querySelector('.check-btn');
        if (checkBtn) {
            checkBtn.style.display = 'block';
        }
        
        // Store selected answer
        exerciseElement.dataset.selectedAnswer = optionIndex;
    }
    
    /**
     * Check multiple choice answer
     */
    checkAnswer(exerciseIndex) {
        const exerciseElement = document.querySelector(`[data-exercise="${exerciseIndex}"]`);
        if (!exerciseElement) return;
        
        const selectedAnswer = parseInt(exerciseElement.dataset.selectedAnswer);
        const chapterData = this.data.chapters[this.state.currentChapter];
        const exercise = chapterData.content.exercises[exerciseIndex];
        const currentLang = this.state.currentLanguage;
        
        const feedbackElement = document.getElementById(`feedback-${exerciseIndex}`);
        if (!feedbackElement) return;
        
        const isCorrect = selectedAnswer === exercise.correct;
        const explanation = exercise.explanation[currentLang] || exercise.explanation.fr;
        
        feedbackElement.innerHTML = `
            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="feedback-result">
                    ${isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                </div>
                <div class="feedback-explanation">
                    ${explanation}
                </div>
            </div>
        `;
        feedbackElement.style.display = 'block';
        
        // Disable further attempts
        const options = exerciseElement.querySelectorAll('.option-btn');
        options.forEach(btn => btn.disabled = true);
        
        const checkBtn = exerciseElement.querySelector('.check-btn');
        if (checkBtn) {
            checkBtn.style.display = 'none';
        }
    }
    
    /**
     * Check fill-in-the-blank answer
     */
    checkFillBlank(exerciseIndex) {
        const exerciseElement = document.querySelector(`[data-exercise="${exerciseIndex}"]`);
        if (!exerciseElement) return;
        
        const input = exerciseElement.querySelector('.blank-input');
        const userAnswer = input.value.trim().toLowerCase();
        
        const chapterData = this.data.chapters[this.state.currentChapter];
        const exercise = chapterData.content.exercises[exerciseIndex];
        const currentLang = this.state.currentLanguage;
        
        const correctAnswers = exercise.correct[currentLang] || exercise.correct.fr || [];
        const isCorrect = correctAnswers.some(answer => 
            answer.toLowerCase() === userAnswer
        );
        
        const feedbackElement = document.getElementById(`feedback-${exerciseIndex}`);
        if (!feedbackElement) return;
        
        feedbackElement.innerHTML = `
            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="feedback-result">
                    ${isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                </div>
                <div class="feedback-explanation">
                    ${isCorrect ? 'Well done!' : `Correct answer(s): ${correctAnswers.join(', ')}`}
                </div>
            </div>
        `;
        feedbackElement.style.display = 'block';
        
        // Disable input
        input.disabled = true;
        const checkBtn = exerciseElement.querySelector('.check-btn');
        if (checkBtn) {
            checkBtn.disabled = true;
        }
    }
    
    /**
     * Hide loading screen and show app
     */
    hideLoading() {
        setTimeout(() => {
            if (this.elements.loading) {
                this.elements.loading.style.display = 'none';
            }
            if (this.elements.app) {
                this.elements.app.style.display = 'block';
            }
            this.state.isLoading = false;
        }, 1000); // Small delay for smooth transition
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error('Application error:', message);
        
        // Simple error display - in production, use a proper modal/toast
        alert(`Error: ${message}`);
    }
    
    /**
     * Initialize from saved state
     */
    loadSavedState() {
        // Load language preference
        const savedLanguage = localStorage.getItem('linguastory_language');
        if (savedLanguage && ['en', 'sk', 'de', 'es'].includes(savedLanguage)) {
            this.state.currentLanguage = savedLanguage;
        }
        
        // Load translation preference
        const savedTranslations = localStorage.getItem('linguastory_show_translations');
        if (savedTranslations !== null) {
            this.state.showTranslations = savedTranslations === 'true';
        }
    }
}

// Expose app globally for debugging and external access
window.LinguaStoryApp = LinguaStoryApp;

// Auto-initialize when script loads (fallback)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.app) {
            window.app = new LinguaStoryApp();
            window.app.init();
        }
    });
} else {
    // DOM already loaded
    if (!window.app) {
        window.app = new LinguaStoryApp();
        window.app.init();
    }
}
