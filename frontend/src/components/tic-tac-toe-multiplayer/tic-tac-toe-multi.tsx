import { useEffect, useState } from "react";
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

const socket = io("http://localhost:8080", { autoConnect: false });

type BoardArray = Array<Array<string | null>>;

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

  //MUI
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [roomInput, setRoomInput] = useState("");

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

    if (emitToServer) socket.emit("restartGame", { roomId });
  };

  // SOCKET: JOIN ROOM ON LOAD
  useEffect(() => {
    if (!roomId) return;

    // ensure connected
    if (!socket.connected) socket.connect();

    socket.emit("joinRoom", roomId);

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
      } else {
        setWinner(winner);
      }
    };

    const handleRestartGame = () => {
      restart(false);
    };

    const handleRoomNotFound = () => {
      showSnackbar("Room does not exist!", "error");
      navigate("/multiplayer");
    };

    const handleRoomFull = () => {
      showSnackbar("Room is full! Maximum 2 players allowed.", "warning");
      navigate("/multiplayer");
    };

    socket.on("assignSymbol", handleAssignSymbol);
    socket.on("opponentMove", handleOpponentMove);
    socket.on("gameFinished", handleGameFinished);
    socket.on("restartGame", handleRestartGame);
    socket.on("roomNotFound", handleRoomNotFound);
    socket.on("roomFull", handleRoomFull);

    //cleanup
    return () => {
      socket.off("assignSymbol", handleAssignSymbol);
      socket.off("opponentMove", handleOpponentMove);
      socket.off("gameFinished", handleGameFinished);
      socket.off("restartGame", handleRestartGame);
      socket.off("roomNotFound", handleRoomNotFound);
      socket.off("roomFull", handleRoomFull);
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

  // CREATE / JOIN ROOM
  const createNewGame = async () => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    const res = await axios.post(
      "http://localhost:8080/game/create",
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    navigate(`/multiplayer?room=${res.data.roomId}`);

    const newRoomId = res.data.roomId;

    // connect socket if needed
    if (!socket.connected) socket.connect();

    socket.emit("createRoom", newRoomId);

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

  // const joinGame = () => {
  //   const id = prompt("Enter room ID:");
  //   if (!id) return;
  //   navigate(`/multiplayer?room=${id}`);
  // };

  const handleJoinRoom = () => {
    if (!roomInput.trim()) return;
    navigate(`/multiplayer?room=${roomInput.trim()}`);
    setOpenJoinDialog(false);
  };

  return (
    <div className="game">
      {/* Logout notif*/}
      {showLogoutNotif && (
        <div className="logout-notification">
          <span>👋</span> Logout successfull.
        </div>
      )}

      {/* ---  HEADER  --- */}
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
          <p>Create or join a match to begin.</p>
        </>
      )}

      {roomId && (
        <>
          <p>
            Room ID: <b>{roomId}</b>
          </p>

          <button
            onClick={() => {
              navigator.clipboard.writeText(roomId);
              showSnackbar("Room ID copied!", "success");
            }}
          >
            Copy Room ID
          </button>

          {/* ISPRAVITI */}
          {!isInRoom && <p>Connecting to room...</p>}

          {isInRoom && (
            <>
              <p>
                You are: <b>{mySymbol}</b>
              </p>
              <p>
                Turn: <b>{currentTurn}</b>
              </p>

              <Board board={board} handleClick={handleOnClick} />

              <div className="game-status">
                {winner && (
                  <h2 className="winner-message"> {winner} wins! &#x1F973;</h2>
                )}
                {isDraw && <h2 className="draw-message">Draw!</h2>}
              </div>

              <button onClick={() => restart()}>Restart</button>
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
