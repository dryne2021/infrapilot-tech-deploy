const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

async function generateResumePdf({
  prompt,
  fileName,
  geminiApiKey,
}) {
  const uploadsDir = path.join(__dirname, "../../uploads/resumes");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data, null, 2));
  }

  const resumeText = data.candidates[0].content.parts[0].text;

  const pdfPath = path.join(uploadsDir, fileName);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  doc.pipe(fs.createWriteStream(pdfPath));

  doc
    .font("Times-Roman")
    .fontSize(11)
    .text(resumeText, {
      align: "left",
      lineGap: 4,
    });

  doc.end();

  return {
    pdfPath: `/uploads/resumes/${fileName}`,
  };
}

module.exports = generateResumePdf;
