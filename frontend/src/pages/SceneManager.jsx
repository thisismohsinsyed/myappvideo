import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  ArrowRight,
  Play,
  RefreshCw,
  Download,
  Image as ImageIcon,
  Film,
  Users,
  MapPin,
  Loader2,
  Check,
  X,
  AlertCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";

// Step definitions
const STEPS = [
  { id: 1, label: "Script", done: true },
  { id: 2, label: "Scenes", key: "scenes_generated" },
  { id: 3, label: "Images", key: "images_generated" },
  { id: 4, label: "Approve Images", key: "images_approved" },
  { id: 5, label: "Videos", key: "videos_generated" },
  { id: 6, label: "Approve Videos", key: "videos_approved" },
  { id: 7, label: "Final", key: "completed" },
];

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
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  const [generatingAllVideos, setGeneratingAllVideos] = useState(false);
  
  // Selection states for approval
  const [selectedForApproval, setSelectedForApproval] = useState(new Set());
  const [activeTab, setActiveTab] = useState("images");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

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
        const proj = await projectRes.json();
        setProject(proj);
        // Set active tab based on project status
        if (proj.status === "videos_generated" || proj.status === "videos_approved") {
          setActiveTab("videos");
        }
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
        setScenes((prev) =>
          prev.map((s) =>
            s.scene_id === sceneId
              ? { ...s, image_generated: true, image_data: data.image_data, image_approved: false }
              : s
          )
        );
        toast.success("HD Image generated!");
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
        setScenes((prev) =>
          prev.map((s) =>
            s.scene_id === sceneId
              ? { ...s, video_status: "completed", video_approved: false }
              : s
          )
        );
        toast.success("Video clip generated!");
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
        toast.success("All HD images generated! Please review and approve.");
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
    const approvedScenes = scenes.filter(s => s.image_approved);
    if (approvedScenes.length === 0) {
      toast.error("Please approve at least one image before generating videos");
      return;
    }

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
        setActiveTab("videos");
        toast.success("Video clips generated from approved images! Please review and approve.");
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

  const handleApproveSelected = async (type, approved) => {
    if (selectedForApproval.size === 0) {
      toast.error(`Please select at least one ${type} to ${approved ? 'approve' : 'reject'}`);
      return;
    }

    try {
      const response = await fetch(
        `${API}/projects/${projectId}/scenes/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            scene_ids: Array.from(selectedForApproval),
            approval_type: type,
            approved: approved
          }),
        }
      );

      if (response.ok) {
        await fetchData();
        setSelectedForApproval(new Set());
        toast.success(`${selectedForApproval.size} ${type}s ${approved ? 'approved' : 'rejected'}!`);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to update approval");
      }
    } catch (error) {
      console.error("Error updating approval:", error);
      toast.error("Failed to update approval");
    }
  };

  const toggleSceneSelection = (sceneId) => {
    setSelectedForApproval((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  };

  const selectAllScenes = (type) => {
    const eligibleScenes = type === "image" 
      ? scenes.filter(s => s.image_generated && !s.image_approved)
      : scenes.filter(s => s.video_status === "completed" && !s.video_approved);
    
    setSelectedForApproval(new Set(eligibleScenes.map(s => s.scene_id)));
  };

  const assembleFinalVideo = async () => {
    const approvedVideos = scenes.filter(s => s.video_approved);
    if (approvedVideos.length === 0) {
      toast.error("Please approve at least one video clip before assembling");
      return;
    }

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
        await fetchData();
        toast.success(`Final video assembled! ${data.scenes_count} clips, ${data.total_duration} seconds.`);
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

  // Calculate progress
  const totalScenes = scenes.length;
  const imagesGenerated = scenes.filter((s) => s.image_generated).length;
  const imagesApproved = scenes.filter((s) => s.image_approved).length;
  const videosCompleted = scenes.filter((s) => s.video_status === "completed").length;
  const videosApproved = scenes.filter((s) => s.video_approved).length;

  // Determine current step
  const getCurrentStep = () => {
    if (project?.status === "completed") return 7;
    if (videosApproved > 0) return 6;
    if (videosCompleted > 0) return 5;
    if (imagesApproved > 0) return 4;
    if (imagesGenerated === totalScenes && totalScenes > 0) return 3;
    if (totalScenes > 0) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

  // Filter scenes for current tab
  const scenesWithImages = scenes.filter(s => s.image_generated);
  const scenesWithVideos = scenes.filter(s => s.video_status === "completed");

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
                {totalScenes} scenes • {imagesApproved}/{imagesGenerated} images approved • {videosApproved}/{videosCompleted} videos approved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {project?.status === "completed" ? (
              <Button className="bg-green-600 hover:bg-green-700" data-testid="download-final-btn">
                <Download className="w-4 h-4 mr-2" />
                Download Final Video
              </Button>
            ) : videosApproved > 0 ? (
              <Button
                onClick={assembleFinalVideo}
                disabled={assembling}
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
                    Assemble Final Video ({videosApproved} clips)
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border bg-muted/30 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 min-w-max">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStep > step.id;
              const isActive = currentStep === step.id;
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 ${isCompleted || isActive ? "" : "opacity-50"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      isCompleted ? "bg-green-500 text-white" : 
                      isActive ? "bg-primary text-primary-foreground" : 
                      "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <span className={`text-sm ${isActive ? "font-medium" : ""}`}>{step.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && <div className="h-0.5 w-8 bg-border" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Action Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Images</p>
                      <div className="flex items-center gap-2">
                        <Progress value={(imagesGenerated / totalScenes) * 100} className="w-20 h-2" />
                        <span className="text-sm font-medium">{imagesGenerated}/{totalScenes}</span>
                        {imagesApproved > 0 && (
                          <span className="text-xs text-green-600">({imagesApproved} approved)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Videos</p>
                      <div className="flex items-center gap-2">
                        <Progress value={(videosCompleted / totalScenes) * 100} className="w-20 h-2" />
                        <span className="text-sm font-medium">{videosCompleted}/{totalScenes}</span>
                        {videosApproved > 0 && (
                          <span className="text-xs text-green-600">({videosApproved} approved)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {imagesGenerated < totalScenes && (
                      <Button
                        onClick={generateAllImages}
                        disabled={generatingAllImages}
                        data-testid="generate-all-images-btn"
                      >
                        {generatingAllImages ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ImageIcon className="w-4 h-4 mr-2" />
                        )}
                        Generate All HD Images
                      </Button>
                    )}
                    {imagesApproved > 0 && videosCompleted < imagesApproved && (
                      <Button
                        onClick={generateAllVideos}
                        disabled={generatingAllVideos}
                        className="bg-purple-600 hover:bg-purple-700"
                        data-testid="generate-all-videos-btn"
                      >
                        {generatingAllVideos ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Film className="w-4 h-4 mr-2" />
                        )}
                        Generate Videos ({imagesApproved} approved)
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Images and Videos */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="images" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Scene Images ({imagesGenerated})
                </TabsTrigger>
                <TabsTrigger value="videos" className="flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  Video Clips ({videosCompleted})
                </TabsTrigger>
              </TabsList>

              {/* Images Tab */}
              <TabsContent value="images" className="mt-6 space-y-4">
                {imagesGenerated === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        No images generated yet
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Generate HD images for your scenes to preview and approve.
                      </p>
                      <Button onClick={generateAllImages} disabled={generatingAllImages}>
                        {generatingAllImages ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Generate All Images
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Bulk Approval Controls */}
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => selectAllScenes("image")}
                          >
                            Select All Pending
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {selectedForApproval.size} selected
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleApproveSelected("image", false)}
                            disabled={selectedForApproval.size === 0}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject Selected
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveSelected("image", true)}
                            disabled={selectedForApproval.size === 0}
                            data-testid="approve-images-btn"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve Selected
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Images Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {scenesWithImages.map((scene) => (
                        <Card
                          key={scene.scene_id}
                          className={`overflow-hidden transition-all ${
                            scene.image_approved 
                              ? "ring-2 ring-green-500 bg-green-50/50" 
                              : selectedForApproval.has(scene.scene_id)
                              ? "ring-2 ring-primary"
                              : ""
                          }`}
                          data-testid={`image-card-${scene.scene_id}`}
                        >
                          <div className="relative aspect-video bg-muted">
                            {scene.image_data ? (
                              <img
                                src={`data:image/png;base64,${scene.image_data}`}
                                alt={`Scene ${scene.scene_number}`}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setSelectedScene(scene)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            
                            {/* Selection Checkbox */}
                            {!scene.image_approved && (
                              <div className="absolute top-2 left-2">
                                <Checkbox
                                  checked={selectedForApproval.has(scene.scene_id)}
                                  onCheckedChange={() => toggleSceneSelection(scene.scene_id)}
                                  className="bg-white border-2"
                                />
                              </div>
                            )}
                            
                            {/* Approval Badge */}
                            {scene.image_approved && (
                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Approved
                                </span>
                              </div>
                            )}
                            
                            {/* Scene Number */}
                            <div className="absolute bottom-2 left-2">
                              <span className="px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                                Scene {scene.scene_number}
                              </span>
                            </div>
                          </div>
                          
                          <CardContent className="p-3">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {scene.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedScene(scene)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => generateImage(scene.scene_id)}
                                disabled={generatingImages[scene.scene_id]}
                              >
                                {generatingImages[scene.scene_id] ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Next Step CTA */}
                    {imagesApproved > 0 && videosCompleted < imagesApproved && (
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-6 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-purple-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              Ready to Generate Videos!
                            </h3>
                            <p className="text-sm text-purple-700">
                              {imagesApproved} images approved. Generate 10-second video clips for each.
                            </p>
                          </div>
                          <Button
                            onClick={generateAllVideos}
                            disabled={generatingAllVideos}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {generatingAllVideos ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <ArrowRight className="w-4 h-4 mr-2" />
                            )}
                            Generate Videos
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Videos Tab */}
              <TabsContent value="videos" className="mt-6 space-y-4">
                {videosCompleted === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                      <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        No video clips yet
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {imagesApproved > 0 
                          ? "Generate video clips from your approved images."
                          : "Approve some images first, then generate video clips."}
                      </p>
                      {imagesApproved > 0 && (
                        <Button onClick={generateAllVideos} disabled={generatingAllVideos}>
                          {generatingAllVideos ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Film className="w-4 h-4 mr-2" />
                          )}
                          Generate Videos
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Bulk Approval Controls */}
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => selectAllScenes("video")}
                          >
                            Select All Pending
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            {selectedForApproval.size} selected
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleApproveSelected("video", false)}
                            disabled={selectedForApproval.size === 0}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject Selected
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveSelected("video", true)}
                            disabled={selectedForApproval.size === 0}
                            data-testid="approve-videos-btn"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve Selected
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Videos Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {scenesWithVideos.map((scene) => (
                        <Card
                          key={scene.scene_id}
                          className={`overflow-hidden transition-all ${
                            scene.video_approved 
                              ? "ring-2 ring-green-500 bg-green-50/50" 
                              : selectedForApproval.has(scene.scene_id)
                              ? "ring-2 ring-primary"
                              : ""
                          }`}
                          data-testid={`video-card-${scene.scene_id}`}
                        >
                          <div className="grid md:grid-cols-2 gap-0">
                            {/* Video Preview */}
                            <div className="relative aspect-video bg-black">
                              {scene.image_data && (
                                <img
                                  src={`data:image/png;base64,${scene.image_data}`}
                                  alt={`Scene ${scene.scene_number}`}
                                  className="w-full h-full object-cover opacity-80"
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                  <Play className="w-8 h-8 text-purple-600 ml-1" />
                                </div>
                              </div>
                              <div className="absolute bottom-2 right-2">
                                <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                                  10 sec
                                </span>
                              </div>
                              
                              {/* Selection Checkbox */}
                              {!scene.video_approved && (
                                <div className="absolute top-2 left-2">
                                  <Checkbox
                                    checked={selectedForApproval.has(scene.scene_id)}
                                    onCheckedChange={() => toggleSceneSelection(scene.scene_id)}
                                    className="bg-white border-2"
                                  />
                                </div>
                              )}
                              
                              {/* Approval Badge */}
                              {scene.video_approved && (
                                <div className="absolute top-2 right-2">
                                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Approved
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Scene Info */}
                            <CardContent className="p-4">
                              <h4 className="font-semibold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                Scene {scene.scene_number}
                              </h4>
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                {scene.description}
                              </p>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => generateVideo(scene.scene_id)}
                                  disabled={generatingVideos[scene.scene_id]}
                                >
                                  {generatingVideos[scene.scene_id] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-1" />
                                      Regenerate
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Final Assembly CTA */}
                    {videosApproved > 0 && project?.status !== "completed" && (
                      <Card className="bg-gradient-to-r from-primary/10 to-purple-100 border-primary/30">
                        <CardContent className="p-6 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-primary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              Ready to Compile Final Video!
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {videosApproved} video clips approved ({videosApproved * 10} seconds total).
                            </p>
                          </div>
                          <Button
                            onClick={assembleFinalVideo}
                            disabled={assembling}
                            className="bg-primary hover:bg-primary/90"
                            data-testid="compile-final-btn"
                          >
                            {assembling ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Film className="w-4 h-4 mr-2" />
                            )}
                            Compile Final Video
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Completed State */}
                    {project?.status === "completed" && (
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-6 text-center">
                          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-green-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Your Video is Ready!
                          </h3>
                          <p className="text-green-700 mb-4">
                            {videosApproved} scenes • {videosApproved * 10} seconds total
                          </p>
                          <Button className="bg-green-600 hover:bg-green-700" data-testid="download-video-btn">
                            <Download className="w-4 h-4 mr-2" />
                            Download Final Video
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Characters */}
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
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Progress Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Progress Summary
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Scenes</span>
                    <span className="font-medium">{totalScenes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Images Generated</span>
                    <span className="font-medium">{imagesGenerated}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Images Approved</span>
                    <span className="font-medium text-green-600">{imagesApproved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Videos Generated</span>
                    <span className="font-medium">{videosCompleted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Videos Approved</span>
                    <span className="font-medium text-green-600">{videosApproved}</span>
                  </div>
                </div>

                {project?.status === "completed" && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Final Video Ready!</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow Guide */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Workflow Guide
                </h3>
                <ol className="text-xs text-muted-foreground space-y-2">
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">1</span>
                    <span>Generate HD images for all scenes</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">2</span>
                    <span>Review and approve images you like</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">3</span>
                    <span>Generate videos from approved images</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">4</span>
                    <span>Review and approve video clips</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">5</span>
                    <span>Compile approved clips into final video</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedScene} onOpenChange={() => setSelectedScene(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              Scene {selectedScene?.scene_number} - HD Preview
            </DialogTitle>
            <DialogDescription>
              {selectedScene?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedScene?.image_data && (
            <div className="mt-4">
              <img
                src={`data:image/png;base64,${selectedScene.image_data}`}
                alt={`Scene ${selectedScene.scene_number}`}
                className="w-full rounded-lg"
              />
            </div>
          )}
          <DialogFooter className="mt-4">
            <div className="flex items-center gap-2 w-full justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedScene?.setting && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedScene.setting}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    generateImage(selectedScene.scene_id);
                    setSelectedScene(null);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                {!selectedScene?.image_approved && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setSelectedForApproval(new Set([selectedScene.scene_id]));
                      handleApproveSelected("image", true);
                      setSelectedScene(null);
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve Image
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
