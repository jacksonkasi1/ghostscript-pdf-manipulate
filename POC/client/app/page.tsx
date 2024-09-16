'use client';

import { useState } from 'react';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadLink, setDownloadLink] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setStatusMessage('');
      setDownloadLink(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatusMessage('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setStatusMessage('Uploading and processing the PDF...');
      
      const response = await fetch('https://5000-jacksonkasi-ghostscript-qjvvxfh2ect.ws-us116.gitpod.io/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process the PDF.');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      setDownloadLink(downloadUrl);
      setStatusMessage('PDF processed successfully! Click the link below to download the extracted text.');
    } catch (error) {
      console.error(error);
      setStatusMessage('An error occurred while processing the PDF.');
    }
  };

  return (
    <div className="container">
      <h1>Upload and Extract PDF Content</h1>
      <div className="form-group">
        <label htmlFor="fileUpload">Select PDF file:</label>
        <input type="file" accept="application/pdf" onChange={handleFileChange} id="fileUpload" />
      </div>

      <div className="form-group">
        <button onClick={handleUpload}>Upload and Extract</button>
      </div>

      {statusMessage && <p>{statusMessage}</p>}

      {downloadLink && (
        <div className="download-link">
          <a href={downloadLink} download="extracted_text.txt">Download Extracted Text</a>
        </div>
      )}
    </div>
  );
}
