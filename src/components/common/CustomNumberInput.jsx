import React from 'react';
import { NumberInput, ActionIcon, Group, Text } from '@mantine/core';
import { Minus, Plus } from '@phosphor-icons/react';

const CustomNumberInput = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  description,
  disabled,
  style,
  precision,
  ...rest
}) => {
  // Determine precision based on step if not explicitly provided
  const effectivePrecision = precision ?? (
    step < 1 ? String(step).split('.')[1].length : 0
  );

  const handleIncrement = () => {
    let newValue = Number(value) + step;
    // Apply precision to fix floating point issues
    if (effectivePrecision > 0) {
      newValue = Number(newValue.toFixed(effectivePrecision));
    }
    newValue = Math.min(max !== undefined ? max : Infinity, newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    let newValue = Number(value) - step;
    // Apply precision to fix floating point issues
    if (effectivePrecision > 0) {
      newValue = Number(newValue.toFixed(effectivePrecision));
    }
    newValue = Math.max(min !== undefined ? min : -Infinity, newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div style={style}>
      {label && <Text
      size="sm"
      weight={500}
      mb={description ? 2 : 7}
      >
        {label}
      </Text>}

      {description && <Text size="xs" c="dimmed" mb="xs">{description}</Text>}
      <Group
      spacing="lg"
      wrap="nowrap"
      >
        <ActionIcon
          size="lg"
          variant={"outline"}
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && Number(value) <= min)}
          aria-label="Decrement"
        >
          <Minus size={16} />
        </ActionIcon>
        <NumberInput
          value={Number(value)}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          precision={effectivePrecision}
          disabled={disabled}
          hideControls
          styles={{ input: { textAlign: 'center' } }}
          style={{ flex: 1 }}
          {...rest}
        />
        <ActionIcon
          size="lg"
          variant="outline"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && Number(value) >= max)}
          aria-label="Increment"
        >
          <Plus size={16} />
        </ActionIcon>
      </Group>
    </div>
  );
};

export default CustomNumberInput;