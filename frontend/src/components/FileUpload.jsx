"use client";

import React, { useState } from "react";
import { Upload } from "lucide-react";

export function FileUpload({ name, accept = "*", onFileSelect }) {
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect && onFileSelect(name, file);  // send name + file
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      onFileSelect && onFileSelect(name, file);  // send name + file
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
        name={name}
        accept={accept}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="flex flex-col items-center justify-center gap-2">
        <Upload className="w-8 h-8 text-muted-foreground" />

        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {fileName || "Click or drag file here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {fileName ? "File uploaded" : "Supported formats: .jpeg, .jpg, .png"}
          </p>
        </div>
      </div>
    </div>
  );
}
