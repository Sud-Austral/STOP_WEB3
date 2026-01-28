/**
 * Chart Initialization Helper
 * Waits for Chart.js to be available before initializing charts
 */

const ChartHelper = {
    /**
     * Initialize charts with retry logic
     * @param {Function} initFunction - Function that creates the charts
     * @param {number} maxRetries - Maximum retry attempts
     */
    init(initFunction, maxRetries = 50) {
        let attempts = 0;

        const tryInit = () => {
            if (typeof Chart !== 'undefined') {
                try {
                    initFunction();
                } catch (error) {
                    console.error('Error initializing charts:', error);
                }
            } else if (attempts < maxRetries) {
                attempts++;
                setTimeout(tryInit, 100);
            } else {
                console.error('Chart.js not available after max retries');
            }
        };

        tryInit();
    },

    /**
     * Default chart options
     */
    defaultOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: { family: 'Outfit', size: 11 },
                    padding: 15,
                    usePointStyle: true
                }
            }
        }
    },

    /**
     * Color palettes
     */
    colors: {
        primary: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
        categorical: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
        sequential: ['#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
        diverging: ['#ef4444', '#f59e0b', '#fbbf24', '#a3e635', '#22c55e', '#10b981']
    }
};

// Expose globally
window.ChartHelper = ChartHelper;
