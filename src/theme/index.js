import { createTheme } from '@mantine/core';


export const LIGHT_TEXT_COLOR = '#ffffff';
export const DARK_TEXT_COLOR = '#212529'; // Mantine default dark text

// Create 10-shade palettes for primary and secondary colors
const themeColors = {
  primary: [
    '#e0f2f1', // Lighter
    '#b2dfdb',
    '#80cbc4',
    '#66bab2',
    '#52b0a8',
    '#45a29e', // '#45a29e' - Main shade (index 5)
    '#3a8a85', // '#3a8a85' - Darker shade (index 6)
    '#2f7a75',
    '#266b66',
    '#1e5a55'  // Darkest
  ],
  secondary: [
    '#d1d4d6', // Lighter
    '#a2a9ae',
    '#788086',
    '#5a636b',
    '#414a52',
    '#1c2833', // '#1c2833' - Main shade (index 5)
    '#2c3e50', // '#2c3e50' - Often used for hover (index 6)
    '#162028',
    '#10181e',
    '#0a0f13'  // Darkest
  ],
  // Create a palette for error color as well
  error: [
    '#ffe5e5',
    '#ffcccc',
    '#ffb3b3',
    '#ff9999',
    '#ff8080',
    '#ff5252', // '#ff5252' - Main shade (index 5)
    '#ff3939',
    '#ff2020',
    '#ff0707',
    '#e60000'
  ]
};

export const theme = createTheme({
  // Pass color scheme dynamically from App.jsx
  // colorScheme: 'dark', // This will be set in MantineProvider

  colors: themeColors,

  // Default radius from globalStyles.js
  defaultRadius: 'md', // globalStyles.defaultBorderRadius was 'md'

  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    h1: '48px',
    h2: '36px',
    h3: '24px',
  },

  spacing: {
    xs: '6px', // Roughly from controlPaddings
    sm: '8px',
    md: '10px',
    lg: '12px',
    xl: '14px',
  },

  //Headings
  headings: {
    fontWeight: 400,
    sizes: {
      h1: { fontSize: 48 },
      h2: { fontSize: 36 },
      h3: { fontSize: 24 },
      h4: { fontSize: 20 },
    },
  },

  // Components
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      variants: {
        primary: (theme, props) => ({
          root: {
            backgroundColor: theme.colors.primary[5],
            color: DARK_TEXT_COLOR,
            border: 'none',
            '&:hover': {
              backgroundColor: theme.colors.primary[6],
            },
          },
        }),
        secondary: (theme, props) => ({
          root: {
            backgroundColor: theme.colors.secondary[5],
            color: DARK_TEXT_COLOR,
            border: 'none',
            '&:hover': {
              backgroundColor: theme.colors.secondary[6],
            },
          },
        }),
        toggle: (theme, props) => ({
          root: {
            background: props.active ? theme.colors.primary[5] : theme.colors.secondary[5],
            color: LIGHT_TEXT_COLOR,
            border: 'none',
            '&:hover': {
              background: props.active ? theme.colors.primary[6] : theme.colors.secondary[6],
            },
          },
        }),
      },
    },
    RingProgress: {
      defaultProps: {
        transition: 'all 0.3s ease',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
        shadow: 'md',
        p: 'md',
        bg: 'rgba(38, 50, 56, 0.64)',
        backdropfilter: 'blur(5px)',
        boxshadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease',
        width: '100%',
        bg: 'rgba(38, 50, 56, 0.9)',
        
      },
      styles: (theme) => ({
        root: {
          backgroundColor: theme.colors.secondary[5],
          color: LIGHT_TEXT_COLOR,
        },
      }),
    }
  },
}); 