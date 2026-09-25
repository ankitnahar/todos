import { useRef, useState } from 'react';
import { Upload, X, File } from 'lucide-react';
import clsx from 'clsx';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
}

export function FileUpload({
  onUpload,
  accept,
  multiple = true,
  maxSize = 10 * 1024 * 1024,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter((file) => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Max size is ${maxSize / 1024 / 1024}MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemove = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
      setSelectedFiles([]);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full">
      <div
        className={clsx(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          accept={accept}
          multiple={multiple}
          className="hidden"
        />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Max file size: {maxSize / 1024 / 1024}MB
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              onClick={handleUpload}
              className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              Upload All
            </button>
          </div>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(index)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
