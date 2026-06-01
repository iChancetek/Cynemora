"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import styles from "./movie-studio.module.css";

// 🎬 Interface definitions for professional NLE timeline
interface Clip {
  id: string;
  name: string;
  duration: number; // in seconds
  start: number; // start time in seconds
  track: "V1" | "V2" | "V3" | "VFX" | "Dialogue" | "Music" | "Foley" | "Effects" | "Subtitles";
  videoUrl?: string;
  description: string;
  color?: string;
}

interface PlatformVideo {
  id: string;
  name: string;
  prompt: string;
  videoUrl: string;
  duration: number;
  sourceType: string;
  createdAt: Date;
  projectId?: string;
}

interface VisualAsset {
  id: string;
  name: string;
  icon: string;
  appearance?: string;
}

interface ProjectItem {
  id: string;
  name: string;
}

interface Character {
  name: string;
  description: string;
  role: string;
}

interface Scene {
  number: number;
  title: string;
  description: string;
  location: string;
  timeOfDay: string;
  mood: string;
  characters: string[];
}

interface ProjectData {
  id: string;
  title: string;
  description: string;
  status: string;
  narrativeGraph?: {
    title?: string;
    logline?: string;
    genre?: string;
    tone?: string;
    themes?: string[];
    acts?: {
      number: number;
      title: string;
      description: string;
      scenes: Scene[];
    }[];
    characters?: Character[];
  };
  shots?: Record<string, any[]>; // maps sceneNumber -> Shot list
}

/** Normalise video URLs — Firebase Storage / public URLs pass through;
 *  raw Gemini URIs get wrapped in the server proxy as a last resort. */
function proxyVideoUrl(url: string): string {
  if (!url) return url;

  // Firebase Storage URLs are permanent and publicly accessible — use as-is
  if (url.includes("storage.googleapis.com/") || url.includes("firebasestorage.googleapis.com/") || url.includes("firebasestorage.app/")) {
    return url;
  }

  // Unwrap any nested proxy wrappers
  let rawUrl = url;
  while (true) {
    const idx = rawUrl.indexOf("/api/render/proxy?url=");
    if (idx !== -1) {
      rawUrl = decodeURIComponent(rawUrl.substring(idx + "/api/render/proxy?url=".length));
    } else {
      break;
    }
  }

  if (rawUrl.includes("generativelanguage.googleapis.com")) {
    return `/api/render/proxy?url=${encodeURIComponent(rawUrl)}`;
  }
  return rawUrl;
}

export default function MovieStudioPage() {
  const { user } = useAuth();
  
  // 🍿 Project details
  const [movieTitle, setMovieTitle] = useState("My CyneMora Movie");
  const [genre, setGenre] = useState("Sci-Fi Thriller");
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildingProgress, setBuildingProgress] = useState(0);
  const [buildStep, setBuildStep] = useState("");
  
  // 🍿 Simple Mode vs Advanced Mode Toggle (Default to Simple Storyboard!)
  const [isSimpleMode, setIsSimpleMode] = useState(true);
  
  // 🎥 Real User Generated Videos from Platform Renders
  const [platformVideos, setPlatformVideos] = useState<PlatformVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  
  // 🧬 Real Persistent Characters from Visual DNA Vault
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [isLoadingDNA, setIsLoadingDNA] = useState(true);

  // 📁 User project folders from Firestore
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("all");
  
  // ⚡ Integrated Quick-Add Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  
  // 🎬 Integrated Cinema Asset Hub Tab State
  const [activeAssetTab, setActiveAssetTab] = useState<"renders" | "projects" | "upload" | "dna">("renders");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCharacterFilter, setSelectedCharacterFilter] = useState<string | null>(null);
  
  // 📁 Project Details Browser & Stitcher States
  const [selectedProjectView, setSelectedProjectView] = useState("none");
  const [selectedProjectData, setSelectedProjectData] = useState<ProjectData | null>(null);
  const [isLoadingProjectData, setIsLoadingProjectData] = useState(false);
  const [isStitchingAll, setIsStitchingAll] = useState(false);
  
  // ⚡ Active timeline navigation states
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(60); // Percentage zoom multiplier
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [activeLUT, setActiveLUT] = useState<"blockbuster" | "cyberpunk" | "noir" | "scifi" | "fantasy" | "documentary">("cyberpunk");
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  
  // ⚙️ Sliders & Toggles State
  const [activeTab, setActiveTab] = useState<"director" | "color" | "audio">("director");
  const [exposure, setExposure] = useState(1.05);
  const [contrast, setContrast] = useState(1.15);
  
  // 🎛️ Sound Board Faders
  const [dialogueVolume, setDialogueVolume] = useState(85);
  const [musicVolume, setMusicVolume] = useState(65);
  const [foleyVolume, setFoleyVolume] = useState(70);
  
  const [noiseRemoval, setNoiseRemoval] = useState(true);

  // 📝 Director's Thoughts and Suggestion Feeds
  const [directorSuggestions, setDirectorSuggestions] = useState<string[]>([
    "Director AI: Welcome! Use the glowing 'Quick Import Platform Renders' button to add all your generated videos in one click.",
  ]);

  const [activeDragTrack, setActiveDragTrack] = useState<string | null>(null);

  // Export properties
  const [exportFormat, setExportFormat] = useState("MP4");
  const [exportResolution, setExportResolution] = useState("4K (2160p)");

  // Load real videos and Visual DNA characters created by the user from Firestore
  useEffect(() => {
    async function loadRealData() {
      if (!user) return;
      setIsLoadingVideos(true);
      setIsLoadingDNA(true);
      try {
        // 1. Fetch real user video renders
        const rendersQuery = query(
          collection(db, "renders"),
          where("userId", "==", user.uid)
        );
        const rendersSnap = await getDocs(rendersQuery);
        const renderItems: PlatformVideo[] = [];
        
        rendersSnap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.videoUrl && d.status === "completed" && !d.deletedAt) {
            renderItems.push({
              id: docSnap.id,
              name: d.prompt ? (d.prompt.length > 32 ? d.prompt.substring(0, 32) + "..." : d.prompt) : `Render #${docSnap.id.substring(0, 6)}`,
              prompt: d.prompt || "AI Scene",
              videoUrl: proxyVideoUrl(d.videoUrl),
              duration: d.duration || 8,
              sourceType: d.sourceType || "text-to-video",
              createdAt: d.createdAt?.toDate() || new Date(),
              projectId: d.projectId
            });
          }
        });
        
        renderItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setPlatformVideos(renderItems);

        // 2. Fetch real characters from Visual DNA Vault
        const dnaQuery = query(
          collection(db, "visualDna"),
          where("userId", "==", user.uid)
        );
        const dnaSnap = await getDocs(dnaQuery);
        const dnaItems: VisualAsset[] = [];
        
        dnaSnap.forEach((docSnap) => {
          const d = docSnap.data();
          dnaItems.push({
            id: docSnap.id,
            name: d.characterName || "Character DNA",
            icon: d.referenceImages && d.referenceImages.length > 0 ? d.referenceImages[0] : "👤",
            appearance: d.appearance?.distinguishingFeatures?.[0] || ""
          });
        });
        setAssets(dnaItems);

        // 3. Fetch real projects folders list
        const projQuery = query(
          collection(db, "projects"),
          where("userId", "==", user.uid)
        );
        const projSnap = await getDocs(projQuery);
        const projItems: ProjectItem[] = [];
        projSnap.forEach((docSnap) => {
          projItems.push({
            id: docSnap.id,
            name: docSnap.data().name || "Untitled Project"
          });
        });
        setProjectsList(projItems);
        
        // Initial timeline starts clean.
        setClips([]);
        setSelectedClip(null);

      } catch (err) {
        console.warn("Failed to query real data from Firestore:", err);
      } finally {
        setIsLoadingVideos(false);
        setIsLoadingDNA(false);
      }
    }
    loadRealData();
  }, [user]);

  // Fetch detailed project details (scenes and shot plans) when a project is selected
  useEffect(() => {
    async function loadProjectDetails() {
      if (!user || selectedProjectView === "none") {
        setSelectedProjectData(null);
        return;
      }
      setIsLoadingProjectData(true);
      try {
        const docRef = doc(db, "projects", selectedProjectView);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSelectedProjectData({
            id: docSnap.id,
            ...docSnap.data()
          } as ProjectData);
        } else {
          setSelectedProjectData(null);
        }
      } catch (err) {
        console.warn("Failed to load project details:", err);
      } finally {
        setIsLoadingProjectData(false);
      }
    }
    loadProjectDetails();
  }, [selectedProjectView, user]);

  // 🪄 Chronological Auto-Stitching of Project Scenes
  const handleStitchProjectRenders = () => {
    if (!selectedProjectData) return;
    
    setIsStitchingAll(true);
    setDirectorSuggestions(prev => [
      ...prev,
      `AI Editor: Parsing chronological screenplay shot plan for "${selectedProjectData.title || "Selected Project"}"...`
    ]);

    setTimeout(() => {
      // Find all completed renders from platformVideos that belong to this projectId
      const projectRenders = platformVideos.filter(v => v.projectId === selectedProjectData.id);
      
      if (projectRenders.length === 0) {
        alert("This project has no completed video renders. Generate some scenes first inside the dashboard project shots editor!");
        setIsStitchingAll(false);
        return;
      }

      // Collect all planned shots across acts & scenes in perfect chronological order
      const orderedRenders: PlatformVideo[] = [];
      const acts = selectedProjectData.narrativeGraph?.acts || [];
      
      // Sort acts by act number
      const sortedActs = [...acts].sort((a, b) => a.number - b.number);
      
      sortedActs.forEach(act => {
        const sortedScenes = [...act.scenes].sort((a, b) => a.number - b.number);
        sortedScenes.forEach(scene => {
          const sceneKey = `scene_${scene.number}`;
          const plannedShots = selectedProjectData.shots?.[sceneKey] || [];
          
          plannedShots.forEach((shot: any, sIdx: number) => {
            // Find matched render
            const matchedRender = projectRenders.find(r => 
              r.prompt.includes(shot.description) || 
              r.prompt.includes(shot.compiledPrompt) ||
              r.name.includes(`Shot ${shot.number}`)
            ) || (projectRenders[sIdx] && projectRenders[sIdx].projectId === selectedProjectData.id ? projectRenders[sIdx] : null);

            if (matchedRender && !orderedRenders.some(r => r.id === matchedRender.id)) {
              orderedRenders.push(matchedRender);
            }
          });
        });
      });

      // Fallback: if we didn't match any renders but some are linked by projectId, grab them chronologically by creation date
      if (orderedRenders.length === 0) {
        orderedRenders.push(...[...projectRenders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
      }

      let currentEnd = clips.reduce((acc, c) => Math.max(acc, c.start + c.duration), 0);
      const newTimelineClips: Clip[] = [];
      
      orderedRenders.forEach(asset => {
        newTimelineClips.push({
          id: `timeline-${Date.now()}-${asset.id}-${Math.random()}`,
          name: asset.name,
          duration: asset.duration,
          start: currentEnd,
          track: "V1",
          videoUrl: asset.videoUrl,
          description: asset.prompt,
          color: "#2563eb"
        });
        currentEnd += asset.duration;
      });

      setClips(prev => [...prev, ...newTimelineClips]);
      if (newTimelineClips.length > 0) {
        setSelectedClip(newTimelineClips[newTimelineClips.length - 1]);
      }
      setCurrentTime(currentEnd - (orderedRenders[orderedRenders.length - 1]?.duration || 0));

      setDirectorSuggestions(prev => [
        ...prev,
        `AI Editor: Successfully stitched ${orderedRenders.length} project shots into the movie timeline sequentially!`
      ]);
      setIsStitchingAll(false);
    }, 1000);
  };

  // Filtered renders list based on search term and character consistent prompt details
  const finalFilteredVideos = platformVideos.filter(vid => {
    // 1. Text search query check
    const matchesSearch = searchQuery 
      ? vid.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        vid.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    // 2. Character consistent filter check
    const matchesCharacter = selectedCharacterFilter
      ? vid.prompt.toLowerCase().includes(selectedCharacterFilter.toLowerCase())
      : true;

    return matchesSearch && matchesCharacter;
  });

  // Dynamic time playback loop
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (isPlaying) {
      if (videoPlayerRef.current) {
        const dur = videoPlayerRef.current.duration;
        if (Number.isFinite(dur) && dur > 0) {
          videoPlayerRef.current.play().catch(() => {});
        }
      }
      timerId = setInterval(() => {
        setCurrentTime((prev) => {
          const totalDur = clips.reduce((acc, c) => Math.max(acc, c.start + c.duration), 0) || 60;
          if (prev >= totalDur) {
            setIsPlaying(false);
            return 0;
          }
          return Number((prev + 0.1).toFixed(1));
        });
      }, 100);
    } else {
      if (videoPlayerRef.current) {
        videoPlayerRef.current.pause();
      }
    }
    return () => clearInterval(timerId);
  }, [isPlaying, clips]);

  // Sync current active clip based on playhead time
  useEffect(() => {
    const activeVideoClip = clips.find(
      (c) => (c.track === "V1" || c.track === "V2") && currentTime >= c.start && currentTime < c.start + c.duration
    );
    if (activeVideoClip) {
      setSelectedClip(activeVideoClip);
    }
  }, [currentTime, clips]);

  // Sync video element time when user scrubbing timeline
  useEffect(() => {
    if (videoPlayerRef.current && selectedClip) {
      const clipProgress = currentTime - selectedClip.start;
      if (clipProgress >= 0 && clipProgress < selectedClip.duration) {
        const duration = videoPlayerRef.current.duration;
        if (Number.isFinite(duration) && duration > 0) {
          const seekTo = clipProgress % duration;
          if (Number.isFinite(seekTo)) {
            videoPlayerRef.current.currentTime = seekTo;
          }
        }
      }
    }
  }, [currentTime, selectedClip]);

  // External video file upload handler
  const handleExternalVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setIsUploading(true);
    setUploadProgress("Uploading file to Storage...");
    
    try {
      const storageRef = ref(storage, `uploads/${user.uid}/uploaded-${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      
      setUploadProgress("Securing download link...");
      const videoUrl = await getDownloadURL(storageRef);
      
      setUploadProgress("Saving to database...");
      const newDoc = await addDoc(collection(db, "renders"), {
        userId: user.uid,
        prompt: `Uploaded: ${file.name}`,
        style: "Master Upload",
        aspectRatio: "16:9",
        movement: "original",
        videoUrl,
        sourceType: "uploaded-movie-studio",
        createdAt: new Date(),
        status: "completed"
      });
      
      const newVideoAsset: PlatformVideo = {
        id: newDoc.id,
        name: file.name.length > 20 ? file.name.substring(0, 20) + "..." : file.name,
        prompt: `Uploaded: ${file.name}`,
        videoUrl: proxyVideoUrl(videoUrl),
        duration: 8,
        sourceType: "uploaded-movie-studio",
        createdAt: new Date()
      };
      
      setPlatformVideos(prev => [newVideoAsset, ...prev]);
      setDirectorSuggestions(prev => [
        ...prev,
        `AI Editor: Successfully imported video asset: '${file.name}'`
      ]);
      
      // Auto-append to storyboard immediately in Simple Mode for maximum ease-of-use!
      if (isSimpleMode) {
        handleAddAssetToSequence(newVideoAsset);
      } else {
        alert(`Uploaded successfully! Drag '${file.name}' onto the timeline rows below.`);
      }
    } catch (err) {
      console.error("External video upload failed:", err);
      alert("Failed to upload video asset.");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  // Add Asset to simple storyboard sequence
  const handleAddAssetToSequence = (asset: PlatformVideo) => {
    // Calculate start time based on end of current sequence
    const currentEnd = clips.reduce((acc, c) => Math.max(acc, c.start + c.duration), 0);
    
    const newTimelineClip: Clip = {
      id: `timeline-${Date.now()}-${asset.id}`,
      name: asset.name,
      duration: asset.duration,
      start: currentEnd,
      track: "V1",
      videoUrl: asset.videoUrl,
      description: asset.prompt,
      color: "#2563eb"
    };
    
    setClips(prev => [...prev, newTimelineClip]);
    setSelectedClip(newTimelineClip);
    setCurrentTime(currentEnd);
    setDirectorSuggestions(prev => [
      ...prev,
      `AI: Appended scene '${asset.name}' to the storyboard sequence.`
    ]);
  };

  // Handle Multi-Select Quick Import
  const handleToggleImportSelection = (id: string) => {
    setSelectedImportIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleApplyQuickImport = () => {
    if (selectedImportIds.length === 0) return;
    
    const itemsToImport = platformVideos.filter(x => selectedImportIds.includes(x.id));
    let currentEnd = clips.reduce((acc, c) => Math.max(acc, c.start + c.duration), 0);
    
    const newTimelineClips: Clip[] = [];
    
    itemsToImport.forEach(asset => {
      newTimelineClips.push({
        id: `timeline-${Date.now()}-${asset.id}`,
        name: asset.name,
        duration: asset.duration,
        start: currentEnd,
        track: "V1",
        videoUrl: asset.videoUrl,
        description: asset.prompt,
        color: "#2563eb"
      });
      currentEnd += asset.duration;
    });
    
    setClips(prev => [...prev, ...newTimelineClips]);
    if (newTimelineClips.length > 0) {
      setSelectedClip(newTimelineClips[newTimelineClips.length - 1]);
    }
    setCurrentTime(currentEnd - (itemsToImport[itemsToImport.length - 1]?.duration || 0));
    
    setDirectorSuggestions(prev => [
      ...prev,
      `AI: Imported ${itemsToImport.length} platform videos into your storyboard sequence.`
    ]);
    
    setSelectedImportIds([]);
    setIsImportModalOpen(false);
  };

  // Reorder Storyboard Clip: Move Left
  const handleMoveClipLeft = (index: number) => {
    if (index === 0) return;
    const newClips = [...clips];
    
    // Swap starts and order
    const current = newClips[index];
    const previous = newClips[index - 1];
    
    const tempStart = current.start;
    current.start = previous.start;
    previous.start = current.start + current.duration; // cascade
    
    newClips[index] = previous;
    newClips[index - 1] = current;
    
    // Clean starts cascade to be continuous
    let totalStart = 0;
    newClips.forEach(c => {
      c.start = totalStart;
      totalStart += c.duration;
    });
    
    setClips(newClips);
  };

  // Reorder Storyboard Clip: Move Right
  const handleMoveClipRight = (index: number) => {
    if (index === clips.length - 1) return;
    const newClips = [...clips];
    
    const current = newClips[index];
    const next = newClips[index + 1];
    
    newClips[index] = next;
    newClips[index + 1] = current;
    
    let totalStart = 0;
    newClips.forEach(c => {
      c.start = totalStart;
      totalStart += c.duration;
    });
    
    setClips(newClips);
  };

  // Drag and Drop Timeline Handlers (Advanced Mode)
  const handleDragStartAsset = (e: React.DragEvent, asset: PlatformVideo) => {
    e.dataTransfer.setData("application/cynemora-video", JSON.stringify(asset));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOverTrack = (e: React.DragEvent, trackName: string) => {
    e.preventDefault();
    setActiveDragTrack(trackName);
  };

  const handleDragLeaveTrack = () => {
    setActiveDragTrack(null);
  };

  const handleDropAssetOnTrack = (e: React.DragEvent, trackName: Clip["track"]) => {
    e.preventDefault();
    setActiveDragTrack(null);
    
    const dataStr = e.dataTransfer.getData("application/cynemora-video");
    if (!dataStr) return;
    
    try {
      const asset: PlatformVideo = JSON.parse(dataStr);
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickPercent = clickX / rect.width;
      const dropStart = Math.max(0, Math.min(60 - asset.duration, Math.floor(clickPercent * 60)));
      
      const newTimelineClip: Clip = {
        id: `timeline-${Date.now()}-${asset.id}`,
        name: asset.name,
        duration: asset.duration,
        start: dropStart,
        track: trackName,
        videoUrl: asset.videoUrl,
        description: asset.prompt,
        color: trackName.startsWith("V") ? "#2563eb" : trackName === "VFX" ? "#7e22ce" : "#047857"
      };
      
      setClips(prev => [...prev, newTimelineClip]);
      setSelectedClip(newTimelineClip);
      setCurrentTime(dropStart);
    } catch (err) {
      console.error(err);
    }
  };

  // Remove clip from timeline
  const handleRemoveClip = (clipId: string) => {
    setClips(prev => {
      const filtered = prev.filter(c => c.id !== clipId);
      // Adjust starts in simple mode to keep it continuous
      if (isSimpleMode) {
        let totalStart = 0;
        filtered.forEach(c => {
          c.start = totalStart;
          totalStart += c.duration;
        });
      }
      return filtered;
    });
    if (selectedClip?.id === clipId) {
      setSelectedClip(null);
    }
  };

  // One-Click AI Movie Builder Action Simulator
  const handleAIBuildMovie = () => {
    if (platformVideos.length === 0) {
      alert("Generate some AI videos first, or upload external videos to build a movie!");
      return;
    }

    setIsBuilding(true);
    setBuildingProgress(5);
    setBuildStep("Reading storyboard parameters...");
    
    const steps = [
      { p: 30, s: "Connecting matching visual vectors..." },
      { p: 65, s: "Smoothing atmospheric lighting transitions..." },
      { p: 100, s: "Stitching complete!" },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setBuildingProgress(step.p);
        setBuildStep(step.s);
        if (step.p === 100) {
          setTimeout(() => {
            setIsBuilding(false);
            
            let runningTime = 0;
            const stitchedTimeline: Clip[] = [];
            
            platformVideos.forEach((asset) => {
              stitchedTimeline.push({
                id: `stitch-${asset.id}`,
                name: asset.name,
                duration: asset.duration,
                start: runningTime,
                track: "V1",
                videoUrl: asset.videoUrl,
                description: asset.prompt,
                color: "#2563eb"
              });
              runningTime += asset.duration;
            });
            
            setClips(stitchedTimeline);
            if (stitchedTimeline.length > 0) {
              setSelectedClip(stitchedTimeline[0]);
            }
            setMovieTitle("CyneMora Stitched Sequence");
          }, 800);
        }
      }, (index + 1) * 1000);
    });
  };

  // Time formatter helper
  const formatTimecode = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Dynamic CSS filter overlays based on LUT and sliders
  const filterStyles = {
    filter: `exposure(${exposure}) contrast(${contrast})`,
    opacity: 0.95,
  };

  // Filtered list of platform video assets
  const filteredVideos = platformVideos.filter(vid => {
    if (selectedProjectFilter === "all") return true;
    return vid.projectId === selectedProjectFilter;
  });

  return (
    <div className={styles.container}>
      {/* 🔮 AI Builder Loading Screen */}
      {isBuilding && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 9, 13, 0.96)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-body)",
          padding: "var(--space-6)"
        }}>
          <div style={{
            maxWidth: "460px",
            width: "100%",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "var(--space-8)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.8)"
          }}>
            <img src="/icon-192x192.png" alt="CyneMora logo" width={48} height={48} style={{ borderRadius: "12px", marginBottom: "var(--space-4)" }} />
            <h2 style={{ fontFamily: "var(--font-display)", color: "white", fontSize: "20px", fontWeight: "800", marginBottom: "var(--space-1)" }}>Stitching Video Renders</h2>
            
            <div style={{ height: "6px", width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-full)", overflow: "hidden", marginBottom: "var(--space-3)", marginTop: "16px" }}>
              <div style={{ height: "100%", width: `${buildingProgress}%`, background: "linear-gradient(90deg, #a78bfa, #ec4899)", borderRadius: "var(--radius-full)", transition: "width 0.4s ease-out" }} />
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-muted)", fontSize: "11px" }}>
              <span>{buildStep}</span>
              <span>{buildingProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 INTEGRATED AREA: Quick-Add Platform Renders Selection Modal */}
      {isImportModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 9, 13, 0.94)",
          zIndex: 9990,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-body)",
          padding: "var(--space-6)"
        }}>
          <div style={{
            maxWidth: "760px",
            width: "100%",
            background: "#121018",
            border: "1px solid rgba(167, 139, 250, 0.25)",
            padding: "var(--space-6)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.8), 0 0 40px rgba(167, 139, 250, 0.1)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "85vh"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, color: "white", fontSize: "16px", fontWeight: 800 }}>🎬 Quick Import Platform Videos</h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>Select multiple completed AI renders from your account and add them instantly.</p>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "white", fontSize: "18px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {platformVideos.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "13px" }}>
                No completed video renders found in your account yet. Generate scenes in the platform, and they will appear here instantly!
              </div>
            ) : (
              <>
                <div style={{ overflowY: "auto", flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", paddingRight: "4px" }}>
                  {platformVideos.map((asset) => {
                    const isSelected = selectedImportIds.includes(asset.id);
                    return (
                      <div 
                        key={asset.id}
                        onClick={() => handleToggleImportSelection(asset.id)}
                        style={{
                          background: isSelected ? "rgba(167, 139, 250, 0.12)" : "rgba(255,255,255,0.02)",
                          border: isSelected ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "var(--radius-md)",
                          padding: "6px",
                          cursor: "pointer",
                          position: "relative",
                          transition: "all 0.15s"
                        }}
                      >
                        <div style={{ position: "absolute", top: "6px", left: "6px", zIndex: 10, background: isSelected ? "#a78bfa" : "rgba(0,0,0,0.6)", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "10px", fontWeight: "bold" }}>
                          {isSelected ? "✓" : ""}
                        </div>
                        <div style={{ width: "100%", height: "70px", borderRadius: "4px", overflow: "hidden", background: "black", marginBottom: "6px" }}>
                          <video src={asset.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "white", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {asset.name}
                        </span>
                        <span style={{ fontSize: "8px", color: "var(--color-text-muted)" }}>{asset.sourceType}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                    Selected: <strong>{selectedImportIds.length}</strong> videos
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className={styles.btnSecondary} onClick={() => setSelectedImportIds([])} disabled={selectedImportIds.length === 0} style={{ padding: "6px 14px", fontSize: "12px" }}>
                      Clear Selection
                    </button>
                    <button className={styles.btnPrimary} onClick={handleApplyQuickImport} disabled={selectedImportIds.length === 0} style={{ padding: "6px 16px", fontSize: "12px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
                      🎬 Append Selected to Movie
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 💡 Friendly Onboarding Tour Box */}
      <div style={{
        background: "linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
        border: "1px solid rgba(167, 139, 250, 0.2)",
        borderRadius: "var(--radius-lg)",
        padding: "12px 18px",
        fontSize: "13px",
        color: "rgba(255,255,255,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>🎬</span>
          <span>
            <strong>Welcome, Director!</strong> Making a movie is super easy here: <strong>Step 1:</strong> Select a video in your Library below to append it to the Storyboard. <strong>Step 2:</strong> Tap play to preview. <strong>Step 3:</strong> Click Export to render your final master cut!
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button 
            onClick={() => setIsSimpleMode(true)} 
            className={isSimpleMode ? styles.btnPrimary : styles.btnSecondary} 
            style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "20px" }}
          >
            🎚️ Simple Storyboard
          </button>
          <button 
            onClick={() => setIsSimpleMode(false)} 
            className={!isSimpleMode ? styles.btnPrimary : styles.btnSecondary} 
            style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "20px" }}
          >
            🎬 Advanced Tracks
          </button>
        </div>
      </div>

      {/* 🎬 Header Section & Production Analytics */}
      <header className={styles.headerPanel}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <span className={styles.studioBadge}>Movie Studio</span>
            <input 
              type="text" 
              className={styles.title} 
              value={movieTitle} 
              onChange={(e) => setMovieTitle(e.target.value)}
              style={{ background: "transparent", border: "none", borderBottom: "1px dashed rgba(255,255,255,0.2)", outline: "none", width: "260px", WebkitBackgroundClip: "initial", WebkitTextFillColor: "initial", color: "white" }} 
            />
          </div>
          
          <div className={styles.projectMetaGroup}>
            <div className={styles.metaBadge}>
              Genre: <strong>{genre}</strong>
            </div>
            <div className={styles.metaBadge}>
              Runtime: <strong>{clips.reduce((acc, c) => Math.max(acc, c.start + c.duration), 0)}s</strong>
            </div>
            <div className={styles.metaBadge}>
              Scenes: <strong>{clips.filter(c => c.track === "V1" || c.track === "V2").length} Stitched</strong>
            </div>
            
            <button className={styles.btnPrimary} onClick={handleAIBuildMovie} disabled={isBuilding || platformVideos.length === 0} style={{ padding: "6px 14px" }}>
              🪄 Auto-Stitch Movie
            </button>
          </div>
        </div>
      </header>

      {/* 🎚️ Playback & Editing Workspace Split Column */}
      <section className={styles.workspaceGrid}>
        
        {/* Left Column — Agent Control Panel */}
        <div className={styles.agentConsole} style={{ height: "480px" }}>
          
          {/* Tabs header */}
          <div className={styles.agentTabs}>
            <button
              className={`${styles.tabButton} ${activeTab === "director" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("director")}
            >
              <span className={styles.tabIcon}>🤖</span>
              <span>AI Director</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === "color" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("color")}
            >
              <span className={styles.tabIcon}>🎨</span>
              <span>Color Filter</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === "audio" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("audio")}
            >
              <span className={styles.tabIcon}>🎙️</span>
              <span>Volume</span>
            </button>
          </div>

          {/* Tab contents */}
          <div className={styles.tabContent}>
            
            {/* 1. Director & Agent Agents Tab */}
            {activeTab === "director" && (
              <>
                <div className={styles.agentCard} style={{ padding: "12px" }}>
                  <span className={styles.agentName}>🎬 AI Director</span>
                  <p className={styles.agentThought} style={{ margin: "4px 0 0 0" }}>
                    &quot;Your sequence looks great! To keep it simple, just add video scenes in chronological order on your storyboard below.&quot;
                  </p>
                </div>

                <div className={styles.agentCard} style={{ flex: 1, minHeight: "120px", display: "flex", flexDirection: "column", padding: "12px" }}>
                  <span className={styles.agentName}>✍️ Screenplay Directions</span>
                  <div style={{
                    flex: 1,
                    overflowY: "auto",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "rgba(255,255,255,0.8)",
                    lineHeight: "1.4"
                  }}>
                    {directorSuggestions.map((s, i) => (
                      <div key={i} style={{ marginBottom: "6px", borderLeft: "2px solid var(--color-primary-light)", paddingLeft: "6px" }}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 2. Color Grading Suite Tab */}
            {activeTab === "color" && (
              <>
                <div className={styles.colorGroupLabel}>LUT Filter Presets</div>
                <div className={styles.lutGrid}>
                  <div className={`${styles.lutCard} ${activeLUT === "cyberpunk" ? styles.lutActive : ""}`} onClick={() => setActiveLUT("cyberpunk")}>
                    <span className={styles.lutName}>Cyberpunk</span>
                    <span className={styles.lutDesc}>Vibrant Neon</span>
                  </div>
                  <div className={`${styles.lutCard} ${activeLUT === "blockbuster" ? styles.lutActive : ""}`} onClick={() => setActiveLUT("blockbuster")}>
                    <span className={styles.lutName}>Hollywood</span>
                    <span className={styles.lutDesc}>Teal & Orange</span>
                  </div>
                  <div className={`${styles.lutCard} ${activeLUT === "noir" ? styles.lutActive : ""}`} onClick={() => setActiveLUT("noir")}>
                    <span className={styles.lutName}>Film Noir</span>
                    <span className={styles.lutDesc}>Monochrome</span>
                  </div>
                  <div className={`${styles.lutCard} ${activeLUT === "documentary" ? styles.lutActive : ""}`} onClick={() => setActiveLUT("documentary")}>
                    <span className={styles.lutName}>Documentary</span>
                    <span className={styles.lutDesc}>Raw Standard</span>
                  </div>
                </div>

                <div className={styles.sliderGroup} style={{ marginTop: "10px", padding: "10px" }}>
                  <div className={styles.sliderRow}>
                    <div className={styles.sliderLabelRow}>
                      <span>Brightness</span>
                      <span className={styles.sliderValue}>{exposure.toFixed(2)} EV</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.3"
                      step="0.05"
                      value={exposure}
                      onChange={(e) => setExposure(Number(e.target.value))}
                      className={styles.sliderInput}
                    />
                  </div>
                </div>
              </>
            )}

            {/* 3. Audio Foley Mixer Tab */}
            {activeTab === "audio" && (
              <>
                <div className={styles.audioMixer}>
                  <div className={styles.colorGroupLabel}>Simple Volume Controls</div>
                  
                  <div className={styles.sliderGroup} style={{ gap: "12px", padding: "12px" }}>
                    <div className={styles.sliderRow}>
                      <div className={styles.sliderLabelRow}>
                        <span>Voice Volume</span>
                        <span>{dialogueVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={dialogueVolume}
                        onChange={(e) => setDialogueVolume(Number(e.target.value))}
                        className={styles.sliderInput}
                      />
                    </div>

                    <div className={styles.sliderRow}>
                      <div className={styles.sliderLabelRow}>
                        <span>Music Volume</span>
                        <span>{musicVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(Number(e.target.value))}
                        className={styles.sliderInput}
                      />
                    </div>
                  </div>

                  <div className={styles.mixerSettings} style={{ padding: "10px", marginTop: "10px" }}>
                    <div className={styles.toggleRow}>
                      <span>Auto Room Noise Cleaner</span>
                      <label className={styles.toggleSwitch}>
                        <input type="checkbox" checked={noiseRemoval} onChange={() => setNoiseRemoval(!noiseRemoval)} />
                        <span className={styles.toggleSlider} />
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Right Column — Playback Pane */}
        <div className={styles.playbackPane}>
          
          {/* Cinema play monitor */}
          <div className={styles.monitorContainer}>
            <div className={styles.monitorDisplay}>
              {selectedClip && selectedClip.videoUrl ? (
                <video
                  ref={videoPlayerRef}
                  src={selectedClip.videoUrl}
                  className={`${styles.monitorVideo} ${styles[`lut_${activeLUT}`]}`}
                  style={filterStyles}
                  loop
                  muted
                  playsInline
                />
              ) : (
                <div 
                  className={`${styles.monitorVideo} ${styles[`lut_${activeLUT}`]}`}
                  style={{
                    ...filterStyles,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0, 0, 0, 0.95)"
                  }}
                >
                  <div style={{
                    textAlign: "center",
                    color: "white",
                    padding: "var(--space-4)",
                    background: "rgba(0, 0, 0, 0.55)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "var(--radius-lg)",
                    backdropFilter: "blur(8px)",
                    maxWidth: "80%"
                  }}>
                    <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎬</div>
                    <div style={{ fontWeight: "700", fontSize: "14px", fontFamily: "var(--font-display)" }}>
                      Your Playback Preview
                    </div>
                    <div style={{ fontSize: "11px", color: "#c084fc", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
                      Add video scenes in the sequence below to play them here.
                    </div>
                  </div>
                </div>
              )}

              {/* Monitor overlays */}
              <div className={styles.monitorOverlay}>
                <div className={styles.timecodeHeader}>
                  <div className={styles.chapterMark}>
                    Cinema Preview
                  </div>
                  <div>24 fps</div>
                </div>
              </div>

              {/* Central hover play button */}
              <div className={styles.playbackStateOverlay}>
                <button className={styles.bigPlayButton} onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? "⏸" : "▶"}
                </button>
              </div>
            </div>

            {/* Bottom playback controller bar */}
            <div className={styles.monitorBar}>
              <div className={styles.monitorTime}>
                <span>{formatTimecode(currentTime)}</span>
                <span className={styles.monitorDuration}>/ {formatTimecode(clips.reduce((acc, c) => Math.max(acc, c.start + c.duration), 0))}</span>
              </div>

              <div className={styles.monitorControls}>
                <button className={styles.controlButton} title="Rewind" onClick={() => {
                  setCurrentTime(0);
                }}>
                  ⏮
                </button>
                <button className={styles.controlButton} style={{ background: "rgba(167, 139, 250, 0.15)", color: "white" }} title={isPlaying ? "Pause" : "Play"} onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? "⏸" : "▶"}
                </button>
              </div>

              <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                Filter: <span style={{ color: "#c084fc", fontWeight: "600", textTransform: "uppercase" }}>{activeLUT}</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* 🎬 MAIN EDITING STAGE: Toggle between Super Simple Storyboard & Advanced Tracks */}
      <section className={styles.timelineSection}>
        {isSimpleMode ? (
          /* 🎚️ 1. SUPER SIMPLE STORYBOARD MODE (EXTREMELY APPROACHABLE!) */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>🎚️</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: "700", fontSize: "15px" }}>Your Film Storyboard Sequence</span>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>({clips.length} scenes in sequence)</span>
              </div>
              
              <div style={{ display: "flex", gap: "8px" }}>
                {/* 🚀 GLOWING INTEGRATED QUICK ADD BUTTON */}
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  style={{
                    background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                    border: "none",
                    color: "white",
                    fontWeight: "700",
                    fontSize: "11px",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    boxShadow: "0 0 12px rgba(167, 139, 250, 0.4)",
                    transition: "transform 0.15s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  ➕ Quick Import Platform Videos
                </button>
                <button 
                  className={styles.btnSecondary} 
                  style={{ padding: "4px 12px", fontSize: "11px", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
                  onClick={() => {
                    setClips([]);
                    setSelectedClip(null);
                  }}
                  disabled={clips.length === 0}
                >
                  🗑️ Clear All
                </button>
              </div>
            </div>

            {clips.length === 0 ? (
              <div style={{
                border: "2px dashed rgba(255, 255, 255, 0.08)",
                borderRadius: "var(--radius-lg)",
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "12px",
                background: "rgba(0,0,0,0.1)"
              }}>
                <span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>📥</span>
                <span>Your Storyboard is empty! <strong>Tap past videos in your library below</strong>, or click the glowing <strong>&apos;Quick Import&apos;</strong> button to construct your film sequence!</span>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "12px", overflowX: "auto", padding: "4px 0", minHeight: "110px" }}>
                {clips.map((clip, idx) => {
                  const isActive = selectedClip?.id === clip.id;
                  return (
                    <div 
                      key={clip.id}
                      style={{
                        width: "180px",
                        background: isActive ? "rgba(167, 139, 250, 0.15)" : "rgba(255, 255, 255, 0.02)",
                        border: isActive ? "2px solid #a78bfa" : "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "var(--radius-md)",
                        padding: "8px",
                        position: "relative",
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        boxShadow: isActive ? "0 0 10px rgba(167, 139, 250, 0.2)" : ""
                      }}
                    >
                      {/* Close button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveClip(clip.id);
                        }}
                        style={{
                          position: "absolute", top: "4px", right: "4px",
                          width: "18px", height: "18px", borderRadius: "50%",
                          background: "rgba(0,0,0,0.6)", color: "white", border: "none",
                          fontSize: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          zIndex: 10
                        }}
                      >
                        ✕
                      </button>

                      {/* Preview video */}
                      <div 
                        onClick={() => {
                          setSelectedClip(clip);
                          setCurrentTime(clip.start);
                        }}
                        style={{ width: "100%", height: "70px", borderRadius: "4px", overflow: "hidden", cursor: "pointer", background: "black" }}
                      >
                        {clip.videoUrl && <video src={clip.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px" }}>
                        <span style={{ fontWeight: "700", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "110px" }}>
                          {clip.name}
                        </span>
                        <span style={{ color: "var(--color-text-muted)" }}>
                          {clip.duration}s
                        </span>
                      </div>

                      {/* Storyboard Reorder Controllers */}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto" }}>
                        <button 
                          onClick={() => handleMoveClipLeft(idx)} 
                          disabled={idx === 0} 
                          style={{ background: "rgba(255,255,255,0.05)", border: "none", color: idx === 0 ? "rgba(255,255,255,0.1)" : "white", padding: "2px 8px", borderRadius: "2px", fontSize: "9px", cursor: "pointer" }}
                        >
                          ◀ Move Left
                        </button>
                        <button 
                          onClick={() => handleMoveClipRight(idx)} 
                          disabled={idx === clips.length - 1} 
                          style={{ background: "rgba(255,255,255,0.05)", border: "none", color: idx === clips.length - 1 ? "rgba(255,255,255,0.1)" : "white", padding: "2px 8px", borderRadius: "2px", fontSize: "9px", cursor: "pointer" }}
                        >
                          Move Right ▶
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* 🎬 2. ADVANCED NLE MULTI-TRACK MODE (COMPACTED & INTUITIVE FOR ADVANCED EDITING) */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className={styles.timelineToolbar}>
              <div className={styles.toolbarTitle}>
                <span>🎬 Non-Linear Timeline Tracks</span>
                <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>[60s Max Track Limits]</span>
              </div>

              <div className={styles.timelineControls}>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  style={{
                    background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
                    border: "none",
                    color: "white",
                    fontWeight: "700",
                    fontSize: "11px",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    marginRight: "16px"
                  }}
                >
                  ➕ Quick Import Platform Videos
                </button>
                <div className={styles.zoomController}>
                  <span>Zoom Scale:</span>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={timelineZoom}
                    onChange={(e) => setTimelineZoom(Number(e.target.value))}
                    className={styles.zoomSlider}
                  />
                  <span style={{ fontFamily: "var(--font-mono)" }}>{timelineZoom}%</span>
                </div>
              </div>
            </div>

            {/* NLE Multitrack Scroller Board */}
            <div className={styles.timelineScroller}>
              
              {/* Timeline Header (Timecode ruler ticks) */}
              <div className={styles.timelineHeader}>
                <div className={styles.trackHeaderCol}>RULER / TIME</div>
                <div className={styles.timecodeRuler}>
                  
                  {/* Render dynamic time ticks */}
                  {Array.from({ length: 7 }).map((_, index) => {
                    const tickSec = index * 10;
                    const percentLeft = (tickSec / 60) * 100;
                    return (
                      <div
                        key={index}
                        className={styles.timeTick}
                        style={{ left: `${percentLeft}%` }}
                      >
                        {formatTimecode(tickSec)}
                      </div>
                    );
                  })}

                  {/* Dynamic Red Playhead Indicator */}
                  <div
                    className={styles.playheadLine}
                    style={{ left: `${(currentTime / 60) * 100}%` }}
                  >
                    <div className={styles.playheadHandle} />
                  </div>

                </div>
              </div>

              {/* Tracks grid */}
              <div className={styles.timelineTracks}>
                
                {(["V1", "V2", "VFX", "Dialogue", "Music", "Foley"] as const).map((trackName) => {
                  const isDragOver = activeDragTrack === trackName;
                  return (
                    <div 
                      key={trackName}
                      className={`${styles.trackRow} ${
                        trackName.startsWith("V") 
                          ? styles.trackVideo 
                          : trackName === "VFX" 
                            ? styles.trackVfx 
                            : styles.trackAudio
                      }`}
                      style={{
                        backgroundColor: isDragOver ? "rgba(167, 139, 250, 0.12)" : "",
                        border: isDragOver ? "1px dashed var(--color-primary-light)" : ""
                      }}
                    >
                      <div className={styles.trackName}>
                        {trackName === "V1" || trackName === "V2" ? "📹 Video " + trackName : trackName === "VFX" ? "✨ VFX" : "🔊 " + trackName}
                      </div>
                      
                      <div 
                        className={styles.trackContent}
                        onDragOver={(e) => handleDragOverTrack(e, trackName)}
                        onDragLeave={handleDragLeaveTrack}
                        onDrop={(e) => handleDropAssetOnTrack(e, trackName)}
                      >
                        {clips
                          .filter((c) => c.track === trackName)
                          .map((c) => {
                            const blockWidth = (c.duration / 60) * 100 * (timelineZoom / 60);
                            const blockLeft = (c.start / 60) * 100 * (timelineZoom / 60);
                            const isActive = selectedClip?.id === c.id;
                            return (
                              <div
                                key={c.id}
                                className={`${styles.clipBlock} ${isActive ? styles.clipActive : ""}`}
                                style={{
                                  left: `${blockLeft}%`,
                                  width: `${blockWidth}%`,
                                }}
                                onClick={() => {
                                  setSelectedClip(c);
                                  setCurrentTime(c.start);
                                }}
                              >
                                <span className={styles.clipName}>{c.name}</span>
                                <span className={styles.clipTimecode}>{c.duration}s</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}

              </div>

            </div>
          </div>
        )}
      </section>

      {/* 🎬 CYNEMORA CINEMA ASSET HUB (ALL PLATFORM ASSETS IN ONE PLACE!) */}
      <section className={styles.bottomPanelCard} style={{ gridColumn: "span 3", minHeight: "360px" }}>
        
        {/* Tab Headers */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={() => setActiveAssetTab("renders")}
              style={{
                background: activeAssetTab === "renders" ? "rgba(167, 139, 250, 0.15)" : "transparent",
                border: "none",
                color: activeAssetTab === "renders" ? "#c084fc" : "var(--color-text-muted)",
                fontSize: "12px",
                fontWeight: "700",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
              }}
            >
              <span>🍿</span> Platform Renders
            </button>
            <button
              onClick={() => setActiveAssetTab("projects")}
              style={{
                background: activeAssetTab === "projects" ? "rgba(167, 139, 250, 0.15)" : "transparent",
                border: "none",
                color: activeAssetTab === "projects" ? "#c084fc" : "var(--color-text-muted)",
                fontSize: "12px",
                fontWeight: "700",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
              }}
            >
              <span>📁</span> Projects & Shot Plans
            </button>
            <button
              onClick={() => setActiveAssetTab("upload")}
              style={{
                background: activeAssetTab === "upload" ? "rgba(167, 139, 250, 0.15)" : "transparent",
                border: "none",
                color: activeAssetTab === "upload" ? "#c084fc" : "var(--color-text-muted)",
                fontSize: "12px",
                fontWeight: "700",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
              }}
            >
              <span>📤</span> Local Uploader
            </button>
            {assets.length > 0 && (
              <button
                onClick={() => setActiveAssetTab("dna")}
                style={{
                  background: activeAssetTab === "dna" ? "rgba(167, 139, 250, 0.15)" : "transparent",
                  border: "none",
                  color: activeAssetTab === "dna" ? "#c084fc" : "var(--color-text-muted)",
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}
              >
                <span>🧬</span> Visual DNA Characters
              </button>
            )}
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>
              TOTAL REPOSITORY: {platformVideos.length} clips
            </span>
          </div>
        </div>

        {/* Tab Body contents */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "240px" }}>
          
          {/* TAB 1: Standalone Platform Renders */}
          {activeAssetTab === "renders" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {/* Search bar & filter controls */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "6px" }}>
                <div style={{ display: "flex", gap: "8px", flex: 1, maxWidth: "420px" }}>
                  <input
                    type="text"
                    placeholder="🔍 Search renders by prompt keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      flex: 1,
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      color: "white",
                      outline: "none"
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "white", padding: "0 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                {/* Character Filter status */}
                {selectedCharacterFilter && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(167, 139, 250, 0.12)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: "20px", padding: "4px 10px", fontSize: "11px" }}>
                    <span>👤 Character: <strong>{selectedCharacterFilter}</strong></span>
                    <button onClick={() => setSelectedCharacterFilter(null)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: "11px", padding: "0 2px" }}>✕</button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    style={{
                      background: "rgba(167, 139, 250, 0.1)",
                      border: "1px solid rgba(167,139,250,0.25)",
                      color: "#c084fc",
                      fontWeight: "700",
                      fontSize: "11px",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    ➕ Bulk Selection Import
                  </button>
                </div>
              </div>

              {/* Renders Grid */}
              {isLoadingVideos ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, minHeight: "180px" }}>
                  <div style={{ width: "24px", height: "24px", border: "2px solid #a78bfa", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "8px" }}>Loading renders...</span>
                </div>
              ) : finalFilteredVideos.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, minHeight: "180px", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "8px", padding: "20px", textAlign: "center" }}>
                  <span style={{ fontSize: "20px", marginBottom: "6px" }}>🔍</span>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>No matching platform renders found.</span>
                  {(searchQuery || selectedCharacterFilter) && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCharacterFilter(null);
                      }}
                      style={{ background: "rgba(167, 139, 250, 0.15)", border: "none", color: "#c084fc", padding: "4px 12px", borderRadius: "4px", fontSize: "11px", marginTop: "10px", cursor: "pointer" }}
                    >
                      Reset Search Filters
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ overflowY: "auto", maxHeight: "200px", paddingRight: "4px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
                    {finalFilteredVideos.map((asset) => {
                      const usageCount = clips.filter(c => c.videoUrl === asset.videoUrl).length;
                      return (
                        <div
                          key={asset.id}
                          draggable
                          onDragStart={(e) => handleDragStartAsset(e, asset)}
                          onClick={() => handleAddAssetToSequence(asset)}
                          style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            border: usageCount > 0 ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "6px",
                            padding: "6px",
                            cursor: "pointer",
                            position: "relative",
                            transition: "all 0.2s",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)"}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = usageCount > 0 ? "#10b981" : "rgba(255, 255, 255, 0.05)"}
                          title="Click to add to Storyboard, or Drag onto Tracks"
                        >
                          {/* Used Count Badge */}
                          {usageCount > 0 && (
                            <span style={{ position: "absolute", top: "4px", right: "4px", zIndex: 10, background: "#10b981", color: "white", fontSize: "8px", fontWeight: "800", padding: "1px 4px", borderRadius: "10px" }}>
                              x{usageCount} Used
                            </span>
                          )}

                          <div style={{ width: "100%", height: "64px", background: "black", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                            <video src={asset.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
                            <span style={{ position: "absolute", bottom: "4px", left: "4px", background: "rgba(0,0,0,0.6)", fontSize: "8px", padding: "1px 4px", borderRadius: "2px", fontWeight: "700" }}>
                              {asset.duration}s
                            </span>
                          </div>
                          
                          <span style={{ fontSize: "9px", fontWeight: "700", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "left" }}>
                            {asset.name}
                          </span>
                          <span style={{ fontSize: "7px", color: "var(--color-text-muted)", display: "block", textAlign: "left" }}>
                            {asset.sourceType}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Projects Directory & Chronological Scene Stitcher */}
          {activeAssetTab === "projects" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {/* Project selector dropdown */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Select Platform Project:</span>
                  <select
                    className={styles.selectInput}
                    value={selectedProjectView}
                    onChange={(e) => setSelectedProjectView(e.target.value)}
                    style={{ padding: "4px 10px", fontSize: "11px", width: "220px" }}
                  >
                    <option value="none">-- Select a Project --</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                {selectedProjectView !== "none" && selectedProjectData && (
                  <button
                    onClick={handleStitchProjectRenders}
                    disabled={isStitchingAll}
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      border: "none",
                      color: "white",
                      fontWeight: "700",
                      fontSize: "11px",
                      padding: "6px 14px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      boxShadow: "0 0 10px rgba(16,185,129,0.3)"
                    }}
                  >
                    {isStitchingAll ? "Stitching..." : "🪄 Auto-Stitch Project Shots"}
                  </button>
                )}
              </div>

              {selectedProjectView === "none" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, minHeight: "180px", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "8px", color: "var(--color-text-muted)", fontSize: "12px", padding: "16px" }}>
                  <span style={{ fontSize: "24px", marginBottom: "4px" }}>📁</span>
                  <span>Select one of your **platform projects** from the dropdown above to browse, edit, and stitch its scenes!</span>
                </div>
              ) : isLoadingProjectData ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, minHeight: "180px" }}>
                  <div style={{ width: "24px", height: "24px", border: "2px solid #a78bfa", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "8px" }}>Loading screenplay & shots...</span>
                </div>
              ) : !selectedProjectData ? (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-muted)" }}>Project failed to load.</div>
              ) : (
                <div style={{ overflowY: "auto", maxHeight: "200px", display: "flex", flexDirection: "column", gap: "16px", paddingRight: "4px" }}>
                  {/* List acts & scenes from selectedProjectData narrativeGraph */}
                  {selectedProjectData.narrativeGraph?.acts?.length ? (
                    selectedProjectData.narrativeGraph.acts.map((act) => (
                      <div key={act.number} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "800", color: "#a78bfa", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px", marginBottom: "8px", textAlign: "left" }}>
                          Act {act.number}: {act.title}
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {act.scenes.map((scene) => {
                            // Find corresponding renders from Firestore for this scene shot plan
                            const sceneKey = `scene_${scene.number}`;
                            const plannedShots = selectedProjectData.shots?.[sceneKey] || [];
                            
                            // We can fetch completed renders from platformVideos that belong to this projectId
                            const projectRenders = platformVideos.filter(v => v.projectId === selectedProjectData.id);
                            
                            return (
                              <div key={scene.number} style={{ background: "rgba(0,0,0,0.15)", borderRadius: "6px", padding: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                  <span style={{ fontSize: "10px", fontWeight: "700", color: "white" }}>
                                    Scene {scene.number}: {scene.title} ({scene.location})
                                  </span>
                                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>
                                    {scene.timeOfDay} • {scene.mood}
                                  </span>
                                </div>

                                {plannedShots.length === 0 ? (
                                  <div style={{ fontSize: "9px", color: "var(--color-text-muted)", textAlign: "left" }}>No shot plan generated yet in shot editor.</div>
                                ) : (
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
                                    {plannedShots.map((shot: any, sIdx: number) => {
                                      // Check if there is a completed render matching the prompt or index
                                      const matchedRender = projectRenders.find(r => 
                                        r.prompt.includes(shot.description) || 
                                        r.prompt.includes(shot.compiledPrompt) ||
                                        r.name.includes(`Shot ${shot.number}`)
                                      ) || (projectRenders[sIdx] && projectRenders[sIdx].projectId === selectedProjectData.id ? projectRenders[sIdx] : null);

                                      return (
                                        <div
                                          key={sIdx}
                                          style={{
                                            background: "rgba(255,255,255,0.02)",
                                            border: matchedRender ? "1px solid rgba(167, 139, 250, 0.25)" : "1px dashed rgba(255,255,255,0.06)",
                                            borderRadius: "4px",
                                            padding: "6px",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "4px",
                                            cursor: matchedRender ? "pointer" : "default"
                                          }}
                                          onClick={() => matchedRender && handleAddAssetToSequence(matchedRender)}
                                        >
                                          <div style={{ width: "100%", height: "56px", background: "black", borderRadius: "2px", overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {matchedRender ? (
                                              <>
                                                <video src={matchedRender.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
                                                <span style={{ position: "absolute", bottom: "2px", right: "2px", background: "rgba(0,0,0,0.6)", fontSize: "7px", padding: "1px 3px", borderRadius: "2px" }}>
                                                  {matchedRender.duration}s
                                                </span>
                                              </>
                                            ) : (
                                              <span style={{ fontSize: "16px" }}>🎬</span>
                                            )}
                                          </div>
                                          <span style={{ fontSize: "8px", fontWeight: "700", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>
                                            Shot {shot.number}: {shot.type}
                                          </span>
                                          <span style={{ fontSize: "7px", color: "var(--color-text-muted)", height: "20px", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>
                                            {shot.description}
                                          </span>
                                          {matchedRender ? (
                                            <span style={{ fontSize: "7px", color: "#10b981", fontWeight: "700", marginTop: "auto", textAlign: "left" }}>
                                              ✓ Rendered (Click to Import)
                                            </span>
                                          ) : (
                                            <span style={{ fontSize: "7px", color: "var(--color-text-muted)", marginTop: "auto", textAlign: "left" }}>
                                              Planned (Not Rendered)
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "11px", padding: "40px" }}>
                      This project has no narrative act-structure or scene lists generated. Generate them in the dashboard shot editor!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Drag-and-Drop Local Video Uploader */}
          {activeAssetTab === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, justifyContent: "center" }}>
              <div 
                style={{ 
                  flex: 1, 
                  border: isUploading ? "1px solid var(--color-primary-light)" : "1px dashed rgba(255,255,255,0.15)", 
                  borderRadius: "var(--radius-lg)", 
                  background: "rgba(0,0,0,0.25)",
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  padding: "32px 16px",
                  textAlign: "center",
                  cursor: isUploading ? "not-allowed" : "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => !isUploading && document.getElementById("hub-video-selector")?.click()}
              >
                <input 
                  id="hub-video-selector" 
                  type="file" 
                  accept="video/mp4,video/webm" 
                  hidden 
                  disabled={isUploading}
                  onChange={handleExternalVideoUpload} 
                />
                {isUploading ? (
                  <>
                    <div style={{ width: "32px", height: "32px", border: "2px solid #a78bfa", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "12px" }} />
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "white" }}>{uploadProgress}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "36px", marginBottom: "8px" }}>📤</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>Select Local Film Asset to Upload</span>
                    <span style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "4px" }}>MP4 or WebM format • Max 50MB</span>
                    <span style={{ fontSize: "9px", color: "#a78bfa", marginTop: "12px", background: "rgba(167, 139, 250, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                      Note: Uploaded files are registered as completed renders and auto-append to the Storyboard!
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Visual DNA Character Consistency Filters */}
          {activeAssetTab === "dna" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)", textAlign: "left" }}>
                Click a consistent AI character profile to filter all platform renders that feature their prompt details:
              </span>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", overflowY: "auto", maxHeight: "200px" }}>
                {assets.map((asset) => {
                  const isActiveFilter = selectedCharacterFilter === asset.name;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => {
                        setSelectedCharacterFilter(isActiveFilter ? null : asset.name);
                        setActiveAssetTab("renders"); // auto switch back to renders grid
                        setDirectorSuggestions(prev => [
                          ...prev,
                          isActiveFilter 
                            ? "AI: Cleared character filters." 
                            : `AI: Filtering renders for character '${asset.name}' appearance traits.`
                        ]);
                      }}
                      style={{
                        background: isActiveFilter ? "rgba(167, 139, 250, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        border: isActiveFilter ? "2px solid #a78bfa" : "1px solid rgba(255, 255, 255, 0.05)",
                        borderRadius: "6px",
                        padding: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = isActiveFilter ? "#a78bfa" : "rgba(255, 255, 255, 0.05)"}
                    >
                      <div style={{ width: "36px", height: "36px", borderRadius: "6px", overflow: "hidden", display: "flex", alignItems: "center", justifyItems: "center", background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
                        {asset.icon.startsWith("http") ? (
                          <img src={asset.icon} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          asset.icon
                        )}
                      </div>
                      <div style={{ textAlign: "left", minWidth: 0 }}>
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "white", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {asset.name}
                        </span>
                        <span style={{ fontSize: "8px", color: "var(--color-text-muted)", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {asset.appearance || "Consistent Actor"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </section>

      {/* 📤 Masters & Export Panel */}
      <section className={styles.metadataCardsRow}>
        
        {/* Export Card */}
        <div className={styles.bottomPanelCard} style={{ gridColumn: "span 3", minHeight: "160px" }}>
          <div className={styles.bottomPanelTitle}>
            <span>📤 High-Quality Broadcast Export</span>
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", marginTop: "8px" }}>
            <div className={styles.formGroup}>
              <label>Format</label>
              <select className={styles.selectInput} value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <option value="MP4">MP4 (H.264 / AAC)</option>
                <option value="MOV">MOV (Apple ProRes 422 HQ)</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Target Resolution</label>
              <select className={styles.selectInput} value={exportResolution} onChange={(e) => setExportResolution(e.target.value)}>
                <option value="1080p">HD (1080p)</option>
                <option value="4K (2160p)">Ultra HD 4K</option>
              </select>
            </div>

            <button 
              className={styles.btnPrimary} 
              style={{ padding: "10px 24px", marginLeft: "auto" }} 
              onClick={() => {
                if (clips.length === 0) {
                  alert("Please add some scenes to your storyboard sequence before exporting!");
                  return;
                }
                alert(`Queuing Hollywood Master Export in render queue!\nFormat: ${exportFormat}\nResolution: ${exportResolution}`);
              }}
            >
              🚀 Render Final Cut Movie
            </button>
          </div>
        </div>

      </section>

    </div>
  );
}
