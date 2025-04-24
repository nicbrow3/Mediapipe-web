# Debugging React Exercise Selection & Landmark Highlighting

## Issue Summary
- Changing the exercise in the UI did not update the highlighted landmarks on the camera overlay.
- The correct exercise was selected in the parent and passed as a prop, but the overlay always used the initial exercise's landmarks.

## Root Cause
- **Stale closure bug:**
  - The pose detection/render loop and callbacks in `WorkoutTracker.jsx` captured the initial `selectedExercise` prop.
  - When the prop changed, the callbacks still referenced the old value, so the overlay never updated.

## Solution
- Use a React `ref` to always access the latest `selectedExercise` inside all async/callback logic:
  ```js
  const selectedExerciseRef = useRef(selectedExercise);
  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
  }, [selectedExercise]);
  // Use selectedExerciseRef.current in all callbacks
  ```
- Update all logic in callbacks (e.g., `processResults`, rep counting, redraw) to use `selectedExerciseRef.current` instead of `selectedExercise`.

## Best Practices for the Future
- **When using props/state in async/callbacks or render loops,** always use a ref to access the latest value.
- **Add debug logs** to confirm that your component re-renders and receives the latest props.
- **Check for stale closures** if UI does not update as expected after a prop/state change.
- **Keep prop/state usage in sync** between parent and child components, especially when passing handlers and selected objects.

---
_This approach ensures React components always use the latest data, even in long-lived or async logic, preventing subtle bugs in dynamic UIs._ 