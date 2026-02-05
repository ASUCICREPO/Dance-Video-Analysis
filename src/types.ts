export type VideoStatus = 
  | "READY" 
  | "CREATING_JOB" 
  | "UPLOADING" 
  | "WAITING_FOR_UPLOAD"
  | "PROCESSING" 
  | "DONE" 
  | "FAILED";

export type JobStatus = 
  | "WAITING_FOR_UPLOAD" 
  | "PROCESSING" 
  | "DONE" 
  | "FAILED";

export interface VideoMetadata {
  title?: string;
  tags?: string[];
  Country?: string;
  notes?: string;
  location?: string;
  "Region (manual input)"?: string;
  "Function (manual input)"?: string;
}

export interface Video {
  localId: string;
  file: File;
  metadata: VideoMetadata;
  jobId?: string;
  uploadUrl?: string;
  status: VideoStatus;
  error?: string;
  resultRaw?: string;
  resultParsed?: AnalysisResult;
  resultParseError?: string; // Store parse error if JSON parsing fails
  videoS3Uri?: string;
  videoUrl?: string; // Optional presigned GET URL for video playback
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateJobRequest {
  metadata?: VideoMetadata;
}

export interface CreateJobResponse {
  jobId: string;
  uploadUrl: string;
  s3Key: string;
}

export interface JobResponse {
  jobId: string;
  status: JobStatus;
  videoS3Uri: string;
  videoUrl?: string; // Optional presigned GET URL for video playback
  metadata: VideoMetadata;
  result: string | AnalysisResult | null; // Can be JSON string OR parsed object OR null
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisResult {
  video_summary: string;
  segments: Segment[];
}

export interface Segment {
  segment_id: number;
  start_time: string;
  end_time: string;
  change_reason: string;
  fields: Record<string, string | null>; // Fields can be null
}
