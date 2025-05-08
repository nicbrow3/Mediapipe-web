export const globalStyles = {
  defaultBorderRadius: 'md', // Mantine shorthand for default border radius
  controlPaddings: {
    xs: '6px 10px',
    sm: '8px 12px',
    md: '10px 16px',
    lg: '12px 20px',
    xl: '14px 24px',
  },
  fontSizes: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    md: '1rem',    // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem',  // 20px
  },
  colors: {
    primary: '#45a29e', // Teal accent
    primaryDark: '#3a8a85',
    secondary: '#1c2833', // Dark background for some elements
    secondaryHover: '#2c3e50', // Slightly lighter for hover on secondary
    lightText: '#ffffff',
    darkText: '#212529', // Mantine default dark text
    error: '#ff5252', // Red for errors
    errorBackground: 'rgba(220, 53, 69, 0.1)', // Light red background for error messages
    overlayBackground: 'rgba(0,0,0,0.7)',
  },
  buttonVariants: {
    primary: {
      backgroundColor: '#45a29e',
      color: 'white',
      border: 'none',
      '&:hover': {
        backgroundColor: '#3a8a85',
      },
    },
    secondary: {
      backgroundColor: '#2c3e50', // A less prominent color
      color: 'white',
      border: 'none', // Border with primary color accent
      '&:hover': {
        backgroundColor: '#34495e', // Slightly lighter hover for secondary
        borderColor: '#5cbdb9',
      },
    },
    toggle: (active) => ({
      background: active ? globalStyles.colors.primary : globalStyles.colors.secondary,
      color: globalStyles.colors.lightText,
      border: 'none',
      '&:hover': {
        background: active ? globalStyles.colors.primaryDark : globalStyles.colors.secondaryHover,
      },
    }),
  },
  cardStyles: {
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    // borderRadius: '8px', // We'll use defaultBorderRadius
    // padding: '12px 18px',
    // minWidth: '140px', // This might be component-specific
    // fontSize: '15px', // We'll use fontSizes
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  // Styles for the centered overlay elements (loader, error, start button)
  centeredOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px', // Can be a Mantine space variable
  },
};

// Function to integrate with Mantine's theme (optional, for deeper integration)
export const getMantineThemeOverrides = (colorScheme) => ({
  colorScheme,
  primaryColor: 'teal', // Example, map to our teal
  fontFamily: 'Verdana, sans-serif', // Example
  defaultRadius: globalStyles.defaultBorderRadius,
  colors: {
    // Define your custom colors for Mantine if needed
    // For example, map our globalStyles.colors.primary to a Mantine color name
    brandPrimary: [globalStyles.colors.primary, /* ...shades */],
    brandSecondary: [globalStyles.colors.secondary, /* ...shades */],
  },
  components: {
    Button: {
      defaultProps: {
        radius: globalStyles.defaultBorderRadius,
        // size: 'md', // default size
      },
      // variants: { // This is how you'd define variants in Mantine theme
      //   primary: (theme) => ({
      //     root: {
      //       backgroundColor: globalStyles.colors.primary,
      //       color: globalStyles.colors.lightText,
      //       '&:hover': {
      //         backgroundColor: theme.fn.darken(globalStyles.colors.primary, 0.1),
      //       },
      //     },
      //   }),
      // },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        padding: 'lg',
        radius: globalStyles.defaultBorderRadius,
        // withBorder: true, // optional
      },
      // styles: (theme) => ({ // Default styles for all cards
      //   root: {
      //     backgroundColor: globalStyles.cardStyles.background,
      //     color: globalStyles.cardStyles.color,
      //   }
      // })
    },
    Loader: {
      defaultProps: {
        color: globalStyles.colors.primary,
        // size: 'xl',
      },
    },
    // ... other component overrides
  },
});

// Note: For full Mantine theme integration, you'd pass `getMantineThemeOverrides`
// to the `theme` prop of `MantineProvider` in App.jsx.
// For now, we can import `globalStyles` directly into components. 