# PDF Editor Application

A React-based web application for editing and annotating PDF documents with layer support.

## Features
- **PDF Upload & Rendering**: View high-quality PDFs.
- **Layer Management**: Create, lock, hide, and reorder layers.
- **Tools**: Add text, images, icons (including Camera), and freehand drawings.
- **Project Saving**: Save your work as a JSON project file and resume later.
- **PDF Export**: Export your annotated document as a standard PDF file.

## Prerequisites

- Node.js (version 20 or higher)
- npm (Node Package Manager)

## Getting Started (Local Development)

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

4.  **Run Production Build**
    ```bash
    npm start
    ```

## Docker Instructions

You can containerize this application using Docker.

### 1. Build the Docker Image

Run the following command in the root directory of the project:

```bash
docker build -t pdf-editor .
```

### 2. Run the Container

Start the application container on port 5000:

```bash
docker run -p 5000:5000 pdf-editor
```

Access the application at `http://localhost:5000`.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **PDF Handling**: react-pdf, pdf-lib
- **UI Components**: Shadcn/UI, Lucide React
