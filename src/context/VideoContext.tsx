import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type { Video, VideoMetadata, AnalysisResult } from "../types";
import { createJob, uploadVideo, getJobStatus } from "../api";

interface VideoContextType {
  videos: Video[];
  addVideos: (files: File[]) => void;
  removeVideo: (localId: string) => void;
  updateVideoMetadata: (localId: string, metadata: VideoMetadata) => void;
  startAnalysis: () => Promise<void>;
  cancelAnalysis: () => void;
  isAnalyzing: boolean;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const pollingIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const activeUploads = useRef<Set<string>>(new Set());
  const MAX_CONCURRENT = 2;

  const addVideos = useCallback((files: File[]) => {
    const newVideos: Video[] = files.map((file) => ({
      localId: `${Date.now()}-${Math.random()}`,
      file,
      metadata: {},
      status: "READY",
    }));
    setVideos((prev) => [...prev, ...newVideos]);
  }, []);

  const removeVideo = useCallback((localId: string) => {
    setVideos((prev) => prev.filter((v) => v.localId !== localId));
    // Clean up polling if exists
    const interval = pollingIntervals.current.get(localId);
    if (interval) {
      clearInterval(interval);
      pollingIntervals.current.delete(localId);
    }
    activeUploads.current.delete(localId);
  }, []);

  const updateVideoMetadata = useCallback((localId: string, metadata: VideoMetadata) => {
    setVideos((prev) =>
      prev.map((v) => (v.localId === localId ? { ...v, metadata } : v))
    );
  }, []);

  const cancelAnalysis = useCallback(() => {
    pollingIntervals.current.forEach((interval) => clearInterval(interval));
    pollingIntervals.current.clear();
    activeUploads.current.clear();
    setIsAnalyzing(false);
    setVideos((prev) =>
      prev.map((v) => {
        if (v.status === "CREATING_JOB" || v.status === "UPLOADING" || v.status === "PROCESSING") {
          return { ...v, status: "READY" };
        }
        return v;
      })
    );
  }, []);

  const processVideo = async (video: Video): Promise<void> => {
    const { localId, file, metadata } = video;
    activeUploads.current.add(localId);

    try {
      // Step 1: Create job
      setVideos((prev) =>
        prev.map((v) =>
          v.localId === localId ? { ...v, status: "CREATING_JOB" } : v
        )
      );

      const { jobId, uploadUrl } = await createJob(metadata);

      setVideos((prev) =>
        prev.map((v) =>
          v.localId === localId
            ? { ...v, jobId, uploadUrl, status: "UPLOADING" }
            : v
        )
      );

      // Step 2: Upload to S3
      await uploadVideo(uploadUrl, file);

      setVideos((prev) =>
        prev.map((v) =>
          v.localId === localId ? { ...v, status: "PROCESSING" } : v
        )
      );

      // Step 3: Start polling
      const poll = async () => {
        if (!activeUploads.current.has(localId)) {
          return; // Cancelled
        }

        try {
          const job = await getJobStatus(jobId);
          
          setVideos((prev) =>
            prev.map((v) => {
              if (v.localId !== localId) return v;
              
              if (job.status === "DONE") {
                let resultParsed: AnalysisResult | undefined;
                let resultParseError: string | undefined;
                
                // Handle result parsing - result can be null, a STRING containing JSON, or an OBJECT
                if (job.result === null) {
                  resultParseError = "DONE but no result received";
                } else if (typeof job.result === "string") {
                  try {
                    // Parse the JSON string
                    const parsed = JSON.parse(job.result);
                    // Validate structure
                    if (parsed && typeof parsed === 'object') {
                      resultParsed = {
                        video_summary: parsed.video_summary || "",
                        segments: Array.isArray(parsed.segments) ? parsed.segments : [],
                      };
                    } else {
                      resultParseError = "Result is not a valid object";
                    }
                  } catch (e) {
                    console.error("Failed to parse result JSON:", e);
                    resultParseError = e instanceof Error ? e.message : "Invalid JSON format";
                  }
                } else if (typeof job.result === "object") {
                  // Result is already an object, use it directly
                  try {
                    // Validate structure
                    if (job.result && typeof job.result === 'object') {
                      resultParsed = {
                        video_summary: (job.result as any).video_summary || "",
                        segments: Array.isArray((job.result as any).segments) 
                          ? (job.result as any).segments 
                          : [],
                      };
                    } else {
                      resultParseError = "Result is not a valid object";
                    }
                  } catch (e) {
                    console.error("Failed to process result object:", e);
                    resultParseError = e instanceof Error ? e.message : "Failed to process result object";
                  }
                } else {
                  // Unexpected type
                  resultParseError = `Unexpected result type: ${typeof job.result}`;
                }
                
                return {
                  ...v,
                  status: "DONE",
                  resultRaw: typeof job.result === "string" 
                    ? job.result 
                    : JSON.stringify(job.result, null, 2), // Convert object to string for display
                  resultParsed,
                  resultParseError,
                  videoS3Uri: job.videoS3Uri,
                  videoUrl: job.videoUrl, // Optional presigned GET URL
                  createdAt: job.createdAt,
                  updatedAt: job.updatedAt,
                };
              } else if (job.status === "FAILED") {
                return {
                  ...v,
                  status: "FAILED",
                  error: job.error || "Analysis failed",
                  resultRaw:
                    typeof job.result === "string"
                      ? job.result
                      : job.result
                      ? JSON.stringify(job.result)
                      : undefined, // May contain partial result even on failure
                  videoS3Uri: job.videoS3Uri,
                };
              } else if (job.status === "WAITING_FOR_UPLOAD") {
                return {
                  ...v,
                  status: "WAITING_FOR_UPLOAD",
                  videoS3Uri: job.videoS3Uri,
                };
              } else {
                // PROCESSING
                return {
                  ...v,
                  status: "PROCESSING",
                  videoS3Uri: job.videoS3Uri,
                  videoUrl: job.videoUrl,
                };
              }
            })
          );

          if (job.status === "DONE" || job.status === "FAILED") {
            const interval = pollingIntervals.current.get(localId);
            if (interval) {
              clearInterval(interval);
              pollingIntervals.current.delete(localId);
            }
            activeUploads.current.delete(localId);
          }
        } catch (error) {
          setVideos((prev) =>
            prev.map((v) =>
              v.localId === localId
                ? { ...v, status: "FAILED", error: String(error) }
                : v
            )
          );
          const interval = pollingIntervals.current.get(localId);
          if (interval) {
            clearInterval(interval);
            pollingIntervals.current.delete(localId);
          }
          activeUploads.current.delete(localId);
        }
      };

      // Poll immediately, then every 3 seconds
      await poll();
      const interval = setInterval(poll, 3000);
      pollingIntervals.current.set(localId, interval);
    } catch (error) {
      setVideos((prev) =>
        prev.map((v) =>
          v.localId === localId
            ? { ...v, status: "FAILED", error: String(error) }
            : v
        )
      );
      activeUploads.current.delete(localId);
    }
  };

  const startAnalysis = useCallback(async () => {
    const readyVideos = videos.filter((v) => v.status === "READY");
    if (readyVideos.length === 0) return;

    setIsAnalyzing(true);
    activeUploads.current.clear();

    // Process videos with concurrency limit
    const processQueue = async () => {
      const queue = [...readyVideos];
      const active: Promise<void>[] = [];

      const runNext = async () => {
        if (queue.length === 0) return;

        const video = queue.shift()!;
        const promise = processVideo(video).then(() => {
          active.splice(active.indexOf(promise), 1);
          if (queue.length > 0) {
            runNext();
          }
        });
        active.push(promise);

        if (active.length < MAX_CONCURRENT && queue.length > 0) {
          runNext();
        }
      };

      // Start initial batch
      for (let i = 0; i < Math.min(MAX_CONCURRENT, queue.length); i++) {
        runNext();
      }
    };

    await processQueue();
  }, [videos]);

  return (
    <VideoContext.Provider
      value={{
        videos,
        addVideos,
        removeVideo,
        updateVideoMetadata,
        startAnalysis,
        cancelAnalysis,
        isAnalyzing,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideos() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideos must be used within VideoProvider");
  }
  return context;
}
