import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Title, 
  Stack, 
  Group, 
  ScrollArea, 
  Text, 
  Container,
  Divider, 
  ActionIcon, 
  TextInput, 
  NumberInput, 
  Select,
  Collapse,
  Paper
} from '@mantine/core';
import { v4 as uuidv4 } from 'uuid';
import * as exercises from '../exercises';
import { IconTrash, IconCopy, IconPlus, IconGripVertical } from '@tabler/icons-react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import cx from 'clsx';
import classes from './WorkoutBuilder.module.css';

// Convert exercise options to array of objects for select component
const exerciseOptions = Object.values(exercises).map(exercise => ({
  value: exercise.id,
  label: exercise.name,
  hasWeight: exercise.hasWeight || false
}));

/**
 * WorkoutBuilder Component
 * This component allows users to create structured workouts with exercises, sets, and circuits.
 * It uses drag and drop functionality for a more intuitive UI.
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
  
  // The ID of the droppable area that's currently being hovered over
  const [activeDroppableId, setActiveDroppableId] = useState(null);
  
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
    // Get any sets that were in the circuit so we can move them back to the main workout
    const circuitToDelete = workoutPlan.find(item => item.type === 'circuit' && item.id === id);
    const setsToMoveOut = circuitToDelete?.elements || [];
    
    // Remove the circuit and add its sets to the main workout
    setWorkoutPlan(prev => {
      const filteredPlan = prev.filter(item => !(item.type === 'circuit' && item.id === id));
      
      // Add the sets from the deleted circuit to the main workout
      return [...filteredPlan, ...setsToMoveOut];
    });
    
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
  
  // Handle drag start to update UI
  const handleDragStart = (start) => {
    // Set dragging state if needed
    document.body.style.cursor = 'grabbing';
  };
  
  // When drag ends, restore normal cursor
  const handleDragEnd = (result) => {
    // Reset cursor
    document.body.style.cursor = 'default';
    
    const { source, destination, draggableId } = result;
    
    // Reset active droppable ID
    setActiveDroppableId(null);
    
    // Dropped outside a valid droppable area
    if (!destination) return;
    
    // No movement occurred
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    // Handle moving items within the main workout plan
    if (source.droppableId === 'main-droppable' && destination.droppableId === 'main-droppable') {
      const newWorkoutPlan = [...workoutPlan];
      const [removed] = newWorkoutPlan.splice(source.index, 1);
      newWorkoutPlan.splice(destination.index, 0, removed);
      setWorkoutPlan(newWorkoutPlan);
      return;
    }
    
    // Handle moving sets from main workout into a circuit
    if (source.droppableId === 'main-droppable' && destination.droppableId.startsWith('circuit-')) {
      const circuitId = destination.droppableId.replace('circuit-', '');
      const item = workoutPlan[source.index];
      
      // Only sets can be moved into a circuit
      if (item.type !== 'set') return;
      
      // Create new workout plan without the moved item
      const newWorkoutPlan = workoutPlan.filter((_, index) => index !== source.index);
      
      // Add the item to the circuit
      const updatedWorkoutPlan = newWorkoutPlan.map(planItem => {
        if (planItem.type === 'circuit' && planItem.id === circuitId) {
          // Clone the item to ensure it has a unique ID if needed
          const elements = [...planItem.elements];
          elements.splice(destination.index, 0, item);
          return { ...planItem, elements };
        }
        return planItem;
      });
      
      setWorkoutPlan(updatedWorkoutPlan);
      return;
    }
    
    // Handle moving items from a circuit to the main workout plan
    if (source.droppableId.startsWith('circuit-') && destination.droppableId === 'main-droppable') {
      const circuitId = source.droppableId.replace('circuit-', '');
      const circuit = workoutPlan.find(item => item.type === 'circuit' && item.id === circuitId);
      
      if (!circuit) return;
      
      // Get the item from the circuit
      const [itemToMove] = circuit.elements.splice(source.index, 1);
      
      // Create new workout plan with the circuit updated
      const newWorkoutPlan = workoutPlan.map(item => {
        if (item.type === 'circuit' && item.id === circuitId) {
          return {
            ...item,
            elements: [...circuit.elements]
          };
        }
        return item;
      });
      
      // Add the item to the main workout plan
      newWorkoutPlan.splice(destination.index, 0, itemToMove);
      setWorkoutPlan(newWorkoutPlan);
      return;
    }
    
    // Handle moving items between circuits
    if (source.droppableId.startsWith('circuit-') && destination.droppableId.startsWith('circuit-')) {
      const sourceCircuitId = source.droppableId.replace('circuit-', '');
      const destCircuitId = destination.droppableId.replace('circuit-', '');
      
      // Get the source circuit
      const sourceCircuit = workoutPlan.find(item => item.type === 'circuit' && item.id === sourceCircuitId);
      
      if (!sourceCircuit) return;
      
      // Get the item from the source circuit
      const [itemToMove] = sourceCircuit.elements.splice(source.index, 1);
      
      // Create new workout plan with all circuits updated
      const newWorkoutPlan = workoutPlan.map(item => {
        if (item.type === 'circuit' && item.id === sourceCircuitId) {
          return {
            ...item,
            elements: [...sourceCircuit.elements]
          };
        }
        
        if (item.type === 'circuit' && item.id === destCircuitId) {
          const updatedElements = [...item.elements];
          updatedElements.splice(destination.index, 0, itemToMove);
          return {
            ...item,
            elements: updatedElements
          };
        }
        
        return item;
      });
      
      setWorkoutPlan(newWorkoutPlan);
      return;
    }
    
    // Handle moving items within a circuit
    if (source.droppableId.startsWith('circuit-') && source.droppableId === destination.droppableId) {
      const circuitId = source.droppableId.replace('circuit-', '');
      
      setWorkoutPlan(prev => {
        return prev.map(item => {
          if (item.type === 'circuit' && item.id === circuitId) {
            const newElements = [...item.elements];
            const [removed] = newElements.splice(source.index, 1);
            newElements.splice(destination.index, 0, removed);
            
            return {
              ...item,
              elements: newElements
            };
          }
          return item;
        });
      });
      return;
    }
  };
  
  // Handle drag update to highlight drop target
  const handleDragUpdate = (update) => {
    if (!update.destination) {
      setActiveDroppableId(null);
      return;
    }
    
    setActiveDroppableId(update.destination.droppableId);
  };
  
  // Render a draggable exercise set
  const renderExerciseSet = (set, index, circuitId = null) => {
    // Find the exercise to check if it has weights
    const exercise = exerciseOptions.find(ex => ex.value === set.exerciseId);
    const hasWeights = exercise?.hasWeight || false;
    
    return (
      <Draggable key={set.id} draggableId={set.id} index={index}>
        {(provided, snapshot) => {
          // Apply styles with a custom transform when dragging to fix positioning
          const style = {
            ...provided.draggableProps.style,
            // If element is being dragged, customize the transform to improve positioning
            ...(snapshot.isDragging && {
              left: 'auto',
              top: 'auto',
            })
          };
          
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              className={cx(classes.item, { [classes.itemDragging]: snapshot.isDragging })}
              style={style}
            >
              <div {...provided.dragHandleProps} className={classes.dragHandle}>
                <IconGripVertical size={18} stroke={1.5} />
              </div>
              
              <div className={classes.itemContent}>
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
                      />
                      
                      {hasWeights && (
                        <NumberInput
                          label="Weight"
                          value={set.weight}
                          onChange={(value) => updateExerciseSet(set.id, 'weight', value, circuitId)}
                          min={0}
                          precision={1}
                          step={2.5}
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
              </div>
            </div>
          );
        }}
      </Draggable>
    );
  };
  
  // Render a draggable circuit
  const renderCircuit = (circuit, index) => {
    const isActive = activeCircuitId === circuit.id;
    const droppableId = `circuit-${circuit.id}`;
    const isDropActive = activeDroppableId === droppableId;
    
    return (
      <Draggable key={circuit.id} draggableId={circuit.id} index={index}>
        {(provided, snapshot) => {
          // Apply styles with a custom transform when dragging to fix positioning
          const style = {
            ...provided.draggableProps.style,
            // If element is being dragged, customize the transform to improve positioning
            ...(snapshot.isDragging && {
              left: 'auto',
              top: 'auto',
            })
          };
          
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              className={cx(classes.circuit, { [classes.circuitDragging]: snapshot.isDragging })}
              style={style}
            >
              <div className={classes.circuitHeader}>
                <div {...provided.dragHandleProps} className={classes.dragHandle}>
                  <IconGripVertical size={20} stroke={1.5} />
                </div>
                
                <TextInput
                  value={circuit.name}
                  onChange={(e) => updateCircuit(circuit.id, 'name', e.target.value)}
                  placeholder="Circuit Name"
                  style={{ flex: 1, marginLeft: 10 }}
                />
                
                <Group spacing={8} mx="md">
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
              </div>
              
              <Collapse in={isActive}>
                <div className={cx(classes.dropArea, { [classes.dropAreaActive]: isDropActive })}>
                  <Text size="sm" weight={500} mb="xs">
                    Drag exercises here or add new:
                  </Text>
                  
                  <Droppable droppableId={droppableId} direction="vertical">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {circuit.elements.length === 0 ? (
                          <div className={classes.dropIndicator}>
                            Drag exercise sets here
                          </div>
                        ) : (
                          circuit.elements.map((set, idx) => renderExerciseSet(set, idx, circuit.id))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                  
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
                </div>
              </Collapse>
            </div>
          );
        }}
      </Draggable>
    );
  };
  
  return (
    <DragDropContext
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      enableDefaultSensors={true}
    >
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
            <Droppable droppableId="main-droppable" direction="vertical">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  style={{ minHeight: workoutPlan.length === 0 ? '100px' : 'auto' }}
                >
                  {workoutPlan.length === 0 ? (
                    <Text color="dimmed" align="center" py="xl">
                      Add exercise sets or circuits to build your workout!
                    </Text>
                  ) : (
                    workoutPlan.map((item, index) => {
                      if (item.type === 'set') {
                        return renderExerciseSet(item, index);
                      } else if (item.type === 'circuit') {
                        return renderCircuit(item, index);
                      }
                      return null;
                    })
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
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
    </DragDropContext>
  );
};

export default WorkoutBuilder; 