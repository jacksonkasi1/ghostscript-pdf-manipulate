// app/page.tsx

'use client';

import { useState } from "react";
import { processPDF, Operation, DataStruct, ResponseElement } from "../lib/background";
import Head from "next/head";

interface FileState {
  filename: string;
  url: string;
}

interface ProgressState {
  inProgress: boolean;
  current: number;
  total: number;
}

export default function Home() {
  const [state, setState] = useState<"init" | "selected" | "loading" | "toBeDownloaded" | "error">("init");
  const [file, setFile] = useState<FileState | undefined>(undefined);
  const [downloadLink, setDownloadLink] = useState<string | undefined>(undefined);
  const [conversionType, setConversionType] = useState<Operation>("compress"); // Default to 'compress'
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [progress, setProgress] = useState<ProgressState>({ inProgress: false, current: 0, total: 0 });

  /**
   * Loads the processed PDF data.
   *
   * @param {ResponseElement} response - The response containing the processed PDF URL.
   * @param {string} filename - The original filename of the PDF.
   * @returns {Promise<{ pdfURL: string }>}
   */
  async function loadPDFData(response: ResponseElement, filename: string): Promise<{ pdfURL: string }> {
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
      xhr.onerror = function () {
        reject(new Error("Failed to load processed PDF."));
      };
      xhr.send();
    });
  }

  /**
   * Processes the selected PDF based on the chosen conversion type.
   *
   * @param {string} pdf - The URL of the PDF to process.
   * @param {string} filename - The original filename of the PDF.
   */
  function handleProcessPDF(pdf: string, filename: string) {
    const dataObject: DataStruct = { pdfDataURL: pdf };
    setState("loading");
    setStatusMessage("Processing PDF...");
    processPDF(
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
      (message) => {
        console.log("Status Update:", message);
        setStatusMessage(message);
      }
    );
  }

  /**
   * Handles file selection.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event.
   */
  const changeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      const url = window.URL.createObjectURL(uploadedFile);
      setFile({ filename: uploadedFile.name, url });
      setState("selected");
      setDownloadLink(undefined);
      setStatusMessage("");
    }
  };

  /**
   * Handles form submission.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submit event.
   */
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (file && conversionType) {
      const { filename, url } = file;
      handleProcessPDF(url, filename);
    } else {
      setState("error");
      setStatusMessage("Please select a file and conversion type.");
    }
  };

  /**
   * Generates the output filename based on the conversion type.
   *
   * @returns {string} - The output filename.
   */
  const getOutputFileName = (): string => {
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
    <>
      <Head>
        <title>Browser-side PDF Processor</title>
        <meta name="description" content="Compress, convert to grayscale, or convert to CMYK your PDF files directly in your browser using Ghostscript and WebAssembly." />
      </Head>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Browser-side PDF Processor</h1>
        <p className="mb-6">
          This tool allows you to <strong>compress</strong>, <strong>convert to grayscale</strong>, or <strong>convert to CMYK</strong> your PDF files directly in your browser using <a href="https://ghostscript.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Ghostscript</a> and <a href="https://webassembly.org/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">WebAssembly</a>.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="form-group">
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">Choose PDF to process:</label>
            <input
              type="file"
              accept="application/pdf"
              name="file"
              onChange={changeHandler}
              id="file"
              className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none"
              required
            />
            <div className="mt-2 text-sm text-gray-500">
              {file && file.filename ? file.filename : "No file chosen"}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="conversionType" className="block text-sm font-medium text-gray-700">Select Operation:</label>
            <select
              id="conversionType"
              value={conversionType}
              onChange={(e) => setConversionType(e.target.value as Operation)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="compress">Compress PDF</option>
              <option value="grayscale">Convert to Grayscale</option>
              <option value="cmyk">Convert to CMYK</option>
            </select>
          </div>
          <div className="form-group">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            >
              {conversionType === "compress" && "🚀 Compress PDF 🚀"}
              {conversionType === "grayscale" && "🔄 Convert to Grayscale 🔄"}
              {conversionType === "cmyk" && "🔄 Convert to CMYK 🔄"}
            </button>
          </div>
        </form>
        {state === "loading" && (
          <div className="mt-6">
            <p className="text-gray-700">{statusMessage}</p>
            {progress.inProgress && (
              <progress className="w-full mt-2" value={progress.current} max={progress.total}></progress>
            )}
          </div>
        )}
        {state === "toBeDownloaded" && downloadLink && (
          <div className="mt-6 space-y-4">
            <a
              href={downloadLink}
              download={getOutputFileName()}
              className="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              📥 Download {getOutputFileName()} 📥
            </a>
            <a
              href="/"
              className="block w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700"
            >
              🔁 Process Another PDF 🔁
            </a>
          </div>
        )}
        {state === "error" && (
          <div className="mt-6">
            <p className="text-red-600">{statusMessage}</p>
          </div>
        )}
        <footer className="mt-12 text-center text-gray-500">
          <p>
            Everything is open-source and you can contribute{" "}
            <a
              href="https://github.com/laurentmmeyer/ghostscript-pdf-processor.wasm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              here
            </a>.
          </p>
          <p className="mt-2">
            <i>This website uses no tracking, no cookies, no adtech.</i>
          </p>
          <p className="mt-2">
            <a href="https://meyer-laurent.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              About me
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
