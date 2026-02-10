// server/controllers/resumeController.js

const OpenAI = require("openai");

// ✅ DOCX imports (updated with BorderStyle)
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} = require("docx");

// ---------- ATS styling constants ----------
const FONT_FAMILY = "Times New Roman";
const BODY_SIZE = 18; // 9pt (docx uses half-points)
const HEADING_SIZE = 24; // 12pt
const NAME_SIZE = 24; // 12pt

// ---------- OpenAI client ----------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Safe decoding (for legacy GET query support) ----------
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
  s = s.replace(/\*\*(.*?)\*\*/g, "$1"); // remove markdown bold
  s = s.replace(/```/g, ""); // remove code fences
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

// ✅ Updated heading with line under it
function makeHeadingParagraph(text) {
  return new Paragraph({
    children: [
      makeRun(String(text).toUpperCase(), { bold: true, size: HEADING_SIZE }),
    ],
    spacing: { before: 160, after: 80 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6, // thickness (try 4–8)
        space: 2,
        color: "000000",
      },
    },
  });
}

function makeBodyParagraph(text, spacingAfter = 80) {
  return new Paragraph({
    children: [makeRun(text, { size: BODY_SIZE })],
    spacing: { after: spacingAfter },
  });
}

// ✅ Improved bullet indent
function makeBulletParagraph(text) {
  return new Paragraph({
    children: [makeRun(text, { size: BODY_SIZE })],
    bullet: { level: 0 },
    spacing: { after: 60 },
    indent: { left: 360, hanging: 180 }, // clean bullet alignment
  });
}

// ---------- Enforce your exact HOS format ----------
function enforceHosFormat({
  fullName = "",
  email = "",
  phone = "",
  location = "",
  resumeText = "",
}) {
  const cleaned = String(resumeText || "").replace(/```/g, "").trim();
  const rawLines = cleaned.split("\n").map(normalizeLine).filter(Boolean);

  // Build header from provided facts (always correct)
  const headerName = (fullName || "").trim();
  const contactParts = [];
  if (email) contactParts.push(email);
  if (phone) contactParts.push(phone);
  if (location) contactParts.push(location);
  const headerContact = contactParts.join(" | ");

  // Skip model header if it already included 2-line header
  let startIdx = 0;
  if (rawLines.length >= 2) {
    const maybeName = rawLines[0];
    const maybeContact = rawLines[1];
    const looksLikeHeader =
      !isSectionHeader(maybeName) &&
      !isSectionHeader(maybeContact) &&
      maybeContact.includes("|");
    if (looksLikeHeader) startIdx = 2;
  }

  const bodyLines = rawLines.slice(startIdx);

  const targetOrder = [
    "PROFESSIONAL SUMMARY",
    "SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "CERTIFICATIONS",
  ];

  // Parse model sections
  const sections = {};
  let current = null;

  for (const line of bodyLines) {
    const upper = line.toUpperCase();
    if (targetOrder.includes(upper) || upper === "SUMMARY") {
      current = upper === "SUMMARY" ? "PROFESSIONAL SUMMARY" : upper;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!current) continue;
    sections[current].push(line);
  }

  // Build final exact formatted text
  const out = [];
  out.push(headerName);
  out.push(headerContact);
  out.push("");

  for (const h of targetOrder) {
    out.push(h);

    const content = sections[h] || [];
    if (content.length === 0) {
      out.push("");
      continue;
    }

    for (const c of content) {
      const cu = c.toUpperCase();
      if (targetOrder.includes(cu) || cu === "SUMMARY") continue;
      out.push(c);
    }
    out.push("");
  }

  return out.join("\n").trim() + "\n";
}

// ---------- Convert enforced HOS text to DOCX paragraphs ----------
function parseHosTextToParagraphs(hosText) {
  const lines = String(hosText || "").split("\n");

  const paragraphs = [];
  let idx = 0;

  const nameLine = normalizeLine(lines[idx++] || "");
  const contactLine = normalizeLine(lines[idx++] || "");

  // ✅ Updated top header (centered + tighter)
  if (nameLine) {
    paragraphs.push(
      new Paragraph({
        children: [makeRun(nameLine, { bold: true, size: NAME_SIZE })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      })
    );
  }

  if (contactLine) {
    paragraphs.push(
      new Paragraph({
        children: [makeRun(contactLine, { size: BODY_SIZE })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
      })
    );
  }

  for (; idx < lines.length; idx++) {
    const raw = lines[idx];
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

// ---------- Helper: Call OpenAI to generate resume text ----------
async function generateWithOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.2-pro";
  const maxTokens = Number(process.env.OPENAI_MAX_TOKENS || 4096);

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You generate ATS-friendly resumes in plain text only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: maxTokens,
  });

  return completion?.choices?.[0]?.message?.content || "";
}

// ---------- Resume generation (OpenAI) ----------
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

    const resumeTextRaw = await generateWithOpenAI(prompt);

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

// ---------- Download resume as Word (DOCX ONLY; no .txt fallback) ----------
exports.downloadResumeAsWord = async (req, res) => {
  try {
    console.log("📥 /api/v1/resume/download hit", req.method);

    // Prefer POST body; fallback to GET query
    const source = req.method === "POST" ? (req.body || {}) : (req.query || {});

    const name = source.name;
    const text = source.text;
    const email = source.email || "";
    const phone = source.phone || "";
    const location = source.location || "";

    if (!name || !text) {
      return res.status(400).json({
        success: false,
        message: "Name and resume text are required",
      });
    }

    // Decode only for GET query usage; for POST assume plain JSON already
    const decodedName = req.method === "POST" ? String(name) : safeDecodeURIComponent(name);
    const decodedText = req.method === "POST" ? String(text) : safeDecodeURIComponent(text);
    const decodedEmail = req.method === "POST" ? String(email) : safeDecodeURIComponent(email);
    const decodedPhone = req.method === "POST" ? String(phone) : safeDecodeURIComponent(phone);
    const decodedLocation =
      req.method === "POST" ? String(location) : safeDecodeURIComponent(location);

    // Enforce HOS format at download time (guaranteed)
    const hosText = enforceHosFormat({
      fullName: decodedName,
      email: decodedEmail,
      phone: decodedPhone,
      location: decodedLocation,
      resumeText: decodedText,
    });

    // ✅ Updated with tighter margins (0.5")
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
          properties: {
            page: {
              margin: {
                top: 720, // 0.5"
                bottom: 720,
                left: 720,
                right: 720,
              },
            },
          },
          children: parseHosTextToParagraphs(hosText),
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    const fileName = `Resume_${decodedName.replace(/\s+/g, "_")}_${Date.now()}.docx`;

    // ✅ Force .docx download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);

    console.log(`✅ Word document generated: ${fileName}`);
  } catch (error) {
    console.error("❌ Word generation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate Word document",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// ---------- Optional: generate resume directly as Word ----------
exports.generateResumeAsWord = async (req, res) => {
  try {
    console.log("📄 /api/v1/resume/generate-word hit");

    const { fullName, location, email, phone, targetRole, jobDescription, skills = [], summary } =
      req.body;

    if (!fullName || !jobDescription) {
      return res.status(400).json({
        message: "Candidate name and job description are required",
      });
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
Existing Summary (optional): ${summary || ""}
Skills provided: ${skillsList.join(", ")}

Rules:
- Headings must be exactly: PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS
- No extra sections.
- Bullets only under EXPERIENCE.
- Output ONLY the resume text.
`.trim();

    const resumeTextRaw = await generateWithOpenAI(prompt);

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

    // ✅ Updated with tighter margins (0.5")
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
          properties: {
            page: {
              margin: {
                top: 720, // 0.5"
                bottom: 720,
                left: 720,
                right: 720,
              },
            },
          },
          children: parseHosTextToParagraphs(hosText),
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `Resume_${String(fullName).replace(/\s+/g, "_")}_${Date.now()}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);

    console.log(`✅ Word document generated directly: ${fileName}`);
  } catch (error) {
    console.error("❌ Error generating Word resume:", error);
    return res.status(500).json({
      message: error.message || "Generation failed",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
