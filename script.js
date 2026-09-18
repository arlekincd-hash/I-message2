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
let isQuizSolved = false;
let quizCorrectCount = 0;

const container = document.getElementById('presentation-container');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');

function init() {
    renderSlides();
    updateSlideState();
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
            contentHTML = `<div class="content-box"><img src="${slide.bg}" class="bg-layer" alt="Slide ${index}"></div>`;
        } 
        else if (slide.type === 'text-overlay') {
            let blocksHTML = slide.blocks.map((block, i) => `
                <div class="info-card" data-index="${i}">
                    <div class="icon-box"><i data-lucide="message-circle"></i></div>
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
                        <video id="video-${index}" preload="metadata">
                            <source src="${slide.src}" type="video/webm">
                            Ваш браузер не поддерживает видео.
                        </video>
                        <div class="play-btn-overlay" id="play-overlay-${index}">
                            <i data-lucide="play" size="40" fill="white"></i>
                        </div>
                    </div>
                </div>
            `;
        }
        else if (slide.type === 'quiz') {
            let optionsHTML = slide.options.map((opt, i) => `
                <div class="quiz-option" data-correct="${opt.correct}">
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
    // 1. Останавливаем видео на предыдущем слайде (если было)
    const prevVideo = document.querySelector(`video:not(#video-${currentSlideIndex})`);
    if (prevVideo) {
        prevVideo.pause();
        prevVideo.currentTime = 0; // Сброс в начало (опционально)
    }
    
    // Обновляем классы видимости
    const slides = document.querySelectorAll('.slide-wrapper');
    slides.forEach((slide, idx) => {
        slide.classList.remove('active', 'prev', 'next');
        if (idx === currentSlideIndex) slide.classList.add('active');
        else if (idx < currentSlideIndex) slide.classList.add('prev');
        else slide.classList.add('next');
    });
    
    // Сброс состояния кнопки и переменных
    const currentData = slidesData[currentSlideIndex];
    isQuizSolved = false;
    
    if (currentData.type === 'quiz') {
        nextBtn.disabled = true;
        nextBtn.innerHTML = 'Выберите вариант ответа';
        // Сброс стилей теста
        const wrapper = document.querySelector(`.slide-wrapper[data-index="${currentSlideIndex}"]`);
        if(wrapper) {
            wrapper.querySelectorAll('.quiz-option').forEach(opt => {
                opt.classList.remove('selected-correct', 'selected-wrong');
                opt.style.pointerEvents = 'auto';
            });
            wrapper.querySelector('.quiz-feedback').style.display = 'none';
        }
    } else if (currentData.type === 'video') {
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
        lucide.createIcons();
    } else {
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
        lucide.createIcons();
        
        // Сброс скролла и видимости блоков для текстового слайда
        const textLayer = document.getElementById(`text-layer-${currentSlideIndex}`);
        if (textLayer) {
            textLayer.scrollTop = 0;
            textLayer.querySelectorAll('.info-card, .final-statement').forEach(el => el.classList.remove('visible'));
            // Показываем первый блок сразу? Нет, по логике "по скролу". 
            // Но чтобы пользователь понял, что можно скроллить, покажем хотя бы заголовок (он всегда виден)
            // А первый блок появится при первом движении скролла или можно показать сразу:
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
        alert(`Курс завершен! Правильных ответов: ${quizCorrectCount} из 1.`);
    }
}

function setupScrollListener(index) {
    const textLayer = document.getElementById(`text-layer-${index}`);
    if (!textLayer) return;
    
    textLayer.addEventListener('scroll', () => {
        const scrollTop = textLayer.scrollTop;
        const cards = textLayer.querySelectorAll('.info-card');
        const finalStmt = textLayer.querySelector('.final-statement');
        
        // Логика появления: чем ниже скролл, тем больше блоков видно
        cards.forEach((card, i) => {
            // Порог срабатывания: каждый следующий блок появляется после прокрутки ~150px от предыдущего
            if (scrollTop > (i * 100) - 50) {
                card.classList.add('visible');
            }
        });
        
        if (scrollTop > (cards.length * 100) + 100) {
            finalStmt.classList.add('visible');
        }
    });
}

function setupVideo(index) {
    const video = document.getElementById(`video-${index}`);
    const overlay = document.getElementById(`play-overlay-${index}`);
    
    if (!video || !overlay) return;

    const togglePlay = () => {
        if (video.paused) {
            video.play();
            overlay.classList.add('hidden');
        } else {
            video.pause();
            overlay.classList.remove('hidden');
        }
    };

    overlay.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);
    
    // Если видео кончилось, показываем кнопку снова
    video.addEventListener('ended', () => {
        overlay.classList.remove('hidden');
    });
}

function setupQuiz(index, slideData) {
    const wrapper = document.querySelector(`.slide-wrapper[data-index="${index}"]`);
    const options = wrapper.querySelectorAll('.quiz-option');
    const feedbackEl = wrapper.querySelector('.quiz-feedback');
    
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            if (isQuizSolved && opt.classList.contains('selected-correct')) return;
            
            const isCorrect = opt.dataset.correct === 'true';
            
            if (isCorrect) {
                // Верно
                isQuizSolved = true;
                quizCorrectCount++;
                
                options.forEach(o => o.style.pointerEvents = 'none'); // Блокируем все
                opt.classList.add('selected-correct');
                
                feedbackEl.textContent = slideData.feedbackCorrect;
                feedbackEl.className = 'quiz-feedback success';
                
                nextBtn.disabled = false;
                nextBtn.innerHTML = 'Далее <i data-lucide="arrow-down"></i>';
                lucide.createIcons();
            } else {
                // Неверно
                opt.classList.add('selected-wrong');
                feedbackEl.textContent = slideData.feedbackWrong;
                feedbackEl.className = 'quiz-feedback error';
                
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

init();
