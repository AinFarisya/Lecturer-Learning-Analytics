# Project Tracking & Workload Monitoring System

A full-stack **project tracking and workload monitoring platform** designed to help administrators manage users, projects, tasks, assignments, milestones, priorities, and employee workload through a centralized web-based system.

This project was developed during my **IT Internship at Celestica GBS Penang (M) Sdn. Bhd.**

---

## Project Purpose

Project and task monitoring is often handled using spreadsheets or manually maintained tracking files, which can make it difficult to monitor project progress, employee workload, task priorities, and overall status efficiently.

This system provides a centralized platform for managing project-related information by supporting:

* Project and task management
* Employee workload monitoring
* User and role management
* Project-to-user assignments
* Project milestone tracking
* Status and priority management
* Gantt-style timeline visualisation
* Role-based system access

The goal is to improve project visibility, reduce reliance on manual tracking, and provide a clearer overview of employee workload and project progress.

---

## Key Features

### User & Role Management

* Admin and user role support
* User creation and management
* User profile information
* Department and contact information
* Role-based access control
* Secure password handling
* Temporary password support
* First-login password change support through backend fields

### Authentication & Security

* Email and password login
* Password hashing using bcrypt
* JSON Web Token (JWT) authentication
* Protected backend routes
* Role-based permissions
* Authentication token management
* Session handling using localStorage or sessionStorage
* Environment variables for sensitive configuration

### Project Management

* Create and manage projects
* Update project information
* Delete projects
* Assign project priority
* Assign project status
* Track project completion
* Maintain project descriptions and due dates

### Task Management

* Create tasks
* Assign tasks to users
* Record task reporter
* Update task status
* Update task priority
* Set task due dates
* Track task completion
* Delete tasks
* Associate tasks with projects

### Project Assignment

* Assign users to projects
* Support multiple project-user relationships
* View assigned users for each project
* Maintain project assignments in PostgreSQL

### Project Milestones

* Create project milestones
* Set milestone start dates
* Set milestone end dates
* Update milestone status
* Update milestone priority
* Delete milestones
* Associate milestones with projects

### Workload Monitoring

* View employee task assignments
* Monitor task status
* Review employee workload
* Display task priority distribution
* Display project and task summaries
* Support dashboard-based monitoring

### Gantt & Timeline Tracking

* Project milestone timeline
* Start and end date visualisation
* Task and milestone progress tracking
* Project timeline monitoring
* Team-level Gantt-style view

---

## Technology Stack

### Frontend

* React
* TypeScript
* JavaScript
* HTML
* CSS
* Vite
* Lucide React

### Backend

* Node.js
* Express.js
* TypeScript
* REST API

### Authentication & Security

* JSON Web Token (JWT)
* bcrypt
* Protected Express routes
* Role-based authorization
* Environment variables

### Database

* PostgreSQL
* pgAdmin

### Development Tools

* Visual Studio Code
* Git
* GitHub
* pgAdmin
* PowerShell

---

## Repository Structure

```text
Project-Tracking-Workload-Monitoring-System/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── projects.routes.ts
│   │   │   ├── tasks.routes.ts
│   │   │   ├── reference.routes.ts
│   │   │   ├── project-assignments.routes.ts
│   │   │   └── project-milestones.routes.ts
│   │   │
│   │   └── server.ts
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── .gitignore
│
├── src/
│   ├── components/
│   │   ├── admin/
│   │   ├── user/
│   │   ├── ui/
│   │   ├── Login.tsx
│   │   └── Login.css
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   ├── utils/
│   │   └── excelExport.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   ├── css.d.ts
│   └── vite-env.d.ts
│
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
└── README.md
