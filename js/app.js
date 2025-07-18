/**
 * LinguaStory v01 - Interactive French Learning Application
 * Main application logic and state management
 */

class LinguaStoryApp {
    constructor() {
        // Application state
        this.state = {
            currentLanguage: 'en', // en, sk
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
            welcomeScreen: document.getElementById('welcomeScreen'),
            startStoryBtn: document.getElementById('startStoryBtn'),
            translationToggle: document.getElementById('translationToggle'),
            langButtons: document.querySelectorAll('.lang-btn'),
            progressBar: document.querySelector('.progress-fill'),
            progressText: document.querySelector('.progress-text')
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
        // This would show detailed grammar information
        // For now, just log
        console.log('Grammar tooltip requested for:', element.textContent);
        
        // In a full implementation, this would:
        // 1. Extract grammar ID from element
        // 2. Load grammar explanation
        // 3. Show tooltip with explanation
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
        if (savedLanguage && ['en', 'sk'].includes(savedLanguage)) {
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