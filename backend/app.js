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
      const tempCpp = path.join(__dirname, "temp.cpp");
      const tempExe = path.join(__dirname, "temp.exe");
      fs.writeFileSync(tempCpp, code);
      execSync(`g++ "${tempCpp}" -o "${tempExe}"`, { timeout: 5000 });
      const output = execSync(`"${tempExe}"`, { timeout: 5000 });
      fs.unlinkSync(tempCpp);
      fs.unlinkSync(tempExe);
      res.json({ output: output.toString() });
    } else if (language === "java") {
      const tempFile = path.join(__dirname, "Main.java");
      fs.writeFileSync(tempFile, code);
      execSync(`javac "${tempFile}"`, { timeout: 5000 });
      const output = execSync(`java -cp "${__dirname}" Main`, { timeout: 5000 });
      fs.unlinkSync(tempFile);
      fs.unlinkSync(path.join(__dirname, "Main.class"));
      res.json({ output: output.toString() });
    } else {
      res.json({ output: "Language not supported yet" });
    }
  } catch (err) {
    res.json({ output: err.message });
  }
});

app.use(express.static(path.join(__dirname, "../client/build")));

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "../client/build/index.html")
  );
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
