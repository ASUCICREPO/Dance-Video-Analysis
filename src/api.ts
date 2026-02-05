import type { VideoMetadata, CreateJobResponse, JobResponse } from "./types";

// Use proxy in development to avoid CORS issues, direct URL in production
const BASE_URL = import.meta.env.DEV 
  ? "/api" 
  : "https://700i2s66u9.execute-api.us-west-2.amazonaws.com/prod";

export async function createJob(metadata?: VideoMetadata): Promise<CreateJobResponse> {
  // Ensure metadata is always an object (even if empty) to match API format
  const requestBody = {
    metadata: metadata || {},
  };

  const response = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to create job: ${response.statusText}`);
  }

  return response.json();
}

export async function uploadVideo(uploadUrl: string, file: File): Promise<void> {
  // Try fetch first, with better error handling
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload video: ${response.statusText} (${response.status})`);
    }
    
    return;
  } catch (error) {
    // If it's a CORS error, provide helpful message
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "CORS Error: The S3 bucket needs CORS configuration. " +
        "Please configure the S3 bucket 'dance-video-analyzer-uploads' with the following CORS policy:\n\n" +
        "AllowedOrigins: * (or your specific domain)\n" +
        "AllowedMethods: PUT, POST\n" +
        "AllowedHeaders: Content-Type, x-amz-*\n" +
        "ExposeHeaders: ETag\n" +
        "MaxAgeSeconds: 3000"
      );
    }
    throw error;
  }
}

export async function getJobStatus(jobId: string): Promise<JobResponse> {
  const response = await fetch(`${BASE_URL}/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`);
  }

  return response.json();
}
