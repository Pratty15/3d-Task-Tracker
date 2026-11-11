# 🚀 3D Task Tracker

An interactive 3D task management application with AI-powered features. Tasks are visualized as glowing nodes in a dynamic Three.js constellation, organized into galaxy clusters by category. Built with **Bun**, **Hono**, **PocketBase**, and **Ollama (Llama 3)**.

![Tech Stack](https://img.shields.io/badge/Bun-Runtime-black?logo=bun)
![Hono](https://img.shields.io/badge/Hono-Framework-orange)
![PocketBase](https://img.shields.io/badge/PocketBase-Database-blue)
![Three.js](https://img.shields.io/badge/Three.js-3D%20Rendering-black?logo=three.js)
![Ollama](https://img.shields.io/badge/Ollama-LLM%20Integration-green)

---

## ✨ Features

### Core Task Management
- **Create, Edit, Delete Tasks** — Full CRUD operations with inline editing
- **Priority Levels** — High, Medium, Low with visual indicators
- **Category Classification** — Dev, Design, Research, Testing, Ops
- **Task Search** — Real-time HTMX-powered search with workspace-aware filtering
- **Toggle Completion** — One-click task status toggling

### 3D Visualization
- **Interactive Constellation View** — Tasks rendered as glowing 3D nodes using Three.js
- **Galaxy Cluster Hubs** — Tasks auto-grouped into 5 spatial clusters (Dev, Design, Research, Testing, Ops) with orbital rings and glowing cores
- **Orbit Controls** — Pan, zoom, and rotate the 3D scene
- **Animated Particles** — Background star field with fog effects
- **Smooth Transitions** — Task state changes reflected with visual animations

### AI-Powered Features (Ollama + Llama 3)
- **AI Project Summary** — One-click project health analysis with bottleneck detection and next-step recommendations
- **AI Task Breakdown** — Auto-generates 3 actionable subtasks from any parent task
- **Natural Language Command Bar** — Type plain English (e.g., *"Fix login CSS bug high priority by tomorrow"*) and AI parses it into a structured task
- **AI Effort & Priority Estimation** — Automatically estimates completion hours and priority badges
- **Duplicate Task Detector** — Real-time token-overlap similarity engine warns about existing similar tasks
- **Daily Standup Generator** — Generates formatted standup reports (Completed, Today's Focus, Blockers) with copy-to-clipboard

### Voice Input
- **Voice Copilot** — Hands-free task creation using Web Speech API with a pulsing microphone button

### Team Collaboration
- **Private & Team Workspaces** — Personal tasks + group team spaces
- **Create / Join Groups** — Team workspace creation with invite-by-ID
- **Member Task Tracking** — View individual member's tasks within a group
- **Task Assignment** — Assign tasks to specific team members

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | [Bun](https://bun.sh) |
| **Backend Framework** | [Hono](https://hono.dev) |
| **Database** | [PocketBase](https://pocketbase.io) |
| **AI / LLM** | [Ollama](https://ollama.ai) with Llama 3 |
| **3D Rendering** | [Three.js](https://threejs.org) |
| **Frontend Updates** | [HTMX](https://htmx.org) |
| **Voice Input** | Web Speech API |
| **Styling** | Custom CSS with Glassmorphism |

---

## 📦 Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [PocketBase](https://pocketbase.io/docs) (v0.36+)
- [Ollama](https://ollama.ai) (with `llama3` model pulled)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/3d-task-tracker.git
cd 3d-task-tracker
```

### 2. Install dependencies

```bash
bun install
```

### 3. Start PocketBase (Database)

```bash
./pocketbase serve
```

> Runs at `http://127.0.0.1:8090`. Set up the `tasks`, `users`, and `groups` collections via the PocketBase Admin UI.

### 4. Pull the AI model (first time only)

```bash
ollama pull llama3
```

> Ollama runs as a background service on Windows/macOS. Verify at `http://127.0.0.1:11434`.

### 5. Start the application

```bash
bun run src/server.ts
```

### 6. Open in browser

```
http://localhost:3000
```

---

## 📁 Project Structure

```
3d-task-tracker/
├── src/
│   ├── server.ts              # Hono server + all API routes
│   ├── middleware/
│   │   └── auth.ts            # PocketBase auth middleware
│   ├── services/
│   │   └── ai.ts              # Ollama AI service layer
│   ├── views/
│   │   ├── layout.ts          # Base HTML layout + Voice Copilot script
│   │   ├── auth.ts            # Login & Signup pages
│   │   ├── dashboard.ts       # Private workspace dashboard
│   │   ├── groupDashboard.ts  # Team workspace dashboard
│   │   └── memberDashboard.ts # Individual member tracker
│   └── public/
│       ├── app.js             # Three.js 3D constellation renderer
│       └── dashboard.css      # Glassmorphic UI styles
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔌 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Private workspace dashboard |
| `GET` | `/groups/:id` | Team workspace dashboard |
| `GET` | `/groups/:id/member/:memberId` | Member task tracker |
| `POST` | `/tasks` | Create a new task |
| `GET` | `/tasks/:id` | Fetch a single task |
| `POST` | `/edit/:id` | Update a task |
| `GET` | `/toggle/:id` | Toggle task completion |
| `GET` | `/delete/:id` | Delete a task |
| `GET` | `/search` | HTMX-powered task search |
| `GET` | `/api/tasks` | JSON API for 3D constellation |
| `GET` | `/ai-summary` | AI project analysis |
| `POST` | `/tasks/:id/ai-breakdown` | AI subtask generation |
| `POST` | `/tasks/ai-create` | Natural language task creation |
| `POST` | `/tasks/check-duplicates` | Duplicate task detection |
| `GET` | `/ai-standup` | Daily standup report |

---

## 🤖 AI Features — How They Work

All AI features use **Ollama (Llama 3)** running locally. If Ollama is unavailable, the app gracefully falls back to a **Smart Analytics Engine** (regex + heuristic-based), so nothing ever breaks.

| Feature | Ollama Online | Ollama Offline |
|---------|--------------|----------------|
| Project Summary | LLM-generated analysis | Calculated stats + metrics |
| Task Breakdown | LLM subtask generation | Template-based subtasks |
| NL Command Bar | LLM JSON parsing | Regex keyword extraction |
| Duplicate Check | Token overlap scoring | Token overlap scoring |
| Daily Standup | Formatted from task data | Formatted from task data |

---

## 📸 Screenshots

> Add your screenshots here

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
