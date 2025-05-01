import { useState, useEffect } from 'react';

// Key for storing color scheme preference
const COLOR_SCHEME_KEY = 'colorScheme';

/**
 * Hook to manage application color scheme (light/dark mode)
 * @returns {Array} [colorScheme, setColorScheme] - Current color scheme and setter function
 */
const useColorScheme = () => {
  // Initialize from localStorage or fallback to dark mode
  const getInitialColorScheme = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COLOR_SCHEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return 'dark'; // default
  };

  // Create color scheme state
  const [colorScheme, setColorScheme] = useState(getInitialColorScheme);

  // Persist color scheme changes and update DOM
  useEffect(() => {
    // Save to localStorage
    localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
    
    // Apply the data attribute to the document element for CSS variables
    document.documentElement.setAttribute('data-mantine-color-scheme', colorScheme);
  }, [colorScheme]);

  return [colorScheme, setColorScheme];
};

export default useColorScheme; 