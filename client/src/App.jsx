import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

export default function App() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const consoleRef = useRef(null);
  const modelsRef = useRef({});

  const [language, setLanguage] = useState("javascript");
  const [runStatus, setRunStatus] = useState("idle");
  const [consoleOutput, setConsoleOutput] = useState({
    text: "Ready.\n",
    type: "success",
  });

  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem("cloudIDE_files");
    return saved ? JSON.parse(saved) : { "main.js": "" };
  });

  const [activeFile, setActiveFile] = useState(() => {
    const savedActive = localStorage.getItem("cloudIDE_activeFile");
    const savedFiles = localStorage.getItem("cloudIDE_files");
    if (savedActive && savedFiles) {
      const parsedFiles = JSON.parse(savedFiles);
      if (parsedFiles[savedActive]) return savedActive;
    }
    // fallback to first file if no saved file
    return savedFiles ? Object.keys(JSON.parse(savedFiles))[0] : "main.js";
  });

  // Update active file in localStorage when switching
  const openFile = (fileName) => {
    setActiveFile(fileName);
    localStorage.setItem("cloudIDE_activeFile", fileName);

    const detectedLanguage = detectLanguageFromFile(fileName);
    setLanguage(detectedLanguage);
  };

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("cloudIDE_theme") || "vs-dark"; // vs-dark or vs-light
  });


  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [currentLanguage, setCurrentLanguage] = useState(getLanguageFromFile(activeFile));

  const extensionToLanguage = {
    js: "javascript",
    py: "python",
    java: "java",
    cpp: "cpp",
  };

  const detectLanguageFromFile = (fileName) => {
    const ext = fileName.split(".").pop();
    return extensionToLanguage[ext] || "plaintext";
  };

  const updateFileContent = (fileName, content) => {
    setFiles((prevFiles) => {
      const updated = { ...prevFiles, [fileName]: content };
      localStorage.setItem("cloudIDE_files", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    localStorage.setItem("files", JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    const handler = () => {
      saveCurrentFile();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [activeFile]);

  useEffect(() => {
    if (!activeFile) return;

    const detectedLanguage = getLanguageFromFile(activeFile);
    setLanguage(detectedLanguage);
  }, [activeFile]);

  useEffect(() => {
    if (editorRef.current && language) {
      monaco.editor.setModelLanguage(
        editorRef.current.getModel(),
        language
      );
    }
  }, [language]);


  function createNewFile() {
    const name = prompt("Enter file name (with extension)");

    if (!name) return;

    if (files[name]) {
      alert("File already exists");
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [name]: "",
    }));

    setActiveFile(name);
    setLanguage(detectLanguageFromFile(name));
  }

  function renameFile(oldName) {
    const newName = prompt("Enter new file name", oldName);
    if (!newName || newName === oldName) return;

    if (files[newName]) {
      alert("File already exists");
      return;
    }

    setFiles((prev) => {
      const updated = { ...prev };
      updated[newName] = updated[oldName];
      delete updated[oldName];
      localStorage.setItem("cloudIDE_files", JSON.stringify(updated));
      return updated;
    });

    // Update active file if needed
    if (activeFile === oldName) {
      setActiveFile(newName);
      localStorage.setItem("cloudIDE_activeFile", newName);
    }

    // Rename Monaco model reference
    if (modelsRef.current[oldName]) {
      modelsRef.current[newName] = modelsRef.current[oldName];
      delete modelsRef.current[oldName];
    }
  }

  function deleteFile(file) {
    if (!window.confirm(`Are you sure you want to delete ${file}?`)) return;

    const fileKeys = Object.keys(files);
    if (fileKeys.length === 1) {
      alert("Cannot delete the last file.");
      return;
    }

    setFiles((prev) => {
      const updated = { ...prev };
      delete updated[file];
      return updated;
    });

    // Update active file if needed
    if (activeFile === file) {
      const remainingFiles = Object.keys(files).filter((f) => f !== file);
      setActiveFile(remainingFiles[0]);
    }

    // Remove Monaco model
    if (modelsRef.current[file]) {
      modelsRef.current[file].dispose();
      delete modelsRef.current[file];
    }
  }

  /* ---------------- LANGUAGE DETECTION ---------------- */

  function getLanguageFromFile(file) {
    if (file.endsWith(".js")) return "javascript";
    if (file.endsWith(".py")) return "python";
    if (file.endsWith(".java")) return "java";
    if (file.endsWith(".cpp")) return "cpp";
    return "plaintext";
  }

  /* ---------------- MODEL HANDLING ---------------- */

  function getOrCreateModel(file) {
    if (!modelsRef.current[file]) {
      const model = monacoRef.current.editor.createModel(
        files[file],
        getLanguageFromFile(file)
      );
      modelsRef.current[file] = model;
    }
    return modelsRef.current[file];
  }

  function saveCurrentFile() {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    setFiles((prev) => ({
      ...prev,
      [activeFile]: model.getValue(),
    }));
  }

  function switchFile(file) {
    saveCurrentFile();
    setActiveFile(file);

    const editor = editorRef.current;
    if (!editor) return;
    const detectedLanguage = detectLanguageFromFile(file);
    setLanguage(detectedLanguage);
    const model = getOrCreateModel(file);
    editor.setModel(model);
    setCurrentLanguage(getLanguageFromFile(file));
  }

  /* ---------------- EDITOR MOUNT ---------------- */

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const model = getOrCreateModel(activeFile);
    editor.setModel(model);
    editor.onDidChangeCursorPosition((e) => {
      const pos = e.position;
      setCursorPosition({ lineNumber: pos.lineNumber, column: pos.column });
    });
  }
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleOutput]);

  /* ---------------- PERSIST THEME ---------------- */

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  /* ---------------- UI ---------------- */
  const runCode = async () => {
    try {
      setRunStatus("running");

      const code = files[activeFile];

      const response = await axios.post("/run", {
        language,
        code,
      });

      // Check if backend returned error
      if (response.data.error) {
        setConsoleOutput({ text: response.data.error, type: "error" });
        setRunStatus("error");
      }
      // Optional: infer runtime errors from output string
      else if (
        response.data.output &&
        response.data.output.toLowerCase().includes("error")
      ) {
        setConsoleOutput({ text: response.data.output, type: "error" });
        setRunStatus("error");
      }
      // Normal success
      else {
        setConsoleOutput({ text: response.data.output || "(no output)", type: "success" });
        setRunStatus("success");
      }
    } catch (err) {
      setConsoleOutput({ text: err.message || "Execution failed", type: "error" });
      setRunStatus("error");
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "220px",
          background: "#252526",
          color: "#fff",
          padding: "10px",
        }}
      >
        <h4 style={{ marginBottom: "10px" }}>Files</h4>
        <button
          style={{
            width: "100%",
            marginBottom: "10px",
            padding: "6px",
            cursor: "pointer",
          }}
          onClick={createNewFile}
        >
          + New File
        </button>
        {Object.keys(files).map((file) => (
          <div
            key={file}
            onClick={() => openFile(file)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 8px",
              marginBottom: "4px",
              borderRadius: "4px",
              background:
                activeFile === file ? "#37373d" : "transparent",
            }}
          >
            <span
              style={{ flex: 1, cursor: "pointer" }}
              onClick={() => switchFile(file)}
            >
              {file}
            </span>

            <button
              style={{ marginLeft: "6px" }}
              onClick={() => renameFile(file)}
            >
              ✏
            </button>

            <button
              style={{ marginLeft: "6px" }}
              onClick={() => deleteFile(file)}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 10px",
            borderBottom: "1px solid #333",
            backgroundColor: "#1e1e1e",
          }}
        >
          <button
            onClick={() => {
              const newTheme = theme === "vs-dark" ? "vs-light" : "vs-dark";
              setTheme(newTheme);
              localStorage.setItem("cloudIDE_theme", newTheme);
            }}
            style={{
              marginLeft: "10px",
              padding: "5px 8px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {theme === "vs-dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            onClick={runCode}
            style={{
              padding: "5px 10px",
              cursor: "pointer",
            }}
          >
            ▶ Run
          </button>

          <button
            onClick={() => setConsoleOutput("")}
            style={{
              padding: "5px 10px",
              cursor: "pointer",
            }}
          >
            🧹 Clear
          </button>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, marginTop: "3px" }}>
          <Editor
            theme={theme}
            language={language}
            value={files[activeFile]}
            onChange={(value) => updateFileContent(activeFile, value)}
            onMount={handleEditorDidMount}
          />
        </div>
        <div
          ref={consoleRef}
          style={{
            height: "160px",
            backgroundColor: "#1e1e1e",
            color: consoleOutput.type === "error" ? "#ff4d4f" : "#00ff00",
            fontFamily: "Consolas, monospace",
            fontSize: "13px",
            padding: "8px",
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            borderTop: "1px solid #333",
          }}
        >
          {consoleOutput.text}
        </div>

        <div
          style={{
            height: "25px",
            background: "#1e1e1e",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 10px",
            fontSize: "12px",
          }}
        >
          <span
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              color:
                runStatus === "running"
                  ? "#fadb14"
                  : runStatus === "error"
                    ? "#ff4d4f"
                    : "#52c41a",
            }}
          >
            {runStatus === "running"
              ? "Running..."
              : runStatus === "error"
                ? "Error"
                : "Done"}
          </span>
          <span>Language: {currentLanguage}</span>
          <span>
            Line: {cursorPosition.lineNumber}, Column: {cursorPosition.column}
          </span>
        </div>
      </div>
    </div>
  );
}
