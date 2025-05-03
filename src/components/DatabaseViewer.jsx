import React, { useState, useEffect } from 'react';
import { Paper, Table, Title, Accordion, Badge, Text, Group, Button, Modal, Loader, Center, Checkbox, Stack, Tooltip } from '@mantine/core';
import { glassStyle } from '/src/styles/uiStyles';
import useDatabase from '../hooks/useDatabase';
import { IconTrash, IconAlertTriangle, IconSelect, IconX, IconInfoCircle } from '@tabler/icons-react';
// Import all available exercises
import * as allExercises from '../exercises';

const DatabaseViewer = () => {
  const { 
    sessions, 
    sessionSets, 
    loading, 
    error, 
    formatDate, 
    formatDuration,
    deleteSession,
    clearAllData,
    endInProgressSessions,
    endStaleWorkoutSessions
  } = useDatabase();
  
  // State for confirmation modals
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteSessionModalOpen, setDeleteSessionModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for multi-selection
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [deleteSelectedModalOpen, setDeleteSelectedModalOpen] = useState(false);

  // Calculate count of active sessions for UI purposes
  const activeSessionsCount = sessions.filter(session => session.endTime === null).length;
  
  // Close stale workout sessions but keep the most recent active one
  useEffect(() => {
    if (loading) return;
    
    const activeSessions = sessions.filter(session => session.endTime === null);
    
    // If there's more than one active session, clean up stale ones
    if (activeSessions.length > 1) {
      // Use our new function to handle stale sessions
      endStaleWorkoutSessions();
    }
  }, [loading, sessions, endStaleWorkoutSessions]);
  
  // Create an exercise map for looking up names by ID
  const exerciseMap = Object.values(allExercises).reduce((map, exercise) => {
    if (exercise && exercise.id) {
      map[exercise.id] = exercise.name;
    }
    return map;
  }, {});

  // Helper to find exercise name by ID
  const getExerciseName = (exerciseId, fallback = "Unknown Exercise") => {
    return exerciseMap[exerciseId] || fallback;
  };

  // Helper function to calculate reps to display (minimum for two-sided exercises)
  const getDisplayReps = (set) => {
    if (set.repsLeft !== null && set.repsRight !== null) {
      return Math.min(set.repsLeft, set.repsRight);
    }
    return set.reps;
  };

  // Helper function to calculate set duration
  const getSetDuration = (set) => {
    if (!set.startTime || !set.endTime) return 'N/A';
    const durationMs = new Date(set.endTime) - new Date(set.startTime);
    return formatDuration(durationMs);
  };

  // Handler for delete all data
  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await clearAllData();
    } finally {
      setIsDeleting(false);
      setDeleteAllModalOpen(false);
    }
  };

  // Handler for delete session
  const handleDeleteSession = async (sessionId) => {
    // Double-check the session isn't active
    const sessionToDelete = sessions.find(s => s.id === sessionId);
    if (isSessionActive(sessionToDelete)) {
      console.error('Attempted to delete an active session:', sessionId);
      setDeleteSessionModalOpen(false);
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteSession(sessionId);
    } finally {
      setIsDeleting(false);
      setDeleteSessionModalOpen(false);
    }
  };

  // Handler for "Select All" button
  const selectAllSessions = () => {
    // Only select completed sessions (those with an endTime)
    const completedSessionIds = sessions
      .filter(session => session.endTime !== null)
      .map(session => session.id);
    setSelectedSessions(completedSessionIds);
  };

  // Helper to check if a session is active (in progress)
  const isSessionActive = (session) => {
    return session.endTime === null;
  };

  // Handler for selecting/deselecting a session
  const toggleSessionSelection = (sessionId) => {
    // Find the session
    const session = sessions.find(s => s.id === sessionId);
    
    // Don't allow selecting active sessions
    if (isSessionActive(session)) {
      return;
    }
    
    setSelectedSessions(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  };

  // Handler for "Deselect All" button
  const deselectAllSessions = () => {
    setSelectedSessions([]);
  };

  // Handler for deleting selected sessions
  const handleDeleteSelectedSessions = async () => {
    // Filter out any active sessions just to be safe
    const sessionsToDelete = selectedSessions.filter(id => {
      const session = sessions.find(s => s.id === id);
      return !isSessionActive(session);
    });
    
    if (sessionsToDelete.length === 0) {
      setDeleteSelectedModalOpen(false);
      return;
    }
    
    setIsDeleting(true);
    try {
      // Delete each selected session one by one
      for (const sessionId of sessionsToDelete) {
        await deleteSession(sessionId);
      }
      // Clear selection after deletion
      setSelectedSessions([]);
    } finally {
      setIsDeleting(false);
      setDeleteSelectedModalOpen(false);
    }
  };

  if (loading && !isDeleting) return (
    <Center style={{ height: 200 }}>
      <Loader size="lg" color="grape" />
      <Text ml="md">Loading database contents...</Text>
    </Center>
  );
  
  if (error) return (
    <Paper p="xl" shadow="md" radius="lg" style={glassStyle}>
      <Group>
        <IconAlertTriangle size={24} color="red" />
        <Text c="red">Error loading database: {error}</Text>
      </Group>
    </Paper>
  );

  // Count completed sessions (available for selection)
  const completedSessionsCount = sessions.length - activeSessionsCount;

  return (
    <Paper p="xl" shadow="md" radius="lg" style={glassStyle}>
      <Group position="apart" mb="xl">
        <Title order={2}>Database Contents</Title>
        
        <Group>
          {/* Multi-selection action buttons */}
          {sessions.length > 0 && (
            <>
              <Button 
                variant="light"
                leftSection={<IconSelect size={16} />}
                onClick={selectAllSessions}
                disabled={isDeleting || completedSessionsCount === 0 || selectedSessions.length === completedSessionsCount}
                size="xs"
              >
                Select All Completed
              </Button>
              <Button 
                variant="light"
                leftSection={<IconX size={16} />}
                onClick={deselectAllSessions}
                disabled={isDeleting || selectedSessions.length === 0}
                size="xs"
              >
                Deselect All
              </Button>
              <Button 
                color="red" 
                variant="light"
                leftSection={<IconTrash size={16} />}
                onClick={() => setDeleteSelectedModalOpen(true)}
                disabled={isDeleting || selectedSessions.length === 0}
                size="xs"
              >
                Delete Selected ({selectedSessions.length})
              </Button>
            </>
          )}
          
          {/* Clear All Data Button */}
          <Button 
            color="red" 
            variant="light"
            leftSection={<IconTrash size={16} />}
            onClick={() => setDeleteAllModalOpen(true)}
            disabled={sessions.length === 0 || isDeleting}
          >
            Clear All Data
          </Button>
        </Group>
      </Group>

      {/* Loading overlay for delete operations */}
      {isDeleting && (
        <Center style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 10,
          borderRadius: 'lg'
        }}>
          <Loader color="white" size="xl" />
          <Text color="white" ml="md">Processing...</Text>
        </Center>
      )}

      <Title order={3} mb="md">Workout Sessions ({sessions.length})</Title>
      <Accordion>
        {sessions.map(session => (
          <Accordion.Item key={session.id} value={`session-${session.id}`}>
            <Group spacing="sm" style={{ width: '100%', flexWrap: 'nowrap' }}>
              {/* Checkbox for session selection */}
              <Tooltip 
                label={isSessionActive(session) ? "Active sessions cannot be selected" : "Select this session"}
                disabled={!isSessionActive(session)}
              >
                <div>
                  <Checkbox
                    checked={selectedSessions.includes(session.id)}
                    onChange={() => toggleSessionSelection(session.id)}
                    disabled={isDeleting || isSessionActive(session)}
                    mr="sm"
                    size="md"
                    style={{ flexShrink: 0 }}
                  />
                </div>
              </Tooltip>
              
              <div style={{ flex: 1 }}>
                <Accordion.Control>
                  <Group>
                    <Text>Session #{session.id}</Text>
                    <Badge color="blue">
                      {formatDate(session.startTime)}
                    </Badge>
                    {session.endTime ? (
                      <Badge color="green">
                        Duration: {formatDuration(session.durationMillis)}
                      </Badge>
                    ) : (
                      <Badge color="red">In Progress</Badge>
                    )}
                  </Group>
                </Accordion.Control>
              </div>
              
              {/* Delete Session Button */}
              <Tooltip 
                label={isSessionActive(session) ? "Cannot delete active session" : "Delete this session"}
                disabled={!isSessionActive(session)}
              >
                <div>
                  <Button 
                    color="red" 
                    variant="subtle" 
                    size="xs"
                    style={{ alignSelf: 'center', marginRight: '12px' }}
                    leftSection={<IconTrash size={14} />}
                    onClick={() => {
                      setSessionToDelete(session.id);
                      setDeleteSessionModalOpen(true);
                    }}
                    disabled={isDeleting || isSessionActive(session)}
                  >
                    Delete
                  </Button>
                </div>
              </Tooltip>
            </Group>
            <Accordion.Panel>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Property</Table.Th>
                    <Table.Th>Value</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>ID</Table.Td>
                    <Table.Td>{session.id}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Start Time</Table.Td>
                    <Table.Td>{formatDate(session.startTime)}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>End Time</Table.Td>
                    <Table.Td>{formatDate(session.endTime)}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Duration</Table.Td>
                    <Table.Td>{formatDuration(session.durationMillis)}</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Status</Table.Td>
                    <Table.Td>
                      {session.endTime === null ? (
                        <Badge color="red">Active</Badge>
                      ) : (
                        <Badge color="green">Completed</Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Notes</Table.Td>
                    <Table.Td>{session.notes || 'No notes'}</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>

              <Title order={4} mt="lg" mb="md">
                Exercise Sets ({sessionSets[session.id]?.length || 0})
              </Title>
              
              {sessionSets[session.id]?.length > 0 ? (
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>ID</Table.Th>
                      <Table.Th>Exercise</Table.Th>
                      <Table.Th>Duration</Table.Th>
                      <Table.Th>Reps</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sessionSets[session.id].map(set => (
                      <Table.Tr key={set.id}>
                        <Table.Td>{set.id}</Table.Td>
                        <Table.Td>{getExerciseName(set.exerciseId)}</Table.Td>
                        <Table.Td>{getSetDuration(set)}</Table.Td>
                        <Table.Td>{getDisplayReps(set)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Text c="dimmed">No exercise sets found for this session</Text>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>

      {sessions.length === 0 && (
        <Text>No workout sessions found in the database.</Text>
      )}
      
      {/* Delete All Confirmation Modal */}
      <Modal
        opened={deleteAllModalOpen}
        onClose={() => setDeleteAllModalOpen(false)}
        title="Delete All Data"
        centered
      >
        <Text mb="md">
          {sessions.some(session => session.endTime === null) ? 
            "Are you sure you want to delete all completed workout data? Active workout sessions will be preserved." :
            "Are you sure you want to delete all workout data? This action cannot be undone."}
        </Text>
        <Group position="right" spacing="md">
          <Button variant="light" onClick={() => setDeleteAllModalOpen(false)}>Cancel</Button>
          <Button color="red" onClick={handleDeleteAllData}>Delete Data</Button>
        </Group>
      </Modal>
      
      {/* Delete Session Confirmation Modal */}
      <Modal
        opened={deleteSessionModalOpen}
        onClose={() => setDeleteSessionModalOpen(false)}
        title="Delete Workout Session"
        centered
      >
        <Text mb="md">Are you sure you want to delete this workout session? This action cannot be undone.</Text>
        <Group position="right" spacing="md">
          <Button variant="light" onClick={() => setDeleteSessionModalOpen(false)}>Cancel</Button>
          <Button color="red" onClick={() => handleDeleteSession(sessionToDelete)}>Delete Session</Button>
        </Group>
      </Modal>
      
      {/* Delete Selected Sessions Confirmation Modal */}
      <Modal
        opened={deleteSelectedModalOpen}
        onClose={() => setDeleteSelectedModalOpen(false)}
        title="Delete Selected Sessions"
        centered
      >
        <Text mb="md">Are you sure you want to delete the {selectedSessions.length} selected workout sessions? This action cannot be undone.</Text>
        <Group position="right" spacing="md">
          <Button variant="light" onClick={() => setDeleteSelectedModalOpen(false)}>Cancel</Button>
          <Button color="red" onClick={handleDeleteSelectedSessions}>Delete Selected</Button>
        </Group>
      </Modal>
    </Paper>
  );
};

export default DatabaseViewer; 