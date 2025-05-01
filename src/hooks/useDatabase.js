import { useState, useEffect } from 'react';
import { getAllWorkoutSessions, getSetsForSession } from '../services/db';

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
      // Get all workout sessions
      const fetchedSessions = await getAllWorkoutSessions();
      setSessions(fetchedSessions);

      // Fetch sets for each session
      const setsMap = {};
      for (const session of fetchedSessions) {
        const sets = await getSetsForSession(session.id);
        setsMap[session.id] = sets;
      }
      setSessionSets(setsMap);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching database data:', err);
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
    formatDate,
    formatDuration
  };
};

export default useDatabase; 