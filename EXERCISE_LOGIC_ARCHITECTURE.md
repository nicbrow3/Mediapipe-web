# Exercise Logic Architecture Guide

## Overview

This project uses a modular, extensible architecture for exercise tracking and repetition logic. The goal is to make it easy to add new exercises, support a variety of rep/phase logic types (including compound and multi-phase movements), and keep the UI decoupled from exercise-specific logic.

## Directory & File Structure

```
src/
  exercises/
    bicepCurls.js
    squat.js
    ... (other exercises)
    index.js                # Exports all exercises
  logic/
    repStateEngine.js       # The engine that runs logic per frame
    repCounterLogic.js      # Example logic function(s)
    landmarkUtils.js        # Example utility function(s)
    ... (other logic functions)
```

## Core Modules & Responsibilities

### `exercises/`
- Each file exports a config object for an exercise (e.g., `bicepCurls.js`).
- `index.js` exports all available exercises for easy import.
- **Logic and utility functions are imported and assigned directly in the config.**

### `logic/repStateEngine.js`
- Central engine that:
  - Accepts pose landmarks, an exercise config, and previous state.
  - Calls the logic function and passes utility functions directly from the config.
  - Returns the new state (e.g., rep count, phase, etc.).

### `logic/repCounterLogic.js` (and other logic functions)
- Implements the rep/phase logic for a specific type of exercise.
- Receives `{ landmarks, config, prevState, utils }` as input.
- Returns the new state (e.g., rep count, phase, etc.).

### `logic/landmarkUtils.js` (and other utility files)
- Contains utility functions (e.g., `calculateAngle`) used by logic functions.

## How to Add a New Exercise

1. **Create a new config file** in `src/exercises/` (e.g., `squat.js`).
2. **Import the logic and utility functions** you need at the top of the file.
3. **Assign the functions directly** in the config object:
   ```js
   import { calculateAngleBasedRepState } from '../logic/repCounterLogic';
   import { calculateAngle } from '../logic/landmarkUtils';

   export const squat = {
     // ...
     logicConfig: {
       stateCalculationFunction: calculateAngleBasedRepState,
       utilityFunctions: { calculateAngle },
     },
     // ...
   };
   ```
4. **Export the config** and add it to `exercises/index.js`.

## How to Add a New Logic or Utility Function

1. **Create the function** in the appropriate file (e.g., `repCounterLogic.js`, `landmarkUtils.js`).
2. **Import and assign it directly** in any exercise config that needs it.

## Example: Engine Usage

```js
// src/logic/repStateEngine.js
export function runRepStateEngine(landmarks, exerciseConfig, prevState) {
  const logicFn = exerciseConfig.logicConfig.stateCalculationFunction;
  const utils = exerciseConfig.logicConfig.utilityFunctions || {};
  return logicFn({ landmarks, config: exerciseConfig, prevState, utils });
}
```

## Why This Approach?
- **Simplicity:** No need for registry boilerplate or string keys—just import and assign.
- **Clarity:** Easy to follow where each function comes from.
- **Refactorable:** You can change the implementation of a function without changing the config reference.
- **Extensible:** If you ever need more flexibility (e.g., configs as pure data, dynamic logic selection), you can refactor to a registry pattern later.

## When to Consider a Registry
- If you want configs to be pure data (e.g., JSON, editable in a CMS, or loaded from a server).
- If you want to support dynamic or user-defined exercises or logic.
- If you want to keep a centralized list of all logic types for validation or documentation.

---

**This architecture makes it easy to add new exercises, logic types, and utilities, and keeps the codebase organized and maintainable.** 