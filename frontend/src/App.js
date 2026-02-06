import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import "@/App.css";

// Pages
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import ApiKeySetup from "@/pages/ApiKeySetup";
import ProjectEditor from "@/pages/ProjectEditor";
import SceneManager from "@/pages/SceneManager";

// Utils
import { API, authFetch, setToken, clearToken, getToken } from "@/utils/api";

// Components
import { Toaster } from "@/components/ui/sonner";

// Re-export API for backward compat
export { API };

// Global user state
let globalUser = null;

// Auth Callback Component
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionId = hash.split("session_id=")[1]?.split("&")[0];

      if (!sessionId) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API}/auth/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (response.ok) {
          const data = await response.json();
          // Store the session token in localStorage
          if (data.session_token) {
            setToken(data.session_token);
          }
          // Set global user (strip session_token from user object)
          const { session_token, ...userData } = data;
          globalUser = userData;
          // Clear hash and navigate
          window.history.replaceState(null, "", "/dashboard");
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/", { replace: true });
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(globalUser ? true : null);
  const [user, setUser] = useState(globalUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (globalUser) {
      setUser(globalUser);
      setIsAuthenticated(true);
      return;
    }

    // Skip if hash has session_id (AuthCallback handles it)
    if (window.location.hash.includes("session_id=")) {
      return;
    }

    const checkAuth = async () => {
      try {
        // Use authFetch which sends Bearer token from localStorage
        const response = await authFetch(`${API}/auth/me`);

        if (response.ok) {
          const userData = await response.json();
          globalUser = userData;
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          clearToken();
          setIsAuthenticated(false);
          navigate("/", { replace: true });
        }
      } catch (error) {
        clearToken();
        setIsAuthenticated(false);
        navigate("/", { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children({ user, setUser });
};

// Main Router
const AppRouter = () => {
  if (window.location.hash.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<ProtectedRoute>{({ user }) => <Dashboard user={user} />}</ProtectedRoute>} />
      <Route path="/setup" element={<ProtectedRoute>{({ user }) => <ApiKeySetup user={user} />}</ProtectedRoute>} />
      <Route path="/project/:projectId" element={<ProtectedRoute>{({ user }) => <ProjectEditor user={user} />}</ProtectedRoute>} />
      <Route path="/project/:projectId/scenes" element={<ProtectedRoute>{({ user }) => <SceneManager user={user} />}</ProtectedRoute>} />
    </Routes>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
