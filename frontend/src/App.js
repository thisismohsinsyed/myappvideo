import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import "@/App.css";

// Pages
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import ApiKeySetup from "@/pages/ApiKeySetup";
import ProjectEditor from "@/pages/ProjectEditor";
import SceneManager from "@/pages/SceneManager";

// Components
import { Toaster } from "@/components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context - Simple global state for user
let globalUser = null;
let globalSetUser = null;

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
          const user = await response.json();
          globalUser = user;
          if (globalSetUser) globalSetUser(user);
          // Clear hash and go to dashboard
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

  // Store setter globally for AuthCallback to use
  useEffect(() => {
    globalSetUser = (u) => {
      setUser(u);
      setIsAuthenticated(true);
    };
    return () => { globalSetUser = null; };
  }, []);

  useEffect(() => {
    // Skip if already authenticated via global state
    if (globalUser) {
      setUser(globalUser);
      setIsAuthenticated(true);
      return;
    }

    // Skip auth check if hash has session_id (AuthCallback will handle)
    if (window.location.hash.includes("session_id=")) {
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          globalUser = userData;
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          navigate("/", { replace: true });
        }
      } catch (error) {
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
  // Check for session_id in hash immediately
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
