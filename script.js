// Данные презентации (можно расширять)
const slidesData = [
    {
        type: 'image',
        bg: 'data/slide_00.jpg'
    },
    {
        type: 'text-overlay',
        bg: 'data/slide_01.jpg',
        title: 'Иллюзия обратной связи',
        blocks: [
            { text: 'То, что мы привыкли называть обратной связью, чаще всего является скрытой критикой или оценкой личности.' },
            { text: 'Настоящая обратная связь — это не похвала и не ругань. Это нейтральная информация о том, как действия одного человека влияют на другого.' },
            { text: 'В российской корпоративной и бытовой культуре мы с детства привыкли подменять понятия. Когда мы говорим «ты плохо сделал» или «ты молодец», мы оцениваем личность, а не поступок. Это запускает у собеседника не желание улучшиться, а желание защититься или, наоборот, расслабиться и перестать стараться. Чтобы научиться давать конструктивную обратную связь, нужно сначала отказаться от роли «судьи» и перейти в роль «наблюдателя», который просто фиксирует факты и их последствия.' }
        ],
        final: 'Откажитесь от роли "судьи" - станьте "наблюдателем"'
    },
    {
        type: 'video',
        src: 'data/video2.webm'
    },
    {
        type: 'quiz',
        question: 'Что является главной целью конструктивной обратной связи, в отличие от критики?',
        options: [
            { text: 'Вежливо указать человеку на его ошибки, чтобы он исправился.', correct: false },
            { text: 'Заставить собеседника почувствовать вину и в следующий раз вести себя иначе.', correct: false },
            { text: 'Использовать психологическую манипуляцию для получения желаемого результата.', correct: false },
            { text: 'Дать корректно информацию о том, как действия человека влияют на вас и/или рабочий процесс, без оценки его личности, с целью корректировки или закрепления результата.', correct: true }
        ],
        feedbackCorrect: 'Вы ответили верно.',
        feedbackWrong: 'Вы ответили неверно. Обратная связь — это информация о влиянии, а не приговор личности. Прочие варианты описывают скрытую агрессию или манипуляцию, которые запускают защиту, а не диалог.'
    }
];

let currentSlideIndex = 0;
let isQuizAnswered = false;
let quizCorrectCount = 0;

const container = document.getElementById('presentation-container');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');

// Инициализация
function init() {
    renderSlides();
    updateSlideVisibility();
    updateProgress();
    
    nextBtn.addEventListener('click', handleNext);
    
    // Обработка скролла внутри слайда для появления текста
    container.addEventListener('scroll', handleInternalScroll, { passive: true });
}

function renderSlides() {
    container.innerHTML = '';
    slidesData.forEach((slide, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'slide-wrapper';
        wrapper.dataset.index = index;
        
        let contentHTML = '';
        
        if (slide.type === 'image') {
            contentHTML = `<img src="${slide.bg}" class="bg-layer" alt="Slide ${index}">`;
        } 
        else if (slide.type === 'text-overlay') {
            let blocksHTML = slide.blocks.map((block, i) => `
                <div class="info-card" data-index="${i}">
                    <div class="icon-box"><i data-lucide="message-square"></i></div>
                    <div class="card-text">${block.text}</div>
                </div>
            `).join('');
            
            contentHTML = `
                <img src="${slide.bg}" class="bg-layer" alt="Background">
                <div class="text-layer" id="text-layer-${index}">
                    <h1 class="slide-title">${slide.title}</h1>
                    ${blocksHTML}
                    <div class="final-statement" data-final="true">${slide.final}</div>
                </div>
            `;
        }
        else if (slide.type === 'video') {
            contentHTML = `
                <div class="video-container">
                    <video id="video-${index}" controlsList="nodownload">
                        <source src="${slide.src}" type="video/webm">
                        Ваш браузер не поддерживает видео.
                    </video>
                    <div class="play-btn-overlay" id="play-overlay-${index}">
                        <i data-lucide="play" size="40" fill="white"></i>
                    </div>
                </div>
            `;
        }
        else if (slide.type === 'quiz') {
            let optionsHTML = slide.options.map((opt, i) => `
                <div class="quiz-option" data-index="${i}" data-correct="${opt.correct}">
                    <span>${String.fromCharCode(65 + i)}</span> - ${opt.text}
                </div>
            `).join('');
            
            contentHTML = `
                <div class="quiz-container">
                    <h2 class="quiz-question">${slide.question}</h2>
                    <div class="quiz-options">
                        ${optionsHTML}
                    </div>
                    <div class="quiz-feedback" id="feedback-${index}"></div>
                </div>
            `;
        }
        
        wrapper.innerHTML = contentHTML;
        container.appendChild(wrapper);
        
        // Перерисовка иконок для нового контента
        lucide.createIcons();
        
        // Навешиваем обработчики для видео и тестов
        if (slide.type === 'video') setupVideo(index);
        if (slide.type === 'quiz') setupQuiz(index, slide);
    });
}

function updateSlideVisibility() {
    const slides = document.querySelectorAll('.slide-wrapper');
    slides.forEach((slide, idx) => {
        slide.classList.remove('active', 'prev', 'next');
        if (idx === currentSlideIndex) {
            slide.classList.add('active');
        } else if (idx < currentSlideIndex) {
            slide.classList.add('prev');
        } else {
            slide.classList.add('next');
        }
    });
    
    // Сброс состояния кнопки и скролла
    const currentSlideData = slidesData[currentSlideIndex];
    isQuizAnswered = false;
    
    if (currentSlideData.type === 'quiz') {
        nextBtn.disabled = true; // Блокируем пока не ответят
        nextBtn.innerHTML = 'Ответьте на вопрос';
    } else {
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
        lucide.createIcons();
        
        // Сброс скролла внутри текстового слайда
        const textLayer = document.getElementById(`text-layer-${currentSlideIndex}`);
        if (textLayer) {
            textLayer.scrollTop = 0;
            // Скрываем все блоки кроме заголовка initially? 
            // Нет, по ТЗ первый виден сразу, остальные по скролу.
            // Но так как мы сбрасываем скролл вверх, логика handleInternalScroll сама покажет первый блок.
            handleInternalScroll(); 
        }
    }
    
    updateProgress();
}

function handleNext() {
    if (currentSlideIndex < slidesData.length - 1) {
        currentSlideIndex++;
        updateSlideVisibility();
    } else {
        // Конец презентации
        alert(`Презентация завершена! Вы ответили верно на ${quizCorrectCount} из 1 вопроса (в демо-режиме).`);
    }
}

function handleInternalScroll() {
    const currentSlideData = slidesData[currentSlideIndex];
    if (currentSlideData.type !== 'text-overlay') return;
    
    const textLayer = document.getElementById(`text-layer-${currentSlideIndex}`);
    if (!textLayer) return;
    
    const scrollTop = textLayer.scrollTop;
    const threshold = 100; // Порог срабатывания
    
    // Показываем блоки по мере скролла
    const cards = textLayer.querySelectorAll('.info-card');
    cards.forEach((card, idx) => {
        // Простая логика: если проскроллили достаточно далеко, показываем следующий
        // Или можно привязать к положению элемента относительно верха
        if (scrollTop > (idx * 80)) { 
            card.classList.add('visible');
        }
    });
    
    const finalStmt = textLayer.querySelector('.final-statement');
    if (scrollTop > (cards.length * 80) + 50) {
        finalStmt.classList.add('visible');
    }
}

function setupVideo(index) {
    const video = document.getElementById(`video-${index}`);
    const overlay = document.getElementById(`play-overlay-${index}`);
    
    overlay.addEventListener('click', () => {
        video.play();
        overlay.classList.add('hidden');
    });
    
    video.addEventListener('pause', () => {
        if (!video.ended) {
            overlay.classList.remove('hidden');
        }
    });
    
    video.addEventListener('play', () => {
        overlay.classList.add('hidden');
    });
}

function setupQuiz(index, slideData) {
    const options = document.querySelectorAll(`#text-layer-${index} .quiz-option, .slide-wrapper[data-index="${index}"] .quiz-option`);
    // Исправленный селектор, так как quiz-container внутри wrapper
    const wrapper = document.querySelector(`.slide-wrapper[data-index="${index}"]`);
    const quizOptions = wrapper.querySelectorAll('.quiz-option');
    const feedbackEl = wrapper.querySelector('.quiz-feedback');
    
    quizOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            if (isQuizAnswered && opt.classList.contains('selected-correct')) return; // Уже отвечено верно
            
            const isCorrect = opt.dataset.correct === 'true';
            
            // Сброс предыдущих стилей если это новая попытка (но неправильные остаются красными по ТЗ)
            // По ТЗ: неправильный остается красным, можно выбрать другой.
            
            if (isCorrect) {
                // Верный ответ
                quizOptions.forEach(o => o.style.pointerEvents = 'none'); // Блокируем дальнейшие клики
                opt.classList.add('selected-correct');
                feedbackEl.textContent = slideData.feedbackCorrect;
                feedbackEl.className = 'quiz-feedback success';
                isQuizAnswered = true;
                quizCorrectCount++;
                
                nextBtn.disabled = false;
                nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
                lucide.createIcons();
            } else {
                // Неверный ответ
                opt.classList.add('selected-wrong');
                feedbackEl.textContent = slideData.feedbackWrong;
                feedbackEl.className = 'quiz-feedback error';
                // Кнопка Далее остается заблокированной
                nextBtn.disabled = true;
                nextBtn.innerHTML = 'Попробуйте еще раз';
            }
        });
    });
}

function updateProgress() {
    const percent = ((currentSlideIndex + 1) / slidesData.length) * 100;
    progressBar.style.width = `${percent}%`;
}

// Запуск
init();
