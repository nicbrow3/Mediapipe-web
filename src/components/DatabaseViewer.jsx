import React from 'react';
import { Paper, Table, Title, Accordion, Badge, Text, Group } from '@mantine/core';
import { glassStyle } from '/src/styles/uiStyles';
import useDatabase from '../hooks/useDatabase';

const DatabaseViewer = () => {
  const { 
    sessions, 
    sessionSets, 
    loading, 
    error, 
    formatDate, 
    formatDuration 
  } = useDatabase();

  if (loading) return <div>Loading database contents...</div>;
  if (error) return <div>Error loading database: {error}</div>;

  return (
    <Paper p="xl" shadow="md" radius="lg" style={glassStyle}>
      <Title order={2} mb="xl">Database Contents</Title>

      <Title order={3} mb="md">Workout Sessions ({sessions.length})</Title>
      <Accordion>
        {sessions.map(session => (
          <Accordion.Item key={session.id} value={`session-${session.id}`}>
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
    </Paper>
  );
};

export default DatabaseViewer; 