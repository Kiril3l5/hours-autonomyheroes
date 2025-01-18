// error-monitoring.js
class ErrorMonitor {
    static init() {
        window.onerror = (msg, url, lineNo, columnNo, error) => {
            const errorReport = {
                message: msg,
                source: url,
                line: lineNo,
                column: columnNo,
                error: error?.stack || 'No stack trace',
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                location: window.location.href
            };

            // Log to console
            console.error('Error Report:', errorReport);

            // Show user-friendly error
            const errorBoundary = document.getElementById('errorBoundary');
            const errorMessage = document.getElementById('errorMessage');
            if (errorBoundary && errorMessage) {
                errorMessage.textContent = 'An error occurred. The development team has been notified.';
                errorBoundary.removeAttribute('aria-hidden');
            }

            // You can add server logging here
            // fetch('/api/log-error', {
            //     method: 'POST',
            //     body: JSON.stringify(errorReport)
            // }).catch(console.error);

            return false;
        };

        window.addEventListener('unhandledrejection', event => {
            console.error('Unhandled Promise Rejection:', event.reason);
        });
    }

    static logError(error, context = {}) {
        console.error('Logged Error:', error, 'Context:', context);
    }
}

// Initialize error monitoring
ErrorMonitor.init();