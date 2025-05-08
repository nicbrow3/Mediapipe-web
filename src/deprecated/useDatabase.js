import { useState, useEffect } from 'react';
import { 
  getAllWorkoutSessions, 
  getSetsForSession, 
  deleteWorkoutSession,
  clearAllData as clearDatabaseData,
  endWorkoutSession
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
  // Default session limit to reduce memory usage
  const [sessionLimit, setSessionLimit] = useState(10);
  const [totalSessionCount, setTotalSessionCount] = useState(0);

  // Fetch data on mount with the limit
  useEffect(() => {
    fetchData(sessionLimit);
  }, [sessionLimit]);

  // Function to end any in-progress sessions
  const endInProgressSessions = async () => {
    try {
      // Find sessions without an end time
      const inProgressSessions = sessions.filter(session => session.endTime === null);
      
      if (inProgressSessions.length === 0) return;
      
      // Process each in-progress session
      for (const session of inProgressSessions) {
        // Get sets for this session if not already loaded
        let sets = sessionSets[session.id];
        if (!sets) {
          sets = await getSetsForSession(session.id);
        }
        
        // If there are sets, use the timestamp of the last set as end time
        // Otherwise use current time
        let endTime;
        if (sets && sets.length > 0) {
          // Sort sets by endTime (descending) and use the most recent one
          const sortedSets = [...sets].sort((a, b) => {
            return new Date(b.endTime || 0) - new Date(a.endTime || 0);
          });
          
          // Use the last set's end time or current time if not available
          endTime = sortedSets[0].endTime || new Date().toISOString();
        } else {
          endTime = new Date().toISOString();
        }
        
        // End the session with the determined end time
        await endWorkoutSession(session.id, endTime);
      }
      
      // Refresh data after ending sessions
      await fetchData(sessionLimit);
    } catch (err) {
      console.error('Error ending in-progress sessions:', err);
      setError(err.message);
    }
  };
  
  // Function to end stale workout sessions while keeping the most recent one active
  const endStaleWorkoutSessions = async () => {
    try {
      // Find sessions without an end time
      const inProgressSessions = sessions.filter(session => session.endTime === null);
      
      // If there are 0 or 1 active sessions, there's nothing to clean up
      if (inProgressSessions.length <= 1) return;
      
      // Sort active sessions by start time (newest first)
      const sortedActiveSessions = [...inProgressSessions].sort((a, b) => 
        new Date(b.startTime) - new Date(a.startTime)
      );
      
      // Keep the most recent session active, mark all others for ending
      const mostRecentSession = sortedActiveSessions[0];
      const staleSessions = sortedActiveSessions.slice(1);
      
      console.log(`Keeping most recent session #${mostRecentSession.id} active`);
      console.log(`Ending ${staleSessions.length} stale sessions: ${staleSessions.map(s => s.id).join(', ')}`);
      
      // Process each stale session
      for (const session of staleSessions) {
        // Get sets for this session if not already loaded
        let sets = sessionSets[session.id];
        if (!sets) {
          sets = await getSetsForSession(session.id);
        }
        
        // Set the end time based on session activity:
        // 1. If there are sets with end times, use the latest one
        // 2. If no sets or no sets with end times, use startTime + 1 second
        let endTime;
        
        if (sets && sets.length > 0 && sets.some(set => set.endTime)) {
          // Find the latest set end time
          const sortedSets = [...sets]
            .filter(set => set.endTime)
            .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
          
          endTime = sortedSets[0].endTime;
        } else {
          // No sets with end times, use start time + 1 second
          const startTimeMs = new Date(session.startTime).getTime();
          endTime = new Date(startTimeMs + 1000).toISOString();
        }
        
        // End the session with the determined end time
        await endWorkoutSession(session.id, endTime);
      }
      
      // Refresh data after ending sessions
      await fetchData(sessionLimit);
    } catch (err) {
      console.error('Error ending stale workout sessions:', err);
      setError(err.message);
    }
  };

  // Function to fetch a specific number of sessions
  const fetchData = async (limit = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get workout sessions with the provided limit
      const fetchedSessions = await getAllWorkoutSessions(limit);
      setSessions(fetchedSessions);
      
      // Get a count of total sessions (for pagination UI if needed)
      // This will make an extra DB call but is more efficient than loading all sessions
      const allSessions = await getAllWorkoutSessions();
      setTotalSessionCount(allSessions.length);

      // Don't eagerly load sets for all sessions - this improves memory usage
      // Instead, we'll load sets on demand when sessions are opened (lazy loading)
      // Only load sets for active sessions initially
      const activeSessions = fetchedSessions.filter(session => session.endTime === null);
      
      if (activeSessions.length > 0) {
        const promises = activeSessions.map(session => 
          getSetsForSession(session.id).then(sets => ({ sessionId: session.id, sets }))
        );
        
        const results = await Promise.all(promises);
        
        // Convert array of results to a map
        const setsMap = results.reduce((map, { sessionId, sets }) => {
          map[sessionId] = sets;
          return map;
        }, {});
        
        // Update state without losing existing loaded sets
        setSessionSets(prev => ({
          ...prev,
          ...setsMap
        }));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching database data:', err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  // Function to load sets for a specific session on demand
  const loadSetsForSession = async (sessionId) => {
    // Don't reload if we already have sets for this session
    if (sessionSets[sessionId]) {
      return sessionSets[sessionId];
    }
    
    try {
      const sets = await getSetsForSession(sessionId);
      
      // Update the sessionSets state with the new data
      setSessionSets(prev => ({
        ...prev,
        [sessionId]: sets
      }));
      
      return sets;
    } catch (err) {
      console.error(`Error loading sets for session ${sessionId}:`, err);
      setError(err.message);
      return [];
    }
  };
  
  // Delete a specific workout session and its sets
  const deleteSession = async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      await deleteWorkoutSession(sessionId);
      // Refresh the data after deletion
      await fetchData(sessionLimit);
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
      await fetchData(sessionLimit);
    } catch (err) {
      console.error('Error clearing database:', err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  // Function to load more sessions when needed
  const loadMoreSessions = () => {
    setSessionLimit(prev => prev + 10);
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
    endInProgressSessions,
    endStaleWorkoutSessions,
    loadMoreSessions,
    loadSetsForSession,
    sessionLimit,
    totalSessionCount,
    hasMoreSessions: totalSessionCount > sessions.length,
    formatDate,
    formatDuration
  };
};

export default useDatabase; 