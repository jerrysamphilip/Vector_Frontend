import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Optional error reporting: only when VITE_SENTRY_DSN is set at build time. The SDK is loaded
// as a separate chunk, so builds without a DSN don't download it.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
    import('@sentry/react')
        .then((Sentry) => {
            Sentry.init({
                dsn: sentryDsn,
                environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
                sendDefaultPii: false,
            })
        })
        .catch(() => {
            // Error reporting must never stop the app from loading
        })
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
