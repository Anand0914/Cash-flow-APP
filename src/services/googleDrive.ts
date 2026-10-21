/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DriveFolderInfo {
  id: string;
  name: string;
}

export interface UploadedReceiptResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
}

/**
 * Find or create dedicated "CashFlow Receipts" folder in user's Google Drive
 */
export async function getOrCreateReceiptsFolder(
  accessToken: string,
  folderName: string = 'CashFlow Receipts'
): Promise<DriveFolderInfo> {
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return { id: data.files[0].id, name: data.files[0].name };
    }
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${err}`);
  }

  const folder = await createRes.json();
  return { id: folder.id, name: folderName };
}

/**
 * Upload receipt image or document to Google Drive folder using multipart upload
 */
export async function uploadReceiptToDrive(
  accessToken: string,
  file: File,
  folderId?: string
): Promise<UploadedReceiptResult> {
  // Size limit check (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Receipt file exceeds maximum allowed size of 10MB');
  }

  // Ensure folder exists
  let targetFolderId = folderId;
  if (!targetFolderId) {
    const folder = await getOrCreateReceiptsFolder(accessToken);
    targetFolderId = folder.id;
  }

  const boundary = '-------CashFlowBoundary' + Math.random().toString(36).substring(2);
  const metadata = {
    name: `Receipt_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    parents: targetFolderId ? [targetFolderId] : [],
  };

  const fileBuffer = await file.arrayBuffer();

  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;
  const mediaHeader = `${delimiter}Content-Type: ${file.type || 'image/jpeg'}\r\n\r\n`;

  const encoder = new TextEncoder();
  const metadataPartBytes = encoder.encode(metadataPart);
  const mediaHeaderBytes = encoder.encode(mediaHeader);
  const closeDelimiterBytes = encoder.encode(closeDelimiter);

  const combinedLength =
    metadataPartBytes.byteLength +
    mediaHeaderBytes.byteLength +
    fileBuffer.byteLength +
    closeDelimiterBytes.byteLength;

  const combined = new Uint8Array(combinedLength);
  let offset = 0;

  combined.set(metadataPartBytes, offset);
  offset += metadataPartBytes.byteLength;

  combined.set(mediaHeaderBytes, offset);
  offset += mediaHeaderBytes.byteLength;

  combined.set(new Uint8Array(fileBuffer), offset);
  offset += fileBuffer.byteLength;

  combined.set(closeDelimiterBytes, offset);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combined,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive upload failed: ${errText}`);
  }

  const result = await res.json();
  return {
    fileId: result.id,
    fileName: metadata.name,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
  };
}
