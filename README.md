# ⚡ Netlink | Asynchronous Social Ecosystem

Netlink is a premium, dark-themed, asynchronous social media application built using a modern full-stack architecture. It features a responsive React (TypeScript) frontend powered by a FastAPI (Python) backend with real-time WebSockets, time-decay hashtag trending, and advanced security controls.

---

## 🚀 Key Features

### 🌟 Premium Glassmorphic Design
- A premium, dark aesthetic utilizing Outfit and Sora fonts.
- Harmonious color palettes featuring neon slate fills and cyan/blue ambient glows.
- Smooth CSS animations, micro-interactions, and heart pulse states.

### 👤 Custom Avatar Character Designer
- A vector-based character designer built into the **Edit Profile** modal (powered by the Dicebear SVG API).
- Live preview rendering which updates instantly.
- Toggle between style variations (*Robots*, *Humans*, *Cute Faces*, *Retro Pixel Art*, *Abstract Shapes*, or *Initials*).
- Custom seed generator with a **Dice 🎲** button for randomization, and customizable background fill options.

### ⏳ 10-Day Username Cooldown
- A security rule preventing users from changing their username more than once in a 10-day period.
- Enforced at the **database schema level** (`last_username_change` column tracking).
- Enforced on the **frontend**: the input field is automatically **disabled** and displays a warning countdown indicating when the change will be available next.

### 📈 Time-Decay Hashtag Trending
- Autolinking hashtag parser (`#tag` becomes a clickable element).
- Backend trending hashtag engine using a mathematical time-decay scoring model:
  $$Score = \frac{1}{(\Delta t + 2)^{1.8}}$$
- Recalculates popular hashtags based on count and post age within a rolling 24-hour window.

### 💬 Recursive Indented Comment Tree
- Supports nested, multi-level commentary.
- Infinite deep replies organized recursively.

### 🔌 Live WebSocket Alerts
- Dual-fallback handshake (fetching token from HttpOnly cookies or query parameter queries).
- Push broadcast gateway instantly dispatching alerts (*Likes*, *Comments*, *Follows*, *Mentions*) to active connections with sliding toast banners.

### 🛡️ Security Guardrails
- **HttpOnly Cookie JWT Sessions**: Prevents CSRF/XSS token harvesting.
- **Magic Byte File Verifier**: Inspects binary headers on uploaded media streams to verify file signatures (JPEG, PNG, etc.) rather than relying solely on file extensions.
- **Token-Bucket Rate Limiter**: custom Python middleware tracking client IDs and throttling request speeds.
- **Native Bcrypt Hashing**: Raw cryptographical library implementation preventing passlib versioning conflicts.

---

## 📂 Codebase Structure

```
netlink/ (root)
├── netlink-backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── auth.py         # Sign-in, sign-up, session verifications
│   │   │   ├── posts.py        # Feed queries, likes, trending tags
│   │   │   ├── links.py        # Follow relationships & profile updates
│   │   │   ├── comments.py     # Nested replies management
│   │   │   ├── notifications.py # Notification state reads
│   │   │   └── upload.py       # Magic number upload inspections
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic environment configurations
│   │   │   └── security.py     # JWT & Rate-limiting dependency middle
│   │   ├── db/
│   │   │   ├── database.py     # SQLAlchemy sessions
│   │   │   ├── models.py       # User, Follow, Post, Comment, Notification tables
│   │   │   └── schemas.py      # Pydantic input/output validation models
│   │   ├── services/
│   │   │   ├── socket.py       # WebSocket active connection manager
│   │   │   └── trending.py     # Time-decay trend indexer
│   │   └── main.py             # FastAPI entry point & CORS configuration
│   ├── requirements.txt
│   └── .env
├── netlink-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthGate.tsx     # Custom login cards with password strength checks
│   │   │   ├── NetCard.tsx      # Post blocks parsing hashtags and mentions
│   │   │   ├── LinkFeed.tsx     # Stream composer and layout grids
│   │   │   ├── ProfileGlass.tsx # Cover views and mutual connection indicators
│   │   │   ├── ProfileModal.tsx # Edit panel with custom avatar builder
│   │   │   ├── CommentTree.tsx  # Recursive replies
│   │   │   ├── NotificationPanel.tsx # Notifications tray
│   │   │   └── RightSidebar.tsx # Hashtag indices
│   │   ├── context/
│   │   │   └── NetContext.tsx   # React global context (websockets & sessions)
│   │   ├── utils/
│   │   │   └── api.ts           # Axios/Fetch API wrapper passing cookie credentials
│   │   ├── index.css            # Stylesheets with sora & jakarta fonts
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
└── package.json                 # Workspace manager mapping dev triggers
```

---

## 🏃 Running the Code

Follow these setup steps to launch both servers:

### Prerequisites
- Node.js (v18+)
- Python (3.11+)

### 1. Installation
In the workspace root directory:
```bash
# Install frontend workspace dependencies
npm install

# Install backend python dependencies
pip install -r netlink-backend/requirements.txt
```

### 2. Startup
Run the following scripts from the root directory:

#### Terminal 1: Launch Backend API
```bash
npm run dev:backend
```
*Starts Uvicorn ASGI server on `http://localhost:5000` with hot-reloader active. Creates `netlink.db` file automatically on boot.*

#### Terminal 2: Launch Frontend Client
```bash
npm run dev:frontend
```
*Starts Vite development server on `http://localhost:5173`. Open this address in your browser.*
