import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Key, 
  Check, 
  AlertCircle, 
  ExternalLink,
  Sparkles,
  Film,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";

export default function ApiKeySetup({ user }) {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch(`${API}/settings/api-key/status`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setHasKey(data.has_key);
        setSelectedModel(data.selected_model || "");
        if (data.has_key) {
          fetchModels();
        }
      }
    } catch (error) {
      console.error("Error checking status:", error);
    }
  };

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const response = await fetch(`${API}/settings/models`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your API key");
      return;
    }

    setSaving(true);
    setValidating(true);

    try {
      const response = await fetch(`${API}/settings/api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });

      if (response.ok) {
        toast.success("API key saved and validated!");
        setHasKey(true);
        setApiKey("");
        fetchModels();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Invalid API key");
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toast.error("Failed to validate API key");
    } finally {
      setSaving(false);
      setValidating(false);
    }
  };

  const handleSelectModel = async (model) => {
    setSelectedModel(model);
    try {
      const response = await fetch(`${API}/settings/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ model }),
      });

      if (response.ok) {
        toast.success("Model selected!");
      } else {
        toast.error("Failed to select model");
      }
    } catch (error) {
      console.error("Error selecting model:", error);
      toast.error("Failed to select model");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              API Settings
            </h1>
            <p className="text-xs text-muted-foreground">Configure your Gemini API key</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* API Key Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Gemini API Key</CardTitle>
                <CardDescription>
                  Required for image and video generation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasKey ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">API Key Configured</p>
                  <p className="text-sm text-green-700">Your Gemini API key is set and validated</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">No API Key Set</p>
                  <p className="text-sm text-amber-700">Add your Gemini API key to start generating</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="apiKey">
                {hasKey ? "Update API Key" : "Enter API Key"}
              </Label>
              <div className="flex gap-3">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="AIza..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                  data-testid="api-key-input"
                />
                <Button 
                  onClick={handleSaveApiKey} 
                  disabled={saving || !apiKey.trim()}
                  data-testid="save-api-key-btn"
                >
                  {validating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {hasKey ? "Update" : "Save"}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Google AI Studio
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Model Selection Card */}
        {hasKey && (
          <Card className="animate-slide-up">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Model Selection</CardTitle>
                  <CardDescription>
                    Choose your preferred Gemini models
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingModels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {models.map((model) => (
                    <div
                      key={model.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedModel === model.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleSelectModel(model.id)}
                      data-testid={`model-option-${model.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            model.capabilities.includes("video") ? "bg-purple-100" : "bg-blue-100"
                          }`}>
                            {model.capabilities.includes("video") ? (
                              <Film className="w-5 h-5 text-purple-600" />
                            ) : (
                              <Sparkles className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {model.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {model.description}
                            </p>
                          </div>
                        </div>
                        {selectedModel === model.id && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        {model.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Help Card */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
              How to get your API key
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">1</span>
                <span>Go to <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a></span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">2</span>
                <span>Sign in with your Google account</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">3</span>
                <span>Click on "Get API Key" in the left sidebar</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">4</span>
                <span>Create a new API key or copy an existing one</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">5</span>
                <span>Paste the key above and click Save</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Continue Button */}
        {hasKey && (
          <div className="flex justify-end">
            <Button 
              onClick={() => navigate("/dashboard")}
              className="bg-primary hover:bg-primary/90"
              data-testid="continue-to-dashboard"
            >
              Continue to Dashboard
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
