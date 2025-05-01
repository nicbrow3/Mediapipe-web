// UI Style utilities and reusable style objects 

/**
 * Reusable style object for glassmorphism UI elements
 * Can be applied directly to Mantine components via the style prop
 * or to styled-components/emotion components
 */
export const glassStyle = {
  backgroundColor: 'rgba(36, 36, 47, 0.55)',
  backdropFilter: 'blur(6px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  borderRadius: 'var(--mantine-radius-md)',
  color: 'var(--mantine-color-white)'
};

// Add more reusable styles here as needed 