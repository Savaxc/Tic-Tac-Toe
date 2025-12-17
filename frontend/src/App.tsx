import "./App.css";
import { AITicTacToe } from "./components/tic-tac-toe/tic-tac-toe";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { HomePage } from "./pages/home/home";
import { TicTacToeMulti } from "./components/tic-tac-toe-multiplayer/tic-tac-toe-multi";
import { LoginPage } from "./pages/auth/login";
import { RegisterPage } from "./pages/auth/register";
import { ProtectedRoute } from "./components/routes/ProtectedRoute";

function AppHeader() {
  const navigate = useNavigate();

  return (
    <header className="App-header">
      <h2 onClick={() => navigate("/")} className="header-title header-title hover-underline">
        Tic-Tac-Toe
      </h2>
    </header>
  );
}


function App() {
  return (
    <div className="App">
      <Router>
        <AppHeader />

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/single-player" element={<AITicTacToe />} />

            <Route
              path="/multiplayer"
              element={
                <ProtectedRoute>
                  <TicTacToeMulti />
                </ProtectedRoute>
              }
            />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App;
