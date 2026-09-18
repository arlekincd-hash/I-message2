// Глобальные переменные
let slidesData = [];
let currentSlideIndex = 0;
let isQuizSolved = false;
let quizCorrectCount = 0;
let totalQuizCount = 0;

// DOM элементы
const container = document.getElementById('presentation-container');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const progressBar = document.getElementById('progress-bar');
const finalScreen = document.getElementById('final-screen');
const finalResult = document.getElementById('final-result');
const restartBtn = document.getElementById('restart-btn');

// Инициализация - загрузка данных из JSON
async function init() {
    try {
        const response = await fetch('data/content.json');
        if (!response.ok) throw new Error('Не удалось загрузить content.json');
        const data = await response.json();
        
        // Преобразуем данные из JSON в формат для слайдов
        slidesData = data.slides.map(slide => {
            if (slide.type === 'image') {
                return { type: 'image', bg: slide.background };
            } else if (slide.type === 'image-text') {
                const titleBlock = slide.content.find(b => b.type === 'title');
                const highlightBlock = slide.content.find(b => b.type === 'highlight');
                const cards = slide.content.filter(b => b.type === 'card');
                
                return {
                    type: 'text-overlay',
                    bg: slide.background,
                    title: titleBlock ? titleBlock.text : '',
                    blocks: cards.map(c => ({ text: c.text, icon: c.icon || 'message-circle' })),
                    final: highlightBlock ? highlightBlock.text : '',
                    finalVisibleImmediately: highlightBlock ? highlightBlock.visibleImmediately : false
                };
            } else if (slide.type === 'video') {
                return { type: 'video', src: slide.source, poster: slide.poster || '' };
            } else if (slide.type === 'quiz') {
                totalQuizCount++;
                return {
                    type: 'quiz',
                    question: slide.question,
                    options: slide.options.map(opt => ({
                        text: opt.text,
                        correct: opt.isCorrect,
                        feedback: opt.feedback || '',
                        feedbackSuccess: opt.feedbackSuccess || 'Вы ответили верно.',
                        feedbackError: opt.feedbackError || 'Вы ответили неверно.'
                    }))
                };
            }
            return slide;
        });
        
        renderSlides();
        updateSlideState();
        updateProgress();
        
        nextBtn.addEventListener('click', handleNext);
        prevBtn.addEventListener('click', handlePrev);
        restartBtn.addEventListener('click', handleRestart);
        
        // Оптимизация скролла с throttle
        window.addEventListener('scroll', throttle(handleGlobalScroll, 100));
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#FF9D86;">Ошибка загрузки данных. Проверьте файл data/content.json</div>';
    }
}

// Throttle функция для оптимизации событий
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Обработка глобального скролла (колесико, свайпы)
function handleGlobalScroll(e) {
    // Эта функция может быть расширена для поддержки жестов свайпа
}

function renderSlides() {
    container.innerHTML = '';
    slidesData.forEach((slide, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'slide-wrapper';
        wrapper.dataset.index = index;
        
        let contentHTML = '';
        
        if (slide.type === 'image') {
            contentHTML = `<div class="content-box"><img src="${slide.bg}" class="bg-layer" alt="Slide ${index}"></div>`;
        } 
        else if (slide.type === 'text-overlay') {
            let blocksHTML = slide.blocks.map((block, i) => `
                <div class="info-card" data-index="${i}">
                    <div class="icon-box"><i data-lucide="${block.icon}"></i></div>
                    <div class="card-text">${block.text}</div>
                </div>
            `).join('');
            
            contentHTML = `
                <div class="content-box">
                    <img src="${slide.bg}" class="bg-layer" alt="Background">
                    <div class="text-layer" id="text-layer-${index}">
                        <h1 class="slide-title">${slide.title}</h1>
                        ${blocksHTML}
                        <div class="final-statement" data-final="true">${slide.final}</div>
                    </div>
                </div>
            `;
        }
        else if (slide.type === 'video') {
            contentHTML = `
                <div class="content-box">
                    <div class="video-container">
                        <video id="video-${index}" preload="metadata" poster="${slide.poster}">
                            <source src="${slide.src}" type="video/webm">
                            Ваш браузер не поддерживает видео.
                        </video>
                        <div class="play-btn-overlay" id="play-overlay-${index}">
                            <i data-lucide="play" size="40" fill="white"></i>
                        </div>
                        <div class="video-controls" id="video-controls-${index}">
                            <button class="video-control-btn" id="video-play-${index}">
                                <i data-lucide="play" size="20"></i>
                            </button>
                            <div class="video-progress-track" id="video-progress-track-${index}">
                                <div class="video-progress-fill" id="video-progress-${index}"></div>
                            </div>
                            <span class="video-time" id="video-time-${index}">0:00 / 0:00</span>
                        </div>
                    </div>
                </div>
            `;
        }
        else if (slide.type === 'quiz') {
            let optionsHTML = slide.options.map((opt, i) => `
                <div class="quiz-option" data-correct="${opt.correct}" data-index="${i}">
                    <span style="font-weight:700; margin-right:10px;">${String.fromCharCode(65 + i)}.</span> ${opt.text}
                </div>
            `).join('');
            
            contentHTML = `
                <div class="content-box">
                    <div class="quiz-container">
                        <h2 class="quiz-question">${slide.question}</h2>
                        <div class="quiz-options">
                            ${optionsHTML}
                        </div>
                        <div class="quiz-feedback" id="feedback-${index}"></div>
                    </div>
                </div>
            `;
        }
        
        wrapper.innerHTML = contentHTML;
        container.appendChild(wrapper);
        lucide.createIcons();
        
        if (slide.type === 'video') setupVideo(index);
        if (slide.type === 'quiz') setupQuiz(index, slide);
        if (slide.type === 'text-overlay') setupScrollListener(index);
    });
}

function updateSlideState() {
    // Останавливаем видео на всех слайдах кроме текущего
    document.querySelectorAll('video').forEach((video, idx) => {
        if (idx !== currentSlideIndex) {
            video.pause();
            video.currentTime = 0;
        }
    });
    
    // Скрываем контролы видео на неактивных слайдах
    document.querySelectorAll('.video-controls').forEach(ctrl => {
        ctrl.style.opacity = '0';
    });
    
    // Обновляем классы видимости слайдов
    const slides = document.querySelectorAll('.slide-wrapper');
    slides.forEach((slide, idx) => {
        slide.classList.remove('active', 'prev', 'next');
        if (idx === currentSlideIndex) slide.classList.add('active');
        else if (idx < currentSlideIndex) slide.classList.add('prev');
        else slide.classList.add('next');
    });
    
    // Сброс состояния
    isQuizSolved = false;
    const currentData = slidesData[currentSlideIndex];
    
    // Обновляем состояние кнопок навигации
    prevBtn.disabled = currentSlideIndex === 0;
    
    if (currentData.type === 'quiz') {
        nextBtn.disabled = true;
        nextBtn.innerHTML = 'Выберите вариант ответа <i data-lucide="lock"></i>';
        lucide.createIcons();
        
        // Сброс стилей теста
        const wrapper = document.querySelector(`.slide-wrapper[data-index="${currentSlideIndex}"]`);
        if(wrapper) {
            wrapper.querySelectorAll('.quiz-option').forEach(opt => {
                opt.classList.remove('selected-correct', 'selected-wrong');
                opt.style.pointerEvents = 'auto';
                opt.style.opacity = '1';
            });
            const feedback = wrapper.querySelector('.quiz-feedback');
            feedback.style.display = 'none';
            feedback.textContent = '';
        }
    } else if (currentData.type === 'video') {
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
        lucide.createIcons();
        
        // Показываем контролы видео для текущего слайда
        const controls = document.getElementById(`video-controls-${currentSlideIndex}`);
        if (controls) controls.style.opacity = '1';
    } else {
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
        lucide.createIcons();
        
        // Сброс скролла и видимости блоков для текстового слайда
        const textLayer = document.getElementById(`text-layer-${currentSlideIndex}`);
        if (textLayer) {
            textLayer.scrollTop = 0;
            textLayer.querySelectorAll('.info-card, .final-statement').forEach(el => {
                el.classList.remove('visible');
            });
            // Показываем первый блок сразу для удобства
            setTimeout(() => {
                const firstCard = textLayer.querySelector('.info-card');
                if(firstCard) firstCard.classList.add('visible');
            }, 300);
        }
    }
    
    updateProgress();
}

function handleNext() {
    if (currentSlideIndex < slidesData.length - 1) {
        currentSlideIndex++;
        updateSlideState();
    } else {
        // Показываем финальный экран
        showFinalScreen();
    }
}

function handlePrev() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        updateSlideState();
    }
}

function handleRestart() {
    currentSlideIndex = 0;
    quizCorrectCount = 0;
    isQuizSolved = false;
    finalScreen.classList.add('hidden');
    
    // Сброс всех видео
    document.querySelectorAll('video').forEach(video => {
        video.pause();
        video.currentTime = 0;
    });
    
    updateSlideState();
}

function showFinalScreen() {
    finalResult.textContent = `Вы ответили верно на ${quizCorrectCount} из ${totalQuizCount} вопросов`;
    finalScreen.classList.remove('hidden');
}

function setupScrollListener(index) {
    const textLayer = document.getElementById(`text-layer-${index}`);
    if (!textLayer) return;
    
    // Используем throttle для оптимизации
    const throttledScroll = throttle(() => {
        const scrollTop = textLayer.scrollTop;
        const cards = textLayer.querySelectorAll('.info-card');
        const finalStmt = textLayer.querySelector('.final-statement');
        const slideData = slidesData[index];
        
        // Логика появления карточек по мере скролла
        cards.forEach((card, i) => {
            // Каждая карточка появляется после прокрутки определенного порога
            const threshold = i * 120;
            if (scrollTop >= threshold - 50) {
                card.classList.add('visible');
            }
        });
        
        // Финальная фраза появляется после всех карточек
        const finalThreshold = cards.length * 120 + 50;
        if (scrollTop >= finalThreshold) {
            finalStmt.classList.add('visible');
        }
    }, 50);
    
    textLayer.addEventListener('scroll', throttledScroll);
}

function setupVideo(index) {
    const video = document.getElementById(`video-${index}`);
    const overlay = document.getElementById(`play-overlay-${index}`);
    const playBtn = document.getElementById(`video-play-${index}`);
    const progressTrack = document.getElementById(`video-progress-track-${index}`);
    const progressFill = document.getElementById(`video-progress-${index}`);
    const timeDisplay = document.getElementById(`video-time-${index}`);
    
    if (!video || !overlay || !playBtn) return;

    // Форматирование времени
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Обновление прогресс-бара и времени
    function updateVideoProgress() {
        if (video.duration) {
            const percent = (video.currentTime / video.duration) * 100;
            progressFill.style.width = `${percent}%`;
            timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
    }

    // Переключение play/pause
    function togglePlay() {
        if (video.paused || video.ended) {
            video.play().then(() => {
                overlay.classList.add('hidden');
                playBtn.innerHTML = '<i data-lucide="pause" size="20"></i>';
                lucide.createIcons();
            }).catch(err => console.log('Autoplay prevented:', err));
        } else {
            video.pause();
            overlay.classList.remove('hidden');
            playBtn.innerHTML = '<i data-lucide="play" size="20"></i>';
            lucide.createIcons();
        }
    }

    // Клик по оверлею
    overlay.addEventListener('click', togglePlay);
    
    // Клик по кнопке play/pause
    playBtn.addEventListener('click', togglePlay);
    
    // Клик по видео
    video.addEventListener('click', togglePlay);
    
    // Обновление прогресса
    video.addEventListener('timeupdate', updateVideoProgress);
    
    // Клик по прогресс-бару для перемотки
    if (progressTrack) {
        progressTrack.addEventListener('click', (e) => {
            const rect = progressTrack.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
        });
    }
    
    // Видео закончилось
    video.addEventListener('ended', () => {
        overlay.classList.remove('hidden');
        playBtn.innerHTML = '<i data-lucide="play" size="20"></i>';
        lucide.createIcons();
        video.currentTime = 0;
        progressFill.style.width = '0%';
    });
    
    // Метаданные загружены
    video.addEventListener('loadedmetadata', () => {
        timeDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
    });
}

function setupQuiz(index, slideData) {
    const wrapper = document.querySelector(`.slide-wrapper[data-index="${index}"]`);
    if (!wrapper) return;
    
    const options = wrapper.querySelectorAll('.quiz-option');
    const feedbackEl = wrapper.querySelector('.quiz-feedback');
    
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            // Если уже решено правильно и кликнули на правильный - ничего не делаем
            if (isQuizSolved && opt.classList.contains('selected-correct')) return;
            
            const optionIndex = parseInt(opt.dataset.index);
            const optionData = slideData.options[optionIndex];
            const isCorrect = opt.dataset.correct === 'true';
            
            if (isCorrect) {
                // Верный ответ
                isQuizSolved = true;
                quizCorrectCount++;
                
                // Блокируем все варианты
                options.forEach(o => {
                    o.style.pointerEvents = 'none';
                    o.style.opacity = '0.6';
                });
                
                // Подсвечиваем правильный
                opt.classList.add('selected-correct');
                opt.style.opacity = '1';
                
                // Показываем сообщение
                feedbackEl.textContent = optionData.feedbackSuccess;
                feedbackEl.className = 'quiz-feedback success';
                feedbackEl.style.display = 'block';
                
                // Разблокируем кнопку Далее
                nextBtn.disabled = false;
                nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
                lucide.createIcons();
            } else {
                // Неверный ответ
                opt.classList.add('selected-wrong');
                opt.style.pointerEvents = 'none';
                opt.style.opacity = '0.7';
                
                // Показываем подсказку
                feedbackEl.textContent = optionData.feedbackError || optionData.feedback;
                feedbackEl.className = 'quiz-feedback error';
                feedbackEl.style.display = 'block';
                
                // Блокируем кнопку Далее
                nextBtn.disabled = true;
                nextBtn.innerHTML = 'Попробуйте другой вариант <i data-lucide="lock"></i>';
                lucide.createIcons();
            }
        });
    });
}

function updateProgress() {
    const percent = ((currentSlideIndex + 1) / slidesData.length) * 100;
    progressBar.style.width = `${percent}%`;
}

// Запуск приложения
init();
