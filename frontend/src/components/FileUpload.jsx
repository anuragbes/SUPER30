"use client";

import React, { useState } from "react";
import { Upload } from "lucide-react";

export function FileUpload({ id, name, accept = "image/jpeg,image/jpg,image/png,image/webp", onFileSelect, file }) {
  const [isDragging, setIsDragging] = useState(false);

  // Derive the display name purely from the prop
  const displayFileName = file?.name || "";

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect && onFileSelect(name, selectedFile);
    }
    // Always clear the input value so the same file can be selected again
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) {
      onFileSelect && onFileSelect(name, selectedFile);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={() => setIsDragging(false)}
      className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
    >
      <input
        type="file"
        id={id}
        name={name}
        accept={accept}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="flex flex-col items-center justify-center gap-2">
        <Upload className="w-8 h-8 text-muted-foreground" />

        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {displayFileName || "Click or drag file here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {displayFileName ? "File selected" : "JPEG, PNG or WebP • Max 5 MB"}
          </p>
        </div>
      </div>
    </div>
  );
}
