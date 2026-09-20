/*
 * js/utils.js — вспомогательные функции
 * Можно смотреть, но НЕ ТРОГАТЬ — это часть движка
 */

/**
 * Throttle — ограничивает частоту вызова функции
 * @param {Function} func - функция для ограничения
 * @param {number} limit - интервал в мс
 */
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

/**
 * Debounce — вызывает функцию после паузы без новых вызовов
 * @param {Function} func - функция для debounce
 * @param {number} wait - время ожидания в мс
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Форматирование времени (секунды -> М:СС)
 * @param {number} seconds 
 * @returns {string}
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Проверка, является ли устройство мобильным (для справки)
 * В этой версии не используется (только ПК)
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
