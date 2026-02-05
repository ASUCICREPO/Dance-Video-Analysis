import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useVideos } from "../context/VideoContext";
import {
  ArrowLeft,
  Download,
  ChevronDown,
  ChevronUp,
  Users,
  Activity,
  Target,
  User,
  Music,
  MapPin,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { formatFileSize, formatDuration, getVideoDuration } from "../utils";
import { FIELD_MAPPINGS, getFieldsForSection, getDominantValue, type SectionName } from "../utils/fieldMapping";
import type { Segment } from "../types";
import * as XLSX from "xlsx";

export function VideoDetailsPage() {
  const { localId } = useParams<{ localId: string }>();
  const { videos } = useVideos();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"metadata" | "segments" | "uploader">("metadata");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["Who"]));
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null);

  const video = videos.find((v) => v.localId === localId);
  const [showRawResult, setShowRawResult] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);

  if (!video || (video.status !== "DONE" && video.status !== "FAILED")) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <p>Video not found or analysis not complete</p>
          <button onClick={() => navigate("/results")}>Back to Results</button>
        </div>
      </div>
    );
  }

  // Handle parse error case
  const hasParseError = !!video.resultParseError;
  const segments = video.resultParsed?.segments || [];
  const videoSummary = video.resultParsed?.video_summary || "";
  
  // Get fields from first segment if available
  const firstSegmentFields = segments.length > 0 ? segments[0].fields : {};

  useEffect(() => {
    let cancelled = false;

    const loadDuration = async () => {
      try {
        const seconds = await getVideoDuration(video.file);
        if (!cancelled) {
          setDurationSeconds(seconds);
        }
      } catch (error) {
        console.error("Failed to get video duration:", error);
      }
    };

    loadDuration();

    return () => {
      cancelled = true;
    };
  }, [video.file]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Helper to render metadata sections
  const renderMetadataSection = (
    sectionName: SectionName,
    Icon: React.ComponentType<{ size?: number }>,
    segments: Segment[],
    isExpanded: boolean
  ) => {
    if (segments.length === 0) return null;
    
    const firstSegmentFields = segments[0].fields;
    const sectionFields = getFieldsForSection(sectionName, firstSegmentFields);
    
    if (sectionFields.length === 0) return null;

    return (
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection(sectionName)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Icon size={20} />
            <span className="font-medium">{sectionName}</span>
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 space-y-2">
            {sectionFields.map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600">{key}:</span>
                <span className="font-medium">
                  {getDominantValue(segments, key)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  const handleExport = () => {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summarySheetData = [
      {
        JobId: video.jobId || "",
        VideoFile: video.file.name,
        VideoSummary: video.resultParsed?.video_summary || "",
        Status: video.status,
        Error: video.error || video.resultParseError || "",
      },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summarySheetData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Metadata sheet
    const metadataEntries = Object.entries(video.metadata || {}).map(
      ([key, value]) => ({
        Field: key,
        Value: Array.isArray(value) ? value.join(", ") : value ?? "",
      })
    );
    const metadataSheet = XLSX.utils.json_to_sheet(
      metadataEntries.length ? metadataEntries : [{ Field: "No metadata", Value: "" }]
    );
    XLSX.utils.book_append_sheet(workbook, metadataSheet, "Metadata");

    // Segments sheet (one row per segment)
    if (video.resultParsed?.segments && video.resultParsed.segments.length > 0) {
      const segmentRows = video.resultParsed.segments.map((segment) => {
        const base: Record<string, string | number | null> = {
          segment_id: segment.segment_id,
          start_time: segment.start_time,
          end_time: segment.end_time,
          change_reason: segment.change_reason,
        };

        // Flatten fields object into individual columns
        Object.entries(segment.fields || {}).forEach(([key, value]) => {
          base[key] = value;
        });

        return base;
      });

      const segmentsSheet = XLSX.utils.json_to_sheet(segmentRows);
      XLSX.utils.book_append_sheet(workbook, segmentsSheet, "Segments");
    }

    // Write the workbook to an .xlsx file and trigger download
    const baseName = video.file.name.toLowerCase().endsWith(".mp4")
      ? video.file.name.slice(0, -4)
      : video.file.name;
    XLSX.writeFile(workbook, `${baseName}_analysis.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Video Details - Metadata</h1>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 flex items-center gap-2"
          >
            <Download size={20} />
            Export Analysis
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel */}
            <div>
              <button
                onClick={() => navigate("/results")}
                className="mb-4 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft size={20} />
                Back to Results
              </button>

              {/* Video Player */}
              <div className="mb-6 bg-black rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                {video.videoUrl ? (
                  <video
                    src={video.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="text-white text-center p-4">
                    <AlertCircle size={32} className="mx-auto mb-2 text-yellow-400" />
                    <p className="text-sm font-medium">Playback URL Missing</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Backend must return presigned GET URL in <code>videoUrl</code> field
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      S3 URI: {video.videoS3Uri || "N/A"}
                    </p>
                  </div>
                )}
              </div>

              {/* Error Banner for FAILED state */}
              {video.status === "FAILED" && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">
                        Analysis Failed
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {video.error || "Unknown error occurred"}
                      </p>
                      {video.resultRaw && (
                        <>
                          <button
                            onClick={() => setShowRawResult(!showRawResult)}
                            className="text-xs text-red-700 underline mt-2"
                          >
                            {showRawResult ? "Hide" : "Show"} result preview
                          </button>
                          {showRawResult && (
                            <pre className="mt-2 p-2 bg-white border border-red-200 rounded text-xs overflow-auto max-h-64">
                              {video.resultRaw.length > 1000 
                                ? `${video.resultRaw.substring(0, 1000)}... (truncated, ${video.resultRaw.length} chars total)`
                                : video.resultRaw}
                            </pre>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Parse Error Warning */}
              {hasParseError && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-800">
                        Parse error: {video.resultParseError}
                      </p>
                      <button
                        onClick={() => setShowRawResult(!showRawResult)}
                        className="text-xs text-orange-700 underline mt-2"
                      >
                        {showRawResult ? "Hide" : "Show"} raw result
                      </button>
                      {showRawResult && video.resultRaw && (
                        <pre className="mt-2 p-2 bg-white border border-orange-200 rounded text-xs overflow-auto max-h-64">
                          {video.resultRaw.length > 1000 
                            ? `${video.resultRaw.substring(0, 1000)}... (truncated, ${video.resultRaw.length} chars total)`
                            : video.resultRaw}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Warning for DONE but no result */}
              {video.status === "DONE" && !video.resultRaw && !hasParseError && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">
                        DONE but no result received
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        The analysis completed but no result data was returned from the backend.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Information */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">Video Information</h2>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Title</p>
                    <p className="text-gray-600">
                      {video.metadata.title || video.file.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-gray-600">
                      {video.metadata.notes || videoSummary || "No description available"}
                    </p>
                  </div>
                  {videoSummary && (
                    <div>
                      <p className="text-sm font-medium">Video Summary</p>
                      <p className="text-gray-600">
                        {videoSummary}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Subject</p>
                    <p className="text-gray-600">
                      {video.metadata.tags?.[0] || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* File Information */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">File Information</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Duration</p>
                    <p className="font-medium">
                      {durationSeconds !== null
                        ? formatDuration(durationSeconds)
                        : "Loading..."}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">File Size</p>
                    <p className="font-medium">{formatFileSize(video.file.size)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Date</p>
                    <p className="font-medium">
                      {video.createdAt
                        ? new Date(video.createdAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Visual</p>
                    <p className="font-medium">Color</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Function</p>
                    <p className="font-medium">
                      {video.metadata["Function (manual input)"] || "Performance"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Video Tags */}
              {video.metadata.tags && video.metadata.tags.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Video Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {video.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm cursor-pointer hover:bg-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel */}
            <div>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                <button
                  onClick={() => setActiveTab("metadata")}
                  className={`px-4 py-2 font-medium ${
                    activeTab === "metadata"
                      ? "border-b-2 border-gray-800 text-gray-800"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Metadata
                </button>
                <button
                  onClick={() => setActiveTab("segments")}
                  className={`px-4 py-2 font-medium ${
                    activeTab === "segments"
                      ? "border-b-2 border-gray-800 text-gray-800"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Segments
                </button>
                <button
                  onClick={() => setActiveTab("uploader")}
                  className={`px-4 py-2 font-medium flex items-center gap-1 ${
                    activeTab === "uploader"
                      ? "border-b-2 border-gray-800 text-gray-800"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Uploader Provided
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "metadata" && (
                <div className="space-y-4">
                  {!video.resultParsed && !hasParseError ? (
                    <p className="text-gray-500 text-center py-8">
                      No analysis data available. Analysis may still be processing.
                    </p>
                  ) : (
                    <>
                      {/* Video Summary */}
                      {videoSummary && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h3 className="text-sm font-semibold text-blue-900 mb-2">Video Summary</h3>
                          <p className="text-sm text-blue-800">{videoSummary}</p>
                        </div>
                      )}
                      
                      {/* Who Section */}
                      {renderMetadataSection(
                        "Who",
                        Users,
                        segments,
                        expandedSections.has("Who")
                      )}

                      {/* Movement Section */}
                      {renderMetadataSection(
                        "Movement",
                        Activity,
                        segments,
                        expandedSections.has("Movement")
                      )}

                      {/* Effort Section */}
                      {renderMetadataSection(
                        "Effort",
                        Target,
                        segments,
                        expandedSections.has("Effort")
                      )}

                      {/* Body Section */}
                      {renderMetadataSection(
                        "Body",
                        User,
                        segments,
                        expandedSections.has("Body")
                      )}

                      {/* Rhythm Section */}
                      {renderMetadataSection(
                        "Rhythm",
                        Music,
                        segments,
                        expandedSections.has("Rhythm")
                      )}

                      {/* Where Section */}
                      {renderMetadataSection(
                        "Where",
                        MapPin,
                        segments,
                        expandedSections.has("Where")
                      )}

                      {/* When Section */}
                      {renderMetadataSection(
                        "When",
                        Calendar,
                        segments,
                        expandedSections.has("When")
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "segments" && (
                <div className="space-y-2">
                  {!video.resultParsed ? (
                    <p className="text-gray-500 text-center py-8">
                      {hasParseError 
                        ? "Parse error occurred. See error message above." 
                        : "No segments available. Analysis may still be processing."}
                    </p>
                  ) : segments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No segments available.
                    </p>
                  ) : (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-4">Segment ID</th>
                          <th className="text-left py-2 px-4">Start Time</th>
                          <th className="text-left py-2 px-4">End Time</th>
                          <th className="text-left py-2 px-4">Change Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {segments.map((segment) => (
                          <React.Fragment key={segment.segment_id}>
                            <tr
                              className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                              onClick={() =>
                                setExpandedSegment(
                                  expandedSegment === segment.segment_id
                                    ? null
                                    : segment.segment_id
                                )
                              }
                            >
                              <td className="py-2 px-4">{segment.segment_id}</td>
                              <td className="py-2 px-4">{segment.start_time || "N/A"}</td>
                              <td className="py-2 px-4">{segment.end_time || "N/A"}</td>
                              <td className="py-2 px-4">{segment.change_reason || "N/A"}</td>
                            </tr>
                            {expandedSegment === segment.segment_id && (
                              <tr>
                                <td colSpan={4} className="px-4 py-4 bg-gray-50">
                                  <div className="grid grid-cols-2 gap-4">
                                    {Object.entries(segment.fields)
                                      .filter(([, value]) => value !== null && value !== undefined)
                                      .map(([key, value]) => (
                                        <div key={key}>
                                          <span className="text-gray-600 font-medium">
                                            {key}:
                                          </span>{" "}
                                          <span>{value || "N/A"}</span>
                                        </div>
                                      ))}
                                    {Object.entries(segment.fields).filter(([, value]) => value !== null && value !== undefined).length === 0 && (
                                      <p className="text-gray-500 text-sm col-span-2">No fields available for this segment</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === "uploader" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Title</h3>
                    <p className="text-gray-600">
                      {video.metadata.title || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Country</h3>
                    <p className="text-gray-600">
                      {video.metadata.Country || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {video.metadata.tags && video.metadata.tags.length > 0 ? (
                        video.metadata.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-600">No tags provided</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Notes</h3>
                    <p className="text-gray-600">
                      {video.metadata.notes || "No notes provided"}
                    </p>
                  </div>
                  
                  {/* Raw Result Panel */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Raw Result</h3>
                      <button
                        onClick={() => setShowRawResult(!showRawResult)}
                        className="text-xs text-gray-600 hover:text-gray-800 underline"
                      >
                        {showRawResult ? "Hide" : "Show"}
                      </button>
                    </div>
                    {showRawResult && (
                      <div className="mt-2">
                        {video.resultRaw ? (
                          <pre className="p-3 bg-gray-50 border border-gray-200 rounded text-xs overflow-auto max-h-96">
                            {video.resultRaw.length > 5000 
                              ? `${video.resultRaw.substring(0, 5000)}...\n\n(truncated, ${video.resultRaw.length} characters total)`
                              : video.resultParsed 
                                ? JSON.stringify(video.resultParsed, null, 2)
                                : video.resultRaw}
                          </pre>
                        ) : (
                          <p className="text-gray-500 text-sm">No raw result available</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
