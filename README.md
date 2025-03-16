# Gantt Chart Project

A Next.js application for managing projects and tasks with a Gantt chart view.

## Features

- Project management (create, edit, delete projects)
- Task management (create, edit, delete tasks)
- Interactive Gantt chart visualization
- Drag and drop tasks to change dates, resize to change duration
- Local SQLite database storage

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/gantt-chart-project.git
   cd gantt-chart-project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the database:
   ```bash
   npm run setup
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/app`: Next.js application and API routes
- `/components`: React components
- `/lib`: Utility functions and database setup
- `/migrations`: Database migration scripts
- `/prisma`: Prisma schema and client

## Database Schema

- Projects: Store information about projects
- Tasks: Store tasks with dates, order, and completion status