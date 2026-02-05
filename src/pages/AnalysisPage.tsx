import { useEffect } from "react";
import { useVideos } from "../context/VideoContext";
import { useNavigate } from "react-router-dom";
import { Clock, File, X, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { formatFileSize } from "../utils";

export function AnalysisPage() {
  const { videos, cancelAnalysis } = useVideos();
  const navigate = useNavigate();

  const doneCount = videos.filter((v) => v.status === "DONE").length;
  const failedCount = videos.filter((v) => v.status === "FAILED").length;
  const total = videos.length;
  const progress = total > 0 ? ((doneCount + failedCount) / total) * 100 : 0;
  const allComplete = doneCount + failedCount === total && total > 0;

  useEffect(() => {
    if (allComplete) {
      // Navigate to completion page after a short delay
      const timer = setTimeout(() => {
        navigate("/complete");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, navigate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CREATING_JOB":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
            <Loader size={14} className="animate-spin" />
            Creating...
          </span>
        );
      case "UPLOADING":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
            <Loader size={14} className="animate-spin" />
            Uploading...
          </span>
        );
      case "WAITING_FOR_UPLOAD":
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center gap-1">
            <Clock size={14} />
            Waiting for upload...
          </span>
        );
      case "PROCESSING":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1">
            <Loader size={14} className="animate-spin" />
            Analyzing video...
          </span>
        );
      case "DONE":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1">
            <CheckCircle size={14} />
            Analysis Complete
          </span>
        );
      case "FAILED":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-1">
            <AlertCircle size={14} />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const getProgressPercent = (video: typeof videos[0]) => {
    switch (video.status) {
      case "CREATING_JOB":
        return 10;
      case "UPLOADING":
        return 30;
      case "WAITING_FOR_UPLOAD":
        return 40;
      case "PROCESSING":
        return 70;
      case "DONE":
        return 100;
      case "FAILED":
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-4">
          AI Video Analysis Platform
        </h1>
        <p className="text-center text-gray-600 mb-8 flex items-center justify-center gap-2">
          <span>🚀</span>
          AI is working its magic! Feel free to grab a coffee while your content
          is being analyzed.
        </p>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Overall Progress</h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {doneCount + failedCount} of {total} Videos Analyzed
              </p>
              <p className="text-sm font-medium">{Math.round(progress)}% Complete</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Selected Videos ({total})
          </h2>
          <div className="space-y-4">
            {videos.map((video) => {
              const videoProgress = getProgressPercent(video);
              return (
                <div
                  key={video.localId}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
                >
                  <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <File size={24} className="text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{video.file.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatFileSize(video.file.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <File size={14} />
                        {formatFileSize(video.file.size)}
                      </span>
                    </div>
                    {(video.status === "PROCESSING" || video.status === "WAITING_FOR_UPLOAD") && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${videoProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {videoProgress}%
                        </p>
                      </div>
                    )}
                    {video.status === "WAITING_FOR_UPLOAD" && (
                      <p className="text-xs text-yellow-600 mt-1">
                        ⚠️ Waiting for upload. Please upload using the provided uploadUrl.
                      </p>
                    )}
                    {video.error && (
                      <p className="text-sm text-red-600 mt-1">{video.error}</p>
                    )}
                  </div>
                  <div>{getStatusBadge(video.status)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={cancelAnalysis}
          className="w-full py-3 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <X size={20} />
          Cancel Analysis
        </button>
      </div>
    </div>
  );
}
