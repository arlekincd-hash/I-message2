// ========================================
// PRESENTATION LOGIC
// ========================================

class Presentation {
    constructor() {
        this.currentSlideIndex = 0;
        this.slides = [];
        this.quizScore = 0;
        this.quizTotal = 0;
        this.content = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Загрузка контента из JSON
            const response = await fetch('data/content.json');
            this.content = await response.json();
            
            // Обновление заголовков и контактов
            document.querySelector('.course-title').textContent = this.content.courseTitle;
            document.querySelector('.author-name').textContent = this.content.author;
            document.querySelector('.creator-contacts').textContent = this.content.creatorContacts;
            
            // Генерация слайдов
            this.generateSlides();
            
            // Инициализация индикаторов
            this.createIndicators();
            
            // Показать первый слайд
            this.showSlide(0);
            
            // Обработчик кнопки "Далее"
            document.getElementById('nextBtn').addEventListener('click', () => this.nextSlide());
            
            // Инициализация иконок Lucide
            if (window.lucide) {
                lucide.createIcons();
            }
            
            console.log('Презентация успешно инициализирована');
        } catch (error) {
            console.error('Ошибка загрузки презентации:', error);
        }
    }
    
    generateSlides() {
        const container = document.getElementById('presentation');
        container.innerHTML = '';
        
        this.slides = this.content.slides.map((slideData, index) => {
            const slideElement = document.createElement('div');
            slideElement.className = 'slide';
            slideElement.dataset.index = index;
            
            let contentHTML = '';
            
            switch (slideData.type) {
                case 'image':
                    contentHTML = this.createImageSlide(slideData);
                    break;
                case 'image-text':
                    contentHTML = this.createImageTextSlide(slideData);
                    break;
                case 'video':
                    contentHTML = this.createVideoSlide(slideData);
                    break;
                case 'quiz':
                    contentHTML = this.createQuizSlide(slideData, index);
                    break;
                default:
                    contentHTML = '<div class="slide-content-wrapper">Неизвестный тип слайда</div>';
            }
            
            slideElement.innerHTML = contentHTML;
            container.appendChild(slideElement);
            
            return {
                element: slideElement,
                data: slideData,
                currentContentIndex: 0,
                isComplete: false
            };
        });
    }
    
    createImageSlide(slideData) {
        return `
            <div class="slide-content-wrapper">
                <img src="${slideData.background}" alt="Слайд ${this.currentSlideIndex + 1}" class="slide-bg-image">
            </div>
        `;
    }
    
    createImageTextSlide(slideData) {
        let contentItemsHTML = '';
        
        slideData.content.forEach((item, index) => {
            if (item.type === 'title') {
                contentItemsHTML += `
                    <h2 class="slide-title ${item.visibleImmediately ? 'visible' : ''}" data-index="${index}">
                        ${item.text}
                    </h2>
                `;
            } else if (item.type === 'card') {
                const iconMap = {
                    'alert-circle': 'AlertCircle',
                    'info': 'Info',
                    'book-open': 'BookOpen',
                    'check': 'Check',
                    'x': 'X',
                    'help-circle': 'HelpCircle'
                };
                
                contentItemsHTML += `
                    <div class="info-card variant-${item.colorVariant || 1} ${item.visibleImmediately ? 'visible' : ''}" data-index="${index}">
                        <i data-lucide="${item.icon || 'info'}" class="info-card-icon"></i>
                        <p class="info-card-text">${item.text}</p>
                    </div>
                `;
            } else if (item.type === 'highlight') {
                contentItemsHTML += `
                    <div class="highlight-block ${item.visibleImmediately ? 'visible' : ''}" data-index="${index}">
                        ${item.text}
                    </div>
                `;
            }
        });
        
        return `
            <div class="slide-content-wrapper">
                <div class="slide-bg-with-text">
                    <img src="${slideData.background}" alt="Фон слайда" class="slide-bg-image-text">
                    <div class="text-overlay-container">
                        ${contentItemsHTML}
                    </div>
                </div>
            </div>
        `;
    }
    
    createVideoSlide(slideData) {
        return `
            <div class="slide-content-wrapper">
                <div class="video-slide-container">
                    <video class="video-element" controls poster="${slideData.poster || ''}">
                        <source src="${slideData.source}" type="video/webm">
                        <source src="${slideData.source.replace('.webm', '.mp4')}" type="video/mp4">
                        Ваш браузер не поддерживает видео.
                    </video>
                </div>
            </div>
        `;
    }
    
    createQuizSlide(slideData, slideIndex) {
        this.quizTotal++;
        
        let optionsHTML = '';
        slideData.options.forEach((option, optIndex) => {
            optionsHTML += `
                <div class="quiz-option" data-option-index="${optIndex}" data-slide-index="${slideIndex}">
                    ${option.text}
                </div>
            `;
        });
        
        return `
            <div class="slide-content-wrapper">
                <div class="quiz-container">
                    <h2 class="quiz-question">${slideData.question}</h2>
                    <div class="quiz-options">
                        ${optionsHTML}
                    </div>
                    <div class="quiz-feedback" id="feedback-${slideIndex}"></div>
                </div>
            </div>
        `;
    }
    
    createIndicators() {
        const indicatorsContainer = document.getElementById('slideIndicators');
        indicatorsContainer.innerHTML = '';
        
        this.slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'indicator-dot';
            dot.dataset.index = index;
            indicatorsContainer.appendChild(dot);
        });
    }
    
    showSlide(index) {
        if (index < 0 || index >= this.slides.length) return;
        
        // Скрыть все слайды
        this.slides.forEach(slide => {
            slide.element.classList.remove('active');
        });
        
        // Показать текущий слайд
        const currentSlide = this.slides[index];
        currentSlide.element.classList.add('active');
        
        // Обновить прогресс бар
        this.updateProgress(index);
        
        // Обновить индикаторы
        this.updateIndicators(index);
        
        // Инициализировать контент слайда
        this.initializeSlideContent(currentSlide);
        
        // Переинициализировать иконки
        if (window.lucide) {
            lucide.createIcons();
        }
        
        this.currentSlideIndex = index;
        
        // Обновить состояние кнопки "Далее"
        this.updateNextButton();
    }
    
    initializeSlideContent(slide) {
        if (slide.data.type === 'image-text') {
            // Показываем элементы по порядку при нажатии кнопки "Далее"
            const textContainer = slide.element.querySelector('.text-overlay-container');
            if (textContainer) {
                const items = textContainer.querySelectorAll('.slide-title, .info-card, .highlight-block');
                
                // Показываем только те, что должны быть видны сразу
                items.forEach(item => {
                    const dataIndex = parseInt(item.dataset.index);
                    const contentItem = slide.data.content[dataIndex];
                    
                    if (contentItem && contentItem.visibleImmediately) {
                        item.classList.add('visible');
                    } else {
                        item.classList.remove('visible');
                    }
                });
                
                // Удаляем обработчик скролла - теперь плашки появляются по кнопке
                // Обработчик больше не нужен
            }
        } else if (slide.data.type === 'quiz') {
            this.initializeQuiz(slide);
        }
    }
    
    handleTextScroll(container, items, slide) {
        // Этот метод больше не используется - плашки появляются по кнопке "Далее"
    }
    
    initializeQuiz(slide) {
        const quizOptions = slide.element.querySelectorAll('.quiz-option');
        const slideIndex = this.currentSlideIndex;
        const quizData = slide.data;
        let hasAnswered = false;
        
        // Сохраняем состояние в объекте слайда
        slide.hasAnswered = false;
        slide.selectedCorrectly = false;
        
        quizOptions.forEach(option => {
            option.addEventListener('click', () => {
                if (slide.hasAnswered) return; // Блокируем повторные клики если уже ответили правильно
                
                const optionIndex = parseInt(option.dataset.optionIndex);
                const selectedOption = quizData.options[optionIndex];
                const feedbackElement = document.getElementById(`feedback-${slideIndex}`);
                
                if (selectedOption.isCorrect) {
                    // Правильный ответ
                    quizOptions.forEach(opt => {
                        opt.classList.remove('selected-correct', 'selected-wrong', 'disabled');
                    });
                    option.classList.add('selected-correct');
                    feedbackElement.textContent = selectedOption.feedbackSuccess || 'Вы ответили верно.';
                    feedbackElement.className = 'quiz-feedback visible success';
                    this.quizScore++;
                    slide.hasAnswered = true;
                    slide.selectedCorrectly = true;
                    slide.isComplete = true;
                    
                    // Блокируем все опции
                    quizOptions.forEach(opt => opt.classList.add('disabled'));
                    
                    // Показываем результат в конце если это последний вопрос
                    if (slideIndex === this.slides.length - 1) {
                        this.showQuizResult();
                    }
                } else {
                    // Неправильный ответ
                    option.classList.add('selected-wrong');
                    option.classList.add('disabled');
                    feedbackElement.textContent = selectedOption.feedback || 'Попробуйте еще раз.';
                    feedbackElement.className = 'quiz-feedback visible error';
                    // НЕ помечаем слайд как завершенный - нужно дать возможность ответить правильно
                }
            });
        });
    }
    
    showQuizResult() {
        const quizContainer = document.querySelector('.quiz-container');
        const resultElement = document.createElement('div');
        resultElement.className = 'quiz-result';
        resultElement.textContent = `Вы ответили верно на ${this.quizScore} из ${this.quizTotal}`;
        
        if (!quizContainer.querySelector('.quiz-result')) {
            quizContainer.appendChild(resultElement);
        }
    }
    
    nextSlide() {
        const currentSlide = this.slides[this.currentSlideIndex];
        
        // Проверяем, завершен ли текущий слайд
        if (currentSlide.data.type === 'image-text') {
            const textContainer = currentSlide.element.querySelector('.text-overlay-container');
            if (textContainer) {
                const items = textContainer.querySelectorAll('.slide-title, .info-card, .highlight-block');
                const visibleItems = textContainer.querySelectorAll('.visible');
                
                if (visibleItems.length < items.length) {
                    // Показываем следующий элемент
                    const nextIndex = visibleItems.length;
                    if (items[nextIndex]) {
                        items[nextIndex].classList.add('visible');
                        // Прокручиваем к новому элементу
                        items[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    
                    if (visibleItems.length + 1 >= items.length) {
                        currentSlide.isComplete = true;
                    }
                    return;
                }
            }
        }
        
        // Для quiz слайда - проверяем, дан ли правильный ответ
        if (currentSlide.data.type === 'quiz') {
            if (!currentSlide.selectedCorrectly) {
                // Еще не ответили правильно - нельзя перейти дальше
                return;
            }
        }
        
        // Переход к следующему слайду
        if (this.currentSlideIndex < this.slides.length - 1) {
            this.showSlide(this.currentSlideIndex + 1);
        } else {
            // Конец презентации
            if (this.quizTotal > 0) {
                this.showQuizResult();
            }
        }
    }
    
    updateProgress(index) {
        const progressFill = document.getElementById('progressFill');
        const percentage = ((index + 1) / this.slides.length) * 100;
        progressFill.style.height = `${percentage}%`;
    }
    
    updateIndicators(index) {
        const dots = document.querySelectorAll('.indicator-dot');
        dots.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    updateNextButton() {
        const nextBtn = document.getElementById('nextBtn');
        const currentSlide = this.slides[this.currentSlideIndex];
        
        if (!currentSlide) return;
        
        // Для quiz слайда - блокируем кнопку если не дан правильный ответ
        if (currentSlide.data.type === 'quiz') {
            if (!currentSlide.selectedCorrectly) {
                nextBtn.disabled = true;
            } else {
                nextBtn.disabled = false;
            }
        } else {
            nextBtn.disabled = false;
        }
        
        // Если последний слайд - меняем текст кнопки
        if (this.currentSlideIndex >= this.slides.length - 1) {
            nextBtn.querySelector('span').textContent = 'Завершить';
        } else {
            nextBtn.querySelector('span').textContent = 'Далее';
        }
    }
}

// Инициализация презентации после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    new Presentation();
});
