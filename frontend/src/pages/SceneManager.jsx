import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Sparkles, 
  Play,
  RefreshCw,
  Download,
  Image as ImageIcon,
  Film,
  Users,
  MapPin,
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";

export default function SceneManager({ user }) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingImages, setGeneratingImages] = useState({});
  const [generatingVideos, setGeneratingVideos] = useState({});
  const [assembling, setAssembling] = useState(false);
  const [selectedScene, setSelectedScene] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  const [generatingAllVideos, setGeneratingAllVideos] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const [projectRes, scenesRes, charactersRes] = await Promise.all([
        fetch(`${API}/projects/${projectId}`, { credentials: "include" }),
        fetch(`${API}/projects/${projectId}/scenes`, { credentials: "include" }),
        fetch(`${API}/projects/${projectId}/characters`, { credentials: "include" }),
      ]);

      if (projectRes.ok) {
        setProject(await projectRes.json());
      }
      if (scenesRes.ok) {
        const data = await scenesRes.json();
        setScenes(data.scenes || []);
      }
      if (charactersRes.ok) {
        const data = await charactersRes.json();
        setCharacters(data.characters || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load project data");
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (sceneId) => {
    setGeneratingImages((prev) => ({ ...prev, [sceneId]: true }));
    try {
      const response = await fetch(
        `${API}/projects/${projectId}/scenes/${sceneId}/generate-image`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update scene with image
        setScenes((prev) =>
          prev.map((s) =>
            s.scene_id === sceneId
              ? { ...s, image_generated: true, image_data: data.image_data }
              : s
          )
        );
        toast.success("Image generated!");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to generate image");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setGeneratingImages((prev) => ({ ...prev, [sceneId]: false }));
    }
  };

  const generateVideo = async (sceneId) => {
    setGeneratingVideos((prev) => ({ ...prev, [sceneId]: true }));
    try {
      const response = await fetch(
        `${API}/projects/${projectId}/scenes/${sceneId}/generate-video`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setScenes((prev) =>
          prev.map((s) =>
            s.scene_id === sceneId
              ? { ...s, video_status: "completed" }
              : s
          )
        );
        toast.success("Video generated!");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to generate video");
      }
    } catch (error) {
      console.error("Error generating video:", error);
      toast.error("Failed to generate video");
    } finally {
      setGeneratingVideos((prev) => ({ ...prev, [sceneId]: false }));
    }
  };

  const generateAllImages = async () => {
    setGeneratingAllImages(true);
    try {
      const response = await fetch(
        `${API}/projects/${projectId}/generate-all-images`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        await fetchData();
        toast.success("All images generated!");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to generate images");
      }
    } catch (error) {
      console.error("Error generating all images:", error);
      toast.error("Failed to generate images");
    } finally {
      setGeneratingAllImages(false);
    }
  };

  const generateAllVideos = async () => {
    setGeneratingAllVideos(true);
    try {
      const response = await fetch(
        `${API}/projects/${projectId}/generate-all-videos`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        await fetchData();
        toast.success("All videos generated!");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to generate videos");
      }
    } catch (error) {
      console.error("Error generating all videos:", error);
      toast.error("Failed to generate videos");
    } finally {
      setGeneratingAllVideos(false);
    }
  };

  const assembleFinalVideo = async () => {
    setAssembling(true);
    try {
      const response = await fetch(
        `${API}/projects/${projectId}/assemble`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProject((prev) => ({ ...prev, status: "completed" }));
        toast.success("Final video assembled!");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to assemble video");
      }
    } catch (error) {
      console.error("Error assembling video:", error);
      toast.error("Failed to assemble video");
    } finally {
      setAssembling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const imagesGenerated = scenes.filter((s) => s.image_generated).length;
  const videosCompleted = scenes.filter((s) => s.video_status === "completed").length;
  const totalScenes = scenes.length;

  const getCurrentStep = () => {
    if (project?.status === "completed") return 5;
    if (videosCompleted === totalScenes && totalScenes > 0) return 4;
    if (imagesGenerated === totalScenes && totalScenes > 0) return 3;
    if (totalScenes > 0) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/project/${projectId}`)}
              data-testid="back-to-editor"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {project?.title || "Scene Manager"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {totalScenes} scenes • {imagesGenerated} images • {videosCompleted} videos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {project?.status === "completed" ? (
              <Button className="bg-green-600 hover:bg-green-700" data-testid="download-final-btn">
                <Download className="w-4 h-4 mr-2" />
                Download Final Video
              </Button>
            ) : (
              <Button
                onClick={assembleFinalVideo}
                disabled={assembling || videosCompleted < totalScenes}
                className="bg-primary hover:bg-primary/90"
                data-testid="assemble-video-btn"
              >
                {assembling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assembling...
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 mr-2" />
                    Assemble Final Video
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-8">
            {[
              { num: 1, label: "Write Script", done: true },
              { num: 2, label: "Generate Scenes", done: currentStep >= 2 },
              { num: 3, label: "Create Images", done: currentStep >= 3 },
              { num: 4, label: "Generate Videos", done: currentStep >= 4 },
              { num: 5, label: "Export", done: currentStep >= 5 },
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center gap-3">
                <div className={`flex items-center gap-3 ${step.done ? "" : "opacity-50"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {step.done && step.num < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className={step.done ? "font-medium" : ""}>{step.label}</span>
                </div>
                {idx < 4 && <div className="h-0.5 w-12 bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Scenes List */}
          <div className="lg:col-span-3 space-y-6">
            {/* Bulk Actions */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Images</p>
                    <div className="flex items-center gap-2">
                      <Progress value={(imagesGenerated / totalScenes) * 100} className="w-24 h-2" />
                      <span className="text-sm font-medium">{imagesGenerated}/{totalScenes}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Videos</p>
                    <div className="flex items-center gap-2">
                      <Progress value={(videosCompleted / totalScenes) * 100} className="w-24 h-2" />
                      <span className="text-sm font-medium">{videosCompleted}/{totalScenes}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={generateAllImages}
                    disabled={generatingAllImages || imagesGenerated === totalScenes}
                    data-testid="generate-all-images-btn"
                  >
                    {generatingAllImages ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4 mr-2" />
                    )}
                    Generate All Images
                  </Button>
                  <Button
                    variant="outline"
                    onClick={generateAllVideos}
                    disabled={generatingAllVideos || imagesGenerated < totalScenes}
                    data-testid="generate-all-videos-btn"
                  >
                    {generatingAllVideos ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Film className="w-4 h-4 mr-2" />
                    )}
                    Generate All Videos
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scenes Grid */}
            <div className="space-y-4">
              {scenes.map((scene, index) => (
                <Card
                  key={scene.scene_id}
                  className="scene-card animate-slide-up overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                  data-testid={`scene-card-${scene.scene_id}`}
                >
                  <div className="grid md:grid-cols-3 gap-0">
                    {/* Image Preview */}
                    <div className="relative aspect-video md:aspect-auto md:h-full bg-muted">
                      {scene.image_data ? (
                        <img
                          src={`data:image/png;base64,${scene.image_data}`}
                          alt={`Scene ${scene.scene_number}`}
                          className="w-full h-full object-cover"
                        />
                      ) : scene.image_generated ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center image-skeleton">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                      
                      {scene.video_status === "completed" && (
                        <div className="video-overlay">
                          <Button size="icon" variant="secondary" className="rounded-full">
                            <Play className="w-6 h-6" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="absolute top-3 left-3">
                        <span className="px-2 py-1 bg-black/60 text-white text-xs font-medium rounded">
                          Scene {scene.scene_number}
                        </span>
                      </div>
                    </div>

                    {/* Scene Details */}
                    <div className="md:col-span-2 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Scene {scene.scene_number}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            {scene.image_generated ? (
                              <span className="status-badge completed">
                                <Check className="w-3 h-3" /> Image Ready
                              </span>
                            ) : (
                              <span className="status-badge draft">Pending Image</span>
                            )}
                            {scene.video_status === "completed" ? (
                              <span className="status-badge completed">
                                <Check className="w-3 h-3" /> Video Ready
                              </span>
                            ) : scene.video_status === "generating" ? (
                              <span className="status-badge processing">
                                <Loader2 className="w-3 h-3 animate-spin" /> Generating
                              </span>
                            ) : (
                              <span className="status-badge draft">Pending Video</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {scene.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                        {scene.characters?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {scene.characters.join(", ")}
                          </div>
                        )}
                        {scene.setting && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {scene.setting}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateImage(scene.scene_id)}
                          disabled={generatingImages[scene.scene_id]}
                          data-testid={`generate-image-${scene.scene_id}`}
                        >
                          {generatingImages[scene.scene_id] ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <ImageIcon className="w-4 h-4 mr-1" />
                          )}
                          {scene.image_generated ? "Regenerate" : "Generate"} Image
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateVideo(scene.scene_id)}
                          disabled={generatingVideos[scene.scene_id] || !scene.image_generated}
                          data-testid={`generate-video-${scene.scene_id}`}
                        >
                          {generatingVideos[scene.scene_id] ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Film className="w-4 h-4 mr-1" />
                          )}
                          {scene.video_status === "completed" ? "Regenerate" : "Generate"} Video
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedScene(scene)}
                          data-testid={`view-scene-${scene.scene_id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {scenes.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    No scenes generated yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Go back to the script editor to generate scenes from your script.
                  </p>
                  <Button onClick={() => navigate(`/project/${projectId}`)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Script
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Characters Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  <Users className="w-4 h-4" />
                  Characters ({characters.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {characters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No characters extracted</p>
                ) : (
                  characters.map((char) => (
                    <div
                      key={char.character_id}
                      className="p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <h4 className="font-medium text-sm">{char.name}</h4>
                      {char.appearance && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {char.appearance}
                        </p>
                      )}
                      {char.age && (
                        <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-background rounded">
                          Age: {char.age}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Generation Progress
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Scenes</span>
                    <span className="font-medium">{totalScenes}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Images</span>
                    <span className="font-medium text-green-600">{imagesGenerated}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Videos</span>
                    <span className="font-medium text-purple-600">{videosCompleted}</span>
                  </div>
                </div>

                {project?.status === "completed" && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Video Ready!</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Scene Detail Dialog */}
      <Dialog open={!!selectedScene} onOpenChange={() => setSelectedScene(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              Scene {selectedScene?.scene_number} Details
            </DialogTitle>
          </DialogHeader>
          {selectedScene && (
            <div className="space-y-4 pt-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{selectedScene.description}</p>
              </div>
              
              {selectedScene.setting && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Setting</h4>
                  <p className="text-sm">{selectedScene.setting}</p>
                </div>
              )}
              
              {selectedScene.action_summary && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Action</h4>
                  <p className="text-sm">{selectedScene.action_summary}</p>
                </div>
              )}
              
              {selectedScene.characters?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Characters</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedScene.characters.map((char) => (
                      <span key={char} className="px-2 py-1 bg-muted rounded text-sm">
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
