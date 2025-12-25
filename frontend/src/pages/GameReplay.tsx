import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Board } from "../components/board/board";
import {
  Box,
  Button,
  CircularProgress,
  Slider,
  Typography,
  Stack,
} from "@mui/material";

type BoardArray = Array<Array<string | null>>;

const emptyBoard: BoardArray = Array.from({ length: 3 }, () =>
  Array(3).fill(null)
);

const GameReplay = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [moves, setMoves] = useState<BoardArray[]>([]);
  const [currentMove, setCurrentMove] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  // FETCH MOVES
  useEffect(() => {
    const fetchMoves = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `http://localhost:8080/game/${gameId}/moves`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setMoves([emptyBoard, ...res.data.moves]);
      } catch (err) {
        console.error("Failed to load replay", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMoves();
  }, [gameId]);

  // AUTOPLAY
  useEffect(() => {
    if (!playing) return;
    if (currentMove >= moves.length - 1) {
      setPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentMove((m) => m + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [playing, currentMove, moves.length]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box maxWidth={500} mx="auto" mt={4} textAlign="center">
      <Typography variant="h4" mb={2}>
        🎬 Game Replay
      </Typography>

      <Board board={moves[currentMove] || emptyBoard} readOnly />


      <Typography mt={2}>
        Move {currentMove} / {moves.length - 1}
      </Typography>

      <Slider
        value={currentMove}
        min={0}
        max={moves.length - 1}
        step={1}
        onChange={(_, v) => setCurrentMove(v as number)}
        sx={{ mt: 2 }}
      />

      <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
        <Button
          variant="outlined"
          onClick={() => setCurrentMove(0)}
        >
          ⏮ Start
        </Button>

        <Button
          variant="contained"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "⏸ Pause" : "▶ Play"}
        </Button>

        <Button
          variant="outlined"
          onClick={() =>
            setCurrentMove((m) =>
              Math.min(m + 1, moves.length - 1)
            )
          }
        >
          ⏭ Next
        </Button>
      </Stack>

      <Button
        sx={{ mt: 3 }}
        variant="text"
        onClick={() => navigate(-1)}
      >
        ← Back to History
      </Button>
    </Box>
  );
};

export default GameReplay;
