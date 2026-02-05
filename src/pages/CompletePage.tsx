import React from "react";
import { useVideos } from "../context/VideoContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, File } from "lucide-react";
import { formatFileSize } from "../utils";

export function CompletePage() {
  const { videos } = useVideos();
  const navigate = useNavigate();

  // Show all DONE videos, even if parsing failed
  const doneVideos = videos.filter((v) => v.status === "DONE");

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-4">
          AI Video Analysis Platform
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Your videos have been analyzed successfully! 🎉
        </p>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Overall Progress</h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {doneVideos.length} of {videos.length} Videos Analyzed
              </p>
              <p className="text-sm font-medium">100% Complete</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className="bg-green-600 h-3 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Selected Videos ({videos.length})
          </h2>
          <div className="space-y-4">
            {videos.map((video) => (
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
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1">
                  <CheckCircle size={14} />
                  Analysis Complete
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-3 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Back to Upload
          </button>
          <button
            onClick={() => navigate("/results")}
            className="flex-1 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-900"
          >
            View Results
          </button>
        </div>
      </div>
    </div>
  );
}
