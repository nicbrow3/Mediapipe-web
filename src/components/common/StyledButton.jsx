import React from 'react';
import { Button as MantineButton, Tooltip, useMantineTheme } from '@mantine/core';

const StyledButton = React.forwardRef((
  {
    variant = 'primary', // 'primary', 'secondary' (theme variants)
    square = false,
    activeToggle, // Destructure but don't use it
    children,
    onClick,
    disabled,
    size = 'md', // Mantine sizes: xs, sm, md, lg, xl
    radius, // Will default to theme.defaultRadius if undefined
    style = {},
    tooltipLabel,
    tooltipPosition = 'top',
    ...rest
  },
  ref
) => {
  const theme = useMantineTheme();

  // Styles directly applied to MantineButton's root via its `styles` prop
  // Variant styles will come from the theme via MantineButton's own `variant` prop
  const rootStyles = {
    fontSize: theme.fontSizes[size] || theme.fontSizes.md,
    padding: theme.spacing[size] || theme.spacing.md,
    ...style, // Allow overriding with specific styles
  };

  if (square) {
    // For square buttons, use the theme's spacing for consistent padding.
    const squarePaddingValue = theme.spacing[size] || theme.spacing.md;
    rootStyles.padding = squarePaddingValue;
    
    // Ensure perfect square aspect ratio
    rootStyles.aspectRatio = '1 / 1';
    
    // Ensure line-height doesn't add too much extra height for single-line text/icons
    rootStyles.lineHeight = rootStyles.fontSize;
  }

  // Remove activeToggle from rest props to prevent it from being passed to DOM
  const { activeToggle: _, ...buttonProps } = rest;

  const buttonElement = (
    <MantineButton
      ref={ref}
      variant={variant} // Pass the variant directly to Mantine Button
      onClick={onClick}
      disabled={disabled}
      size={size} // Mantine's size prop primarily affects height/min-height
      radius={radius || theme.defaultRadius} // Use theme defaultRadius if not provided
      styles={{
        root: rootStyles,
        inner: {
          justifyContent: 'center', // Ensure content is centered
        },
        label: {
          overflow: 'visible', // Don't cut off text
          whiteSpace: 'nowrap', // Prevent wrapping
        }
      }}
      {...buttonProps} // Pass remaining props, excluding activeToggle
    >
      {children}
    </MantineButton>
  );

  if (tooltipLabel) {
    return (
      <Tooltip label={tooltipLabel} position={tooltipPosition} withArrow>
        {buttonElement}
      </Tooltip>
    );
  }

  return buttonElement;
});

export default StyledButton; 