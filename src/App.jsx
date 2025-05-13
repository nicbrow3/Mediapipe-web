import React, { useState, useEffect } from 'react';
import MinimalTracker from './components/MinimalTracker'; // MinimalTracker is now the main component
import './App.css';
import { MantineProvider } from '@mantine/core'; // Keep MantineProvider
import '@mantine/core/styles.css';
import { theme as appTheme } from './theme'; // Import our new theme


function App() {

  // --- Color Scheme State (Keep) ---
  const COLOR_SCHEME_KEY = 'colorScheme';
  const getInitialColorScheme = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COLOR_SCHEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return 'dark'; // default
  };
  const [colorScheme, setColorScheme] = useState(getInitialColorScheme);
  useEffect(() => {
    localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
    document.documentElement.setAttribute('data-mantine-color-scheme', colorScheme);
  }, [colorScheme]);

  return (
    <MantineProvider theme={{ ...appTheme, colorScheme }}>
      <div className="app-container">
        {/* Simplified Navigation Bar */}
        <div className="app-navbar">
          {/* Left side of navbar - empty or for future use */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Removed Sidebar toggle and Back to Main View button */}
          </div>

          {/* Center title */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
              Minimal Tracking
            </h1>
          </div>

          {/* Right side of navbar - empty or for future use */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Removed Settings and Switch to Minimal View buttons */}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="app-content"> {/* Removed sidebar-open class logic */}
          <MinimalTracker /> {/* Render MinimalTracker directly */}
        </div>

      </div>
    </MantineProvider>
  );
}

export default App; 