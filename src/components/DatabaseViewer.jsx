import React, { useState } from 'react';
import { Paper, Table, Title, Accordion, Badge, Text, Group, Button, Modal, Loader, Center } from '@mantine/core';
import { glassStyle } from '/src/styles/uiStyles';
import useDatabase from '../hooks/useDatabase';
import { IconTrash, IconAlertTriangle } from '@tabler/icons-react';

const DatabaseViewer = () => {
  const { 
    sessions, 
    sessionSets, 
    loading, 
    error, 
    formatDate, 
    formatDuration,
    deleteSession,
    clearAllData
  } = useDatabase();
  
  // State for confirmation modals
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteSessionModalOpen, setDeleteSessionModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setIsDeleting(true);
    try {
      await deleteSession(sessionId);
    } finally {
      setIsDeleting(false);
      setDeleteSessionModalOpen(false);
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

  return (
    <Paper p="xl" shadow="md" radius="lg" style={glassStyle}>
      <Group position="apart" mb="xl">
        <Title order={2}>Database Contents</Title>
        
        {/* Delete All Button */}
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
                disabled={isDeleting}
              >
                Delete
              </Button>
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
                      <Table.Th>Start Time</Table.Th>
                      <Table.Th>End Time</Table.Th>
                      <Table.Th>Reps</Table.Th>
                      <Table.Th>Left/Right</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sessionSets[session.id].map(set => (
                      <Table.Tr key={set.id}>
                        <Table.Td>{set.id}</Table.Td>
                        <Table.Td>{set.exerciseId}</Table.Td>
                        <Table.Td>{formatDate(set.startTime)}</Table.Td>
                        <Table.Td>{formatDate(set.endTime)}</Table.Td>
                        <Table.Td>{set.reps}</Table.Td>
                        <Table.Td>
                          {set.repsLeft !== null && set.repsRight !== null ? 
                            `${set.repsLeft} / ${set.repsRight}` : 'N/A'}
                        </Table.Td>
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
    </Paper>
  );
};

export default DatabaseViewer; 