import { useVideos } from "../context/VideoContext";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";
import { formatFileSize } from "../utils";

export function ResultsPage() {
  const { videos } = useVideos();
  const navigate = useNavigate();

  // Show all completed videos (DONE or FAILED)
  const analyzedVideos = videos.filter(
    (v) => v.status === "DONE" || v.status === "FAILED"
  );

  const getSubtitle = (video: typeof videos[0]) => {
    if (video.resultParsed) {
      // Use video_summary as primary subtitle
      const summary = video.resultParsed.video_summary || "";
      if (summary) {
        // Try to extract key info: participant count
        const segments = video.resultParsed.segments || [];
        if (segments.length > 0) {
          const firstSegment = segments[0];
          const participantCount = firstSegment.fields["Number of Participants"];
          
          if (participantCount && participantCount !== "N/A") {
            // Create a short summary with participant info
            const shortSummary = summary.substring(0, 60);
            return `${shortSummary}${summary.length > 60 ? "..." : ""} • ${participantCount}`;
          }
        }
        
        // Just show truncated summary
        return summary.substring(0, 80) + (summary.length > 80 ? "..." : "");
      }
    }
    
    // Fallback
    if (video.metadata.title) {
      return video.metadata.title;
    }
    
    if (video.resultParseError) {
      return "Analysis complete (parse error - see details)";
    }
    
    return "Video analysis complete";
  };

  const getTitle = (video: typeof videos[0]) => {
    return video.metadata.title || video.file.name;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Analysis Results</h1>
        <p className="text-gray-600 mb-8">
          Your video analysis is complete! Click on any video below to open the
          detailed report with comprehensive analysis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {analyzedVideos.map((video) => (
            <div
              key={video.localId}
              onClick={() => navigate(`/details/${video.localId}`)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="w-full h-48 bg-black flex items-center justify-center">
                {video.videoUrl ? (
                  <video
                    src={video.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
                    Video preview unavailable
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2 truncate">{getTitle(video)}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span>{formatFileSize(video.file.size)}</span>
                </div>
                {video.metadata.tags && video.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {video.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-600 line-clamp-2">
                  {getSubtitle(video)}
                </p>
                {video.status === "FAILED" && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Analysis failed – click for details
                  </p>
                )}
                {video.resultParseError && video.status === "DONE" && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Parse error – see details
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-4 space-y-2">
          {videos.length > 0 && analyzedVideos.length === 0 && (
            <p className="text-sm text-gray-500">
              No completed analyses yet. Videos may still be processing or may
              have failed.
            </p>
          )}
          <div>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-900 flex items-center gap-2 mx-auto"
            >
              <Upload size={20} />
              Home / Upload New Videos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
