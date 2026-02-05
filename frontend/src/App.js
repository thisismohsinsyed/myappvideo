import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
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

// Auth Callback Component
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Get hash from window.location directly to ensure we get the latest value
      const hash = window.location.hash;
      console.log("Auth callback - hash:", hash);
      
      const sessionId = hash.split("session_id=")[1]?.split("&")[0];
      console.log("Auth callback - sessionId:", sessionId);

      if (!sessionId) {
        console.log("No session ID found, redirecting to home");
        navigate("/");
        return;
      }

      try {
        console.log("Calling auth/session endpoint...");
        const response = await fetch(`${API}/auth/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });

        console.log("Auth response status:", response.status);
        
        if (response.ok) {
          const user = await response.json();
          console.log("Auth success, user:", user.email);
          // Clear the hash and navigate to dashboard
          window.history.replaceState(null, "", "/dashboard");
          navigate("/dashboard", { state: { user }, replace: true });
        } else {
          const errorData = await response.json();
          console.error("Auth failed:", errorData);
          navigate("/");
        }
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/");
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If user data passed from AuthCallback, use it
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          navigate("/");
        }
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/");
      }
    };

    checkAuth();
  }, [navigate, location.state]);

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

  // Clone children and pass user prop
  return children({ user, setUser });
};

// Router Component
const AppRouter = () => {
  const location = useLocation();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  // Check URL fragment for session_id - use window.location.hash directly
  // This runs on every render to catch the hash immediately after redirect
  const currentHash = window.location.hash;
  if (currentHash && currentHash.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {({ user }) => <Dashboard user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            {({ user }) => <ApiKeySetup user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:projectId"
        element={
          <ProtectedRoute>
            {({ user }) => <ProjectEditor user={user} />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:projectId/scenes"
        element={
          <ProtectedRoute>
            {({ user }) => <SceneManager user={user} />}
          </ProtectedRoute>
        }
      />
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
