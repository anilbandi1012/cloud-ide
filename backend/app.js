const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// Execute code endpoint
app.post("/run", async (req, res) => {
  const { code, language } = req.body;

  try {
    if (language === "javascript") {
      // Run JS code via Node
      const output = execSync(`node -e "${code.replace(/"/g, '\\"')}"`, { timeout: 5000 });
      res.json({ output: output.toString() });
    } else if (language === "python") {
      const tempFile = path.join(__dirname, "temp.py");
      fs.writeFileSync(tempFile, code);
      const output = execSync(`python "${tempFile}"`, { timeout: 5000 });
      fs.unlinkSync(tempFile);
      res.json({ output: output.toString() });
    } else if (language === "cpp") {
      const { spawnSync } = require("child_process");

      const tempCpp = path.join(__dirname, "temp.cpp");
      const tempExe = path.join(__dirname, "temp.out");

      fs.writeFileSync(tempCpp, code);

      // Compile
      const compile = spawnSync("g++", [tempCpp, "-o", tempExe], {
        timeout: 10000,
        encoding: "utf-8"
      });

      if (compile.stderr) {
        fs.unlinkSync(tempCpp);
        return res.json({ output: compile.stderr });
      }

      // Run
      const run = spawnSync(tempExe, [], {
        input: "",          // 🔴 prevents stdin blocking
        timeout: 10000,     // 🔴 prevents infinite loops
        encoding: "utf-8"
      });

      fs.unlinkSync(tempCpp);
      fs.unlinkSync(tempExe);

      if (run.error) {
        return res.json({ output: run.error.message });
      }

      res.json({ output: run.stdout || run.stderr });
    }
    else if (language === "java") {
      const { spawnSync } = require("child_process");

      const tempJava = path.join(__dirname, "Main.java");
      fs.writeFileSync(tempJava, code);

      // Compile
      const compile = spawnSync("javac", [tempJava], {
        timeout: 10000,
        encoding: "utf-8"
      });

      if (compile.stderr) {
        fs.unlinkSync(tempJava);
        return res.json({ output: compile.stderr });
      }

      // Run
      const run = spawnSync("java", ["-cp", __dirname, "Main"], {
        input: "",          // 🔴 prevents stdin blocking
        timeout: 15000,     // 🔴 Java needs more time
        encoding: "utf-8"
      });

      fs.unlinkSync(tempJava);
      fs.unlinkSync(path.join(__dirname, "Main.class"));

      if (run.error) {
        return res.json({ output: run.error.message });
      }

      res.json({ output: run.stdout || run.stderr });
    } else {
      res.json({ output: "Language not supported yet" });
    }
  } catch (err) {
    res.json({ output: err.message });
  }
});

app.use(express.static(path.join(__dirname, "../client/dist")));

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "../client/dist/index.html")
  );
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
