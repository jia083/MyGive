/**
 * IPFS Upload Utility using Pinata
 *
 * This utility handles uploading files to IPFS via Pinata service.
 * Files (images, PDFs, documents) are stored permanently on IPFS and can be accessed via gateway URLs.
 */

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

/**
 * Upload an image file to IPFS using Pinata
 * @param {File} file - Image file to upload
 * @returns {Promise<{success: boolean, ipfsHash?: string, gatewayUrl?: string, error?: string}>}
 */
export async function uploadImageToIPFS(file) {
  try {
    // Validate file
    const validationError = validateImageFile(file);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        platform: 'MyGive',
        type: 'resource-image'
      }
    });
    formData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.details || 'Failed to upload to Pinata');
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;
    const gatewayUrl = `${PINATA_GATEWAY}${ipfsHash}`;

    return {
      success: true,
      ipfsHash: ipfsHash,
      gatewayUrl: gatewayUrl,
    };

  } catch (error) {
    console.error('IPFS upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload image to IPFS'
    };
  }
}

/**
 * Validate image file before upload
 * @param {File} file - File to validate
 * @returns {string|null} Error message or null if valid
 */
function validateImageFile(file) {
  // Check if file exists
  if (!file) {
    return 'No file provided';
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return 'File size exceeds 5MB limit';
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images.';
  }

  return null;
}

/**
 * Get IPFS gateway URL from hash
 * @param {string} ipfsHash - IPFS hash
 * @returns {string} Full gateway URL
 */
export function getIPFSGatewayUrl(ipfsHash) {
  if (!ipfsHash) return '';

  // If it's already a full URL, return as is
  if (ipfsHash.startsWith('http')) {
    return ipfsHash;
  }

  // If it's an ipfs:// URI, extract the hash
  if (ipfsHash.startsWith('ipfs://')) {
    ipfsHash = ipfsHash.replace('ipfs://', '');
  }

  return `${PINATA_GATEWAY}${ipfsHash}`;
}

/**
 * Check if Pinata is configured
 * @returns {boolean} True if Pinata JWT is configured
 */
export function isPinataConfigured() {
  return !!process.env.NEXT_PUBLIC_PINATA_JWT;
}

/**
 * Upload a PDF document to IPFS using Pinata
 * @param {Blob} pdfBlob - PDF blob to upload
 * @param {string} filename - Filename for the PDF
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<{success: boolean, ipfsHash?: string, gatewayUrl?: string, error?: string}>}
 */
export async function uploadDocumentToIPFS(pdfBlob, filename, metadata = {}) {
  try {
    // Validate blob
    if (!pdfBlob) {
      return { success: false, error: 'No document provided' };
    }

    // Check file size (max 10MB for documents)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (pdfBlob.size > maxSize) {
      return { success: false, error: 'Document size exceeds 10MB limit' };
    }

    // Create File from Blob
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const pinataMetadata = JSON.stringify({
      name: filename,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        platform: 'MyGive',
        type: 'report-document',
        ...metadata
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.details || 'Failed to upload document to Pinata');
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;
    const gatewayUrl = `${PINATA_GATEWAY}${ipfsHash}`;

    return {
      success: true,
      ipfsHash: ipfsHash,
      gatewayUrl: gatewayUrl,
    };

  } catch (error) {
    console.error('IPFS document upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload document to IPFS'
    };
  }
}

/**
 * Upload JSON data to IPFS using Pinata
 * @param {Object} jsonData - JSON data to upload
 * @param {string} filename - Filename for the JSON
 * @returns {Promise<{success: boolean, ipfsHash?: string, gatewayUrl?: string, error?: string}>}
 */
export async function uploadJSONToIPFS(jsonData, filename = 'data.json') {
  try {
    if (!jsonData) {
      return { success: false, error: 'No data provided' };
    }

    // Convert JSON to Blob
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], filename, { type: 'application/json' });

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: filename,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        platform: 'MyGive',
        type: 'json-data'
      }
    });
    formData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.details || 'Failed to upload JSON to Pinata');
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;
    const gatewayUrl = `${PINATA_GATEWAY}${ipfsHash}`;

    return {
      success: true,
      ipfsHash: ipfsHash,
      gatewayUrl: gatewayUrl,
    };

  } catch (error) {
    console.error('IPFS JSON upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload JSON to IPFS'
    };
  }
}
