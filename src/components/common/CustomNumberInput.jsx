import React from 'react';
import { NumberInput, ActionIcon, Group, Text } from '@mantine/core';
import { Minus, Plus } from 'phosphor-react';

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
  ...rest
}) => {

  const handleIncrement = () => {
    const newValue = Math.min(max !== undefined ? max : Infinity, Number(value) + step);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = Math.max(min !== undefined ? min : -Infinity, Number(value) - step);
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