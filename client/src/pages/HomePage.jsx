import { useAuth } from "../context/AuthContext";
import AuthScreen from "../components/AuthScreen";
import Dashboard from "../components/Dashboard";

export default function HomePage() {
  const { loading, token, user } = useAuth();

  if (loading) {
    return (
      <div className="screen-shell center-screen">
        <div className="panel subtle-card loading-card">
          <span className="dot" />
          세션 확인 중
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <AuthScreen />;
  }

  return <Dashboard />;
}
