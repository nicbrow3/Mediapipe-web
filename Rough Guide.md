 #media-pipe 

New goal: have it run on the web so that we can use the iPad’s ultrawide camera to run it.
- [Demo](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) This demo works great on the iPad and gives a large field of view.

# Creating a Workout Tracker Webapp with MediaPipe Pose Estimation

This comprehensive guide outlines the steps to build a workout tracker webapp that uses a webcam to track body movements and count exercise repetitions. The app leverages MediaPipe Pose Estimation to detect body landmarks, calculates joint angles to determine exercise stages, and displays repetition counts. We’ll use NPM to manage dependencies and Parcel to bundle the application, ensuring a modern development workflow. The virtual environment is achieved by isolating dependencies within the project using NPM.

## Prerequisites

- **Knowledge**: Basic understanding of HTML, CSS, and JavaScript.
- **Tools**: Node.js and NPM installed on your machine. Download from Node.js.
- **Environment**: A modern browser like Chrome or Safari for webcam access and MediaPipe compatibility.

## Development Steps

### Step 1: Set Up the Project

Initialize a new project and install dependencies to create a virtual environment for dependency management.

1. **Create a Project Directory**:
    
    ```bash
    mkdir workout-tracker
    cd workout-tracker
    ```
    
2. **Initialize NPM**: Create a `package.json` file to manage dependencies:
    
    ```bash
    npm init -y
    ```
    
3. **Install MediaPipe**: Install the MediaPipe vision tasks package:
    
    ```bash
    npm install @mediapipe/tasks-vision
    ```
    
4. **Install Parcel**: Install Parcel as a development dependency for bundling and serving:
    
    ```bash
    npm install parcel --save-dev
    ```
    
5. **Create Project Files**: Set up the following files in the project directory:
    
    - `index.html`: The main HTML file for the app’s structure.
    - `styles.css`: Styles for the user interface.
    - `script.js`: JavaScript logic for webcam access, pose detection, and rep counting.
    - `public/wasm/`: A directory to store MediaPipe’s WebAssembly (WASM) files for local development.
6. **Copy WASM Files** (Optional): For local WASM file usage, copy the WASM files from `node_modules/@mediapipe/tasks-vision/wasm` to `public/wasm`. This ensures the app can run without relying on a CDN, though we’ll use the CDN for simplicity in this guide.
    

### Step 2: Create the HTML Structure

Build the web interface with elements to display the webcam feed, pose landmarks, and repetition count.

In `index.html`, add:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workout Tracker</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Workout Tracker</h1>
    <video id="video" autoplay></video>
    <canvas id="canvas"></canvas>
    <div id="repCount">Reps: 0</div>
    <script type="module" src="script.js"></script>
</body>
</html>
```

- **Video Element**: Displays the webcam feed.
- **Canvas Element**: Used to draw pose landmarks.
- **Rep Count Div**: Shows the number of repetitions.
- **Script Tag**: Uses `type="module"` to support ES module imports in `script.js`.

### Step 3: Style the Application

Add basic styles to ensure a clean and functional user interface.

In `styles.css`:

```css
body {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: Arial, sans-serif;
}

#video, #canvas {
    width: 640px;
    height: 480px;
    border: 1px solid #ccc;
}

#repCount {
    font-size: 24px;
    margin-top: 20px;
}
```

These styles center the content and set dimensions for the video and canvas elements.

### Step 4: Access the Webcam

Request webcam access to capture the video feed for pose detection.

In `script.js`, add:

```javascript
const video = document.getElementById('video');
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(error => {
        console.error('Error accessing webcam:', error);
    });
```

This code requests webcam permission and streams the feed to the video element. Ensure the app is served over HTTP/HTTPS (Parcel handles this) due to browser security restrictions.

### Step 5: Integrate MediaPipe Pose Landmarker

Configure MediaPipe to detect body landmarks in the video feed.

In `script.js`, add:

```javascript
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let poseLandmarker;
async function setup() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
}
setup();
```

- **Imports**: Use ES modules to import MediaPipe classes.
- **WASM Files**: The example uses a CDN for WASM files for simplicity. For local files, copy `node_modules/@mediapipe/tasks-vision/wasm` to `public/wasm` and use `FilesetResolver.forVisionTasks('./wasm')`, ensuring Parcel serves the `public` directory.
- **Model**: Uses the lightweight `pose_landmarker_lite` model for real-time performance.
- **Configuration**: Sets `runningMode` to `VIDEO` for continuous tracking and adjusts confidence thresholds for accuracy.

### Step 6: Process Video Frames

Analyze video frames to detect poses and extract landmarks.

In `script.js`, add:

```javascript
let lastVideoTime = -1;
function renderLoop() {
    if (video.currentTime !== lastVideoTime) {
        const poseLandmarkerResult = poseLandmarker.detectForVideo(video, performance.now());
        processResults(poseLandmarkerResult);
        lastVideoTime = video.currentTime;
    }
    requestAnimationFrame(renderLoop);
}
renderLoop();
```

This loop checks for new video frames, processes them with `detectForVideo`, and calls `processResults` to handle the output.

### Step 7: Calculate Angles and Count Reps

Calculate joint angles to determine exercise stages and count repetitions.

1. **Angle Calculation Function**:
    
    In `script.js`, add:
    
    ```javascript
    function calculateAngle(a, b, c) {
        const vectorBA = { x: a.x - b.x, y: a.y - b.y };
        const vectorBC = { x: c.x - b.x, y: c.y - b.y };
        const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
        const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2);
        const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);
        const angle = Math.acos(dotProduct / (magnitudeBA * magnitudeBC));
        return angle * (180 / Math.PI);
    }
    ```
    
    This function computes the angle between three points (e.g., shoulder, elbow, wrist) using vector mathematics.
    
2. **Rep Counting Logic**:
    
    In `script.js`, implement `processResults`:
    
    ```javascript
    let repCount = 0;
    let stage = null;
    
    function processResults(results) {
        if (results.landmarks && results.landmarks[0]) {
            const landmarks = results.landmarks[0];
            // Example: Left elbow angle for bicep curls
            const leftShoulder = landmarks[11]; // LEFT_SHOULDER
            const leftElbow = landmarks[13]; // LEFT_ELBOW
            const leftWrist = landmarks[15]; // LEFT_WRIST
            const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    
            // Rep counting logic for bicep curls
            if (angle < 90 && stage !== 'down') {
                stage = 'down';
            }
            if (angle > 160 && stage === 'down') {
                stage = 'up';
                repCount++;
                document.getElementById('repCount').innerText = `Reps: ${repCount}`;
            }
        }
    }
    ```
    
    - **Landmarks**: MediaPipe provides 33 landmarks per pose. Refer to the Pose Landmarker documentation for the landmark map.
    - **Logic**: For bicep curls, a rep is counted when the elbow angle goes below 90 degrees (flexed) and then above 160 degrees (extended). Adjust thresholds for other exercises like squats or push-ups.

### Step 8: Display Results

Visualize pose landmarks and update the rep count in the UI.

1. **Draw Landmarks**:
    
    For simplicity, you can manually draw landmarks on the canvas or use MediaPipe’s drawing utilities if available. Here’s a basic example:
    
    In `script.js`, add:
    
    ```javascript
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    function drawLandmarks(landmarks) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.fillStyle = 'red';
        landmarks.forEach(landmark => {
            ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
    
    // Update processResults to include drawing
    function processResults(results) {
        if (results.landmarks && results.landmarks[0]) {
            const landmarks = results.landmarks[0];
            drawLandmarks(landmarks);
            // Existing angle and rep counting logic
            const leftShoulder = landmarks[11];
            const leftElbow = landmarks[13];
            const leftWrist = landmarks[15];
            const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
            if (angle < 90 && stage !== 'down') {
                stage = 'down';
            }
            if (angle > 160 && stage === 'down') {
                stage = 'up';
                repCount++;
                document.getElementById('repCount').innerText = `Reps: ${repCount}`;
            }
        }
    }
    ```
    
    - **Canvas Setup**: Ensure the canvas dimensions match the video (640x480).
    - **Drawing**: Draws red dots at landmark positions. Enhance with lines or use MediaPipe’s `DrawingUtils` for advanced visualization (requires additional setup).
2. **Update Rep Count**: The rep count is updated in the `processResults` function, displayed in the `#repCount` div.
    

### Step 9: Run and Test the Application

1. **Start the Development Server**: Run Parcel to serve the application:
    
    ```bash
    npx parcel index.html
    ```
    
    Parcel will start a development server, typically at `http://localhost:1234`. Open this URL in a browser.
    
2. **Grant Webcam Permission**: When prompted, allow webcam access.
    
3. **Test Functionality**:
    
    - Verify that the webcam feed appears and pose landmarks are drawn.
    - Perform exercises (e.g., bicep curls) and check if reps are counted correctly.
    - Test across devices (desktop, mobile) and browsers (Chrome, Safari) to ensure compatibility.
4. **Refine Logic**: Adjust angle thresholds and confidence settings (`minPoseDetectionConfidence`, etc.) for accuracy. Experiment with different exercises by modifying the landmark indices and thresholds.
    

### Step 10: Build for Production

For deployment, create optimized bundles:

```bash
npx parcel build index.html
```

This generates files in the `dist` folder, which can be hosted on a web server. Ensure the WASM files are included if using local files, or rely on the CDN.

## Virtual Environment Explanation

In web development, a virtual environment isolates project dependencies to prevent conflicts. Using NPM, dependencies like `@mediapipe/tasks-vision` are installed locally in the project’s `node_modules` folder, creating a self-contained environment. This approach avoids global installations and ensures reproducibility across development setups.

## Configuration Options

The following table summarizes key configuration options for the PoseLandmarker:

|Option Name|Description|Value Range|Default Value|
|---|---|---|---|
|`runningMode`|Sets processing mode|`IMAGE`, `VIDEO`|`IMAGE`|
|`numPoses`|Maximum poses detected|Integer > 0|1|
|`minPoseDetectionConfidence`|Minimum confidence for detection|Float [0.0, 1.0]|0.5|
|`minPosePresenceConfidence`|Minimum confidence for presence|Float [0.0, 1.0]|0.5|
|`minTrackingConfidence`|Minimum confidence for tracking|Float [0.0, 1.0]|0.5|
|`outputSegmentationMasks`|Outputs segmentation mask|Boolean|False|

Adjust these based on your app’s needs, balancing accuracy and performance.

## Troubleshooting

- **Webcam Access Denied**: Ensure the app is served over HTTPS or localhost and that the browser supports `getUserMedia`.
- **Pose Detection Issues**: Increase confidence thresholds or use a more robust model (e.g., `pose_landmarker_full`).
- **Performance Lag**: Reduce video resolution or use a lighter model.
- **WASM File Errors**: Verify the WASM path or CDN URL. For local files, ensure the `public/wasm` directory is served correctly.

## Expanding the App

- **Multiple Exercises**: Add logic for other exercises (e.g., squats, push-ups) by targeting different landmarks and angles.
- **UI Enhancements**: Include exercise selection, rep history, or visual feedback.
- **Mobile Optimization**: Test and adjust for mobile browsers, considering touch events and screen sizes.

## Conclusion

This guide provides a complete workflow to create a workout tracker webapp using MediaPipe Pose Estimation. By using NPM for dependency management and Parcel for bundling, you ensure a modern, isolated development environment. The app can be extended with additional features and optimized for production deployment.

Rep monitoring idea:
We can record a certain number of reps in monitor the angles with a graph. Then we can mainly go through and see where the rap started and stopped, then feed that into an LLM, which could give us the data that we need to look for to monitor reps accurately. 

[[Cursor Rules & Notes]] 

Choosing works outs
- select muscle group or random
- Spinner for random or a list 
- #### Visuals
	- ![[Pasted image 20250405112021.png]]
	- Have a graph over time of the range of motion on a set
		- Say we do 20 push-ups, we can see how deep we went on each rep over time. See trends this way.
		- x-axis reps, y-axis depth
	- [ ] Prefab for 2-sided workouts visuals (i.e. curls/tricep kickbacks)
		- Could have a standard prefab that exists for workouts that use both sides of the body and can keep track of the motions separately
		- Another one of single/whole body workouts that only need to keep track of a singular motion
		- Component on the specific workout tracker to show which landmarks that we need to see.
			- Circle around the node with color to show visibility?
	- Could have each body part as a static sprite and have a joint to the next part matching real-life counter part.
	- Limit range of motion? for more realism or could hold off to make it look a little funny?
	- Have the transparent or greyed out when the tracking doesn't see the 3 nodes needed (Shoulder, Elbow, Wrist)
		- Fully opaque and maybe an outline when fully tracked.
	- Have a semi-circle arc with tiny perpendicular lines capping off the full range of motion and have a small dot/circle along of the arm to show the current placement within the full range of motion.
- #### Activities
	- Weight / options selector
		- You could have a radial menu appear on the screen and then use your left and right arms respectively, select something in the menu by holding your arm at a specific angle for a second
	- Curls
		- Track the angle of the upper arm to the ground, give them some buffer from perfectly vertical, ~0-20 degrees maybe
		- Then for the reps track the angle of the lower arm relative to the upper arm.
			- Can give Range of motion scores of good rep ←→ half rep
			- Control score - slow and steady decline / not "rocking" the upper arm to help with the motion.
	- Pistol Squats
	- Tricep kickbacks
	- Squats
	- Pushups
	- Tricep dips
	- ~~Need to start with some way of interacting with the UI. Start with a square in one of the corners that activate when you hold for it for a second~~
		- Could do a hand wave like get on one button in the next to it and then back to the original button because that's a strange motion
- #### Gamify
	- Body Morph (Title?)
		- Contort your body to match the body-shaped holes on screen
		- Stand still for a moment to initialize your on screen body
		- Your on screen body will be created in a single plane
		- Will follow your actually body close to 1-to-1
			- Maybe keep the torso facing forward to avoid cheating?
			- Have a faint indicator of your actual body within the 3D space
		- If you hit an obstacle - ragdoll the on screen body
		- On respawn → pull the ragdoll back to your body markers like magnets 
	- Vertical Control
		- Curls / Squats / Pushups
		- Flappy bird style of obstacle avoidance
# Unity
- The (x,y) coordinates of the landmarks are normalized from 0 to 1 with (0,0) being the top-left corner of the screen.

## Start of Scripts
`void Awake(){}` - Called before game object is initialized. Runs before any `start()` functions. Called even if the script is disabled. Useful for setting up references between scripts.

`void Start(){}` - Called on the first frame of when a script is enabled. Called before the first `Update()`. Use if you need to wait for other objects to be initialized first.

## Variables
@export = `[SerializeField] private <TYPE> <LABEL>;`
- These will appear in the inspector where you can assign them
- This snippet will look if the object the script is attached to is it's type and use that object if it's unassigned:
`void Awake() {`
	`if (textDisplay == null) {`
		`textDisplay = GetComponent<TextMeshProUGUI>();`
	`}`
`}`
![[2006.11718v1.pdf]]

- Outdated:
	- We're using the MediaPipe pose estimation in the background and running it on a local server on the same machine as Godot.
	- Godot talks to the server and receives the position data from MediaPipe ~60 ms latency
