import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Title, 
  Stack, 
  Paper, 
  Group, 
  ScrollArea, 
  Text, 
  Container,
  Divider, 
  ActionIcon, 
  TextInput, 
  NumberInput, 
  Select,
  Collapse
} from '@mantine/core';
import { v4 as uuidv4 } from 'uuid';
import * as exercises from '../exercises';
import { IconTrash, IconCopy, IconPlus } from '@tabler/icons-react';

// Convert exercise options to array of objects for select component
const exerciseOptions = Object.values(exercises).map(exercise => ({
  value: exercise.id,
  label: exercise.name,
  hasWeight: exercise.hasWeight || false
}));

/**
 * WorkoutBuilder Component
 * This component allows users to create structured workouts with exercises, sets, and circuits.
 */
const WorkoutBuilder = ({ 
  initialWorkoutPlan = [], 
  onSave, 
  onCancel 
}) => {
  // Main workout plan state
  const [workoutPlan, setWorkoutPlan] = useState(initialWorkoutPlan);
  
  // Active circuit for editing (when adding sets to a circuit)
  const [activeCircuitId, setActiveCircuitId] = useState(null);
  
  // Add a new exercise set to the workout plan
  const addExerciseSet = (circuitId = null) => {
    const newSet = {
      type: 'set',
      id: uuidv4(),
      exerciseId: exerciseOptions[0]?.value || '',
      reps: 10,
      weight: null,
      notes: ''
    };
    
    if (circuitId) {
      // Add to specific circuit
      setWorkoutPlan(prev => {
        return prev.map(item => {
          if (item.type === 'circuit' && item.id === circuitId) {
            return {
              ...item,
              elements: [...item.elements, newSet]
            };
          }
          return item;
        });
      });
    } else {
      // Add to main workout plan
      setWorkoutPlan(prev => [...prev, newSet]);
    }
  };
  
  // Add a new circuit to the workout plan
  const addCircuit = () => {
    const newCircuit = {
      type: 'circuit',
      id: uuidv4(),
      name: 'New Circuit',
      repetitions: 3,
      elements: []
    };
    
    setWorkoutPlan(prev => [...prev, newCircuit]);
    // Automatically set this as the active circuit for editing
    setActiveCircuitId(newCircuit.id);
  };
  
  // Handle updates to exercise sets
  const updateExerciseSet = (id, field, value, circuitId = null) => {
    if (circuitId) {
      // Update set within a circuit
      setWorkoutPlan(prev => {
        return prev.map(item => {
          if (item.type === 'circuit' && item.id === circuitId) {
            return {
              ...item,
              elements: item.elements.map(set => {
                if (set.id === id) {
                  return { ...set, [field]: value };
                }
                return set;
              })
            };
          }
          return item;
        });
      });
    } else {
      // Update set in main workout plan
      setWorkoutPlan(prev => {
        return prev.map(item => {
          if (item.type === 'set' && item.id === id) {
            return { ...item, [field]: value };
          }
          return item;
        });
      });
    }
  };
  
  // Handle updates to circuit properties
  const updateCircuit = (id, field, value) => {
    setWorkoutPlan(prev => {
      return prev.map(item => {
        if (item.type === 'circuit' && item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      });
    });
  };
  
  // Delete an exercise set
  const deleteExerciseSet = (id, circuitId = null) => {
    if (circuitId) {
      // Delete from circuit
      setWorkoutPlan(prev => {
        return prev.map(item => {
          if (item.type === 'circuit' && item.id === circuitId) {
            return {
              ...item,
              elements: item.elements.filter(set => set.id !== id)
            };
          }
          return item;
        });
      });
    } else {
      // Delete from main workout plan
      setWorkoutPlan(prev => prev.filter(item => !(item.type === 'set' && item.id === id)));
    }
  };
  
  // Delete a circuit
  const deleteCircuit = (id) => {
    setWorkoutPlan(prev => prev.filter(item => !(item.type === 'circuit' && item.id === id)));
    if (activeCircuitId === id) {
      setActiveCircuitId(null);
    }
  };
  
  // Duplicate an exercise set
  const duplicateExerciseSet = (id, circuitId = null) => {
    if (circuitId) {
      // Duplicate within circuit
      setWorkoutPlan(prev => {
        return prev.map(item => {
          if (item.type === 'circuit' && item.id === circuitId) {
            const setToDuplicate = item.elements.find(set => set.id === id);
            if (setToDuplicate) {
              const newSet = { ...setToDuplicate, id: uuidv4() };
              const setIndex = item.elements.findIndex(set => set.id === id);
              const newElements = [...item.elements];
              newElements.splice(setIndex + 1, 0, newSet);
              return { ...item, elements: newElements };
            }
          }
          return item;
        });
      });
    } else {
      // Duplicate in main workout plan
      setWorkoutPlan(prev => {
        const setToDuplicate = prev.find(item => item.type === 'set' && item.id === id);
        if (setToDuplicate) {
          const newSet = { ...setToDuplicate, id: uuidv4() };
          const setIndex = prev.findIndex(item => item.type === 'set' && item.id === id);
          const newWorkoutPlan = [...prev];
          newWorkoutPlan.splice(setIndex + 1, 0, newSet);
          return newWorkoutPlan;
        }
        return prev;
      });
    }
  };
  
  // Toggle active circuit for editing
  const toggleCircuitEdit = (id) => {
    setActiveCircuitId(prev => prev === id ? null : id);
  };
  
  // Render an exercise set item
  const renderExerciseSet = (set, circuitId = null) => {
    // Find the exercise to check if it has weights
    const exercise = exerciseOptions.find(ex => ex.value === set.exerciseId);
    const hasWeights = exercise?.hasWeight || false;
    
    return (
      <Paper 
        key={set.id} 
        p="md" 
        withBorder 
        style={{ marginBottom: 10 }}
        shadow="xs"
      >
        <Group position="apart" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Select
              label="Exercise"
              value={set.exerciseId}
              onChange={(value) => updateExerciseSet(set.id, 'exerciseId', value, circuitId)}
              data={exerciseOptions}
              style={{ marginBottom: 8 }}
            />
            
            <Group grow>
              <NumberInput
                label="Reps"
                value={set.reps}
                onChange={(value) => updateExerciseSet(set.id, 'reps', value, circuitId)}
                min={1}
                max={100}
                style={{ flex: 1 }}
              />
              
              {hasWeights && (
                <NumberInput
                  label="Weight"
                  value={set.weight}
                  onChange={(value) => updateExerciseSet(set.id, 'weight', value, circuitId)}
                  min={0}
                  precision={1}
                  step={2.5}
                  style={{ flex: 1 }}
                />
              )}
            </Group>
          </Box>
          
          <Group spacing={5} mt={25}>
            <ActionIcon 
              color="blue" 
              onClick={() => duplicateExerciseSet(set.id, circuitId)}
              title="Duplicate set"
            >
              <IconCopy size={16} />
            </ActionIcon>
            <ActionIcon 
              color="red" 
              onClick={() => deleteExerciseSet(set.id, circuitId)}
              title="Delete set"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>
    );
  };
  
  // Render a circuit item
  const renderCircuit = (circuit) => {
    const isActive = activeCircuitId === circuit.id;
    
    return (
      <Paper 
        key={circuit.id} 
        p="md" 
        withBorder 
        style={{ marginBottom: 15 }}
        shadow="sm"
      >
        <Group position="apart" mb="xs">
          <TextInput
            value={circuit.name}
            onChange={(e) => updateCircuit(circuit.id, 'name', e.target.value)}
            placeholder="Circuit Name"
            style={{ flex: 1 }}
          />
          
          <Group spacing={8}>
            <Text size="sm" weight={500}>Repeat</Text>
            <NumberInput
              value={circuit.repetitions}
              onChange={(value) => updateCircuit(circuit.id, 'repetitions', value)}
              min={1}
              max={20}
              style={{ width: 70 }}
            />
            <Text size="sm" weight={500}>times</Text>
          </Group>
          
          <Group spacing={5}>
            <Button 
              variant="outline" 
              size="xs"
              onClick={() => toggleCircuitEdit(circuit.id)}
            >
              {isActive ? 'Close' : 'Edit'}
            </Button>
            <ActionIcon 
              color="red" 
              onClick={() => deleteCircuit(circuit.id)}
              title="Delete circuit"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
        
        <Collapse in={isActive}>
          <Box mt="md">
            <Text size="sm" weight={500} mb="xs">
              Exercises in Circuit
            </Text>
            
            {circuit.elements.map(set => renderExerciseSet(set, circuit.id))}
            
            <Button 
              leftSection={<IconPlus size={14} />}
              variant="outline" 
              size="sm" 
              mt="sm"
              onClick={() => addExerciseSet(circuit.id)}
              fullWidth
            >
              Add Exercise to Circuit
            </Button>
          </Box>
        </Collapse>
      </Paper>
    );
  };
  
  return (
    <Container size="md" py="xl">
      <Paper p="lg" radius="md" withBorder shadow="md">
        <Title order={2} mb="md">Workout Builder</Title>
        
        <Group position="apart" mb="md">
          <Group>
            <Button 
              leftSection={<IconPlus size={16} />}
              onClick={() => addExerciseSet()}
            >
              Add Exercise Set
            </Button>
            
            <Button 
              leftSection={<IconPlus size={16} />}
              variant="outline"
              onClick={addCircuit}
            >
              Add Circuit
            </Button>
          </Group>
        </Group>
        
        <Divider mb="lg" />
        
        <ScrollArea style={{ height: 'calc(100vh - 300px)' }} type="auto">
          <Stack spacing="md">
            {workoutPlan.length === 0 ? (
              <Text color="dimmed" align="center" py="xl">
                Add exercise sets or circuits to build your workout!
              </Text>
            ) : (
              workoutPlan.map(item => {
                if (item.type === 'set') {
                  return renderExerciseSet(item);
                } else if (item.type === 'circuit') {
                  return renderCircuit(item);
                }
                return null;
              })
            )}
          </Stack>
        </ScrollArea>
        
        <Divider my="lg" />
        
        <Group position="right" mt="md">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          
          <Button 
            onClick={() => onSave && onSave(workoutPlan)}
            disabled={workoutPlan.length === 0}
          >
            Save & Use Workout
          </Button>
        </Group>
      </Paper>
    </Container>
  );
};

export default WorkoutBuilder; 