import { apiService } from "./api.service";
import { config } from "@/config/environment";

// Helper to build full API URL
function getApiUrl(path: string) {
    const baseUrl = config.apiBaseUrl || "";
    return baseUrl ? `${baseUrl}${path}` : path;
}

// Fetch all ministries from the API
export async function getAllMinistries() {
    try {
        const url = getApiUrl("/ministries");
        try {
            const response = await apiService.get(url, { withCredentials: true });
            const data = response.data;
            if (Array.isArray(data?.data)) {
                return data.data;
            } else if (Array.isArray(data)) {
                return data;
            }
            return [];
        } catch (error) {
            console.error('[getAllMinistries] API Error:', error);
            return [];
        }
    } catch (error) {
        console.error('[getAllMinistries] API Error:', error);
        return [];
    }
}

// Fetch all ministryId values from the user table
export async function getAllAssignedMinistryIds() {
    try {
        const url = getApiUrl("/users");
        try {
            const response = await apiService.get(url);
            const data = response.data;
            const users = Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data)
                ? data
                : [];
             return users.map((user: any) => user.ministryId);
        } catch (error) {
            return [];
        }
    } catch (error) {
        return [];
    }

}
 
// Fetch indicators for ministry form creation
export async function getMinistryFormIndicators() {
    try {
        const url = getApiUrl("/ministry/form/create/indicators");
        const response = await apiService.get(url, { withCredentials: true });
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('[getMinistryFormIndicators] API Error:', error);
        return [];
    }
}


/**
 * Registers a ministry form for a Ministry Approver
 * @param userId - The user ID of the Ministry Approver
 * @param userRole - The role of the user (should be 'MINISTRY_APPROVER')
 * @param ministryId - The ministry ID
 * @returns Promise<any>
 */
export async function minstryRegistrationForm(userId: string, userRole: string, ministryId: string): Promise<any> {
    const url = getApiUrl("/ministry/form/create/form");

    const payload = {
        userId,
        userRole,
        ministryId,
    };
    try {
        const response = await apiService.post(url, payload, { withCredentials: true });
        // Try to return the most useful data
        return response.data?.data || response.data || response;
    } catch (error) {
        console.error('❌ Error in minstryRegistrationForm:', error);
        throw error;
    }
}


/**
 * Assign indicators to a nodal officer by a ministry approver
 * @param nodalUserId - The ID of the nodal officer
 * @param ministryUserId - The ID of the ministry approver
 * @param indicatorsId - Array of indicator IDs to assign
 */
export async function assignIndicatorsToNodal(
    nodalUserId: string,
    ministryUserId: string,
    indicatorsId: string[]
) {
    const url = getApiUrl("/ministry/form/create/assign-indicator-to-nodal");
    return apiService.post(
        url,
        {
            nodalUserId,
            ministryUserId,
            indicatorsId,
        },
        { withCredentials: true }
    );
}


// Fetch remaining indicators for ministry form creation for a specific user
export async function getRemainingMinistryIndicators(userId?: string) {
    try {
        let url = getApiUrl("/ministry/form/create/indicators");
        if (userId) {
            url += `?userId=${encodeURIComponent(userId)}`;
        }
        const response = await apiService.get(url, { withCredentials: true });
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error('[getRemainingMinistryIndicators] API Error:', error);
        return [];
    }
}

/**
 * Get ministry submission ID for a user (simpler endpoint)
 * @param userId - The ID of the user (Ministry Approver)
 * @returns Promise with submission ID
 */
export async function getMinistrySubmissionId(userId: string): Promise<string | null> {
    try {
        const url = getApiUrl(`/ministry/form/retrieve/submission/${userId}`);
        const response = await apiService.get(url, { withCredentials: true });
        const apiResponse = response.data;
        
        console.log('[getMinistrySubmissionId] Response structure:', {
            isArray: Array.isArray(apiResponse),
            type: typeof apiResponse,
            keys: apiResponse && typeof apiResponse === 'object' && !Array.isArray(apiResponse) ? Object.keys(apiResponse) : 'N/A',
            hasSubmissionId: !!apiResponse?.submissionId,
            submissionId: apiResponse?.submissionId,
            sampleData: Array.isArray(apiResponse) ? 'Array of ' + apiResponse.length + ' items' : apiResponse
        });
        
        // The simpler endpoint should return { status, data, message, submissionId }
        // But if backend hasn't been restarted, it might return just the data array
        if (apiResponse?.submissionId) {
            return apiResponse.submissionId;
        }
        if (apiResponse?.submission?.id) {
            return apiResponse.submission.id;
        }
        if (apiResponse?.id) {
            return apiResponse.id;
        }
        if (apiResponse?.data?.submissionId) {
            return apiResponse.data.submissionId;
        }
        if (apiResponse?.data?.id) {
            return apiResponse.data.id;
        }
        if (apiResponse?.data?.submission?.id) {
            return apiResponse.data.submission.id;
        }
        
        // If response is an array, backend hasn't been restarted with the new code
        if (Array.isArray(apiResponse)) {
            console.warn('[getMinistrySubmissionId] Response is an array - backend needs restart to return submissionId');
        }
        
        return null;
    } catch (error) {
        console.error('[getMinistrySubmissionId] API Error:', error);
        return null;
    }
}

/**
 * Retrieve submission details with indicators, subsections, and input fields
 * @param userId - The ID of the user (Ministry Approver)
 * @returns Promise with submission form structure
 */
export async function getMinistrySubmissionDetails(userId: string): Promise<{
    status: boolean;
    data: any[];
    message: string;
    submissionId?: string;
}> {
    try {
        const url = getApiUrl(`/ministry/form/retrieve/submission-with-data/${userId}`);
        const response = await apiService.get(url, { withCredentials: true });
        
        console.log('[getMinistrySubmissionDetails] Raw axios response:', {
            hasData: !!response.data,
            dataType: typeof response.data,
            isArray: Array.isArray(response.data),
            dataKeys: response.data && typeof response.data === 'object' && !Array.isArray(response.data) ? Object.keys(response.data) : 'N/A',
            fullResponse: response
        });
        
        // The API returns { status: true, data: [...], message: "...", submissionId: "..." }
        // response.data should be the entire object from the backend
        let apiResponse = response.data;
        
        // CRITICAL: Check if response.data is nested (some axios configurations nest it)
        if (apiResponse?.data && typeof apiResponse.data === 'object' && 'status' in apiResponse && Array.isArray(apiResponse.data)) {
            // This is the expected structure: { status, data: [...], message, submissionId }
            console.log('[getMinistrySubmissionDetails] Found nested structure with status');
        } else if (Array.isArray(apiResponse)) {
            // If response.data is directly an array, the backend response might be wrapped differently
            // Try to get the actual response from response.data or response
            console.warn('[getMinistrySubmissionDetails] Response.data is an array, checking for nested structure...');
            
            // Check if there's a nested response structure
            if (response?.data?.data && Array.isArray(response.data.data)) {
                apiResponse = response.data; // Use the outer object
                console.log('[getMinistrySubmissionDetails] Found nested data structure');
            }
        }
        
        // If the response has the expected structure
        if (apiResponse && typeof apiResponse === 'object' && !Array.isArray(apiResponse) && 'status' in apiResponse) {
            console.log('[getMinistrySubmissionDetails] API Response structure:', {
                hasStatus: 'status' in apiResponse,
                hasData: 'data' in apiResponse,
                hasSubmissionId: 'submissionId' in apiResponse,
                submissionId: apiResponse.submissionId,
                allKeys: Object.keys(apiResponse),
                fullResponse: JSON.stringify(apiResponse, null, 2)
            });
            
            // CRITICAL: Log the actual submissionId value
            if (apiResponse.submissionId) {
                console.log('[getMinistrySubmissionDetails] ✅ Found submissionId:', apiResponse.submissionId);
            } else {
                console.error('[getMinistrySubmissionDetails] ❌ submissionId is missing from API response!');
                console.error('[getMinistrySubmissionDetails] Response keys:', Object.keys(apiResponse));
                console.error('[getMinistrySubmissionDetails] Full response:', JSON.stringify(apiResponse, null, 2));
            }
            
            return {
                status: apiResponse.status ?? true,
                data: apiResponse.data || [],
                message: apiResponse.message || '',
                submissionId: apiResponse.submissionId // Include submissionId if available
            };
        }
        
        // Fallback: if response.data is directly the array
        if (Array.isArray(apiResponse)) {
            console.warn('[getMinistrySubmissionDetails] Response is directly an array, no submissionId available');
            console.warn('[getMinistrySubmissionDetails] This means the backend response structure is different than expected');
            console.warn('[getMinistrySubmissionDetails] Raw response.data:', response.data);
            return {
                status: true,
                data: apiResponse,
                message: 'Retrieved indicators for submission'
            };
        }
        
        // Fallback: if response.data.data exists
        if (apiResponse?.data && Array.isArray(apiResponse.data)) {
            console.log('[getMinistrySubmissionDetails] Nested data structure:', {
                hasSubmissionId: 'submissionId' in apiResponse,
                submissionId: apiResponse.submissionId
            });
            return {
                status: apiResponse.status ?? true,
                data: apiResponse.data,
                message: apiResponse.message || '',
                submissionId: apiResponse.submissionId // Check top level too
            };
        }
        
        console.error('[getMinistrySubmissionDetails] Unexpected response structure:', apiResponse);
        return { status: false, data: [], message: 'Unexpected response structure' };
    } catch (error) {
        console.error('[getMinistrySubmissionDetails] API Error:', error);
        throw error;
    }
}

/**
 * Upload files in section data to S3 and replace File objects with filePath
 * Similar to state submission flow
 */
async function uploadFilesInSectionData(
  sectionData: Record<string, any>,
  submissionId: string
): Promise<Record<string, any>> {
  if (!submissionId) {
    console.warn('⚠️ No submissionId provided, skipping file upload');
    return sectionData;
  }

  // Check if sectionData has any File objects
  const hasFiles = (obj: any, depth = 0): boolean => {
    if (depth > 20) return false;
    if (!obj || typeof obj !== 'object') return false;

    if (obj instanceof File) {
      return true;
    }

    // Check FileUpload objects: { file: File, fileName: string, ... }
    if (obj.file instanceof File && !obj.filePath) {
      return true;
    }

    if (Array.isArray(obj)) {
      return obj.some(item => hasFiles(item, depth + 1));
    }

    for (const value of Object.values(obj)) {
      if (hasFiles(value, depth + 1)) {
        return true;
      }
    }

    return false;
  };

  if (!hasFiles(sectionData)) {
    console.log('ℹ️ No File objects found in sectionData, skipping upload');
    return sectionData;
  }

  console.log('📤 Uploading files to S3 before submitting indicator...');

  // Recursively upload files and replace with filePath
  const uploadFilesAndReplace = async (
    data: any,
    path: string[] = []
  ): Promise<any> => {
    if (!data || typeof data !== 'object') return data;

    // Handle FileUpload objects with File instances (but no filePath yet)
    if (data.file instanceof File && !data.filePath) {
      try {
        const filePathStr = path.length > 0 ? ` at path: ${path.join('.')}` : '';
        console.log(`📤 Uploading file: ${data.fileName || data.file.name}${filePathStr}`);
        
        const uploadResponse = await apiService.uploadFile(submissionId, data.file);
        const fileData = uploadResponse?.data || uploadResponse;

        // Replace File object with filePath
        const uploaded = {
          ...data,
          file: null,
          filePath: fileData.filePath || fileData.data?.filePath,
          fileName: fileData.fileName || fileData.data?.fileName || data.fileName || data.file.name,
          originalName: data.file.name || data.originalName || fileData.originalName || fileData.data?.originalName || data.fileName,
          fileSize: fileData.size || fileData.fileSize || fileData.data?.size || data.fileSize || data.file.size,
          mimeType: fileData.mimeType || fileData.data?.mimeType || data.file.type,
          uploadedAt: Date.now(),
        };

        console.log(`✅ File uploaded successfully: ${uploaded.fileName} -> ${uploaded.filePath}`);
        return uploaded;
      } catch (error: any) {
        console.error(`❌ Failed to upload file ${data.fileName || data.file.name}:`, error);
        throw error;
      }
    }

    // Handle arrays (e.g., subsection arrays with file uploads)
    if (Array.isArray(data)) {
      const uploadedArray = await Promise.all(
        data.map((item, index) =>
          uploadFilesAndReplace(item, [...path, index.toString()])
        )
      );
      return uploadedArray;
    }

    // Handle nested objects
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = await uploadFilesAndReplace(value, [...path, key]);
    }
    return result;
  };

  try {
    const uploadedData = await uploadFilesAndReplace(sectionData);
    console.log('✅ All files uploaded to S3 successfully');
    return uploadedData;
  } catch (error: any) {
    console.error('❌ Failed to upload files to S3:', error);
    throw new Error(`File upload failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Transform form data to API format for ministry submission
 * @param sectionData - The form data for the specific section/indicator
 * @param currentSection - The section object from assignedIndicators containing inputs and subsections
 */
function transformFormDataToApiFormat(
  sectionData: Record<string, any>,
  currentSection: any
): { inputs: Array<{ inputId: string; value: any }>; subsection: Array<Array<{ inputId: string; value: any }>> } {
  const inputs: Array<{ inputId: string; value: any }> = [];
  const subsection: Array<Array<{ inputId: string; value: any }>> = [];

  // Process direct inputs
  if (currentSection.inputs && Array.isArray(currentSection.inputs)) {
    currentSection.inputs.forEach((inputField: any) => {
      const fieldId = inputField.id;
      const value = sectionData[fieldId];
      
      // Only include if value exists (not null, undefined, or empty string)
      if (value !== null && value !== undefined && value !== '') {
        inputs.push({
          inputId: fieldId,
          value: value,
        });
      }
    });
  }

  // Process subsections
  if (currentSection.subsection && Array.isArray(currentSection.subsection)) {
    currentSection.subsection.forEach((subsectionObj: any) => {
      const subsectionName = Object.keys(subsectionObj)[0];
      const subsectionData = subsectionObj[subsectionName];
      
      // Get subsection items from formData (array of objects)
      const subsectionItems = sectionData[subsectionName];
      
      if (Array.isArray(subsectionItems) && subsectionItems.length > 0) {
        subsectionItems.forEach((item: any) => {
          const subsectionInputs: Array<{ inputId: string; value: any }> = [];
          
          if (subsectionData.inputs && Array.isArray(subsectionData.inputs)) {
            subsectionData.inputs.forEach((inputField: any) => {
              const fieldId = inputField.id;
              const value = item[fieldId];
              
              // Only include if value exists
              if (value !== null && value !== undefined && value !== '') {
                subsectionInputs.push({
                  inputId: fieldId,
                  value: value,
                });
              }
            });
          }
          
          // Only add subsection entry if it has inputs
          if (subsectionInputs.length > 0) {
            subsection.push(subsectionInputs);
          }
        });
      }
    });
  }

  return { inputs, subsection };
}

/**
 * Submit an indicator to Ministry Approver
 * @param submissionIndicatorId - The submission indicator ID
 * @param sectionData - The form data for the specific section/indicator
 * @param currentSection - The section object from assignedIndicators containing inputs and subsections
 * @param submissionId - The ministry submission ID (for file uploads)
 */
export async function submitIndicatorToMinistryApprover(
  submissionIndicatorId: string,
  sectionData: Record<string, any>,
  currentSection: any,
  submissionId?: string // Add submissionId parameter
): Promise<any> {
  try {
    // Step 1: Upload files to S3 if any exist
    let processedSectionData = sectionData;
    if (submissionId && submissionId !== "exists") {
      try {
        processedSectionData = await uploadFilesInSectionData(sectionData, submissionId);
      } catch (error: any) {
        console.error('❌ Error uploading files:', error);
        throw new Error(`File upload failed: ${error.message || 'Unknown error'}`);
      }
    } else if (submissionId === "exists") {
      // CRITICAL: Don't allow file uploads with "exists" placeholder
      console.error('❌ Invalid submissionId: "exists" - cannot upload files');
      throw new Error('Invalid submission ID. Please refresh the page to get the correct submission ID.');
    } else {
      console.warn('⚠️ No submissionId provided, files will not be uploaded');
      throw new Error('Submission ID is required for file uploads. Please refresh the page.');
    }

    const url = getApiUrl(`/ministry/form/submission/data`);
    
    // Step 2: Transform form data to API format (after files are uploaded)
    const transformedData = transformFormDataToApiFormat(processedSectionData, currentSection);
    
    const payload = {
      submissionIndicatorId,
      data: transformedData,
    };

    console.log("📤 Submitting indicator to Ministry Approver:", {
      submissionIndicatorId,
      payload,
    });

    const response = await apiService.post(url, payload, { withCredentials: true });
    return response.data?.data || response.data || response;
  } catch (error) {
    console.error('❌ Error in submitIndicatorToMinistryApprover:', error);
    throw error;
  }
}
