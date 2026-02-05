import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  ArrowRight,
  Play,
  Pause,
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
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Save,
  Volume2,
  VolumeX,
  Maximize
} from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";
import { createVideoFromImage, combineVideos, downloadBlob } from "@/utils/videoUtils";

// Step definitions
const STEPS = [
  { id: 1, label: "Script" },
  { id: 2, label: "Scenes" },
  { id: 3, label: "Images" },
  { id: 4, label: "Approve" },
  { id: 5, label: "Videos" },
  { id: 6, label: "Review" },
  { id: 7, label: "Final" },
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
  
  // Progress tracking
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, status: "" });
  
  // Selection states for approval
  const [selectedForApproval, setSelectedForApproval] = useState(new Set());
  const [activeTab, setActiveTab] = useState("images");
  
  // Edit dialogs
  const [editCharacterDialog, setEditCharacterDialog] = useState(null);
  const [editSceneDialog, setEditSceneDialog] = useState(null);
  const [newCharacterDialog, setNewCharacterDialog] = useState(false);
  const [videoPreviewScene, setVideoPreviewScene] = useState(null);
  
  // Video playback states
  const [sceneVideoUrls, setSceneVideoUrls] = useState({});
  const [generatingSceneVideo, setGeneratingSceneVideo] = useState({});
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [finalVideoBlob, setFinalVideoBlob] = useState(null);
  const [generatingFinalVideo, setGeneratingFinalVideo] = useState(false);
  const [showFinalVideoDialog, setShowFinalVideoDialog] = useState(false);
  const videoRef = useRef(null);
  const finalVideoRef = useRef(null);
  
  // Form states
  const [editingCharacter, setEditingCharacter] = useState({});
  const [editingScene, setEditingScene] = useState({});
  const [newCharacter, setNewCharacter] = useState({ name: "", appearance: "", clothing: "", age: "", style: "" });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ============== IMAGE GENERATION ==============
  const generateImage = async (sceneId) => {
    setGeneratingImages((prev) => ({ ...prev, [sceneId]: true }));
    toast.info("Generating HD image... This may take 10-15 seconds");
    
    try {
      const response = await fetch(
        `${API}/projects/${projectId}/scenes/${sceneId}/generate-image`,
        { method: "POST", credentials: "include" }
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
        toast.success("HD Image generated successfully!");
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

  const generateAllImages = async () => {
    const scenesToGenerate = scenes.filter(s => !s.image_generated);
    if (scenesToGenerate.length === 0) {
      toast.info("All images already generated!");
      return;
    }

    setGeneratingAllImages(true);
    setGenerationProgress({ current: 0, total: scenesToGenerate.length, status: "Starting image generation..." });

    for (let i = 0; i < scenesToGenerate.length; i++) {
      const scene = scenesToGenerate[i];
      setGenerationProgress({ 
        current: i, 
        total: scenesToGenerate.length, 
        status: `Generating image ${i + 1} of ${scenesToGenerate.length} (Scene ${scene.scene_number})...` 
      });

      try {
        const response = await fetch(
          `${API}/projects/${projectId}/scenes/${scene.scene_id}/generate-image`,
          { method: "POST", credentials: "include" }
        );

        if (response.ok) {
          const data = await response.json();
          setScenes((prev) =>
            prev.map((s) =>
              s.scene_id === scene.scene_id
                ? { ...s, image_generated: true, image_data: data.image_data, image_approved: false }
                : s
            )
          );
        } else {
          const error = await response.json();
          toast.error(`Scene ${scene.scene_number}: ${error.detail || "Failed"}`);
        }
      } catch (error) {
        toast.error(`Scene ${scene.scene_number}: Generation failed`);
      }
    }

    setGenerationProgress({ current: scenesToGenerate.length, total: scenesToGenerate.length, status: "Complete!" });
    setGeneratingAllImages(false);
    toast.success("All images generated! Please review and approve.");
  };

  // ============== VIDEO GENERATION ==============
  const generateVideo = async (sceneId) => {
    setGeneratingVideos((prev) => ({ ...prev, [sceneId]: true }));
    toast.info("Generating video clip...");
    
    try {
      const response = await fetch(
        `${API}/projects/${projectId}/scenes/${sceneId}/generate-video`,
        { method: "POST", credentials: "include" }
      );

      if (response.ok) {
        // Also create the actual video file from the image
        const sceneData = scenes.find(s => s.scene_id === sceneId);
        if (sceneData?.image_data) {
          createSceneVideo(sceneId, sceneData.image_data);
        }
        
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

  // Create actual video file from image
  const createSceneVideo = async (sceneId, imageData) => {
    setGeneratingSceneVideo(prev => ({ ...prev, [sceneId]: true }));
    try {
      const videoBlob = await createVideoFromImage(imageData, 10);
      const videoUrl = URL.createObjectURL(videoBlob);
      setSceneVideoUrls(prev => ({ ...prev, [sceneId]: { url: videoUrl, blob: videoBlob } }));
    } catch (error) {
      console.error("Error creating scene video:", error);
    } finally {
      setGeneratingSceneVideo(prev => ({ ...prev, [sceneId]: false }));
    }
  };

  // Generate video for preview when clicking on a scene
  const prepareVideoPreview = async (scene) => {
    setVideoPreviewScene(scene);
    
    // If video URL doesn't exist yet, create it
    if (!sceneVideoUrls[scene.scene_id] && scene.image_data) {
      await createSceneVideo(scene.scene_id, scene.image_data);
    }
  };

  const generateAllVideos = async () => {
    const approvedScenes = scenes.filter(s => s.image_approved && s.video_status !== "completed");
    if (approvedScenes.length === 0) {
      toast.info("No approved images to generate videos from, or all videos already generated!");
      return;
    }

    setGeneratingAllVideos(true);
    setGenerationProgress({ current: 0, total: approvedScenes.length, status: "Starting video generation..." });

    for (let i = 0; i < approvedScenes.length; i++) {
      const scene = approvedScenes[i];
      setGenerationProgress({ 
        current: i, 
        total: approvedScenes.length, 
        status: `Generating video ${i + 1} of ${approvedScenes.length} (Scene ${scene.scene_number})...` 
      });

      try {
        const response = await fetch(
          `${API}/projects/${projectId}/scenes/${scene.scene_id}/generate-video`,
          { method: "POST", credentials: "include" }
        );

        if (response.ok) {
          // Create actual video file from image
          if (scene.image_data) {
            await createSceneVideo(scene.scene_id, scene.image_data);
          }
          
          setScenes((prev) =>
            prev.map((s) =>
              s.scene_id === scene.scene_id
                ? { ...s, video_status: "completed", video_approved: false }
                : s
            )
          );
        }
      } catch (error) {
        toast.error(`Scene ${scene.scene_number}: Video generation failed`);
      }
    }

    setGenerationProgress({ current: approvedScenes.length, total: approvedScenes.length, status: "Complete!" });
    setGeneratingAllVideos(false);
    setActiveTab("videos");
    toast.success("All videos generated! Please review and approve.");
  };

  // ============== APPROVAL ==============
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
        // Update local state
        setScenes((prev) =>
          prev.map((s) =>
            selectedForApproval.has(s.scene_id)
              ? { ...s, [type === "image" ? "image_approved" : "video_approved"]: approved }
              : s
          )
        );
        setSelectedForApproval(new Set());
        toast.success(`${selectedForApproval.size} ${type}s ${approved ? 'approved' : 'rejected'}!`);
      } else {
        toast.error("Failed to update approval");
      }
    } catch (error) {
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

  const selectAllPending = (type) => {
    const eligibleScenes = type === "image" 
      ? scenes.filter(s => s.image_generated && !s.image_approved)
      : scenes.filter(s => s.video_status === "completed" && !s.video_approved);
    setSelectedForApproval(new Set(eligibleScenes.map(s => s.scene_id)));
  };

  // ============== CHARACTER MANAGEMENT ==============
  const handleSaveCharacter = async () => {
    try {
      const response = await fetch(
        `${API}/projects/${projectId}/characters/${editingCharacter.character_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(editingCharacter),
        }
      );

      if (response.ok) {
        setCharacters((prev) =>
          prev.map((c) => c.character_id === editingCharacter.character_id ? editingCharacter : c)
        );
        setEditCharacterDialog(null);
        toast.success("Character updated!");
      } else {
        toast.error("Failed to update character");
      }
    } catch (error) {
      toast.error("Failed to update character");
    }
  };

  const handleAddCharacter = async () => {
    if (!newCharacter.name.trim()) {
      toast.error("Character name is required");
      return;
    }

    try {
      const response = await fetch(
        `${API}/projects/${projectId}/characters`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(newCharacter),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCharacters((prev) => [...prev, data]);
        setNewCharacterDialog(false);
        setNewCharacter({ name: "", appearance: "", clothing: "", age: "", style: "" });
        toast.success("Character added!");
      } else {
        toast.error("Failed to add character");
      }
    } catch (error) {
      toast.error("Failed to add character");
    }
  };

  const handleDeleteCharacter = async (characterId) => {
    if (!window.confirm("Delete this character?")) return;

    try {
      const response = await fetch(
        `${API}/projects/${projectId}/characters/${characterId}`,
        { method: "DELETE", credentials: "include" }
      );

      if (response.ok) {
        setCharacters((prev) => prev.filter((c) => c.character_id !== characterId));
        toast.success("Character deleted!");
      } else {
        toast.error("Failed to delete character");
      }
    } catch (error) {
      toast.error("Failed to delete character");
    }
  };

  // ============== SCENE PROMPT EDITING ==============
  const handleSaveScene = async () => {
    try {
      const response = await fetch(
        `${API}/projects/${projectId}/scenes/${editingScene.scene_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            description: editingScene.description,
            setting: editingScene.setting,
            action_summary: editingScene.action_summary,
            characters: editingScene.characters,
          }),
        }
      );

      if (response.ok) {
        setScenes((prev) =>
          prev.map((s) => s.scene_id === editingScene.scene_id ? { ...s, ...editingScene } : s)
        );
        setEditSceneDialog(null);
        toast.success("Scene prompt updated! Regenerate to apply changes.");
      } else {
        toast.error("Failed to update scene");
      }
    } catch (error) {
      toast.error("Failed to update scene");
    }
  };

  // ============== FINAL ASSEMBLY ==============
  const assembleFinalVideo = async () => {
    const approvedVideos = scenes.filter(s => s.video_approved);
    if (approvedVideos.length === 0) {
      toast.error("Please approve at least one video clip before assembling");
      return;
    }

    setAssembling(true);
    setGeneratingFinalVideo(true);
    
    try {
      // First call backend to update status
      const response = await fetch(
        `${API}/projects/${projectId}/assemble`,
        { method: "POST", credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setProject((prev) => ({ ...prev, status: "completed" }));
        
        // Now create the actual combined video
        toast.info("Creating final video file...");
        
        // Ensure all scene videos are created
        const videosToCreate = [];
        for (const scene of approvedVideos) {
          if (!sceneVideoUrls[scene.scene_id] && scene.image_data) {
            const videoBlob = await createVideoFromImage(scene.image_data, 10);
            const videoUrl = URL.createObjectURL(videoBlob);
            setSceneVideoUrls(prev => ({ ...prev, [scene.scene_id]: { url: videoUrl, blob: videoBlob } }));
            videosToCreate.push({ blob: videoBlob, duration: 10 });
          } else if (sceneVideoUrls[scene.scene_id]) {
            videosToCreate.push({ blob: sceneVideoUrls[scene.scene_id].blob, duration: 10 });
          }
        }
        
        // Combine all videos
        if (videosToCreate.length > 0) {
          const combinedBlob = await combineVideos(videosToCreate);
          const combinedUrl = URL.createObjectURL(combinedBlob);
          setFinalVideoUrl(combinedUrl);
          setFinalVideoBlob(combinedBlob);
        }
        
        setShowFinalVideoDialog(true);
        toast.success(`Final video assembled! ${data.scenes_count} clips, ${data.total_duration} seconds.`);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to assemble video");
      }
    } catch (error) {
      toast.error("Failed to assemble video");
    } finally {
      setAssembling(false);
      setGeneratingFinalVideo(false);
    }
  };

  // Download final video
  const handleDownloadFinalVideo = () => {
    if (finalVideoBlob) {
      downloadBlob(finalVideoBlob, `${project?.title || 'video'}_final.webm`);
      toast.success("Video download started!");
    } else {
      toast.error("No video available to download");
    }
  };

  // Download individual scene video
  const handleDownloadSceneVideo = (sceneId, sceneNumber) => {
    const videoData = sceneVideoUrls[sceneId];
    if (videoData?.blob) {
      downloadBlob(videoData.blob, `scene_${sceneNumber}.webm`);
      toast.success("Scene video download started!");
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

  const getCurrentStep = () => {
    if (project?.status === "completed") return 7;
    if (videosApproved > 0) return 6;
    if (videosCompleted > 0) return 5;
    if (imagesApproved > 0) return 4;
    if (imagesGenerated > 0) return 3;
    if (totalScenes > 0) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();
  const scenesWithImages = scenes.filter(s => s.image_generated);
  const scenesWithVideos = scenes.filter(s => s.video_status === "completed");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${projectId}`)} data-testid="back-to-editor">
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
              <Button onClick={assembleFinalVideo} disabled={assembling} className="bg-primary hover:bg-primary/90" data-testid="assemble-video-btn">
                {assembling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Film className="w-4 h-4 mr-2" />}
                Assemble Final Video ({videosApproved} clips)
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border bg-muted/30 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 min-w-max">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStep > step.id;
              const isActive = currentStep === step.id;
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 ${isCompleted || isActive ? "" : "opacity-40"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      isCompleted ? "bg-green-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <Check className="w-3 h-3" /> : step.id}
                    </div>
                    <span className={`text-xs ${isActive ? "font-medium" : ""}`}>{step.label}</span>
                  </div>
                  {idx < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Generation Progress Banner */}
      {(generatingAllImages || generatingAllVideos) && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-medium text-primary">{generationProgress.status}</p>
                <Progress value={(generationProgress.current / generationProgress.total) * 100} className="h-2 mt-2" />
              </div>
              <span className="text-sm font-medium text-primary">
                {generationProgress.current}/{generationProgress.total}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Action Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Images: </span>
                      <span className="font-medium">{imagesGenerated}/{totalScenes}</span>
                      {imagesApproved > 0 && <span className="text-green-600 ml-1">({imagesApproved} ✓)</span>}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Videos: </span>
                      <span className="font-medium">{videosCompleted}/{totalScenes}</span>
                      {videosApproved > 0 && <span className="text-green-600 ml-1">({videosApproved} ✓)</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {imagesGenerated < totalScenes && (
                      <Button onClick={generateAllImages} disabled={generatingAllImages} data-testid="generate-all-images-btn">
                        {generatingAllImages ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Generate All Images
                      </Button>
                    )}
                    {imagesApproved > 0 && (
                      <Button onClick={generateAllVideos} disabled={generatingAllVideos} variant="outline" data-testid="generate-all-videos-btn">
                        {generatingAllVideos ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Film className="w-4 h-4 mr-2" />}
                        Generate Videos
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="images" className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Images ({imagesGenerated})
                </TabsTrigger>
                <TabsTrigger value="videos" className="flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  Videos ({videosCompleted})
                </TabsTrigger>
              </TabsList>

              {/* Images Tab */}
              <TabsContent value="images" className="mt-4 space-y-4">
                {scenes.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No scenes generated yet. Go back to script editor.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Bulk Actions */}
                    {imagesGenerated > 0 && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-3 flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" onClick={() => selectAllPending("image")}>
                              Select All Pending
                            </Button>
                            <span className="text-sm text-muted-foreground">{selectedForApproval.size} selected</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleApproveSelected("image", false)} disabled={selectedForApproval.size === 0}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveSelected("image", true)} disabled={selectedForApproval.size === 0} data-testid="approve-images-btn">
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Scenes Grid */}
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {scenes.map((scene) => (
                        <Card key={scene.scene_id} className={`overflow-hidden ${
                          scene.image_approved ? "ring-2 ring-green-500" : 
                          selectedForApproval.has(scene.scene_id) ? "ring-2 ring-primary" : ""
                        }`} data-testid={`scene-card-${scene.scene_id}`}>
                          
                          {/* Image Area */}
                          <div className="relative aspect-video bg-muted">
                            {generatingImages[scene.scene_id] ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                                <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                                <p className="text-white text-sm">Generating HD Image...</p>
                              </div>
                            ) : scene.image_data ? (
                              <img
                                src={`data:image/png;base64,${scene.image_data}`}
                                alt={`Scene ${scene.scene_number}`}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setSelectedScene(scene)}
                              />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-xs text-muted-foreground">No image yet</p>
                              </div>
                            )}
                            
                            {/* Checkbox */}
                            {scene.image_generated && !scene.image_approved && (
                              <div className="absolute top-2 left-2">
                                <Checkbox
                                  checked={selectedForApproval.has(scene.scene_id)}
                                  onCheckedChange={() => toggleSceneSelection(scene.scene_id)}
                                  className="bg-white"
                                />
                              </div>
                            )}
                            
                            {/* Badges */}
                            <div className="absolute top-2 right-2 flex gap-1">
                              {scene.image_approved && (
                                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">✓ Approved</span>
                              )}
                            </div>
                            
                            <div className="absolute bottom-2 left-2">
                              <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded">Scene {scene.scene_number}</span>
                            </div>
                          </div>
                          
                          {/* Scene Info */}
                          <CardContent className="p-3">
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{scene.description}</p>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Button size="sm" variant="ghost" onClick={() => generateImage(scene.scene_id)} disabled={generatingImages[scene.scene_id]}>
                                {generatingImages[scene.scene_id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingScene(scene); setEditSceneDialog(true); }}>
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              {scene.image_data && (
                                <Button size="sm" variant="ghost" onClick={() => setSelectedScene(scene)}>
                                  <Eye className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Next Step CTA */}
                    {imagesApproved > 0 && videosCompleted < imagesApproved && (
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-purple-900">Ready for Videos!</h3>
                            <p className="text-sm text-purple-700">{imagesApproved} images approved.</p>
                          </div>
                          <Button onClick={generateAllVideos} disabled={generatingAllVideos} className="bg-purple-600 hover:bg-purple-700">
                            {generatingAllVideos ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                            Generate Videos
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Videos Tab */}
              <TabsContent value="videos" className="mt-4 space-y-4">
                {videosCompleted === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Film className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {imagesApproved > 0 ? "Generate videos from approved images." : "Approve some images first."}
                      </p>
                      {imagesApproved > 0 && (
                        <Button onClick={generateAllVideos} disabled={generatingAllVideos} className="mt-4">
                          Generate Videos
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Bulk Actions */}
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-3 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="sm" onClick={() => selectAllPending("video")}>
                            Select All Pending
                          </Button>
                          <span className="text-sm text-muted-foreground">{selectedForApproval.size} selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleApproveSelected("video", false)} disabled={selectedForApproval.size === 0}>
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveSelected("video", true)} disabled={selectedForApproval.size === 0} data-testid="approve-videos-btn">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Videos Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {scenesWithVideos.map((scene) => (
                        <Card key={scene.scene_id} className={`overflow-hidden ${
                          scene.video_approved ? "ring-2 ring-green-500" : 
                          selectedForApproval.has(scene.scene_id) ? "ring-2 ring-primary" : ""
                        }`}>
                          <div className="grid md:grid-cols-2">
                            <div 
                              className="relative aspect-video bg-black cursor-pointer group"
                              onClick={() => prepareVideoPreview(scene)}
                              data-testid={`video-preview-${scene.scene_id}`}
                            >
                              {scene.image_data && (
                                <img src={`data:image/png;base64,${scene.image_data}`} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                  {generatingSceneVideo[scene.scene_id] ? (
                                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                                  ) : (
                                    <Play className="w-7 h-7 text-purple-600 ml-1" />
                                  )}
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to Play</span>
                              </div>
                              {!scene.video_approved && (
                                <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox checked={selectedForApproval.has(scene.scene_id)} onCheckedChange={() => toggleSceneSelection(scene.scene_id)} className="bg-white" />
                                </div>
                              )}
                              {scene.video_approved && (
                                <div className="absolute top-2 right-2">
                                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">✓ Approved</span>
                                </div>
                              )}
                              <div className="absolute bottom-2 right-2">
                                <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded">10 sec</span>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <h4 className="font-semibold mb-1">Scene {scene.scene_number}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{scene.description}</p>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => prepareVideoPreview(scene)}>
                                  <Play className="w-3 h-3 mr-1" /> Play
                                </Button>
                                {sceneVideoUrls[scene.scene_id] && (
                                  <Button size="sm" variant="ghost" onClick={() => handleDownloadSceneVideo(scene.scene_id, scene.scene_number)}>
                                    <Download className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Final CTA */}
                    {videosApproved > 0 && project?.status !== "completed" && (
                      <Card className="bg-gradient-to-r from-primary/10 to-purple-100 border-primary/30">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-primary">Ready for Final Video!</h3>
                            <p className="text-sm text-muted-foreground">{videosApproved} clips = {videosApproved * 10}s total</p>
                          </div>
                          <Button onClick={assembleFinalVideo} disabled={assembling} className="bg-primary hover:bg-primary/90" data-testid="compile-final-btn">
                            {assembling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Film className="w-4 h-4 mr-2" />}
                            Compile Final Video
                          </Button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Completed State */}
                    {project?.status === "completed" && (
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-6 text-center">
                          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                          <h3 className="text-lg font-semibold text-green-900 mb-1">Your Video is Ready!</h3>
                          <p className="text-green-700 mb-4">{videosApproved} scenes • {videosApproved * 10}s total</p>
                          <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => setShowFinalVideoDialog(true)}>
                              <Play className="w-4 h-4 mr-2" />
                              Play Video
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleDownloadFinalVideo} disabled={!finalVideoBlob}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Characters */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Characters ({characters.length})
                  </CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setNewCharacterDialog(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {characters.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No characters yet</p>
                ) : (
                  characters.map((char) => (
                    <div key={char.character_id} className="p-2 rounded bg-muted/50 border text-sm group">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{char.name}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingCharacter(char); setEditCharacterDialog(true); }}>
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteCharacter(char.character_id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {char.appearance && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{char.appearance}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Progress */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm">Progress</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span>Scenes</span><span className="font-medium">{totalScenes}</span></div>
                  <div className="flex justify-between"><span>Images</span><span className="font-medium">{imagesGenerated} ({imagesApproved} ✓)</span></div>
                  <div className="flex justify-between"><span>Videos</span><span className="font-medium">{videosCompleted} ({videosApproved} ✓)</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedScene} onOpenChange={() => setSelectedScene(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Scene {selectedScene?.scene_number} - HD Preview</DialogTitle>
            <DialogDescription>{selectedScene?.description}</DialogDescription>
          </DialogHeader>
          {selectedScene?.image_data && (
            <img src={`data:image/png;base64,${selectedScene.image_data}`} alt="" className="w-full rounded-lg" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { generateImage(selectedScene.scene_id); setSelectedScene(null); }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
            </Button>
            {!selectedScene?.image_approved && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { 
                setSelectedForApproval(new Set([selectedScene.scene_id])); 
                handleApproveSelected("image", true); 
                setSelectedScene(null); 
              }}>
                <Check className="w-4 h-4 mr-2" /> Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Character Dialog */}
      <Dialog open={!!editCharacterDialog} onOpenChange={() => setEditCharacterDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Character</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Name</Label><Input value={editingCharacter.name || ""} onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })} /></div>
            <div><Label>Appearance</Label><Textarea value={editingCharacter.appearance || ""} onChange={(e) => setEditingCharacter({ ...editingCharacter, appearance: e.target.value })} placeholder="Physical features, hair, skin, body type..." /></div>
            <div><Label>Clothing</Label><Input value={editingCharacter.clothing || ""} onChange={(e) => setEditingCharacter({ ...editingCharacter, clothing: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Age</Label><Input value={editingCharacter.age || ""} onChange={(e) => setEditingCharacter({ ...editingCharacter, age: e.target.value })} /></div>
              <div><Label>Style</Label><Input value={editingCharacter.style || ""} onChange={(e) => setEditingCharacter({ ...editingCharacter, style: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCharacterDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveCharacter}><Save className="w-4 h-4 mr-2" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Character Dialog */}
      <Dialog open={newCharacterDialog} onOpenChange={setNewCharacterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Character</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Name *</Label><Input value={newCharacter.name} onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })} /></div>
            <div><Label>Appearance</Label><Textarea value={newCharacter.appearance} onChange={(e) => setNewCharacter({ ...newCharacter, appearance: e.target.value })} placeholder="Physical features..." /></div>
            <div><Label>Clothing</Label><Input value={newCharacter.clothing} onChange={(e) => setNewCharacter({ ...newCharacter, clothing: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Age</Label><Input value={newCharacter.age} onChange={(e) => setNewCharacter({ ...newCharacter, age: e.target.value })} /></div>
              <div><Label>Style</Label><Input value={newCharacter.style} onChange={(e) => setNewCharacter({ ...newCharacter, style: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCharacterDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCharacter}><Plus className="w-4 h-4 mr-2" /> Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Scene Prompt Dialog */}
      <Dialog open={!!editSceneDialog} onOpenChange={() => setEditSceneDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Scene {editingScene.scene_number} Prompt</DialogTitle>
            <DialogDescription>Modify the image/video generation prompt for this scene</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Scene Description (Main Prompt)</Label>
              <Textarea 
                value={editingScene.description || ""} 
                onChange={(e) => setEditingScene({ ...editingScene, description: e.target.value })} 
                placeholder="Detailed visual description for image generation..."
                className="min-h-[120px]"
              />
            </div>
            <div>
              <Label>Setting/Location</Label>
              <Input value={editingScene.setting || ""} onChange={(e) => setEditingScene({ ...editingScene, setting: e.target.value })} placeholder="Where does this scene take place?" />
            </div>
            <div>
              <Label>Action Summary</Label>
              <Textarea value={editingScene.action_summary || ""} onChange={(e) => setEditingScene({ ...editingScene, action_summary: e.target.value })} placeholder="What happens in this scene?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSceneDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveScene}><Save className="w-4 h-4 mr-2" /> Save & Regenerate Later</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!videoPreviewScene} onOpenChange={() => setVideoPreviewScene(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Scene {videoPreviewScene?.scene_number} - Video Player</DialogTitle>
            <DialogDescription>{videoPreviewScene?.description}</DialogDescription>
          </DialogHeader>
          
          {/* Video Player Area */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {generatingSceneVideo[videoPreviewScene?.scene_id] ? (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin" />
                  <p>Creating video from image...</p>
                  <p className="text-sm text-white/60 mt-1">This may take a moment</p>
                </div>
              </div>
            ) : sceneVideoUrls[videoPreviewScene?.scene_id]?.url ? (
              <video
                ref={videoRef}
                src={sceneVideoUrls[videoPreviewScene?.scene_id]?.url}
                className="w-full aspect-video"
                controls
                autoPlay
                onError={(e) => console.error("Video error:", e)}
              >
                Your browser does not support video playback.
              </video>
            ) : videoPreviewScene?.image_data ? (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin" />
                  <p>Preparing video...</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-white/70">
                  <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No video available</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Video Info */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Duration</p>
              <p className="font-medium">10 seconds</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Resolution</p>
              <p className="font-medium">1080p HD</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Status</p>
              <p className="font-medium text-green-600">
                {videoPreviewScene?.video_approved ? "Approved" : "Pending Review"}
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {sceneVideoUrls[videoPreviewScene?.scene_id] && (
              <Button variant="outline" onClick={() => handleDownloadSceneVideo(videoPreviewScene?.scene_id, videoPreviewScene?.scene_number)}>
                <Download className="w-4 h-4 mr-2" /> Download Clip
              </Button>
            )}
            <Button variant="outline" onClick={() => { generateVideo(videoPreviewScene?.scene_id); }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
            </Button>
            {!videoPreviewScene?.video_approved && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { 
                setSelectedForApproval(new Set([videoPreviewScene?.scene_id])); 
                handleApproveSelected("video", true); 
                setVideoPreviewScene(null); 
              }}>
                <Check className="w-4 h-4 mr-2" /> Approve Video
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final Video Dialog */}
      <Dialog open={showFinalVideoDialog} onOpenChange={setShowFinalVideoDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              Final Video Ready!
            </DialogTitle>
            <DialogDescription>
              Your video has been assembled from {videosApproved} approved clips ({videosApproved * 10} seconds total)
            </DialogDescription>
          </DialogHeader>
          
          {/* Final Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {generatingFinalVideo ? (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin" />
                  <p>Creating final video...</p>
                  <p className="text-sm text-white/60 mt-1">Combining all approved clips</p>
                </div>
              </div>
            ) : finalVideoUrl ? (
              <video
                ref={finalVideoRef}
                src={finalVideoUrl}
                className="w-full aspect-video"
                controls
                autoPlay
              >
                Your browser does not support video playback.
              </video>
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-white/70">
                  <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Video not available</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Video Stats */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{videosApproved}</p>
              <p className="text-muted-foreground text-xs">Scenes</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">{videosApproved * 10}s</p>
              <p className="text-muted-foreground text-xs">Duration</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold text-primary">1080p</p>
              <p className="text-muted-foreground text-xs">Resolution</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold text-green-500">Ready</p>
              <p className="text-muted-foreground text-xs">Status</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalVideoDialog(false)}>
              Close
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleDownloadFinalVideo} disabled={!finalVideoBlob}>
              <Download className="w-4 h-4 mr-2" /> Download Final Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
