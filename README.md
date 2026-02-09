# 🎮 Tic-Tac-Toe Multiplayer (Full-Stack)

A full-stack multiplayer Tic-Tac-Toe web application built with **React (TypeScript)**, **Node.js**, **PostgreSQL**, and **Socket.IO**, featuring real-time gameplay, JWT authentication, game history tracking, and a modern UI using Material UI.

---

## Features

- Multiplayer real-time gameplay using **Socket.IO**
- JWT Authentication & secure access
- Create & join game rooms using Room ID
- Turn-based game validation (prevents cheating / invalid moves)
- Automatic win / draw detection
- Game restart system with player confirmation + countdown
- Side swapping after restart (X ↔ O)
- Persistent move tracking in database (`game_moves`)
- Match history page (Win / Loss / Draw results)
- Replay system (load game moves from database)
- Modern responsive UI built with **Material UI**
- Sound effects + confetti celebration

---

## Tech Stack

### Frontend
- **React**
- **TypeScript**
- **Material UI**
- **Axios**
- **Socket.IO Client**

### Backend
- **Node.js**
- **Express.js**
- **TypeScript**
- **Socket.IO**
- **JWT Authentication**

### Database
- **PostgreSQL**
- Tables:
  - `users`
  - `games`
  - `game_moves`

---

## Project Structure

```text
tic-tac-toe/
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── api/          # Axios/Fetch configurations
│   │   ├── assets/       # Styles, images, and fonts
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Main screen views
│   │   └── utils/        # Helper functions
│   └── package.json
│
├── backend/              # Node.js backend
│   ├── src/
│   │   ├── config/       # Database and env configurations
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Auth and validation logic
│   │   ├── models/       # Database schemas
│   │   ├── routes/       # API endpoints
│   │   ├── sockets/      # Socket.IO event logic
│   │   ├── utils/        # Shared utility functions
│   │   ├── app.ts        # Express app setup
│   │   └── server.ts     # Server entry point
│   └── package.json
│
└── README.md
```

---

## Installation & Setup

### 1 Clone Repository
```bash
git clone https://github.com/savaxc/tic-tac-toe-multiplayer.git
cd tic-tac-toe-multiplayer
```

### 2 Setup Database (PostgreSQL)
```bash
#Create a PostgreSQL database:
CREATE DATABASE tictactoe;
```
```bash
#Then create the required tables (example):
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL,
  player_x_user_id INT NOT NULL,
  player_o_user_id INT,
  winner VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP
);

CREATE TABLE game_moves (
  id SERIAL PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  move_index INT NOT NULL,
  board TEXT NOT NULL
);
```

### 3 Backend Setup
```bash
#Go to backend(server) folder:
cd server
npm install
```

```bash
#Create .env file inside /backend:
PORT=8080
JWT_SECRET=your_secret_key
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=tictactoe
DB_PORT=5432
```

```bash
#Run backend:
npm run dev
```

```bash
#Backend will run on:
http://localhost:8080
```

### 4 Frontend Setup
```bash
#Go to frontend(client) folder:
cd ../frontend
npm install
```
```bash
#Run frontend
npm run dev
```
```bash
#Frontend will run on:
http://localhost:5173
```
---

##  Authentication
This project uses JWT authentication.

- Users must log in to generate a token.
- Token is stored in localStorage.
- Socket.IO connection requires JWT token via handshake.

---

## How to Play
1.  **Create a Game:** Player 1 creates a new game session.
2.  **Room ID:** The system generates a unique **Room ID**.
3.  **Join:** Player 2 enters the Room ID to join the match.
4.  **Gameplay:** Players take turns placing their symbols (**X** or **O**).
5.  **Detection:** The system automatically detects the **Winner** or a **Draw**.
6.  **Storage:** All game results are automatically stored in the database.
7. **Restart:** Restart option allows both players to restart with a confirmation system.

## Restart System
The game features a synchronized restart mechanism to ensure both players are ready for a rematch.

* **Mutual Confirmation:** Restarting requires approval from both players.
* **Countdown Timer:** A timer starts as soon as the first player requests a restart.
* **New Match Logic:** Once both players confirm:
    * The old game is closed.
    * A new game is created within the **same room**.
    * **Symbol Swap:** Players automatically swap symbols ($X \leftrightarrow O$) for the new round.

---

## Game History & Replay

Each player has access to a personalized history of their past performance.

### History Details
You can track your progress through the following match data:

* **Opponent Username:** See who you played against.
* **Match Result:** Clear indicators of **WIN**, **LOSS**, or **DRAW**.
* **Date and Time:** Precise timestamp of when the match took place.

### Replay
Stored moves allow replaying a full game by fetching:
```bash
GET /game/:gameId/moves
```

---

## API Endpoints
Create Game
```bash
POST /game/create
```

Get Game History
```bash
GET /game/history
```

Get Game Moves (Replay)
```bash
GET /game/:gameId/moves
```

---

## Socket.IO Events

The real-time communication is handled via Socket.IO events to ensure seamless synchronization between players.

### Client → Server (Emits)
These events are sent from the player's browser to the server.

| Event | Description |
| :--- | :--- |
| `joinRoom` | Sent when a player enters a Room ID to join a session. |
| `playerMove` | Sent when a player clicks on a cell to place their symbol. |
| `gameOver` | Triggered when a terminal state (Win/Draw) is reached locally. |
| `requestRestart` | Sent when a player initiates or confirms a rematch request. |

### Server → Client (Listen)
The client listens for these events to update the UI in real-time.

| Event | Description |
| :--- | :--- |
| `assignSymbol` | Informs the player if they are playing as **X** or **O**. |
| `opponentMove` | Notifies the client of the specific move made by the other player. |
| `opponentConnected` | Sent when the second player successfully enters the room. |
| `opponentLeft` | Alerts the player if their opponent disconnects during the game. |
| `restartCountdown` | Triggers the visual timer when the first restart request is made. |
| `restartConfirmed` | Notifies both clients to reset the board and swap symbols. |
| `restartCanceled` | Sent if the countdown expires without a mutual confirmation. |
| `gameFinished` | Finalizes the match state and triggers the database storage. |

---

## 👨‍💻 Author

### Developed by [Savaxc]
📌 Full-Stack Developer (React + Node.js + PostgreSQL)

---

## License
This project is licensed under the MIT License.