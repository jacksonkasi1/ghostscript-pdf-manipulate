// lib/background.ts

export type Operation = 'compress' | 'grayscale' | 'cmyk';

export interface DataStruct {
  pdfDataURL: string;
  url?: string;
}

export interface ResponseElement {
  pdfDataURL: string;
  url?: string;
}

type ResponseCallback = (response: ResponseElement) => void;
type ProgressCallback = (isComplete: boolean, current: number, total: number) => void;
type StatusUpdateCallback = (message: string) => void;

declare global {
  interface Window {
    FS: any;
    Module: any;
  }
}

let Module: any;

/**
 * Dynamically loads the Ghostscript WebAssembly script.
 */
async function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/gs.js'; // Load from public folder
    script.async = true;

    script.onload = () => {
      console.log('Ghostscript loaded successfully.');
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Ghostscript.'));
    };

    document.body.appendChild(script);
  });
}

/**
 * Processes a PDF based on the selected operation.
 *
 * @param {Operation} operation - The operation to perform: 'compress', 'grayscale', or 'cmyk'.
 * @param {DataStruct} dataStruct - Contains the PDF data URL.
 * @param {ResponseCallback} responseCallback - Called with the response containing the processed PDF URL.
 * @param {ProgressCallback} progressCallback - Called to report progress.
 * @param {StatusUpdateCallback} statusUpdateCallback - Called to report status updates.
 */
export async function processPDF(
  operation: Operation,
  dataStruct: DataStruct,
  responseCallback: ResponseCallback,
  progressCallback: ProgressCallback,
  statusUpdateCallback: StatusUpdateCallback
) {
  const ghostscriptArgs: Record<Operation, string[]> = {
    compress: [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/ebook",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-sOutputFile=output_compressed.pdf",
      "input.pdf",
    ],
    grayscale: [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-sColorConversionStrategy=Gray",
      "-dProcessColorModel=/DeviceGray",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-sOutputFile=output_grayscale.pdf",
      "input.pdf",
    ],
    cmyk: [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-sColorConversionStrategy=CMYK",
      "-dProcessColorModel=/DeviceCMYK",
      "-dOverrideICC",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-sOutputFile=output_cmyk.pdf",
      "input.pdf",
    ],
  };

  if (!ghostscriptArgs[operation]) {
    throw new Error("Invalid PDF processing operation.");
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", dataStruct.pdfDataURL);
  xhr.responseType = "arraybuffer";
  xhr.onload = async function () {
    window.URL.revokeObjectURL(dataStruct.pdfDataURL);

    Module = {
      preRun: [
        function () {
          const FS = window.FS;
          FS.writeFile("input.pdf", new Uint8Array(xhr.response));
        },
      ],
      postRun: [
        function () {
          const FS = window.FS;
          const outputFileName = ghostscriptArgs[operation].find(arg => arg.startsWith("-sOutputFile="))!.split("=")[1];
          const uarray = FS.readFile(outputFileName, { encoding: "binary" });
          const blob = new Blob([uarray], { type: "application/octet-stream" });
          const pdfDataURL = window.URL.createObjectURL(blob);
          responseCallback({ pdfDataURL, url: dataStruct.url });
        },
      ],
      arguments: ghostscriptArgs[operation],
      print: function (text: string) {
        statusUpdateCallback(text);
      },
      printErr: function (text: string) {
        statusUpdateCallback("Error: " + text);
        console.error(text);
      },
      setStatus: function (text: string) {
        if (!Module.setStatus.last)
          Module.setStatus.last = { time: Date.now(), text: "" };
        if (text === Module.setStatus.last.text) return;
        const m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
        const now = Date.now();
        if (m && now - Module.setStatus.last.time < 30)
          return;
        Module.setStatus.last.time = now;
        Module.setStatus.last.text = text;
        if (m) {
          text = m[1];
          progressCallback(false, parseInt(m[2], 10) * 100, parseInt(m[4], 10) * 100);
        } else {
          progressCallback(true, 0, 0);
        }
        statusUpdateCallback(text);
      },
      totalDependencies: 0,
    };
    Module.setStatus("Loading Ghostscript...");
    window.Module = Module;

    // Load the Ghostscript WebAssembly file
    await loadScript();
  };
  xhr.send();
}
