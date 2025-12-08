# PDF Editor for Network Infrastructure

A specialized React-based application designed for infrastructure workers and IT administrators to mark up building plans, document cable layouts, and manage IDF connections.

## Key Features

### 🏗️ Network Passportization
- **Properties Panel**: Detailed metadata for every object including:
  - **Socket ID**: Unique identifier for network points.
  - **Port Patch Panel**: Documentation of physical connections.
  - **Purpose**: Categorize points (Data, Mic, CAM, TV).
- **Object Labels**: Permanent visibility of object names on the canvas for easy identification.

### ⚡ Productivity Tools
- **Auto-Numbering System**: 
  - Toggle `#` mode to automatically increment labels.
  - Configurable prefix (e.g., "IDF1-P1-") and starting number.
  - Supports efficient click-to-place workflow for rapid deployment.
- **Deep Zoom**: Zoom up to 1000% for precise placement on detailed technical drawings.
- **Shortcuts**: Standard Copy (`Ctrl+C`) and Paste (`Ctrl+V`) with smart offset positioning.

### 🛠️ Editing Capabilities
- **Layer Management**: Organize complex plans with multiple layers (create, lock, hide, reorder).
- **Rich Object Types**: 
  - Text annotations
  - Images
  - Icons (Square, Circle, Triangle, Star, Hexagon, Arrow, **Camera**)
  - Freehand drawing lines
- **Transformations**: Resize and rotate objects freely.

### 📄 Export & Output
- **Smart PDF Export**: 
  - Generates flattened PDFs ready for printing or sharing.
  - **Auto-scaled Labels**: Object names are rendered with white backgrounds for maximum readability.
  - **Configurable Font Size**: User-controlled font size setting for export (1px - 30px) via the Settings menu.
- **Project Persistence**: Save work-in-progress as JSON project files and resume later (even without the original PDF).

## Getting Started (Local Development)

### Prerequisites
- Node.js (version 20 or higher)
- npm (Node Package Manager)

### Installation

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Start the Development Server**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5000`.

3.  **Build for Production**
    ```bash
    npm run build
    ```

## Docker Deployment

You can containerize this application using Docker.

### 1. Build the Docker Image
```bash
docker build -t pdf-editor .
```

### 2. Run the Container
```bash
docker run -p 5000:5000 pdf-editor
```
Access the application at `http://localhost:5000`.

## Tech Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **PDF Handling**: react-pdf, pdf-lib
- **UI Components**: Shadcn/UI, Lucide React
