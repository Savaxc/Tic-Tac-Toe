import { useEffect, useState } from "react";
import useSFX from "../../hooks/useSFX";
import { Board } from "../board/board";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import confetti from "https://cdn.skypack.dev/canvas-confetti";
import { logout } from "../../utils/logout";
import {
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
//Generate SessionId
// const generateSessionId = () => {
//   let id = localStorage.getItem("sessionId");
//   if (!id) {
//     id = crypto.randomUUID();
//     localStorage.setItem("sessionId", id);
//   }
//   return id;
// };

const socket = io("http://localhost:8080", { autoConnect: false });

socket.on("connect", () => {
  const sessionId = localStorage.getItem("sessionId");

  if (sessionId) {
    socket.emit("registerSession", sessionId);
  }
});

type BoardArray = Array<Array<string | null>>;

interface GameHistory {
  moves: BoardArray[];
  players: { X?: string; O?: string };
}

export const TicTacToeMulti = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roomId = params.get("room");

  const emptyBoard: BoardArray = Array.from({ length: 3 }, () =>
    Array(3).fill(null)
  );

  const [board, setBoard] = useState<BoardArray>(emptyBoard);
  const [mySymbol, setMySymbol] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<string | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [showLogoutNotif, setShowLogoutNotif] = useState(false);

  //state for histpry modal
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [historyMoves, setHistoryMoves] = useState<BoardArray[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  //MUI
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [roomInput, setRoomInput] = useState("");
  const [openExitModal, setOpenExitModal] = useState(false);

  //DISCONNECT PLAYERS INFO
  const [, setOpponentLeft] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  //Color Board Winner
  const winningCells = winner ? getWinningCells(board) : [];

  //Symbol shange
  const [prevSymbol, setPrevSymbol] = useState<"X" | "O">("O");

  //useSFX sounds
  const { playSoundEffect } = useSFX();

  //swap x/o request
  const [restartRequested, setRestartRequested] = useState(false);
  const [restartVotes, setRestartVotes] = useState(0);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenJoinDialog = () => {
    setRoomInput("");
    setOpenJoinDialog(true);
  };

  const handleCloseJoinDialog = () => {
    setOpenJoinDialog(false);
  };

  //FUNCIJA ZA OTVARANJE ISTORIJE
  const handleOpenHistory = () => {
    if (!roomId) return;

    socket.emit("getGameHistory", roomId, (history: GameHistory | null) => {
      if (history && history.moves.length > 0) {
        setHistoryMoves(history.moves);
        setHistoryIndex(0);
        setOpenHistoryDialog(true);
      } else {
        showSnackbar("No game history available!", "info");
      }
    });
  };

  const handleCloseHistory = () => {
    setOpenHistoryDialog(false);
  };

  const handlePrevMove = () => {
    setHistoryIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNextMove = () => {
    setHistoryIndex((prev) => Math.min(prev + 1, historyMoves.length - 1));
  };

  const getHistoryResult = () => {
    if (!historyMoves.length) return null;
    const lastBoard = historyMoves[historyMoves.length - 1];
    const finalWinner = checkWinner(lastBoard);
    if (!finalWinner) return "Draw!";
    if (finalWinner === mySymbol) return "You won!";
    return "You lost!";
  };

  // TURN LOGIC
  const getCurrentTurn = (boardState: BoardArray) => {
    const moves = boardState.flat().filter(Boolean).length;
    return moves % 2 === 0 ? "X" : "O";
  };
  const currentTurn = getCurrentTurn(board);

  // RESTART
  const restart = (emitToServer = true) => {
    setBoard(emptyBoard);
    setWinner(null);
    setIsDraw(false);

    if (emitToServer && roomId) {
      socket.emit("restartGame", { roomId });
    }
  };

  // SOCKET: JOIN ROOM ON LOAD
  useEffect(() => {
    if (!roomId) return;

    const joinRoomSafely = () => {
      console.log("JOINING ROOM:", roomId);
      socket.emit("joinRoom", roomId);
    };

    // Ako nije povezan — poveyi se i sacekaj connect event
    if (!socket.connected) {
      socket.connect();
      socket.once("connect", () => {
        const sessionId = localStorage.getItem("sessionId");
        if (sessionId) socket.emit("registerSession", sessionId);
        joinRoomSafely();
      });
    } else {
      setTimeout(() => {
        joinRoomSafely();
      }, 10);
    }

    //handlers
    const handleAssignSymbol = (symbol: "X" | "O") => {
      setMySymbol(symbol);
      setIsInRoom(true);
    };

    const handleOpponentMove = (newBoard: BoardArray) => {
      setBoard(newBoard);
    };

    //on GameFinished set draw or winner
    const handleGameFinished = (winner: string | null) => {
      if (winner === null) {
        setIsDraw(true);
        playSoundEffect("GAME_OVER");
      } else {
        setWinner(winner);

        if (winner !== mySymbol) {
          playSoundEffect("GAME_OVER");
        }
      }
    };

    const handleRestartGame = (players: { X?: string; O?: string }) => {
      const sessionId = localStorage.getItem("sessionId");

      if (players.X === sessionId) setMySymbol("X");
      else if (players.O === sessionId) setMySymbol("O");

      setBoard(emptyBoard);
      setWinner(null);
      setIsDraw(false);
    };

    const handleRestartVoteUpdate = ({ votes }: { votes: number }) => {
      setRestartVotes(votes);
    };

    const handleRestartConfirmed = (players: { X?: string; O?: string }) => {
      const mySessionId = localStorage.getItem("sessionId");

      if (players.X === mySessionId) setMySymbol("X");
      if (players.O === mySessionId) setMySymbol("O");

      setBoard(emptyBoard);
      setWinner(null);
      setIsDraw(false);
      setRestartRequested(false);
      setRestartVotes(0);
    };

    const handleRestartCanceled = () => {
      setRestartRequested(false);
      setRestartVotes(0);
      showSnackbar("Restart canceled (no response)", "warning");
    };

    const handleRoomNotFound = () => {
      showSnackbar("Room does not exist!", "error");
      navigate("/multiplayer");
    };

    const handleRoomFull = () => {
      showSnackbar("Room is full! Maximum 2 players allowed.", "warning");
      navigate("/multiplayer");
    };

    const handleOpponentConnected = () => {
      setOpponentLeft(false);
      setWaitingForOpponent(false);
      showSnackbar("Opponent connected!", "success");
    };

    const handleOpponentLeft = () => {
      setOpponentLeft(true);
      setWaitingForOpponent(true);
      showSnackbar("Opponent left the game!", "warning");
    };

    // event listeners
    socket.on("assignSymbol", handleAssignSymbol);
    socket.on("opponentMove", handleOpponentMove);
    socket.on("gameFinished", handleGameFinished);
    socket.on("restartGame", handleRestartGame);
    socket.on("roomNotFound", handleRoomNotFound);
    socket.on("roomFull", handleRoomFull);
    socket.on("opponentConnected", handleOpponentConnected);
    socket.on("opponentLeft", handleOpponentLeft);
    socket.on("restartVoteUpdate", handleRestartVoteUpdate);
    socket.on("restartConfirmed", handleRestartConfirmed);
    socket.on("restartCanceled", handleRestartCanceled);

    //cleanup
    return () => {
      socket.off("assignSymbol", handleAssignSymbol);
      socket.off("opponentMove", handleOpponentMove);
      socket.off("gameFinished", handleGameFinished);
      socket.off("restartGame", handleRestartGame);
      socket.off("roomNotFound", handleRoomNotFound);
      socket.off("roomFull", handleRoomFull);
      socket.off("opponentConnected", handleOpponentConnected);
      socket.off("opponentLeft", handleOpponentLeft);
      socket.off("restartVoteUpdate", handleRestartVoteUpdate);
      socket.off("restartConfirmed", handleRestartConfirmed);
      socket.off("restartCanceled", handleRestartCanceled);
    };
  }, [roomId]);

  // HANDLE MOVE
  const handleOnClick = (r: number, c: number) => {
    if (!isInRoom) return;
    if (winner) return;
    if (currentTurn !== mySymbol) return;
    if (board[r][c] !== null) return;

    const updated = board.map((row, rIndex) =>
      row.map((col, cIndex) => (rIndex === r && cIndex === c ? mySymbol : col))
    );

    setBoard(updated);
    socket.emit("playerMove", { roomId, board: updated });

    const w = checkWinner(updated);
    if (w) {
      setWinner(w);
      socket.emit("gameOver", { roomId, winner: w });

      if (w === mySymbol) {
        playSoundEffect("GAME_WIN");
      }

      confetti();
      return;
    }

    //Draw result check
    const hasEmpty = updated.some((row) => row.includes(null));
    if (!hasEmpty) {
      setIsDraw(true);
      socket.emit("gameOver", { roomId, winner: null });
    }
  };

  //socket povezan pre emitovanja
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketEmitSafe = (event: string, data?: any) => {
    return new Promise<void>((resolve) => {
      if (socket.connected) {
        socket.emit(event, data);
        return resolve();
      }
      socket.once("connect", () => {
        socket.emit(event, data);
        resolve();
      });
      socket.connect();
    });
  };

  // CREATE / JOIN ROOM
  const createNewGame = async () => {
    const token = localStorage.getItem("token");
    const sessionId = localStorage.getItem("sessionId");
    if (!token) return navigate("/login");
    if (!sessionId) {
      alert("Session not initialized yet!");
      return navigate("/login");
    }

    const res = await axios.post(
      "http://localhost:8080/game/create",
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // navigate(`/multiplayer?room=${res.data.roomId}`);

    const newRoomId = res.data.roomId;

    //symbol change
    const newSymbol = prevSymbol === "X" ? "O" : "X";
    setMySymbol(newSymbol);
    setPrevSymbol(newSymbol);

    // safe connect socket
    await socketEmitSafe("createRoom", newRoomId);
    setWaitingForOpponent(true);

    navigate(`/multiplayer?room=${newRoomId}`);
  };

  // LOGOUT
  const handleLogout = () => {
    if (socket.connected) {
      socket.disconnect();
    }

    setShowLogoutNotif(true);

    //1.5sec timeout to show notif
    setTimeout(() => {
      logout();
    }, 1500);
  };

  const handleJoinRoom = () => {
    if (!roomInput.trim()) return;
    navigate(`/multiplayer?room=${roomInput.trim()}`);
    setOpenJoinDialog(false);
    showSnackbar("You connected!", "success");
  };

  //EXIT GAME
  const handleExitGame = () => {
    setOpenExitModal(false);

    socket.emit("exitGame");
    socket.disconnect();
    navigate("/multiplayer");
  };

  return (
    <div className="game">
      {/* Logout notif*/}
      {showLogoutNotif && (
        <div className="logout-notification">
          <span>👋</span> Logout successfull.
        </div>
      )}

      {/* HEADER */}
      <div className="game-header">
        <h1>Multiplayer Mode</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {!roomId && (
        <>
          <button onClick={createNewGame}>Create Game</button>
          <button onClick={handleOpenJoinDialog}>Join Game</button>
          <p
            style={{
              fontSize: "25px",
            }}
          >
            Create or join a match to begin.
          </p>
        </>
      )}

      {roomId && (
        <>
          <p
            style={{
              fontSize: "18px",
            }}
          >
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

          {!isInRoom || waitingForOpponent ? (
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
                {!isInRoom ? "Connecting to room..." : "Waiting for opponent…"}
              </p>
              {(waitingForOpponent || !isInRoom) && <CircularProgress />}
            </div>
          ) : (
            // Ako smo u sobi i protivnik je povezan, prikayi igru (tablu)
            <>
              <p>
                You are: <b>{mySymbol}</b>
              </p>
              <p>
                Turn: <b>{currentTurn}</b>
              </p>

              {restartRequested && (
                <p style={{ fontWeight: "bold", color: "#ff9800" }}>
                  Waiting for opponent to confirm restart…
                </p>
              )}

              {restartVotes > 0 && (
                <p style={{ fontSize: "17px", color: "red", fontWeight: "bold" }}>
                  Restart confirmations: {restartVotes} / 2
                </p>
              )}

              <Board
                board={board}
                handleClick={handleOnClick}
                winningCells={winningCells}
              />

              <div className="game-status">
                {winner && (
                  <h2 className="winner-message"> {winner} wins! &#x1F973;</h2>
                )}
                {isDraw && <h2 className="draw-message">Draw!</h2>}
              </div>

              {/* <button onClick={() => restart()}>Restart</button> */}
              <div className="action-buttons">
                <Button
                  onClick={handleOpenHistory}
                  variant="outlined"
                  className="control-btn"
                >
                  View History
                </Button>

                <Button
                  variant="outlined"
                  disabled={restartRequested}
                  onClick={() => {
                    socket.emit("requestRestart", roomId);
                    setRestartRequested(true);
                  }}
                >
                  {restartRequested
                    ? "Waiting for opponent..."
                    : "Restart Game"}
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
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: "100%",
            fontWeight: "bold",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            position: "relative",
            px: 3,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          action={
            <IconButton
              aria-label="close"
              size="small"
              onClick={() => setSnackbar({ ...snackbar, open: false })}
              sx={{
                position: "absolute",
                top: -5,
                right: 5,
                color: "inherit",
              }}
            >
              ✖
            </IconButton>
          }
        >
          <span style={{ flex: 1, textAlign: "center" }}>
            {snackbar.message}
          </span>
        </Alert>
      </Snackbar>

      <Dialog
        open={openJoinDialog}
        onClose={handleCloseJoinDialog}
        disableEnforceFocus
        disableRestoreFocus
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "10px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.1)",
            padding: "10px",
            minWidth: { xs: "90%", sm: "350px" },
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            fontSize: "1.4rem",
            fontWeight: 600,
            paddingBottom: "8px",
          }}
        >
          Enter Room ID
        </DialogTitle>

        <DialogContent
          sx={{
            paddingX: "20px",
            paddingY: "10px !important",
          }}
        >
          <TextField
            autoFocus
            margin="dense"
            type="text"
            fullWidth
            variant="outlined"
            size="small"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
            sx={{
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: "#1976d2",
                  borderWidth: "1px",
                },
            }}
          />
        </DialogContent>

        <DialogActions
          sx={{
            padding: "16px 20px",
            justifyContent: "flex-end",
            borderTop: "1px solid #eee",
          }}
        >
          <Button onClick={handleCloseJoinDialog} sx={{ color: "#666" }}>
            Cancel
          </Button>
          <Button
            onClick={handleJoinRoom}
            variant="contained"
            disableElevation
            sx={{
              borderRadius: "7px",
              fontWeight: 550,
            }}
          >
            Join
          </Button>
        </DialogActions>
      </Dialog>

      {/* Game History for Game */}
      <Dialog
        open={openHistoryDialog}
        onClose={handleCloseHistory}
        disableEnforceFocus
        disableRestoreFocus
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle textAlign="center">Game History</DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {historyMoves.length > 0 && (
            <>
              <Board
                board={historyMoves[historyIndex]}
                handleClick={() => {}}
              />
              <p>
                Move {historyIndex + 1} / {historyMoves.length}
              </p>
              {historyIndex === historyMoves.length - 1 && (
                <p style={{ fontWeight: "bold", marginTop: "8px" }}>
                  {getHistoryResult()}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  marginTop: "8px",
                }}
              >
                <Button onClick={handlePrevMove} disabled={historyIndex === 0}>
                  Prev
                </Button>
                <Button
                  onClick={handleNextMove}
                  disabled={historyIndex === historyMoves.length - 1}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseHistory}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* EXIT GAME MODAL */}
      <Dialog
        open={openExitModal}
        onClose={() => setOpenExitModal(false)}
        maxWidth="xs"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "12px",
            padding: "8px",
          },
        }}
      >
        <DialogTitle
          sx={{ textAlign: "center", fontWeight: 700, fontSize: "25px" }}
        >
          Exit Game?
        </DialogTitle>

        <DialogContent
          sx={{ textAlign: "center", paddingBottom: "8px", fontSize: "20px" }}
        >
          <p>Are you sure you want to leave this match?</p>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", pb: 2, gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setOpenExitModal(false)}
            sx={{ borderRadius: "8px" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            sx={{ borderRadius: "8px" }}
            onClick={() => {
              handleExitGame();
            }}
          >
            Exit
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

// CHECK WINNER
const checkWinner = (board: BoardArray): string | null => {
  const lines = [
    //Rows(red)
    [board[0][0], board[0][1], board[0][2]],
    [board[1][0], board[1][1], board[1][2]],
    [board[2][0], board[2][1], board[2][2]],

    //Columns(kolone)
    [board[0][0], board[1][0], board[2][0]],
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],

    //Diagonals
    [board[0][0], board[1][1], board[2][2]],
    [board[0][2], board[1][1], board[2][0]],
  ];

  for (const line of lines) {
    if (line[0] && line[0] === line[1] && line[1] === line[2]) return line[0];
  }
  return null;
};

const getWinningCells = (board: BoardArray): [number, number][] => {
  const lines: [number, number][][] = [
    // Rows
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
    // Columns
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
    // Diagonals
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
    ) {
      return line;
    }
  }
  return [];
};
