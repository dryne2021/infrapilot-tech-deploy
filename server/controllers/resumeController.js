// server/controllers/resumeController.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// ✅ Import DOCX ONCE at top
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require("docx");

// ---------- ATS styling constants ----------
const FONT_FAMILY = "Times New Roman";
const BODY_SIZE = 18; // 9pt (docx uses half-points)
const HEADING_SIZE = 24; // 12pt
const NAME_SIZE = 24; // keep name at 12pt to match your spec

// ---------- Safe decoding ----------
function safeDecodeURIComponent(encodedURI) {
  try {
    return decodeURIComponent(encodedURI);
  } catch (error) {
    try {
      const withSpaces = String(encodedURI).replace(/\+/g, " ");
      return decodeURIComponent(withSpaces);
    } catch (secondError) {
      try {
        const encoded = encodeURI(String(encodedURI)).replace(/%25/g, "%");
        return decodeURIComponent(encoded);
      } catch (finalError) {
        return String(encodedURI);
      }
    }
  }
}

// ---------- Text helpers ----------
function normalizeLine(line) {
  let s = String(line || "");

  // remove markdown bold **text**
  s = s.replace(/\*\*(.*?)\*\*/g, "$1");

  // strip code fences (just in case)
  s = s.replace(/```/g, "");

  return s.trim();
}

function isBulletLine(line) {
  const t = String(line || "").trim();
  return t.startsWith("•") || t.startsWith("-") || t.startsWith("*");
}

function stripBulletMarker(line) {
  const t = String(line || "").trim();
  if (t.startsWith("•")) return t.slice(1).trim();
  if (t.startsWith("-")) return t.slice(1).trim();
  if (t.startsWith("*")) return t.slice(1).trim();
  return t;
}

function isSectionHeader(line) {
  const upper = normalizeLine(line).toUpperCase();
  const headers = new Set([
    "PROFESSIONAL SUMMARY",
    "SUMMARY",
    "SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "CERTIFICATIONS",
  ]);
  return headers.has(upper);
}

function makeRun(text, opts = {}) {
  return new TextRun({
    text: String(text ?? ""),
    font: FONT_FAMILY,
    size: opts.size ?? BODY_SIZE,
    bold: Boolean(opts.bold),
  });
}

function makeHeadingParagraph(text) {
  return new Paragraph({
    children: [makeRun(String(text).toUpperCase(), { bold: true, size: HEADING_SIZE })],
    spacing: { before: 200, after: 120 },
  });
}

function makeBodyParagraph(text, spacingAfter = 80) {
  return new Paragraph({
    children: [makeRun(text, { size: BODY_SIZE })],
    spacing: { after: spacingAfter },
  });
}

function makeBulletParagraph(text) {
  return new Paragraph({
    children: [makeRun(text, { size: BODY_SIZE })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

// ---------- Enforce your exact “HOS format” (text) ----------
function enforceHosFormat({
  fullName = "",
  email = "",
  phone = "",
  location = "",
  resumeText = "",
}) {
  const cleaned = String(resumeText || "").replace(/```/g, "").trim();

  // Remove leading/trailing empty lines, normalize
  const rawLines = cleaned.split("\n").map(normalizeLine).filter(Boolean);

  // Detect if the model already produced the 2-line header
  // Header is:
  // FULL_NAME
  // EMAIL | PHONE | LOCATION
  let startIdx = 0;

  // If first line looks like a section header, it means header missing
  const firstIsHeader = rawLines[0] && isSectionHeader(rawLines[0]);

  // Build header (always from provided data to guarantee correctness)
  const headerName = (fullName || rawLines[0] || "").trim();
  const headerContactParts = [];
  if (email) headerContactParts.push(email);
  if (phone) headerContactParts.push(phone);
  if (location) headerContactParts.push(location);
  const headerContact = headerContactParts.join(" | ");

  // If model included header lines, try to skip them to avoid duplication
  if (!firstIsHeader && rawLines.length >= 2) {
    const maybeName = rawLines[0];
    const maybeContact = rawLines[1];
    const maybeContactHasPipe = maybeContact.includes("|");

    const maybeNameNotAHeader = !isSectionHeader(maybeName);
    const maybeContactNotAHeader = !isSectionHeader(maybeContact);

    if (maybeNameNotAHeader && maybeContactNotAHeader && maybeContactHasPipe) {
      startIdx = 2;
    }
  }

  const bodyLines = rawLines.slice(startIdx);

  // We now ensure sections exist and in THIS order:
  // PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS
  // If missing, we’ll insert the section header and leave content empty (better than breaking format).
  const targetOrder = [
    "PROFESSIONAL SUMMARY",
    "SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "CERTIFICATIONS",
  ];

  // Parse existing sections
  const sections = {};
  let current = null;

  for (const line of bodyLines) {
    const upper = line.toUpperCase();
    if (targetOrder.includes(upper)) {
      current = upper;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!current) continue;
    sections[current].push(line);
  }

  // If the model used SUMMARY instead of PROFESSIONAL SUMMARY, move it
  if (!sections["PROFESSIONAL SUMMARY"] && sections["SUMMARY"]) {
    sections["PROFESSIONAL SUMMARY"] = sections["SUMMARY"];
    delete sections["SUMMARY"];
  }

  // Build final text in exact HOS format
  const out = [];
  out.push(headerName);
  out.push(headerContact);
  out.push(""); // blank line

  for (const h of targetOrder) {
    out.push(h);
    const content = sections[h] || [];

    if (content.length === 0) {
      // Keep section present; leave blank line for ATS consistency
      out.push("");
      continue;
    }

    // Keep content exactly, but remove any accidental duplicate headers inside
    for (const c of content) {
      const cU = c.toUpperCase();
      if (targetOrder.includes(cU) || cU === "SUMMARY") continue;
      out.push(c);
    }
    out.push("");
  }

  return out.join("\n").trim() + "\n";
}

// ---------- Convert the enforced format to DOCX paragraphs ----------
function parseHosTextToParagraphs(hosText) {
  const lines = String(hosText || "").split("\n");

  const paragraphs = [];
  let lineIdx = 0;

  // Header lines (2 lines): name then contact
  const nameLine = normalizeLine(lines[lineIdx++] || "");
  const contactLine = normalizeLine(lines[lineIdx++] || "");

  if (nameLine) {
    paragraphs.push(
      new Paragraph({
        children: [makeRun(nameLine, { bold: true, size: NAME_SIZE })],
        alignment: AlignmentType.LEFT,
        spacing: { after: 60 },
      })
    );
  }

  if (contactLine) {
    paragraphs.push(
      new Paragraph({
        children: [makeRun(contactLine, { size: BODY_SIZE })],
        alignment: AlignmentType.LEFT,
        spacing: { after: 140 },
      })
    );
  }

  // Remaining body
  for (; lineIdx < lines.length; lineIdx++) {
    const raw = lines[lineIdx];
    if (!raw || raw.trim() === "") continue;

    const line = normalizeLine(raw);
    if (!line) continue;

    if (isSectionHeader(line)) {
      paragraphs.push(makeHeadingParagraph(line));
      continue;
    }

    if (isBulletLine(raw)) {
      const bulletText = normalizeLine(stripBulletMarker(raw));
      if (bulletText) paragraphs.push(makeBulletParagraph(bulletText));
      continue;
    }

    paragraphs.push(makeBodyParagraph(line));
  }

  return paragraphs;
}

// ---------- Resume generation (Gemini) ----------
exports.generateResume = async (req, res) => {
  try {
    console.log("✅ /api/v1/resume/generate hit");

    const {
      fullName,
      targetRole,
      location,
      email,
      phone,
      summary,
      skills = [],
      experience = [],
      education = [],
      certifications = [],
      projects = [],
      jobId,
      jobDescription,
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: "Candidate name is required" });
    }

    if (!jobDescription) {
      return res.status(400).json({
        message:
          "Job description is required. Please paste the job description you want to tailor the resume for.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is missing" });
    }

    const skillsList = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // ✅ Force EXACT output structure (your HOS format)
    const prompt = `
You are writing an ATS-friendly resume. Output MUST be plain text only (no markdown, no tables, no columns).

You MUST follow this EXACT format and section order, with the same headings and blank lines:

${fullName}
${email || ""} | ${phone || ""} | ${location || ""}

PROFESSIONAL SUMMARY
(2–4 lines. Mention total years of experience. Tailor to the job description.)

SKILLS
(One clean list, comma-separated, aligned with the job description.)

EXPERIENCE
(Include 1–2 roles. Each role: Title — Company, Location | Dates, then 6–10 bullet points with measurable impact.)

EDUCATION
(Include degree, school, location, year.)

CERTIFICATIONS
(List certifications relevant to the job.)

JOB DESCRIPTION:
${jobDescription}

CANDIDATE INFO (use these facts; do not invent contact details):
Name: ${fullName}
Target Role: ${targetRole || "Professional"}
Location: ${location || ""}
Email: ${email || ""}
Phone: ${phone || ""}
Existing Summary (optional): ${summary || ""}

Skills provided (use and expand with job keywords as appropriate):
${skillsList.join(", ")}

Strict rules:
- Headings must match exactly: PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS
- Do not add extra sections (no Projects, no Links, no References).
- Use bullets only under EXPERIENCE.
- Output ONLY the resume text in the required format.
`.trim();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
    });

    const result = await model.generateContent(prompt);
    const resumeTextRaw = result?.response?.text?.() || "";

    if (!resumeTextRaw.trim()) {
      return res.status(500).json({ message: "Empty response from AI" });
    }

    // ✅ Enforce your format even if the model deviates
    const hosText = enforceHosFormat({
      fullName,
      email,
      phone,
      location,
      resumeText: resumeTextRaw,
    });

    return res.status(200).json({
      success: true,
      resumeText: hosText,
      jobDescriptionLength: jobDescription.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      message: error.message || "Generation failed",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// ---------- Download resume as Word (Times New Roman, 9/12, HOS format) ----------
exports.downloadResumeAsWord = async (req, res) => {
  try {
    console.log("📥 /api/v1/resume/download hit");
    console.log("Query params received:", Object.keys(req.query || {}));

    // ✅ accept optional contact fields so header is always correct
    const { name, text, email, phone, location } = req.query;

    if (!name || !text) {
      return res.status(400).json({
        success: false,
        message: "Name and resume text are required",
      });
    }

    const decodedText = safeDecodeURIComponent(text);
    const decodedName = safeDecodeURIComponent(name);
    const decodedEmail = email ? safeDecodeURIComponent(email) : "";
    const decodedPhone = phone ? safeDecodeURIComponent(phone) : "";
    const decodedLocation = location ? safeDecodeURIComponent(location) : "";

    // ✅ enforce the HOS format again at download-time (guaranteed output)
    const hosText = enforceHosFormat({
      fullName: decodedName,
      email: decodedEmail,
      phone: decodedPhone,
      location: decodedLocation,
      resumeText: decodedText,
    });

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: FONT_FAMILY, size: BODY_SIZE },
          },
        },
      },
      sections: [
        {
          properties: {},
          children: [...parseHosTextToParagraphs(hosText)],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const fileName = `Resume_${decodedName.replace(/\s+/g, "_")}_${Date.now()}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.send(buffer);

    console.log(`✅ Word document generated: ${fileName}`);
  } catch (error) {
    console.error("❌ Error creating Word document:", error);

    // Fallback: text file
    try {
      const decodedText = safeDecodeURIComponent(req.query.text || "");
      const decodedName = safeDecodeURIComponent(req.query.name || "Candidate");
      const fileName = `Resume_${decodedName.replace(/\s+/g, "_")}.txt`;

      res.setHeader("Content-Type", "text/plain");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
      res.send(decodedText);
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
      res.status(500).json({
        success: false,
        message: "Failed to create document",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
};

// ---------- Generate resume directly as Word (HOS format) ----------
exports.generateResumeAsWord = async (req, res) => {
  try {
    console.log("📄 /api/v1/resume/generate-word hit");

    const { fullName, location, email, phone, targetRole, jobDescription, skills = [] } = req.body;

    if (!fullName || !jobDescription) {
      return res.status(400).json({
        message: "Candidate name and job description are required",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is missing" });
    }

    const skillsList = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const prompt = `
Output MUST be plain text only (no markdown, no tables).

Follow this EXACT format:

${fullName}
${email || ""} | ${phone || ""} | ${location || ""}

PROFESSIONAL SUMMARY
(2–4 lines tailored to the job; include total years of experience.)

SKILLS
(Comma-separated list aligned to the job.)

EXPERIENCE
(1–2 roles; each role has bullets with measurable outcomes.)

EDUCATION
(Degree, School, Location, Year.)

CERTIFICATIONS
(Only relevant certifications.)

JOB DESCRIPTION:
${jobDescription}

Target Role: ${targetRole || "Professional"}
Skills provided: ${skillsList.join(", ")}

Rules:
- Headings must be exactly: PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS
- No extra sections.
- Bullets only under EXPERIENCE.
- Output ONLY the resume text.
`.trim();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
    });

    const result = await model.generateContent(prompt);
    const resumeTextRaw = result?.response?.text?.() || "";

    if (!resumeTextRaw.trim()) {
      return res.status(500).json({ message: "Empty response from AI" });
    }

    const hosText = enforceHosFormat({
      fullName,
      email,
      phone,
      location,
      resumeText: resumeTextRaw,
    });

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: FONT_FAMILY, size: BODY_SIZE },
          },
        },
      },
      sections: [
        {
          properties: {},
          children: [...parseHosTextToParagraphs(hosText)],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `Resume_${fullName.replace(/\s+/g, "_")}_${Date.now()}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    res.send(buffer);

    console.log(`✅ Word document generated directly: ${fileName}`);
  } catch (error) {
    console.error("❌ Error generating Word resume:", error);
    res.status(500).json({
      message: error.message || "Generation failed",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
