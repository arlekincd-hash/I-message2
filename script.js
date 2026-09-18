// Данные презентации
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
let quizCorrectCount = 0;
let isCurrentSlideCompleted = false; // Для блокировки перехода

const container = document.getElementById('presentation-container');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');

function init() {
    renderSlides();
    updateSlideVisibility();
    updateProgress();
    
    nextBtn.addEventListener('click', handleNext);
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
                    <span style="font-weight:bold; color:var(--accent-blue)">${String.fromCharCode(65 + i)}</span> 
                    ${opt.text}
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
        
        // Перерисовка иконок
        lucide.createIcons();
        
        // Навешиваем обработчики
        if (slide.type === 'video') setupVideo(index);
        if (slide.type === 'quiz') setupQuiz(index, slide);
        if (slide.type === 'text-overlay') setupTextScroll(index);
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
    
    const currentSlideData = slidesData[currentSlideIndex];
    isCurrentSlideCompleted = false;
    
    // Сброс состояния кнопки
    if (currentSlideData.type === 'quiz') {
        nextBtn.disabled = true;
        nextBtn.innerHTML = 'Ответьте на вопрос';
    } else if (currentSlideData.type === 'video') {
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
        lucide.createIcons();
    } else {
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
        lucide.createIcons();
        
        // Сброс скролла для текстового слайда
        if (currentSlideData.type === 'text-overlay') {
            const textLayer = document.getElementById(`text-layer-${currentSlideIndex}`);
            if (textLayer) {
                textLayer.scrollTop = 0;
                // Скрываем все блоки, кроме заголовка, при входе
                textLayer.querySelectorAll('.info-card, .final-statement').forEach(el => el.classList.remove('visible'));
                // Показываем первый блок сразу (опционально, или по скролу)
                // По ТЗ: "что то сразу на слайде". Пусть будет заголовок + первый блок виден сразу?
                // Или первый блок появляется при легком скролле. Оставим логику скролла.
                setTimeout(() => handleTextScroll(currentSlideIndex), 100);
            }
        }
    }
    
    updateProgress();
}

function handleNext() {
    if (currentSlideIndex < slidesData.length - 1) {
        currentSlideIndex++;
        updateSlideVisibility();
    } else {
        alert(`Презентация завершена! Вы ответили верно на ${quizCorrectCount} из 1 вопроса.`);
    }
}

// Логика скролла внутри текстового слайда
function setupTextScroll(index) {
    const textLayer = document.getElementById(`text-layer-${index}`);
    if (!textLayer) return;
    
    textLayer.addEventListener('scroll', () => handleTextScroll(index));
}

function handleTextScroll(index) {
    const textLayer = document.getElementById(`text-layer-${index}`);
    if (!textLayer) return;
    
    const scrollTop = textLayer.scrollTop;
    const cards = textLayer.querySelectorAll('.info-card');
    const finalStmt = textLayer.querySelector('.final-statement');
    
    // Порог появления блоков (каждые 100px скролла открывает новый блок)
    cards.forEach((card, idx) => {
        if (scrollTop > (idx * 80)) {
            card.classList.add('visible');
        } else {
            card.classList.remove('visible'); // Можно убрать, если хотим чтобы оставались
        }
    });
    
    // Появление финальной фразы в конце
    if (scrollTop > (cards.length * 80) + 50) {
        finalStmt.classList.add('visible');
    }
}

function setupVideo(index) {
    const video = document.getElementById(`video-${index}`);
    const overlay = document.getElementById(`play-overlay-${index}`);
    
    if (!video || !overlay) return;
    
    overlay.addEventListener('click', () => {
        video.play();
        overlay.classList.add('hidden');
    });
    
    video.addEventListener('pause', () => {
        if (!video.ended) overlay.classList.remove('hidden');
    });
    video.addEventListener('play', () => overlay.classList.add('hidden'));
}

function setupQuiz(index, slideData) {
    // Находим обертку текущего слайда
    const wrapper = document.querySelector(`.slide-wrapper[data-index="${index}"]`);
    if (!wrapper) return;
    
    const quizOptions = wrapper.querySelectorAll('.quiz-option');
    const feedbackEl = wrapper.querySelector('.quiz-feedback');
    let answeredCorrectly = false;
    
    quizOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            if (answeredCorrectly) return; // Если уже верно ответили, клики игнорируем
            
            const isCorrect = opt.dataset.correct === 'true';
            
            if (isCorrect) {
                // Верный ответ
                answeredCorrectly = true;
                isCurrentSlideCompleted = true;
                
                // Визуал
                quizOptions.forEach(o => o.style.pointerEvents = 'none'); // Блокируем все
                opt.classList.add('selected-correct');
                
                feedbackEl.textContent = slideData.feedbackCorrect;
                feedbackEl.className = 'quiz-feedback success';
                
                quizCorrectCount++;
                
                // Разблокируем кнопку Далее
                nextBtn.disabled = false;
                nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
                lucide.createIcons();
                
            } else {
                // Неверный ответ
                opt.classList.add('selected-wrong');
                // Остальные остаются активными для повторной попытки
                
                feedbackEl.textContent = slideData.feedbackWrong;
                feedbackEl.className = 'quiz-feedback error';
                
                // Кнопка Далее заблокирована
                nextBtn.disabled = true;
                nextBtn.innerHTML = 'Попробуйте другой вариант';
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
