# 3D Task Tracker

A full-stack task management application with an interactive 3D visualization layer and local LLM-powered AI features. Tasks are rendered as nodes in a Three.js constellation, spatially clustered by category. Built with Bun, Hono, PocketBase, and Ollama (Llama 3).

![Tech Stack](https://img.shields.io/badge/Bun-Runtime-black?logo=bun)
![Hono](https://img.shields.io/badge/Hono-Framework-orange)
![PocketBase](https://img.shields.io/badge/PocketBase-Database-blue)
![Three.js](https://img.shields.io/badge/Three.js-3D%20Rendering-black?logo=three.js)
![Ollama](https://img.shields.io/badge/Ollama-LLM%20Integration-green)

---

## Features

### Task Management
- Full CRUD operations with inline editing
- Priority levels (High, Medium, Low) with visual indicators
- Category classification — Dev, Design, Research, Testing, Ops
- Real-time HTMX-powered search with workspace-aware filtering
- One-click task completion toggling

### 3D Visualization
- Interactive constellation view — tasks rendered as glowing 3D nodes using Three.js
- Semantic galaxy clustering — tasks auto-grouped into 5 spatial clusters with orbital rings and point light cores
- Orbit controls for pan, zoom, and rotate
- Background star field particle system with fog effects

### AI Features (Ollama + Llama 3)
- **Project Summary** — One-click project health analysis with bottleneck detection and next-step recommendations
- **Task Breakdown** — Auto-generates 3 actionable subtasks from any parent task
- **Natural Language Command Bar** — Type plain English (e.g., *"Fix login CSS bug high priority by tomorrow"*) and AI parses it into a structured task with category, priority, and deadline
- **Effort and Priority Estimation** — Automatically estimates completion hours and assigns priority badges
- **Duplicate Task Detection** — Real-time token-overlap similarity engine warns about existing similar tasks
- **Daily Standup Generator** — Generates formatted standup reports (Completed, Today's Focus, Blockers) with copy-to-clipboard

### Voice Input
- Hands-free task dictation using Web Speech API with a pulsing microphone indicator

### Team Collaboration
- Private and team workspaces with group creation and join-by-ID
- Per-member task tracking within groups
- Task assignment to specific team members

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Backend Framework | [Hono](https://hono.dev) |
| Database | [PocketBase](https://pocketbase.io) |
| AI / LLM | [Ollama](https://ollama.ai) with Llama 3 |
| 3D Rendering | [Three.js](https://threejs.org) |
| Frontend Updates | [HTMX](https://htmx.org) |
| Voice Input | Web Speech API |
| Styling | Custom CSS with Glassmorphism |

---

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- [PocketBase](https://pocketbase.io/docs) v0.36+
- [Ollama](https://ollama.ai) with `llama3` model pulled

---

## Getting Started

**1. Clone and install**

```bash
git clone https://github.com/YOUR_USERNAME/3d-task-tracker.git
cd 3d-task-tracker
bun install
```

**2. Start PocketBase**

```bash
./pocketbase serve
```

Runs at `http://127.0.0.1:8090`. Set up the `tasks`, `users`, and `groups` collections via the Admin UI.

**3. Pull the AI model (first time only)**

```bash
ollama pull llama3
```

Ollama runs as a background service automatically. Verify at `http://127.0.0.1:11434`.

**4. Start the application**

```bash
bun run src/server.ts
```

**5. Open `http://localhost:3000`**

---

## Project Structure

```
3d-task-tracker/
├── src/
│   ├── server.ts              # Hono server + API routes
│   ├── middleware/
│   │   └── auth.ts            # PocketBase auth middleware
│   ├── services/
│   │   └── ai.ts              # Ollama AI service layer
│   ├── views/
│   │   ├── layout.ts          # Base HTML layout + Voice Copilot
│   │   ├── auth.ts            # Login and Signup pages
│   │   ├── dashboard.ts       # Private workspace dashboard
│   │   ├── groupDashboard.ts  # Team workspace dashboard
│   │   └── memberDashboard.ts # Member task tracker
│   └── public/
│       ├── app.js             # Three.js 3D constellation renderer
│       └── dashboard.css      # Glassmorphic UI styles
├── package.json
├── tsconfig.json
└── README.md
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Private workspace dashboard |
| GET | `/groups/:id` | Team workspace dashboard |
| GET | `/groups/:id/member/:memberId` | Member task tracker |
| POST | `/tasks` | Create a new task |
| GET | `/tasks/:id` | Fetch a single task |
| POST | `/edit/:id` | Update a task |
| GET | `/toggle/:id` | Toggle task completion |
| GET | `/delete/:id` | Delete a task |
| GET | `/search` | HTMX-powered task search |
| GET | `/api/tasks` | JSON API for 3D constellation |
| GET | `/ai-summary` | AI project analysis |
| POST | `/tasks/:id/ai-breakdown` | AI subtask generation |
| POST | `/tasks/ai-create` | Natural language task creation |
| POST | `/tasks/check-duplicates` | Duplicate task detection |
| GET | `/ai-standup` | Daily standup report |

---

## AI Fallback Behavior

All AI features use Ollama (Llama 3) running locally. If Ollama is unavailable, the app falls back to a heuristic-based Smart Analytics engine — nothing breaks.

| Feature | Ollama Online | Ollama Offline |
|---------|--------------|----------------|
| Project Summary | LLM-generated analysis | Calculated stats and metrics |
| Task Breakdown | LLM subtask generation | Template-based subtasks |
| NL Command Bar | LLM JSON parsing | Regex keyword extraction |
| Duplicate Check | Token overlap scoring | Token overlap scoring |
| Daily Standup | Formatted from task data | Formatted from task data |

---

## License

This project is open source and available under the [MIT License](LICENSE).
