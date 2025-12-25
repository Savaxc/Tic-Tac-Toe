import { useEffect, useState, useRef } from "react";
import useSFX from "../../hooks/useSFX";
import { Board } from "../board/board";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import confetti from "https://cdn.skypack.dev/canvas-confetti";
import { logout } from "../../utils/logout";
import {
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  DialogActions,
  Button,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

type BoardArray = Array<Array<string | null>>;

interface GameHistoryData {
  moves: BoardArray[];
  players: { X?: number; O?: number };
  restartVotes: any;
}

export const TicTacToeMulti = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roomId = params.get("room");

  const socketRef = useRef<Socket | null>(null);

  const emptyBoard: BoardArray = Array.from({ length: 3 }, () =>
    Array(3).fill(null)
  );

  const [board, setBoard] = useState<BoardArray>(emptyBoard);
  const [mySymbol, setMySymbol] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [showLogoutNotif, setShowLogoutNotif] = useState(false);
  const [iVotedRestart, setIVotedRestart] = useState(false);

  // MUI states
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [roomInput, setRoomInput] = useState("");
  const [openExitModal, setOpenExitModal] = useState(false);

  // Opponent info
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  // Winning cells
  const winningCells = winner ? getWinningCells(board) : [];

  // useSFX
  const { playSoundEffect } = useSFX();

  // Restart state
  const [restartRequested, setRestartRequested] = useState(false);
  const [restartVotes, setRestartVotes] = useState(0);
  const [restartCountdown, setRestartCountdown] = useState<number | null>(null);

  // Symbol animation
  const [animateSymbol, setAnimateSymbol] = useState(false);
  const [showSidesSwapped, setShowSidesSwapped] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "info"
  ) => setSnackbar({ open: true, message, severity });

  const handleOpenJoinDialog = () => {
    setRoomInput("");
    setOpenJoinDialog(true);
  };
  const handleCloseJoinDialog = () => setOpenJoinDialog(false);

  //Turn logic
  const getCurrentTurn = (boardState: BoardArray) =>
    boardState.flat().filter(Boolean).length % 2 === 0 ? "X" : "O";
  const currentTurn = getCurrentTurn(board);

  // SOCKET LOGIC
  useEffect(() => {
    if (!roomId) return;

    const token = localStorage.getItem("token");

    socketRef.current = io("http://localhost:8080", {
      auth: { token },
      transports: ["websocket"], 
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected via Socket.IO, joining room:", roomId);
      socket.emit("joinRoom", roomId);
    });

    // 2. Handleri
    const handleAssignSymbol = (symbol: "X" | "O") => {
      setMySymbol(symbol);
      setIsInRoom(true);

      if (symbol === "X") setWaitingForOpponent(true);
      else setWaitingForOpponent(false);

      //Sinhronizacija stanja (Reconnect fix)
      socket.emit(
        "getGameHistory",
        roomId,
        (history: GameHistoryData | null) => {
          if (!history || history.moves.length === 0) {
            setBoard(emptyBoard);
            setWinner(null);
            setIsDraw(false);
            return;
          }

          const lastBoardState = history.moves[history.moves.length - 1];
          setBoard(lastBoardState);

          const w = checkWinner(lastBoardState);
          if (w) setWinner(w);
          else if (!lastBoardState.flat().includes(null)) setIsDraw(true);
        }
      );
    };

    const handleOpponentConnected = () => {
      setOpponentLeft(false);
      setWaitingForOpponent(false);
      showSnackbar("Opponent connected!", "success");
    };

    const handleOpponentMove = (newBoard: BoardArray) => {
      setBoard(newBoard);
    };

    const handleGameFinished = (winner: string | null) => {
      if (!winner) setIsDraw(true);
      else setWinner(winner);
      playSoundEffect("GAME_OVER");
    };

    const handleRestartCountdown = (count: number) => {
      setRestartRequested(true);
      setRestartCountdown(count);
      if (restartVotes === 0) setRestartVotes(1);
    };

    const handleRestartConfirmed = (players: { X?: number; O?: number }) => {
      setMySymbol((prev) => (prev === "X" ? "O" : "X"));

      setAnimateSymbol(true);
      setShowSidesSwapped(true);
      setTimeout(() => {
        setAnimateSymbol(false);
        setShowSidesSwapped(false);
      }, 1000);

      setBoard(emptyBoard);
      setWinner(null);
      setIsDraw(false);
      setRestartRequested(false);
      setRestartVotes(0);
      setRestartCountdown(null);
      setIVotedRestart(false);
      showSnackbar("Game restarted! Sides swapped.", "success");
    };

    const handleRestartCanceled = () => {
      setRestartRequested(false);
      setRestartVotes(0);
      setRestartCountdown(null);
      setIVotedRestart(false);
      showSnackbar("Restart canceled.", "warning");
    };

    const handleRoomError = (msg: string) => {
      showSnackbar(msg, "error");
      navigate("/multiplayer");
    };

    const handleRoomFull = () => {
      showSnackbar("Room is full!", "error");
      navigate("/multiplayer");
    };

    const handleOpponentLeft = () => {
      setOpponentLeft(true);
      setWaitingForOpponent(true);
      showSnackbar("Opponent left the game.", "warning");
    };

    // Registracija listenera
    socket.on("assignSymbol", handleAssignSymbol);
    socket.on("opponentConnected", handleOpponentConnected);
    socket.on("opponentMove", handleOpponentMove);
    socket.on("gameFinished", handleGameFinished);
    socket.on("restartCountdown", handleRestartCountdown);
    socket.on("restartConfirmed", handleRestartConfirmed);
    socket.on("restartCanceled", handleRestartCanceled);
    socket.on("roomError", handleRoomError);
    socket.on("roomFull", handleRoomFull);
    socket.on("opponentLeft", handleOpponentLeft);

    // CLEANUP
    return () => {
      socket.disconnect();
    };
  }, [roomId, navigate]);

  // ACTIONS
  const requestRestart = () => {
    if (socketRef.current) {
      socketRef.current.emit("requestRestart", roomId);
      setIVotedRestart(true);
      setRestartVotes((prev) => prev + 1);
    }
  };

  // const cancelRestart = () => {
  //   showSnackbar("Waiting for timer to expire...", "info");
  // };

  const handleOnClick = (r: number, c: number) => {
    if (
      restartRequested ||
      !isInRoom ||
      winner ||
      currentTurn !== mySymbol ||
      board[r][c]
    )
      return;

    const updated = board.map((row, rIndex) =>
      row.map((col, cIndex) => (rIndex === r && cIndex === c ? mySymbol : col))
    );

    setBoard(updated);

    if (socketRef.current) {
      socketRef.current.emit("playerMove", { roomId, board: updated });
    }

    const w = checkWinner(updated);
    if (w) {
      setWinner(w);
      if (socketRef.current) {
        socketRef.current.emit("gameOver", { roomId, winner: w });
      }
      if (w === mySymbol) playSoundEffect("GAME_WIN");
      confetti();
      return;
    }

    if (!updated.flat().includes(null)) {
      setIsDraw(true);
      if (socketRef.current) {
        socketRef.current.emit("gameOver", { roomId, winner: null });
      }
    }
  };

  const createNewGame = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        "http://localhost:8080/game/create",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      navigate(`/multiplayer?room=${res.data.roomId}`);
    } catch (e) {
      console.error(e);
      showSnackbar("Failed to create game", "error");
    }
  };

  const handleJoinRoom = () => {
    if (!roomInput.trim()) return;
    navigate(`/multiplayer?room=${roomInput.trim()}`);
    setOpenJoinDialog(false);
  };

  const handleLogout = () => {
    if (socketRef.current) socketRef.current.disconnect();
    setShowLogoutNotif(true);
    setTimeout(() => logout(), 1500);
  };

  const handleExitGame = () => {
    setOpenExitModal(false);
    if (socketRef.current) {
      socketRef.current.emit("leaveRoom", roomId);
      socketRef.current.disconnect();
    }
    navigate("/multiplayer");
  };

  return (
    <div className="game">
      {showLogoutNotif && (
        <div className="logout-notification">👋 Logout successfull.</div>
      )}

      <div className="game-header">
        <h1>Multiplayer Mode</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {!roomId ? (
        <>
          <button onClick={createNewGame}>Create Game</button>
          <button onClick={handleOpenJoinDialog}>Join Game</button>
          <p style={{ fontSize: "25px" }}>Create or join a match to begin.</p>
          <Button
            variant="outlined"
            className="control-btn"
            onClick={() => navigate("/history")}
          >
            View My Games History
          </Button>
        </>
      ) : (
        <>
          <p style={{ fontSize: "18px" }}>
            Room ID: <b>{roomId}</b>
          </p>
          <div className="game-controls">
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                showSnackbar("Room ID copied!", "success");
              }}
              className="control-btn"
            >
              Copy Room ID
            </button>
            <Button
              variant="contained"
              color="error"
              className="control-btn"
              onClick={() => setOpenExitModal(true)}
            >
              Exit Game
            </Button>
          </div>

          {!isInRoom ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "10px",
                padding: "30px",
                minHeight: "100px",
              }}
            >
              <p
                style={{
                  marginBottom: "15px",
                  fontWeight: "bold",
                  fontSize: "1.2em",
                }}
              >
                Connecting to room...
              </p>
              <CircularProgress />
            </div>
          ) : (
            <>
              {waitingForOpponent && opponentLeft && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Waiting for opponent to connect...
                </Alert>
              )}

              <p>
                You are:{" "}
                <b className={animateSymbol ? "symbol-rotate" : ""}>
                  {mySymbol}
                </b>
              </p>
              {showSidesSwapped && (
                <p className="sides-swapped-text">Sides swapped!</p>
              )}
              <p>
                Turn: <b>{currentTurn}</b>
              </p>

              {/* RESTART UI DEO */}
              {restartRequested && (
                <div
                  style={{
                    marginTop: "10px",
                    marginBottom: "10px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ fontWeight: "bold", color: "#ff9800" }}>
                    ⏳ {restartCountdown}s
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      justifyContent: "center",
                    }}
                  >
                    {iVotedRestart ? (
                      <p style={{ fontSize: "0.9rem", color: "green" }}>
                        You voted. Waiting for opponent...
                      </p>
                    ) : (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={requestRestart}
                      >
                        Confirm Restart
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div
                className={`board-wrapper ${restartRequested ? "locked" : ""}`}
              >
                <Board
                  board={board}
                  handleClick={handleOnClick}
                  winningCells={winningCells}
                />
              </div>

              <div className="game-status">
                {winner && <h2 className="winner-message">{winner} wins!</h2>}
                {isDraw && <h2 className="draw-message">Draw!</h2>}
              </div>

              <div className="action-buttons">
                <Button
                  variant="outlined"
                  className="control-btn"
                  onClick={() => navigate("/history")}
                >
                  View History
                </Button>
                <Button
                  variant="outlined"
                  onClick={requestRestart}
                  disabled={iVotedRestart || restartRequested}
                >
                  Restart Game
                </Button>
              </div>
            </>
          )}
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* JOIN DIALOG */}
      <Dialog open={openJoinDialog} onClose={handleCloseJoinDialog}>
        <DialogTitle>Enter Room ID</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseJoinDialog}>Cancel</Button>
          <Button onClick={handleJoinRoom} variant="contained">
            Join
          </Button>
        </DialogActions>
      </Dialog>

      {/* EXIT DIALOG */}
      <Dialog open={openExitModal} onClose={() => setOpenExitModal(false)}>
        <DialogTitle>Exit Game?</DialogTitle>
        <DialogContent>Are you sure you want to leave?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExitModal(false)}>Cancel</Button>
          <Button onClick={handleExitGame} color="error" variant="contained">
            Exit
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

// Helper funkcije
const checkWinner = (board: BoardArray): string | null => {
  const lines = [
    [board[0][0], board[0][1], board[0][2]],
    [board[1][0], board[1][1], board[1][2]],
    [board[2][0], board[2][1], board[2][2]],
    [board[0][0], board[1][0], board[2][0]],
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],
    [board[0][0], board[1][1], board[2][2]],
    [board[0][2], board[1][1], board[2][0]],
  ];
  for (const line of lines)
    if (line[0] && line[0] === line[1] && line[1] === line[2]) return line[0];
  return null;
};

const getWinningCells = (board: BoardArray): [number, number][] => {
  const lines: [number, number][][] = [
    [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    [
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    if (
      board[a[0]][a[1]] &&
      board[a[0]][a[1]] === board[b[0]][b[1]] &&
      board[a[0]][a[1]] === board[c[0]][c[1]]
    )
      return line;
  }
  return [];
};
