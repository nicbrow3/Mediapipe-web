import React, { useMemo } from 'react';
import { Select } from '@mantine/core';

const ExerciseSelector = ({ exerciseOptions, selectedExercise, onChange }) => {
  // Memoize the formatted and sorted options to prevent recalculation on every render
  const formattedExerciseOptions = useMemo(() => {
    if (!exerciseOptions || exerciseOptions.length === 0) return [];
    
    return [...exerciseOptions]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(exercise => ({
        value: exercise.id,
        label: exercise.name
      }));
  }, [exerciseOptions]); // Only recalculate when exerciseOptions changes

  // Memoize the onChange handler to prevent new function creation on every render
  const handleChange = useMemo(() => {
    return (exerciseId) => {
      const exercise = exerciseOptions?.find(ex => ex.id === exerciseId);
      if (exercise) {
        onChange(exercise);
      }
    };
  }, [exerciseOptions, onChange]);

  return (
    <Select
      label="Select Exercise"
      placeholder="Choose an exercise"
      data={formattedExerciseOptions}
      value={selectedExercise?.id || ''}
      onChange={handleChange}
      style={{ width: '100%' }}
    />
  );
};

export default React.memo(ExerciseSelector); // Prevent re-render if props haven't changed 