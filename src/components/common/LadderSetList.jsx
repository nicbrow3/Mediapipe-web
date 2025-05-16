import React, { useMemo } from 'react';
import { Paper, ScrollArea, Text, Group, ThemeIcon, Stack, Box } from '@mantine/core';
import { ArrowUp, Star, ArrowDown, WarningCircle } from 'phosphor-react';

// Helper function to calculate ladder sets
const getLadderSets = (settings) => {
  const { startReps: rawStartReps, incrementReps: rawIncrementReps, topReps: rawTopReps, endReps: rawEndReps } = settings;

  const startReps = parseInt(rawStartReps, 10);
  const incrementReps = parseInt(rawIncrementReps, 10);
  const topReps = parseInt(rawTopReps, 10);
  const endReps = parseInt(rawEndReps, 10);

  // Validate inputs and return specific error messages
  if (isNaN(startReps)) return { data: [], error: "Start Reps must be a valid number." };
  if (isNaN(incrementReps)) return { data: [], error: "Increment Reps must be a valid number." };
  if (isNaN(topReps)) return { data: [], error: "Top Reps must be a valid number." };
  if (isNaN(endReps)) return { data: [], error: "End Reps must be a valid number." };
  
  if (startReps <= 0) return { data: [], error: "Start Reps must be greater than 0." };
  if (incrementReps <= 0) return { data: [], error: "Increment Reps must be greater than 0." };
  if (topReps <= 0) return { data: [], error: "Top Reps must be greater than 0." };
  if (endReps <= 0) return { data: [], error: "End Reps must be greater than 0." };
  
  if (startReps > topReps) return { data: [], error: "Start Reps cannot be greater than Top Reps." };
  if (endReps > topReps) return { data: [], error: "End Reps cannot be greater than Top Reps." };

  const setsData = [];

  // Ascending phase
  let currentRepsAsc = startReps;
  while (currentRepsAsc < topReps) {
    setsData.push({ reps: currentRepsAsc, type: 'rising' });
    currentRepsAsc += incrementReps;
  }

  // Peak set
  setsData.push({ reps: topReps, type: 'peak' });

  // Descending phase (only if topReps > endReps)
  if (topReps > endReps) {
    let currentRepsDesc = topReps - incrementReps;
    while (currentRepsDesc >= endReps) {
      setsData.push({ reps: currentRepsDesc, type: 'lowering' });
      currentRepsDesc -= incrementReps;
    }
  }
  
  // Deduplicate and assign set numbers
  // This ensures that if startReps = topReps, only one peak set is shown.
  // And if increment causes an overlap with peak, peak is preferred.
  const finalSets = [];
  const seenRepsType = new Set(); // To track "reps-type" combinations

  for (const set of setsData) {
    const key = `${set.reps}-${set.type}`;
    // Prioritize 'peak' if reps are the same as 'topReps'
    if (set.reps === topReps && set.type !== 'peak') {
        // If a peak set for topReps isn't added yet, mark this as one to be potentially skipped
        // if a true peak set exists. Or, if a non-peak set has topReps, we ensure the peak set is the one that's kept.
        const peakKey = `${topReps}-peak`;
        if ([...seenRepsType].some(sKey => sKey === peakKey)) continue; // if peak already processed, skip this non-peak at topReps
    }

    // If it's a peak set, remove any existing non-peak set with the same rep count
    if (set.type === 'peak') {
        const risingKey = `${set.reps}-rising`;
        const loweringKey = `${set.reps}-lowering`;
        if (seenRepsType.has(risingKey)) {
            const index = finalSets.findIndex(s => s.reps === set.reps && s.type === 'rising');
            if (index > -1) finalSets.splice(index, 1);
            seenRepsType.delete(risingKey);
        }
        if (seenRepsType.has(loweringKey)) {
            const index = finalSets.findIndex(s => s.reps === set.reps && s.type === 'lowering');
            if (index > -1) finalSets.splice(index, 1);
            seenRepsType.delete(loweringKey);
        }
    }
    
    if (!seenRepsType.has(key)) {
      finalSets.push(set);
      seenRepsType.add(key);
    }
  }
  
  // Re-assign sequential set numbers
  const calculatedSets = finalSets.map((set, index) => ({ ...set, setNumber: index + 1 }));
  return { data: calculatedSets, error: null }; // Return successful data
};


const LadderSetList = ({ ladderSettings }) => {
  const { data: sets, error: setsError } = useMemo(() => {
    if (ladderSettings && 
        typeof ladderSettings.startReps !== 'undefined' && 
        typeof ladderSettings.incrementReps !== 'undefined' && 
        typeof ladderSettings.topReps !== 'undefined' &&
        typeof ladderSettings.endReps !== 'undefined') {
      return getLadderSets(ladderSettings);
    }
    return { data: [], error: "Ladder settings are incomplete." }; // Default error if settings object is malformed
  }, [ladderSettings?.startReps, ladderSettings?.incrementReps, ladderSettings?.topReps, ladderSettings?.endReps]);

  if (setsError) {
    return (
      <Paper p="md" shadow="xs" withBorder style={{ height: '100%' }}>
        <Stack align="center" justify="center" style={{ height: '100%' }}>
          <ThemeIcon color="orange" size="xl" radius="xl">
            <WarningCircle size={24} />
          </ThemeIcon>
          <Text c="dimmed" align="center" size="sm">
            {setsError}
          </Text>
        </Stack>
      </Paper>
    );
  }

  if (!sets || sets.length === 0) {
    return (
      <Paper p="md" shadow="xs" withBorder style={{ height: '100%' }}>
        <Text c="dimmed" align="center" size="sm">
          No sets to display based on current settings.
          <br />
          Please ensure Start Reps, Increment, and Top Reps are configured correctly.
        </Text>
      </Paper>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case 'rising':
        return <ArrowUp size={18} />;
      case 'peak':
        return <Star size={18} weight="fill" />;
      case 'lowering':
        return <ArrowDown size={18} />;
      default:
        return null;
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'rising':
        return 'blue';
      case 'peak':
        return 'orange';
      case 'lowering':
        return 'teal'; // Changed from green for better contrast/differentiation
      default:
        return 'gray';
    }
  };

  return (
    <Paper
    shadow="xs"
    // withBorder
    style={{display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}
    >
      <Text
      size="sm"
      weight={600}
      mb="sm"
      align="center"
      >
        Ladder Progression
      </Text>
        <ScrollArea
            h="100%"
            type="auto"
            style={{ flex: 1 }}
            >
            <Stack spacing="xs">
            {sets.map((set) => (
                <Paper
                key={set.setNumber}
                p="sm"
                radius="sm"
                withBorder
                >
                    <Group
                    gap={"lg"}
                    p={"xs"}
                    wrap={"nowrap"}
                    >
                        <Text
                        size="sm"
                        weight={500}
                        c={"dimmed"}
                        style={{ whiteSpace: 'nowrap' }}
                        >
                            Set {set.setNumber}
                        </Text>
                        <Text
                        size={"h3"}
                        style={{ whiteSpace: 'nowrap' }}
                        >
                            {set.reps} {set.reps === 1 ? 'rep' : 'reps'}
                        </Text>
                        <div style={{marginLeft: 'auto'}} // aligns it to the right side somehow
                        > 
                        <ThemeIcon
                        justify={"flex-end"}
                        variant="light"
                        color={getIconColor(set.type)}
                        size="lg"
                        radius="xl">
                        {getIcon(set.type)}
                        </ThemeIcon>

                        </div>
                    </Group>
                </Paper>
            ))}
            </Stack>
        </ScrollArea>
    </Paper>
  );
};

export default React.memo(LadderSetList);
