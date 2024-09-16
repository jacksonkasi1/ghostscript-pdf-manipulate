import { useState } from "react";

import "../App.css";

import { _extractPDFText } from "../lib/background.js";
import React from "react";

export function ExtractContent() {
  const [state, setState] = useState("init"); // Possible states: init, selected, loading, textExtracted, error
  const [file, setFile] = useState({
    filename: '',
    url: ''
  });
  const [extractedText, setExtractedText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState({ inProgress: false, current: 0, total: 0 });

  // Extract text from the selected PDF
  function extractPDFText(pdf) {
    const dataObject = { pdfDataURL: pdf };
    setState("loading");
    setStatusMessage("Extracting text from PDF...");
    _extractPDFText(
      dataObject,
      (element) => {
        setState("textExtracted");
        setExtractedText(element.text);
        setStatusMessage("Text extraction complete!");
      },
      (isComplete, current, total) => {
        setProgress({ inProgress: !isComplete, current, total });
      },
      (element) => {
        console.log("Status Update:", element);
        setStatusMessage(element);
      }
    );
  }

  const changeHandler = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      const url = window.URL.createObjectURL(uploadedFile);
      setFile({ filename: uploadedFile.name || 'NaN', url });
      setState("selected");
      setExtractedText("");
      setStatusMessage("");
    }
  };

  const onExtractText = (event) => {
    event.preventDefault();
    if (file) {
      const { url } = file;
      extractPDFText(url);
    } else {
      setState("error");
      setStatusMessage("Please select a file.");
    }
    return false;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText).then(() => {
      alert("Copied to clipboard!");
    });
  };

  return (
    <div className="container">
      <h1>PDF Processor</h1>
      <form className="form">
        <div className="form-group">
          <label htmlFor="file">Choose PDF to process:</label>
          <input
            type="file"
            accept="application/pdf"
            name="file"
            onChange={changeHandler}
            id="file"
            className="file-input"
            required
          />
          <div className="file-label">
            {file && file.filename ? file.filename : "No file chosen"}
          </div>
        </div>

        <div className="form-group">
          <button onClick={onExtractText} className="button">
            📝 Extract Text from PDF 📝
          </button>
        </div>
      </form>

      {state === "loading" && (
        <div className="status">
          <p>{statusMessage}</p>
          {progress.inProgress && <progress value={progress.current} max={progress.total}></progress>}
        </div>
      )}

      {state === "textExtracted" && extractedText && (
        <div className="text-extracted-section">
          <h3>Extracted Text:</h3>
          <textarea
            className="extracted-text"
            value={extractedText}
            readOnly
          ></textarea>
          <button onClick={copyToClipboard} className="copy-button">
            📋 Copy to Clipboard
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="error">
          <p>{statusMessage}</p>
        </div>
      )}
    </div>
  );
}
