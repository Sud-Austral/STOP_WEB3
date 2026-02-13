/**
 * Global utility to wait for data loading with Timeout.
 * Prevents infinite loops if data fails to load.
 */
window.waitForData = function (dataKey = 'STATE_DATA_CEAD', timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
            // Success case
            if (window[dataKey] && window[dataKey].isLoaded) {
                resolve(window[dataKey]);
                return;
            }

            // Timeout case
            if (Date.now() - startTime > timeoutMs) {
                console.error(`❌ waitForData timeout: ${dataKey} did not load within ${timeoutMs}ms.`);
                // We resolve anyway to avoid breaking execution chains entirely, 
                // but the view should handle missing data. Or we could reject.
                // Rejection is safer for robust error handling.
                reject(new Error(`Timeout waiting for ${dataKey}`));
                return;
            }

            requestAnimationFrame(check);
        };
        check();
    });
};

console.log("✅ Waiter Utility Loaded (with Timeout protection)");
