import { apiService } from "@/services/api.service";

/**
 * Searches for submissionId in a nested object structure
 */
function searchForSubmissionId(obj: any, depth = 0): string | null {
  if (depth > 5) return null; // Prevent infinite recursion
  if (!obj || typeof obj !== 'object') return null;
  
  if (obj.submissionId && typeof obj.submissionId === 'string') {
    return obj.submissionId;
  }
  
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const found = searchForSubmissionId(value, depth + 1);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Finds the first submissionIndicatorId in a nested data structure
 */
function findFirstSubmissionIndicatorId(data: any): string | null {
  if (!data || typeof data !== 'object') return null;
  
  // Check if it's an array
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findFirstSubmissionIndicatorId(item);
      if (found) return found;
    }
  } else {
    // Check if this object has submissionIndicatorId
    if (data.submissionIndicatorId && typeof data.submissionIndicatorId === 'string') {
      return data.submissionIndicatorId;
    }
    
    // Recursively search in nested objects
    for (const value of Object.values(data)) {
      if (typeof value === 'object' && value !== null) {
        const found = findFirstSubmissionIndicatorId(value);
        if (found) return found;
      }
    }
  }
  
  return null;
}

/**
 * Extracts submissionId from API response using multiple fallback strategies
 */
export async function extractSubmissionId(
  response: any,
  targetUserId: string,
  toast: (options: { title: string; description: string; variant: "destructive" | "default" }) => void
): Promise<string | null> {
  // Strategy 1: Direct property
  let actualSubmissionId = response.submissionId || null;
  
  console.log("🔍 Checking for submissionId in response:", {
    hasSubmissionId: !!response.submissionId,
    submissionId: response.submissionId,
    responseKeys: Object.keys(response || {}),
  });
  
  // Strategy 2: Search in nested structure
  if (!actualSubmissionId && response && typeof response === 'object') {
    actualSubmissionId = searchForSubmissionId(response);
    if (actualSubmissionId) {
      console.log("✅ Found submissionId in nested structure:", actualSubmissionId);
    }
  }
  
  if (actualSubmissionId) {
    console.log("📋 Using actual submission ID for file uploads:", actualSubmissionId);
    return actualSubmissionId;
  }
  
  // Strategy 3: Fetch from submission endpoint
  console.warn("⚠️ No submissionId in API response, trying to extract from data or fetch from endpoint...");
  
  try {
    const submissionResponse = await apiService.get(
      `/ministry/form/retrieve/submission/${targetUserId}`,
      { withCredentials: true }
    );
    const submissionData = submissionResponse.data;
    
    console.log("🔍 Submission endpoint response structure:", {
      isArray: Array.isArray(submissionData),
      type: typeof submissionData,
      hasSubmissionId: !!submissionData?.submissionId,
    });
    
    // Try multiple possible structures
    let fetchedSubmissionId = null;
    
    if (submissionData?.submissionId) {
      fetchedSubmissionId = submissionData.submissionId;
    } else if (submissionData?.submission?.id) {
      fetchedSubmissionId = submissionData.submission.id;
    } else if (submissionData?.id) {
      fetchedSubmissionId = submissionData.id;
    } else if (submissionData?.data?.submissionId) {
      fetchedSubmissionId = submissionData.data.submissionId;
    } else if (submissionData?.data?.id) {
      fetchedSubmissionId = submissionData.data.id;
    } else if (submissionData?.data?.submission?.id) {
      fetchedSubmissionId = submissionData.data.submission.id;
    }
    
    if (fetchedSubmissionId) {
      console.log("✅ Fetched submission ID from submission endpoint:", fetchedSubmissionId);
      return fetchedSubmissionId;
    }
    
    // Strategy 4: Extract from submissionIndicatorId
    console.warn("⚠️ No submissionId in API response. Extracting from submissionIndicatorId...");
    
    const firstSubmissionIndicatorId = findFirstSubmissionIndicatorId(response.data);
    
    if (firstSubmissionIndicatorId) {
      console.log("✅ Found submissionIndicatorId:", firstSubmissionIndicatorId);
      console.log("🔍 Querying backend to get submissionId from submissionIndicatorId...");
      
      try {
        const submissionIdResponse = await apiService.get(
          `/ministry/form/retrieve/submission-id-from-indicator/${firstSubmissionIndicatorId}`,
          { withCredentials: true }
        );
        
        const submissionIdData = submissionIdResponse.data;
        console.log("🔍 SubmissionId from indicator response:", submissionIdData);
        
        if (submissionIdData?.submissionId) {
          console.log("✅ Successfully extracted submissionId from submissionIndicatorId:", submissionIdData.submissionId);
          return submissionIdData.submissionId;
        } else {
          console.error("❌ submissionId not found in response from indicator endpoint");
          toast({
            title: "Error",
            description: "Could not extract submissionId from submissionIndicatorId.",
            variant: "destructive",
          });
        }
      } catch (queryError: any) {
        console.error("❌ Error querying submissionId from indicator:", queryError);
        console.error("❌ Backend is not returning submissionId in the API response!");
        
        toast({
          title: "Backend Configuration Issue",
          description: "Unable to retrieve submission ID. Please check the backend console logs and verify the service method is returning submissionId. The backend may need to be restarted or there may be a response interceptor issue.",
          variant: "destructive",
        });
      }
    } else {
      console.error("❌ Could not find submissionIndicatorId in response data");
      toast({
        title: "Error",
        description: "Could not extract submissionId from response.",
        variant: "destructive",
      });
    }
  } catch (fetchError: any) {
    console.error("❌ Error fetching submission ID:", fetchError);
    toast({
      title: "Error",
      description: "Failed to retrieve submission ID. The backend may need to be restarted. Please contact support.",
      variant: "destructive",
    });
  }
  
  return null;
}

