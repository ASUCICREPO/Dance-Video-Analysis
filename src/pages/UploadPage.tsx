import React, { useRef, useState, useEffect } from "react";
import { Upload, X, Clock, File, Plus } from "lucide-react";
import { useVideos } from "../context/VideoContext";
import { MetadataModal } from "../components/MetadataModal";
import { formatFileSize, formatDuration, getVideoThumbnail, getVideoDuration } from "../utils";
import { useNavigate } from "react-router-dom";

export function UploadPage() {
  const { videos, addVideos, removeVideo, updateVideoMetadata, startAnalysis } =
    useVideos();
  const [dragActive, setDragActive] = useState(false);
  const [metadataModalVideo, setMetadataModalVideo] = useState<string | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [durations, setDurations] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    // Generate thumbnails and durations for new videos
    videos.forEach(async (video) => {
      if (video.status !== "READY") return;

      if (!thumbnails.has(video.localId)) {
        try {
          const thumbnail = await getVideoThumbnail(video.file);
          setThumbnails((prev) => new Map(prev).set(video.localId, thumbnail));
        } catch (error) {
          console.error("Failed to generate thumbnail:", error);
        }
      }

      if (!durations.has(video.localId)) {
        try {
          const durationSeconds = await getVideoDuration(video.file);
          setDurations((prev) => new Map(prev).set(video.localId, durationSeconds));
        } catch (error) {
          console.error("Failed to get video duration:", error);
        }
      }
    });
  }, [videos, thumbnails, durations]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const mp4Files = files.filter(
      (file) => file.type === "video/mp4" || file.name.endsWith(".mp4")
    );
    if (mp4Files.length > 0) {
      addVideos(mp4Files);
    }
  };

  const handleAnalyze = async () => {
    if (videos.length === 0) return;
    await startAnalysis();
    navigate("/analysis");
  };

  const selectedVideo = videos.find((v) => v.localId === metadataModalVideo);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-4">
          AI Video Analysis Platform
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Upload your videos to get started with AI-powered analysis. Our system
          will process your content to analyze patterns and provide insights.
        </p>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <Upload size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">
            Drop your videos here or click anywhere to browse files
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Supported formats: mp4 (max 250MB)
          </p>
          <button className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md">
            Upload Video
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/mp4"
          onChange={handleFileInput}
          className="hidden"
        />

        {videos.length > 0 && (
          <>
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">
                Selected Videos ({videos.length})
              </h2>
              <div className="space-y-4">
                {videos.map((video) => {
                  const thumbnail = thumbnails.get(video.localId);
                  return (
                    <div
                      key={video.localId}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="relative">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt="Thumbnail"
                            className="w-24 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <File size={24} className="text-gray-400" />
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeVideo(video.localId);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{video.file.name}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {durations.has(video.localId)
                              ? formatDuration(durations.get(video.localId) || 0)
                              : "Loading..."}
                          </span>
                          <span className="flex items-center gap-1">
                            <File size={14} />
                            {formatFileSize(video.file.size)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setMetadataModalVideo(video.localId)}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Add Metadata
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              {videos.length > 0 ? (
                <button
                  onClick={handleAnalyze}
                  className="w-full py-3 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-medium"
                >
                  Analyze Videos ({videos.length})
                </button>
              ) : (
                <p className="text-center text-gray-500">
                  Upload at least one video to continue
                </p>
              )}
            </div>
          </>
        )}

        {videos.length === 0 && (
          <p className="text-center text-gray-500 mt-4">
            Upload at least one video to continue
          </p>
        )}
      </div>

      {selectedVideo && (
        <MetadataModal
          isOpen={metadataModalVideo !== null}
          onClose={() => setMetadataModalVideo(null)}
          onSave={(metadata) => {
            updateVideoMetadata(selectedVideo.localId, metadata);
          }}
          initialMetadata={selectedVideo.metadata}
        />
      )}
    </div>
  );
}
