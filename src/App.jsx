// App.jsx

import { useState } from "react";
import "./App.css";
import { _processPDF } from "./lib/background.js";
import { ExtractContent } from "./Component/ExtractContent";

function loadPDFData(response, filename) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", response.pdfDataURL);
    xhr.responseType = "arraybuffer";
    xhr.onload = function () {
      window.URL.revokeObjectURL(response.pdfDataURL);
      const blob = new Blob([xhr.response], { type: "application/pdf" });
      const pdfURL = window.URL.createObjectURL(blob);
      resolve({ pdfURL });
    };
    xhr.send();
  });
}

function App() {
  const [state, setState] = useState("init"); // Possible states: init, selected, loading, toBeDownloaded, error
  const [file, setFile] = useState(undefined);
  const [downloadLink, setDownloadLink] = useState(undefined);
  const [conversionType, setConversionType] = useState("compress"); // Default to 'compress'
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState({ inProgress: false, current: 0, total: 0 });

  /**
   * Processes the selected PDF based on the chosen conversion type.
   *
   * @param {string} pdf - The URL of the PDF to process.
   * @param {string} filename - The original filename of the PDF.
   */
  function processPDF(pdf, filename) {
    const dataObject = { pdfDataURL: pdf };
    setState("loading");
    setStatusMessage("Processing PDF...");
    _processPDF(
      conversionType,
      dataObject,
      (element) => {
        console.log(element);
        setState("toBeDownloaded");
        loadPDFData(element, filename).then(({ pdfURL }) => {
          setDownloadLink(pdfURL);
          setStatusMessage("Processing complete!");
        }).catch((err) => {
          console.error(err);
          setState("error");
          setStatusMessage("Failed to load processed PDF.");
        });
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
      setFile({ filename: uploadedFile.name, url });
      setState("selected");
      setDownloadLink(undefined);
      setStatusMessage("");
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (file && conversionType) {
      const { filename, url } = file;
      processPDF(url, filename);
    } else {
      setState("error");
      setStatusMessage("Please select a file and conversion type.");
    }
    return false;
  };

  const getOutputFileName = () => {
    if (file && file.filename) {
      const baseName = file.filename.replace(/\.pdf$/i, "");
      switch (conversionType) {
        case "compress":
          return `${baseName}-compressed.pdf`;
        case "grayscale":
          return `${baseName}-grayscale.pdf`;
        case "cmyk":
          return `${baseName}-cmyk.pdf`;
        default:
          return `${baseName}-processed.pdf`;
      }
    }
    return "processed.pdf";
  };

  return (
    <div className="container">
      <h1>Browser-side PDF Processor</h1>
      <p>
        This tool allows you to <strong>compress</strong>, <strong>convert to grayscale</strong>, or <strong>convert to CMYK</strong> your PDF files directly in your browser using <a target="_blank" href="https://ghostscript.com/">Ghostscript</a> and <a target="_blank" href="https://webassembly.org/">WebAssembly</a>.
      </p>

      <ExtractContent />

      <form onSubmit={onSubmit} className="form">
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
          <label htmlFor="conversionType">Select Operation:</label>
          <select
            id="conversionType"
            value={conversionType}
            onChange={(e) => setConversionType(e.target.value)}
            className="dropdown"
          >
            <option value="compress">Compress PDF</option>
            <option value="grayscale">Convert to Grayscale</option>
            <option value="cmyk">Convert to CMYK</option>
          </select>
        </div>
        <div className="form-group">
          <button type="submit" className="button">
            {conversionType === "compress" && "🚀 Compress PDF 🚀"}
            {conversionType === "grayscale" && "🔄 Convert to Grayscale 🔄"}
            {conversionType === "cmyk" && "🔄 Convert to CMYK 🔄"}
          </button>
        </div>
      </form>
      {state === "loading" && (
        <div className="status">
          <p>{statusMessage}</p>
          {progress.inProgress && (
            <progress value={progress.current} max={progress.total}></progress>
          )}
        </div>
      )}
      {state === "toBeDownloaded" && downloadLink && (
        <div className="download-section">
          <a href={downloadLink} download={getOutputFileName()} className="download-button">
            📥 Download {getOutputFileName()} 📥
          </a>
          <a href="./" className="reset-button">
            🔁 Process Another PDF 🔁
          </a>
        </div>
      )}
      {state === "error" && (
        <div className="error">
          <p>{statusMessage}</p>
        </div>
      )}
      <footer>
        <p>
          Everything is open-source and you can contribute{" "}
          <a
            href="https://github.com/laurentmmeyer/ghostscript-pdf-processor.wasm"
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </a>
          .
        </p>
        <p>
          <i>This website uses no tracking, no cookies, no adtech.</i>
        </p>
        <p>
          <a target="_blank" href="https://meyer-laurent.com">
            About me
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
