import { useState, useEffect } from 'react';
import { 
  getAllWorkoutSessions, 
  getSetsForSession, 
  deleteWorkoutSession,
  clearAllData as clearDatabaseData
} from '../services/db';

/**
 * Hook to manage database data fetching for workout sessions and their sets
 * @returns {Object} Database state and operations
 */
const useDatabase = () => {
  const [sessions, setSessions] = useState([]);
  const [sessionSets, setSessionSets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Function to fetch all sessions and their sets
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all workout sessions
      const fetchedSessions = await getAllWorkoutSessions();
      setSessions(fetchedSessions);

      // Optimized approach: Fetch sets for all sessions in parallel
      if (fetchedSessions.length > 0) {
        const promises = fetchedSessions.map(session => 
          getSetsForSession(session.id).then(sets => ({ sessionId: session.id, sets }))
        );
        
        const results = await Promise.all(promises);
        
        // Convert array of results to a map
        const setsMap = results.reduce((map, { sessionId, sets }) => {
          map[sessionId] = sets;
          return map;
        }, {});
        
        setSessionSets(setsMap);
      } else {
        setSessionSets({});
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching database data:', err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  // Delete a specific workout session and its sets
  const deleteSession = async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      await deleteWorkoutSession(sessionId);
      // Refresh the data after deletion
      await fetchData();
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  // Clear all database data
  const clearAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Find any active session (session without an endTime)
      const activeSession = sessions.find(session => session.endTime === null);
      const activeSessionId = activeSession ? activeSession.id : null;
      
      // Pass the active session ID to preserve it
      await clearDatabaseData(activeSessionId);
      
      // Refresh the data after deletion
      await fetchData();
    } catch (err) {
      console.error('Error clearing database:', err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  // Helper function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Helper function to format duration
  const formatDuration = (millis) => {
    if (!millis) return 'N/A';
    const seconds = Math.floor(millis / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return {
    sessions,
    sessionSets,
    loading,
    error,
    refreshData: fetchData,
    deleteSession,
    clearAllData,
    formatDate,
    formatDuration
  };
};

export default useDatabase; 