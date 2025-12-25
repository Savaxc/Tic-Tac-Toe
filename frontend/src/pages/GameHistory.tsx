import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Paper,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";

type GameResult = "WIN" | "LOSS" | "DRAW";

type GameHistoryItem = {
  gameId: string;
  roomId: string;
  result: GameResult;
  date: string;
  opponent?: string;
  opponentUsername?: string;
};

const GameHistory = () => {
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GameResult | "ALL">("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await axios.get<GameHistoryItem[]>(
          "http://localhost:8080/game/history",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setHistory(response.data);
      } catch (error) {
        console.error("Failed to load game history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="70vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // STATS
  const totalGames = history.length;
  const wins = history.filter((g) => g.result === "WIN").length;
  const losses = history.filter((g) => g.result === "LOSS").length;
  const draws = history.filter((g) => g.result === "DRAW").length;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0";

  // FILTERED GAMES
  const filteredHistory =
    filter === "ALL" ? history : history.filter((g) => g.result === filter);

  return (
    <Box maxWidth={800} mx="auto" mt={4}>
      <Typography variant="h4" mb={3} textAlign="center">
        📜 Game History
      </Typography>
      
      <Button variant="outlined" onClick={() => navigate(-1)}>
        ← Back
      </Button>


      {/* Stats Panel */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" mb={1}>
          🧠 Stats
        </Typography>
        <Stack direction="row" spacing={3}>
          <Typography>Wins: {wins}</Typography>
          <Typography>Losses: {losses}</Typography>
          <Typography>Draws: {draws}</Typography>
          <Typography>Win Rate: {winRate}%</Typography>
        </Stack>
      </Paper>

      {/* Filter */}
      <FormControl sx={{ mb: 3, minWidth: 150 }}>
        <InputLabel>Filter by result</InputLabel>
        <Select
          value={filter}
          label="Filter by result"
          onChange={(e) => setFilter(e.target.value as GameResult | "ALL")}
        >
          <MenuItem value="ALL">All</MenuItem>
          <MenuItem value="WIN">Wins</MenuItem>
          <MenuItem value="LOSS">Losses</MenuItem>
          <MenuItem value="DRAW">Draws</MenuItem>
        </Select>
      </FormControl>

      {filteredHistory.length === 0 && (
        <Typography textAlign="center" color="text.secondary">
          No games found.
        </Typography>
      )}

      <Stack spacing={2}>
        {filteredHistory.map((game) => (
          <Paper
            key={game.gameId}
            elevation={3}
            sx={{
              p: 2,
              borderRadius: 3,
              background:
                game.result === "WIN"
                  ? "linear-gradient(135deg, #1b5e20, #2e7d32)"
                  : game.result === "LOSS"
                  ? "linear-gradient(135deg, #b71c1c, #d32f2f)"
                  : "linear-gradient(135deg, #e65100, #ef6c00)",
              color: "#fff",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>
                  Room
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  {game.roomId}
                </Typography>

                <Typography variant="subtitle2" sx={{ mt: 1, opacity: 0.85 }}>
                  Date
                </Typography>
                <Typography variant="body2">
                  {new Date(game.date).toLocaleString()}
                </Typography>

                <Typography variant="subtitle2" sx={{ mt: 1, opacity: 0.85 }}>
                  Result
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: "bold", textTransform: "uppercase" }}
                >
                  {game.result}
                </Typography>

                {game.opponentUsername && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 1, opacity: 0.85 }}>
                      Opponent
                    </Typography>
                    <Typography variant="body2">@{game.opponentUsername}</Typography>
                  </>
                )}
              </Box>

              <Button
                variant="contained"
                color="inherit"
                sx={{
                  color: "#000",
                  backgroundColor: "#fff",
                  fontWeight: "bold",
                  "&:hover": {
                    backgroundColor: "#e0e0e0",
                  },
                }}
                onClick={() => navigate(`/game/${game.gameId}/moves`)}
              >
                View
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

export default GameHistory;
