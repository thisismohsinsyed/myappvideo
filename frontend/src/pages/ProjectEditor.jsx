import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  Layers, 
  ArrowRight,
  Loader2,
  FileText,
  Check,
  AlertCircle,
  Play
} from "lucide-react";
import { toast } from "sonner";
import { API, authFetch } from "@/utils/api";

export default function ProjectEditor({ user }) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decomposing, setDecomposing] = useState(false);
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);

  useEffect(() => {
    fetchProject();
    checkApiKey();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`${API}/projects/${projectId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProject(data);
        setTitle(data.title);
        setScript(data.script || "");
      } else {
        toast.error("Project not found");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const checkApiKey = async () => {
    try {
      const response = await fetch(`${API}/settings/api-key/status`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.has_key);
      }
    } catch (error) {
      console.error("Error checking API key:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, script }),
      });

      if (response.ok) {
        const updated = await response.json();
        setProject(updated);
        toast.success("Project saved!");
      } else {
        toast.error("Failed to save project");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSave = useCallback((newScript) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    const timeout = setTimeout(async () => {
      try {
        await fetch(`${API}/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ script: newScript }),
        });
      } catch (error) {
        console.error("Auto-save error:", error);
      }
    }, 2000);
    
    setAutoSaveTimeout(timeout);
  }, [projectId, autoSaveTimeout]);

  const handleScriptChange = (e) => {
    const newScript = e.target.value;
    setScript(newScript);
    handleAutoSave(newScript);
  };

  const handleDecompose = async () => {
    if (!script.trim()) {
      toast.error("Please write a script first");
      return;
    }

    if (!hasApiKey) {
      toast.error("Please add your Gemini API key first");
      navigate("/setup");
      return;
    }

    setDecomposing(true);
    try {
      // First save the script
      await fetch(`${API}/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ script }),
      });

      // Then decompose
      const response = await fetch(`${API}/projects/${projectId}/decompose`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Created ${data.scenes?.length || 0} scenes!`);
        navigate(`/project/${projectId}/scenes`);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to decompose script");
      }
    } catch (error) {
      console.error("Error decomposing script:", error);
      toast.error("Failed to decompose script");
    } finally {
      setDecomposing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const charCount = script.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold border-none bg-transparent px-0 h-auto focus-visible:ring-0"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                data-testid="project-title-edit"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground px-3 py-1 bg-muted rounded-full">
              {saving ? "Saving..." : "Auto-saved"}
            </span>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving}
              data-testid="save-project-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={handleDecompose}
              disabled={decomposing || !script.trim()}
              className="bg-primary hover:bg-primary/90"
              data-testid="generate-scenes-btn"
            >
              {decomposing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Scenes
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="font-medium">Write Script</span>
            </div>
            <div className="h-0.5 w-12 bg-border" />
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span>Generate Scenes</span>
            </div>
            <div className="h-0.5 w-12 bg-border" />
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span>Create Images</span>
            </div>
            <div className="h-0.5 w-12 bg-border" />
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                4
              </div>
              <span>Generate Videos</span>
            </div>
            <div className="h-0.5 w-12 bg-border" />
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                5
              </div>
              <span>Export</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Script Editor */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Your Script
              </h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
              </div>
            </div>

            <Textarea
              value={script}
              onChange={handleScriptChange}
              placeholder="Write your script here...

Example:
INT. COFFEE SHOP - DAY

SARAH (30s, professional attire) sits at a corner table, laptop open. She takes a sip of coffee and sighs.

SARAH
(to herself)
Another Monday...

A BARISTA (20s, cheerful) approaches with a fresh cup.

BARISTA
Looks like you could use a refill.

Sarah looks up and smiles.

SARAH
You read my mind.

The barista winks and walks away. Sarah turns back to her laptop, determination in her eyes."
              className="script-textarea min-h-[500px] text-base leading-relaxed p-6 resize-none"
              data-testid="script-textarea"
            />

            {!hasApiKey && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4 flex items-center gap-4">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-900">
                      You need a Gemini API key to generate scenes.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/setup")}
                    className="border-amber-300 hover:bg-amber-100"
                  >
                    Add API Key
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tips Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Script Tips
                  </h3>
                </div>

                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Include clear scene headings (INT/EXT, LOCATION, TIME)</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Describe character appearances in detail</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Use action lines to describe visual elements</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Keep scenes focused on visual storytelling</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    AI Scene Generation
                  </h3>
                </div>

                <p className="text-sm text-muted-foreground">
                  Our AI will analyze your script and automatically:
                </p>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>Break script into visual scenes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-primary" />
                    <span>Extract character profiles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span>Generate image prompts</span>
                  </li>
                </ul>

                <Button
                  onClick={handleDecompose}
                  disabled={decomposing || !script.trim() || !hasApiKey}
                  className="w-full bg-primary hover:bg-primary/90"
                  data-testid="sidebar-generate-btn"
                >
                  {decomposing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Generate Scenes
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
