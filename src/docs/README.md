# MediaPipe Web - Exercise Tracking

A lightweight, web-based exercise tracking application built with React and MediaPipe.

## Overview

This application uses MediaPipe's PoseLandmarker to track body movements in real-time through your webcam. It can recognize and provide feedback on various exercises by tracking joint angles.

![Screenshot of the MinimalTracker interface](screenshot-placeholder.jpg)

## Features

- Real-time pose tracking using your webcam
- Support for various exercise types
- Angle measurements for different body joints
- Customizable exercise configurations
- Performance metrics (FPS and inference time)
- Minimal UI for distraction-free exercise tracking

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Modern web browser with webcam access

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mediapipe-web.git
   cd mediapipe-web
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

3. Start the development server:
   ```
   npm start
   ```
   or
   ```
   yarn start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Click "Start Minimal Tracking" to activate your webcam
2. Select an exercise from the dropdown menu
3. Position yourself so your body is visible in the camera
4. Follow the exercise instructions
5. The application will display angle measurements in real-time

## Project Structure

The application follows a component-based architecture. For a detailed overview of the component structure, see the [Component Architecture documentation](src/docs/ComponentArchitecture.md).

## Adding New Exercises

You can add new exercises by creating a configuration file in the `src/exercises` directory. Refer to the existing exercise files for examples of the required structure.

## Technology Stack

- React
- MediaPipe Tasks-Vision
- HTML5 Canvas

## License

MIT

## Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for their amazing vision framework
- The open source community for inspiration and resources 