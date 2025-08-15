import React, { useCallback, useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { MAX_FILE_SIZE_BYTES, ACCEPTED_FILE_TYPES } from "../constants";

interface FileUploaderProps {
  onFileAccepted: (file: File | null) => void; // Changed to allow null
  acceptedFileTypes?: string;
  maxFileSize?: number; // in bytes
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFileAccepted,
  acceptedFileTypes = ACCEPTED_FILE_TYPES,
  maxFileSize = MAX_FILE_SIZE_BYTES,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (!isDragging) setIsDragging(true);
      setError(null);
    },
    [isDragging],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
    },
    [isDragging],
  );

  const validateAndAcceptFile = useCallback(
    (file: File) => {
      setError(null);
      setUploadedFile(null);
      setIsVerifying(true);

      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      const acceptedTypesArray = acceptedFileTypes
        .split(",")
        .map((t) => t.trim());
      let validationError: string | null = null;

      if (!acceptedTypesArray.includes(fileExtension)) {
        validationError = `Invalid file type. Please upload: ${acceptedTypesArray.join(", ")}.`;
      } else if (file.size > maxFileSize) {
        validationError = `File is too large. Max size is ${maxFileSize / (1024 * 1024)}MB.`;
      }

      setTimeout(() => {
        setIsVerifying(false);
        if (validationError) {
          setError(validationError);
          onFileAccepted(null); // Pass null on error
        } else {
          setUploadedFile(file);
          onFileAccepted(file);
        }
      }, 300);
    },
    [onFileAccepted, acceptedFileTypes, maxFileSize],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        validateAndAcceptFile(files[0]);
      }
    },
    [validateAndAcceptFile],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndAcceptFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setError(null);
    setIsVerifying(false);
    onFileAccepted(null); // Pass null on removal
  };

  const renderDropzoneContent = () => {
    if (isVerifying) {
      return (
        <div className="flex flex-col items-center text-[var(--text-secondary)]">
          <Loader2
            size={48}
            className="mx-auto mb-3 animate-spin text-[var(--primary-accent-start)]"
          />
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            Verifying file...
          </p>
        </div>
      );
    }
    return (
      <label
        htmlFor="fileUploadInput"
        className="cursor-pointer flex flex-col items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
      >
        <UploadCloud
          size={52}
          className={`mx-auto mb-4 transition-transform duration-200 ${isDragging ? "scale-110 text-[var(--primary-accent-start)]" : "text-[var(--text-muted)]"}`}
        />
        <p className="text-xl font-semibold text-[var(--text-primary)]">
          Drag & drop your Excel file
        </p>
        <p className="text-sm">
          or{" "}
          <span className="text-[var(--primary-accent-start)] font-medium">
            click to browse
          </span>
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Supports: {acceptedFileTypes.replace(/,/g, ", ")} (Max{" "}
          {maxFileSize / (1024 * 1024)}MB)
        </p>
      </label>
    );
  };

  return (
    <div className="w-full">
      {uploadedFile &&
      Object.keys(uploadedFile).length > 0 &&
      !isVerifying &&
      !error ? (
        <div className="p-6 rounded-xl text-center border-2 border-dashed border-[var(--success-border)] bg-[var(--success-start)]/10 transition-all duration-300">
          <FileText
            size={40}
            className="mx-auto text-[var(--success-text)] mb-2"
          />
          <p
            className="text-md font-semibold text-[var(--text-primary)] truncate px-4"
            title={uploadedFile.name}
          >
            {uploadedFile.name}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            {(uploadedFile.size / 1024).toFixed(2)} KB
          </p>
          <button
            onClick={removeFile}
            className="text-[var(--danger-text)] hover:text-[var(--danger-start)] flex items-center justify-center mx-auto transition-colors text-sm py-1.5 px-3.5 rounded-md hover:bg-[var(--danger-start)]/10"
            title="Remove file"
          >
            <XCircle size={18} className="mr-1.5" /> Remove File
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`p-10 rounded-xl text-center cursor-pointer transition-all duration-300
            border-2 border-dashed 
            ${
              isDragging
                ? "border-[var(--primary-accent-start)] ring-2 ring-[var(--primary-accent-start)]/30 bg-[var(--primary-accent-start)]/5"
                : error
                  ? "border-[var(--danger-border)] bg-[var(--danger-start)]/5"
                  : "border-[var(--border-color)] hover:border-[var(--border-color-light)] bg-[var(--bg-main)] hover:bg-[var(--input-bg)]"
            }
            ${isVerifying ? "border-[var(--primary-accent-start)] bg-[var(--primary-accent-start)]/5" : ""}
            `}
        >
          <input
            type="file"
            id="fileUploadInput"
            ref={fileInputRef}
            className="hidden"
            accept={acceptedFileTypes}
            onChange={handleFileChange}
            aria-label="File upload input"
          />
          {renderDropzoneContent()}
        </div>
      )}
      {error && !isVerifying && (
        <div className="mt-4 p-3.5 flex items-center text-sm text-[var(--danger-text)] bg-[var(--danger-start)]/10 border border-[var(--danger-border)]/50 rounded-lg">
          <AlertTriangle
            size={20}
            className="mr-2.5 text-[var(--danger-text)] flex-shrink-0"
          />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
