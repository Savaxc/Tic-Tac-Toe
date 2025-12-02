import { useEffect, useState } from "react";
import { Board } from "../board/board";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import confetti from "https://cdn.skypack.dev/canvas-confetti";
import { logout } from "../../utils/logout";

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
      alert("Room does not exist!");
      navigate("/multiplayer");
    };

    const handleRoomFull = () => {
      alert("Room is full! Maximum 2 players allowed.");
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

  const joinGame = () => {
    const id = prompt("Enter room ID:");
    if (!id) return;
    navigate(`/multiplayer?room=${id}`);
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
          <button onClick={joinGame}>Join Game</button>
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
              alert("Room ID copied!");
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
