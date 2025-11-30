import { useNavigate } from 'react-router-dom';
import './home.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

return (
    <div className="home-container">
      <div className="button-group">
        <button className="home-button" onClick={() => navigate('/login')}>
          Login
        </button>
        <button className="home-button" onClick={() => navigate('/single-player')}>
          Single Player
        </button>
      </div>
    </div>
  );
};
