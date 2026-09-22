/*
 * js/reveal.js — механика появления блоков внутри слайда (раздел 6 ТЗ)
 * Можно смотреть, но НЕ ТРОГАТЬ — это часть движка
 *
 * ИЗМЕНЕНИЕ: поддержка поля icon в блоках content.js
 * (иконка Lucide цветом из theme.css, через CSS-маску).
 */

// Константы для настройки механики появления (можно менять здесь)
const REVEAL_CONFIG = {
    animationDuration: 300,      // длительность анимации появления (мс)
    scrollThreshold: 50,         // порог скролла для одного шага
    lockTime: 250,               // блокировка повторного срабатывания (мс)
};

/**
 * Класс для управления появлением блоков на слайде типа Б
 */
class RevealEngine {
    constructor(slideElement, blocksData, onComplete) {
        this.slideElement = slideElement;
        this.blocksData = blocksData || [];
        this.onComplete = onComplete;
        
        this.currentIndex = 0;
        this.totalBlocks = this.blocksData.length;
        this.isLocked = false;
        this.scrollAccumulator = 0;
        
        this.blockElements = [];
        this.indicatorElement = null;
        
        this.init();
    }
    
    /**
     * Инициализация — создание DOM-элементов блоков
     */
    init() {
        if (!this.blocksData || this.blocksData.length === 0) {
            return;
        }
        
        // Создаём контейнер для плашек поверх медиа
        const overlayContainer = document.createElement('div');
        overlayContainer.className = 'reveal-overlay';
        overlayContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10;
            pointer-events: none;
        `;
        
        // Создаём каждый блок
        this.blocksData.forEach((block, index) => {
            const blockEl = document.createElement('div');
            blockEl.className = 'reveal-block';
            blockEl.dataset.order = block.order || (index + 1);
            
            // Стили glassmorphism из темы
            blockEl.style.cssText = `
                position: absolute;
                left: 8%;
                right: 8%;
                padding: 24px 30px;
                background: var(--color-card, rgba(255, 255, 255, 0.92));
                backdrop-filter: blur(var(--card-blur, 8px));
                border-radius: var(--radius-card, 16px);
                border: 1px solid var(--color-card-border, rgba(255, 255, 255, 0.5));
                box-shadow: var(--shadow-soft, 0 4px 20px rgba(0,0,0,0.04));
                font-family: var(--font-text, 'Golos Text', sans-serif);
                font-size: var(--font-size-text, 1.15rem);
                line-height: 1.6;
                color: var(--color-ink, #172433);
                opacity: 0;
                transform: translateY(20px);
                transition: opacity ${REVEAL_CONFIG.animationDuration}ms ease, 
                            transform ${REVEAL_CONFIG.animationDuration}ms ease;
                pointer-events: auto;
            `;
            
            // Позиционирование по вертикали (равномерное распределение)
            const totalBlocks = this.blocksData.length;
            const verticalStep = 100 / (totalBlocks + 1);
            const topPosition = verticalStep * (index + 1);
            blockEl.style.top = `${topPosition}%`;
            
            // Чередование фона для чётных/нечётных
            if ((index + 1) % 2 === 0) {
                blockEl.style.background = 'rgba(232, 237, 242, 0.92)';
            }
            
            // Сначала текст: textContent затирает всё содержимое карточки,
            // поэтому иконку добавляем строго ПОСЛЕ этой строки.
            blockEl.textContent = block.text;

            if (block.icon) {
                const icon = document.createElement('span');
                icon.className = 'card-icon';
                icon.style.setProperty('--icon',
                    'url("https://unpkg.com/lucide-static@latest/icons/' + block.icon + '.svg")');
                if (block.tone) icon.dataset.tone = block.tone;
                blockEl.prepend(icon);
            }

            overlayContainer.appendChild(blockEl);
            this.blockElements.push(blockEl);
        });
        
        this.slideElement.querySelector('.slide-media-container')?.appendChild(overlayContainer);
        
        // Создаём индикатор прогресса (счётчик блоков)
        this.createIndicator();
    }
    
    /**
     * Создание индикатора прогресса внутри слайда
     */
    createIndicator() {
        if (this.totalBlocks === 0) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'reveal-indicator';
        indicator.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-family: var(--font-text, sans-serif);
            font-size: 13px;
            color: var(--color-ink-soft, #6B7885);
            z-index: 20;
            background: rgba(247, 248, 250, 0.9);
            padding: 6px 12px;
            border-radius: 20px;
        `;
        indicator.textContent = `0 / ${this.totalBlocks}`;
        
        this.slideElement.querySelector('.slide-media-container')?.appendChild(indicator);
        this.indicatorElement = indicator;
    }
    
    /**
     * Обновление индикатора
     */
    updateIndicator() {
        if (this.indicatorElement) {
            this.indicatorElement.textContent = `${this.currentIndex} / ${this.totalBlocks}`;
        }
    }
    
    /**
     * Показать следующий блок
     */
    revealNext() {
        if (this.isLocked || this.currentIndex >= this.totalBlocks) {
            return false;
        }
        
        this.isLocked = true;
        
        const block = this.blockElements[this.currentIndex];
        if (block) {
            // Анимация появления через transform и opacity (GPU-ускорение)
            requestAnimationFrame(() => {
                block.style.opacity = '1';
                block.style.transform = 'translateY(0)';
            });
            
            this.currentIndex++;
            this.updateIndicator();
        }
        
        // Разблокировка после завершения анимации
        setTimeout(() => {
            this.isLocked = false;
            
            // Проверка: все ли блоки открыты
            if (this.currentIndex >= this.totalBlocks && this.onComplete) {
                this.onComplete();
            }
        }, REVEAL_CONFIG.lockTime);
        
        return true;
    }
    
    /**
     * Закрыть последний открытый блок (обратный порядок)
     */
    revealPrev() {
        if (this.isLocked || this.currentIndex <= 0) {
            return false;
        }
        
        this.isLocked = true;
        this.currentIndex--;
        
        const block = this.blockElements[this.currentIndex];
        if (block) {
            requestAnimationFrame(() => {
                block.style.opacity = '0';
                block.style.transform = 'translateY(20px)';
            });
        }
        
        setTimeout(() => {
            this.isLocked = false;
            this.updateIndicator();
        }, REVEAL_CONFIG.lockTime);
        
        return true;
    }
    
    /**
     * Обработчик wheel события
     */
    handleWheel(deltaY) {
        if (this.currentIndex >= this.totalBlocks) {
            // Все блоки открыты — можно переходить дальше
            return 'completed';
        }
        
        // Накопление скролла для контроля скорости
        this.scrollAccumulator += Math.abs(deltaY);
        
        if (this.scrollAccumulator >= REVEAL_CONFIG.scrollThreshold) {
            this.scrollAccumulator = 0;
            
            if (deltaY > 0) {
                // Скролл вниз — открываем блок
                return this.revealNext() ? 'revealed' : 'locked';
            } else {
                // Скролл вверх — закрываем блок
                return this.revealPrev() ? 'revealed' : 'locked';
            }
        }
        
        return 'accumulating';
    }
    
    /**
     * Сброс состояния (при уходе со слайда)
     */
    reset() {
        this.currentIndex = 0;
        this.isLocked = false;
        this.scrollAccumulator = 0;
        
        this.blockElements.forEach(block => {
            block.style.opacity = '0';
            block.style.transform = 'translateY(20px)';
        });
        
        this.updateIndicator();
    }
    
    /**
     * Проверка: все ли блоки открыты
     */
    isCompleted() {
        return this.currentIndex >= this.totalBlocks;
    }
}
