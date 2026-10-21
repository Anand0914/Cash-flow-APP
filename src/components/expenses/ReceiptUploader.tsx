/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  X,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { uploadReceiptToDrive } from '../../services/googleDrive.ts';

interface ReceiptUploaderProps {
  receiptUrl?: string;
  receiptFileId?: string;
  receiptFileName?: string;
  onChange: (fileInfo: { fileId?: string; url?: string; fileName?: string }) => void;
  accessToken: string | null;
  driveFolderId?: string;
}

export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  receiptUrl,
  receiptFileId,
  receiptFileName,
  onChange,
  accessToken,
  driveFolderId,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(receiptUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB size limit.');
      return;
    }

    // Generate local data URL preview for image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLocalPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLocalPreview(null);
    }

    // If connected to Google Drive with valid OAuth token, upload to Drive
    if (accessToken) {
      try {
        setIsUploading(true);
        const result = await uploadReceiptToDrive(accessToken, file, driveFolderId);
        onChange({
          fileId: result.fileId,
          url: result.webViewLink,
          fileName: file.name,
        });
      } catch (err: any) {
        console.error('Drive upload failed:', err);
        setUploadError(err.message || 'Failed to upload to Google Drive.');
        // Fallback: save local data URL so receipt is not lost
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            onChange({
              url: event.target?.result as string,
              fileName: file.name,
            });
          };
          reader.readAsDataURL(file);
        }
      } finally {
        setIsUploading(false);
      }
    } else {
      // Local storage data URL fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({
          url: event.target?.result as string,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    setLocalPreview(null);
    setUploadError(null);
    onChange({ fileId: undefined, url: undefined, fileName: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Uploaded state */}
      {receiptUrl || localPreview ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            {localPreview && !localPreview.startsWith('http') ? (
              <img
                src={localPreview}
                alt="Receipt Preview"
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {receiptFileName || 'Receipt Attachment'}
              </p>
              <div className="flex items-center space-x-2 mt-0.5">
                {receiptFileId ? (
                  <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Saved in Google Drive
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Attached locally</span>
                )}
                {receiptUrl && receiptUrl.startsWith('http') && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[10px] text-blue-600 hover:underline gap-0.5 font-medium"
                  >
                    View <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Remove receipt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Empty upload button */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-4 text-center transition-all group"
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <p className="text-xs font-semibold text-slate-700">Uploading to Google Drive...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1 space-y-1.5">
              <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Click to attach bill receipt or voucher
              </p>
              <p className="text-[10px] text-slate-400">
                JPEG, PNG, WEBP or PDF (Max 10MB) • {accessToken ? 'Uploads to Google Drive' : 'Stores in record'}
              </p>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <div className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          {uploadError}
        </div>
      )}
    </div>
  );
};
