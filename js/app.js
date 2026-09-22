/*
 * js/app.js — главный движок платформы
 * Можно смотреть, но НЕ ТРОГАТЬ — это ядро системы
 * Автор материала работает только с config/ и content/
 */

// ============================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ============================================
let state = {
    currentSlideIndex: 0,
    totalSlides: 0,
    quizCorrectCount: 0,
    totalQuizCount: 0,
    isQuizSolved: false,
    revealEngines: {},  // хранит RevealEngine для каждого слайда
    activeVideo: null   // текущее активное видео
};

// DOM элементы
const dom = {
    container: null,
    headerTitle: null,
    headerAuthor: null,
    footerProgress: null,
    footerContacts: null,
    prevBtn: null,
    nextBtn: null,
    finalScreen: null,
    finalResult: null,
    restartBtn: null
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
function init() {
    console.log('Платформа презентаций v2.0 — запуск');
    
    // Сохраняем ссылки на DOM элементы
    dom.container = document.getElementById('presentation-container');
    dom.headerTitle = document.getElementById('header-course-title');
    dom.headerAuthor = document.getElementById('header-author');
    dom.footerProgress = document.getElementById('progress-bar');
    dom.footerContacts = document.getElementById('footer-contacts');
    dom.prevBtn = document.getElementById('prev-btn');
    dom.nextBtn = document.getElementById('next-btn');
    dom.finalScreen = document.getElementById('final-screen');
    dom.finalResult = document.getElementById('final-result');
    dom.restartBtn = document.getElementById('restart-btn');
    
    // Применяем настройки из config/config.js
    applyConfig();
    
    // Загружаем контент и рендерим слайды
    loadContentAndRender();
    
    // Навешиваем обработчики событий
    setupEventListeners();
    
    // Обработчик изменения размера окна (throttle)
    window.addEventListener('resize', throttle(recalculateSlideSize, 100));
    
    // ВАЖНО: Явный пересчёт размеров слайда после инициализации
    recalculateSlideSize();
}

/**
 * Применение настроек из CONFIG
 */
function applyConfig() {
    if (typeof CONFIG !== 'undefined') {
        dom.headerTitle.textContent = CONFIG.courseTitle || 'Курс';
        dom.headerAuthor.textContent = CONFIG.author || '';
        dom.footerContacts.textContent = CONFIG.creatorContactsLabel || CONFIG.creatorContacts || '';
        if (CONFIG.creatorContacts && !CONFIG.creatorContactsLabel) {
            dom.footerContacts.href = CONFIG.creatorContacts;
            dom.footerContacts.target = '_blank';
            dom.footerContacts.rel = 'noopener noreferrer';
        }
    }
}

/**
 * Загрузка контента и рендеринг слайдов
 */
function loadContentAndRender() {
    if (typeof CONTENT === 'undefined' || !CONTENT.slides) {
        console.error('CONTENT не найден или пуст');
        dom.container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-error);">Ошибка: файл content/content.js не найден или пуст</div>';
        return;
    }
    
    state.totalSlides = CONTENT.slides.length;
    
    // Подсчёт количества тестов
    state.totalQuizCount = CONTENT.slides.filter(s => s.type === 'quiz').length;
    
    renderAllSlides();
    goToSlide(0);
    updateProgress();
}

/**
 * Рендеринг всех слайдов (один раз при загрузке)
 */
function renderAllSlides() {
    dom.container.innerHTML = '';
    
    CONTENT.slides.forEach((slideData, index) => {
        const slideEl = createSlideElement(slideData, index);
        dom.container.appendChild(slideEl);
        
        // Инициализация RevealEngine для слайдов с блоками
        if (slideData.type === 'text-overlay' && slideData.blocks) {
            state.revealEngines[index] = new RevealEngine(
                slideEl,
                slideData.blocks,
                () => onRevealComplete(index)
            );
        }
        
        // Инициализация видео для видео-слайдов
        if (slideData.type === 'video') {
            initVideoPlayer(slideEl, slideData, index);
        }
        
        // Инициализация теста для quiz-слайдов
        if (slideData.type === 'quiz') {
            initQuiz(slideEl, slideData, index);
        }
    });
    
    // Обновляем иконки Lucide после рендеринга
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Создание DOM-элемента слайда
 */
function createSlideElement(slideData, index) {
    const slideEl = document.createElement('div');
    slideEl.className = 'slide';
    slideEl.dataset.index = index;
    slideEl.dataset.type = slideData.type;
    
    let mediaHTML = '';
    
    switch (slideData.type) {
        case 'image':
        case 'text-overlay':
            mediaHTML = `<img src="${slideData.media}" alt="" class="slide-media" loading="lazy">`;
            break;
        case 'video':
            mediaHTML = `
                <video class="slide-media" preload="none" poster="${slideData.poster || ''}">
                    <source src="${slideData.media}" type="video/webm">
                    Ваш браузер не поддерживает видео.
                </video>
                <div class="video-play-overlay">
                    <i data-lucide="play-circle" size="80"></i>
                </div>
                <div class="video-controls-container"></div>
            `;
            break;
        case 'quiz':
            mediaHTML = `<div class="quiz-container"></div>`;
            break;
    }
    
    slideEl.innerHTML = `
        <div class="slide-media-container">
            ${mediaHTML}
        </div>
    `;
    
    return slideEl;
}

/**
 * Переход к слайду
 */
function goToSlide(index) {
    if (index < 0 || index >= state.totalSlides) {
        return;
    }
    
    // Остановка текущего видео если есть
    stopActiveVideo();
    
    // Сброс состояния теста
    state.isQuizSolved = false;
    
    // Обновление классов слайдов
    const slides = document.querySelectorAll('.slide');
    slides.forEach((slide, i) => {
        slide.classList.remove('active', 'prev', 'next');
        if (i === index) {
            slide.classList.add('active');
        } else if (i < index) {
            slide.classList.add('prev');
        } else {
            slide.classList.add('next');
        }
    });
    
    state.currentSlideIndex = index;
    
    // Обновление состояния кнопок
    updateNavigationState();
    updateProgress();
    
    // Прокрутка к началу контейнера (без скролла страницы)
    dom.container.scrollTop = 0;
}

/**
 * Обновление состояния кнопок навигации
 */
function updateNavigationState() {
    const currentSlide = CONTENT.slides[state.currentSlideIndex];
    const revealEngine = state.revealEngines[state.currentSlideIndex];
    
    // Кнопка "Назад"
    dom.prevBtn.disabled = state.currentSlideIndex === 0;
    
    // Кнопка "Далее"
    let canGoNext = true;
    let nextBtnText = CONFIG.btnNextText || 'Далее';
    
    if (currentSlide.type === 'quiz') {
        if (!state.isQuizSolved) {
            canGoNext = false;
            nextBtnText = 'Выберите вариант ответа';
        }
    } else if (revealEngine && !revealEngine.isCompleted()) {
        canGoNext = false;
        // nextBtnText остаётся стандартным, кнопка просто приглушена
    }
    
    dom.nextBtn.disabled = !canGoNext;
    dom.nextBtn.innerHTML = `${nextBtnText} <i data-lucide="arrow-right"></i>`;
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Обработка завершения появления всех блоков
 */
function onRevealComplete(slideIndex) {
    updateNavigationState();
}

/**
 * Обновление прогресс-бара
 */
function updateProgress() {
    const percent = ((state.currentSlideIndex + 1) / state.totalSlides) * 100;
    dom.footerProgress.style.width = `${percent}%`;
}

/**
 * Пересчёт размера слайда (формула из ТЗ раздел 4.2)
 */
function recalculateSlideSize() {
    const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 70;
    const footerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--footer-height')) || 70;
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 20;
    const maxSlideWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--max-slide-width')) || 1600;
    
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Формула из ТЗ
    const slideHeight = viewportHeight - headerHeight - footerHeight - 2 * gap;
    const slideWidthFromRatio = slideHeight * 16 / 9;
    const slideWidth = Math.min(slideWidthFromRatio, maxSlideWidth, viewportWidth - 2 * gap);
    
    // Применяем размеры ко всем слайдам
    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => {
        slide.style.height = `${slideHeight}px`;
        slide.style.width = `${slideWidth}px`;
    });
    
    console.log(`[recalculateSlideSize] viewport=${viewportWidth}x${viewportHeight}, slide=${slideWidth.toFixed(0)}x${slideHeight.toFixed(0)}`);
}

// ============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================
function setupEventListeners() {
    // Кнопки навигации
    dom.prevBtn.addEventListener('click', () => {
        if (state.currentSlideIndex > 0) {
            goToSlide(state.currentSlideIndex - 1);
        }
    });
    
    dom.nextBtn.addEventListener('click', () => {
        const revealEngine = state.revealEngines[state.currentSlideIndex];
        const currentSlide = CONTENT.slides[state.currentSlideIndex];
        
        // Если есть нераскрытые блоки — открываем следующий
        if (revealEngine && !revealEngine.isCompleted()) {
            revealEngine.revealNext();
            return;
        }
        
        // Иначе переходим к следующему слайду
        if (state.currentSlideIndex < state.totalSlides - 1) {
            goToSlide(state.currentSlideIndex + 1);
        } else {
            // Показ финального экрана
            showFinalScreen();
        }
    });
    
    dom.restartBtn.addEventListener('click', handleRestart);
    
    // Клавиатура
    document.addEventListener('keydown', handleKeyboard);
    
    // Wheel (скролл) для появления блоков
    dom.container.addEventListener('wheel', handleWheel, { passive: true });
    
    // Touch события для свайпа
    setupTouchHandling();
}

/**
 * Обработка клавиатуры
 */
function handleKeyboard(e) {
    const revealEngine = state.revealEngines[state.currentSlideIndex];
    
    switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
            e.preventDefault();
            dom.nextBtn.click();
            break;
        case 'ArrowLeft':
        case 'PageUp':
            e.preventDefault();
            dom.prevBtn.click();
            break;
        case 'ArrowDown':
            if (revealEngine) {
                e.preventDefault();
                revealEngine.revealNext();
            }
            break;
        case 'ArrowUp':
            if (revealEngine) {
                e.preventDefault();
                revealEngine.revealPrev();
            }
            break;
        case 'Enter':
            // Активация выбранного варианта в тесте
            const selectedOption = document.querySelector('.quiz-option.selected');
            if (selectedOption) {
                selectedOption.click();
            }
            break;
    }
}

/**
 * Обработка wheel для появления блоков
 */
function handleWheel(e) {
    const revealEngine = state.revealEngines[state.currentSlideIndex];
    
    if (revealEngine) {
        const result = revealEngine.handleWheel(e.deltaY);
        if (result === 'revealed' || result === 'locked') {
            e.preventDefault();
        }
    }
}

/**
 * Touch handling для свайпа
 */
let touchStartY = 0;
let touchEndY = 0;

function setupTouchHandling() {
    dom.container.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    dom.container.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const diff = touchStartY - touchEndY;
    const threshold = 50;
    
    if (Math.abs(diff) < threshold) return;
    
    const revealEngine = state.revealEngines[state.currentSlideIndex];
    
    if (diff > 0) {
        // Свайп вверх — следующий блок или слайд
        if (revealEngine && !revealEngine.isCompleted()) {
            revealEngine.revealNext();
        } else {
            dom.nextBtn.click();
        }
    } else {
        // Свайп вниз — предыдущий блок
        if (revealEngine) {
            revealEngine.revealPrev();
        }
    }
}

/**
 * Обработка перезапуска
 */
function handleRestart() {
    state.currentSlideIndex = 0;
    state.quizCorrectCount = 0;
    state.isQuizSolved = false;
    
    // Сброс всех reveal engines
    Object.values(state.revealEngines).forEach(engine => engine.reset());
    
    // Сброс видео
    stopActiveVideo();
    
    // Скрытие финального экрана
    dom.finalScreen.classList.add('hidden');
    
    goToSlide(0);
}

/**
 * Показ финального экрана
 */
function showFinalScreen() {
    dom.finalResult.textContent = `Вы ответили верно на ${state.quizCorrectCount} из ${state.totalQuizCount} вопросов`;
    dom.finalScreen.classList.remove('hidden');
}

// ============================================
// ВИДЕО ПЛЕЕР
// ============================================
function initVideoPlayer(slideEl, slideData, index) {
    const video = slideEl.querySelector('video');
    const playOverlay = slideEl.querySelector('.video-play-overlay');
    const controlsContainer = slideEl.querySelector('.video-controls-container');
    
    if (!video || !playOverlay) return;
    
    let isPlaying = false;
    let controlsInitialized = false;
    
    function initControls() {
        if (controlsInitialized) return;
        controlsInitialized = true;
        
        controlsContainer.innerHTML = `
            <div class="video-controls">
                <button class="video-control-btn" id="video-play-${index}">
                    <i data-lucide="play" size="20"></i>
                </button>
                <div class="video-progress-track" id="video-progress-track-${index}">
                    <div class="video-progress-fill" id="video-progress-${index}"></div>
                </div>
                <span class="video-time" id="video-time-${index}">0:00 / 0:00</span>
            </div>
        `;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        const playBtn = controlsContainer.querySelector(`#video-play-${index}`);
        const progressTrack = controlsContainer.querySelector(`#video-progress-track-${index}`);
        const progressFill = controlsContainer.querySelector(`#video-progress-${index}`);
        const timeDisplay = controlsContainer.querySelector(`#video-time-${index}`);
        
        function togglePlay() {
            if (video.paused || video.ended) {
                video.play().then(() => {
                    isPlaying = true;
                    playOverlay.classList.add('hidden');
                    controlsContainer.classList.add('visible');
                    if (playBtn) playBtn.innerHTML = '<i data-lucide="pause" size="20"></i>';
                }).catch(err => console.log('Autoplay prevented:', err));
            } else {
                video.pause();
                isPlaying = false;
                playOverlay.classList.remove('hidden');
                if (playBtn) playBtn.innerHTML = '<i data-lucide="play" size="20"></i>';
            }
        }
        
        function updateProgress() {
            if (video.duration && progressFill && timeDisplay) {
                const percent = (video.currentTime / video.duration) * 100;
                progressFill.style.width = `${percent}%`;
                timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
            }
        }
        
        playOverlay.addEventListener('click', togglePlay);
        if (playBtn) playBtn.addEventListener('click', togglePlay);
        video.addEventListener('click', togglePlay);
        video.addEventListener('timeupdate', updateProgress);
        
        if (progressTrack) {
            progressTrack.addEventListener('click', (e) => {
                const rect = progressTrack.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                video.currentTime = pos * video.duration;
            });
        }
        
        video.addEventListener('ended', () => {
            isPlaying = false;
            playOverlay.classList.remove('hidden');
            if (playBtn) playBtn.innerHTML = '<i data-lucide="play" size="20"></i>';
            video.currentTime = 0;
            if (progressFill) progressFill.style.width = '0%';
        });
        
        video.addEventListener('loadedmetadata', () => {
            if (timeDisplay) {
                timeDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
            }
        });
    }
    
    // Клик по оверлею — старт
    playOverlay.addEventListener('click', () => {
        initControls();
        if (video.paused || video.ended) {
            video.play().then(() => {
                isPlaying = true;
                playOverlay.classList.add('hidden');
                controlsContainer.classList.add('visible');
            }).catch(err => console.log('Autoplay prevented:', err));
        }
    });
    
    // Сохраняем ссылку на видео для остановки при уходе
    slideEl._video = video;
    slideEl._stopVideo = () => {
        if (video) {
            video.pause();
            video.currentTime = 0;
            isPlaying = false;
            playOverlay.classList.remove('hidden');
            controlsContainer.classList.remove('visible');
        }
    };
}

function stopActiveVideo() {
    const activeSlide = document.querySelector('.slide.active');
    if (activeSlide && activeSlide._stopVideo) {
        activeSlide._stopVideo();
    }
}

// ============================================
// QUIZ (ТЕСТЫ)
// ============================================
function initQuiz(slideEl, slideData, index) {
    const quizContainer = slideEl.querySelector('.quiz-container');
    if (!quizContainer) return;
    
    const optionsHTML = slideData.options.map((opt, i) => `
        <div class="quiz-option" data-index="${i}" data-correct="${opt.isCorrect}">
            <span class="quiz-option-letter">${String.fromCharCode(65 + i)}.</span>
            <span class="quiz-option-text">${opt.text}</span>
        </div>
    `).join('');
    
    quizContainer.innerHTML = `
        <h2 class="quiz-question">${slideData.question}</h2>
        <div class="quiz-options">
            ${optionsHTML}
        </div>
        <div class="quiz-feedback"></div>
    `;
    
    const options = quizContainer.querySelectorAll('.quiz-option');
    const feedbackEl = quizContainer.querySelector('.quiz-feedback');
    
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            if (state.isQuizSolved && opt.classList.contains('selected-correct')) {
                return;
            }
            
            const optionIndex = parseInt(opt.dataset.index);
            const optionData = slideData.options[optionIndex];
            const isCorrect = opt.dataset.correct === 'true';
            
            if (isCorrect) {
                // Верный ответ
                state.isQuizSolved = true;
                state.quizCorrectCount++;
                
                options.forEach(o => {
                    o.style.pointerEvents = 'none';
                    o.style.opacity = '0.6';
                });
                
                opt.classList.add('selected-correct');
                opt.style.opacity = '1';
                
                feedbackEl.textContent = optionData.feedback || 'Верно!';
                feedbackEl.className = 'quiz-feedback success';
                feedbackEl.style.display = 'block';
                
                updateNavigationState();
            } else {
                // Неверный ответ
                opt.classList.add('selected-wrong');
                opt.style.pointerEvents = 'none';
                opt.style.opacity = '0.7';
                
                feedbackEl.textContent = optionData.feedback || 'Неверно, попробуйте другой вариант.';
                feedbackEl.className = 'quiz-feedback error';
                feedbackEl.style.display = 'block';
                
                updateNavigationState();
            }
        });
    });
}

// Запуск приложения после полной загрузки ВСЕХ ресурсов (шрифты, картинки, стили)
window.addEventListener('load', () => {
    // Дополнительная гарантия через requestAnimationFrame для отрисовки
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            init();
        });
    });
});
