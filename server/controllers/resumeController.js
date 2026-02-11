// server/controllers/resumeController.js

const OpenAI = require("openai");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
} = require("docx");

// ---------- ATS styling constants ----------
const FONT_FAMILY = "Times New Roman";
const BODY_SIZE = 18;
const HEADING_SIZE = 24;

// ---------- OpenAI client ----------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==========================================================
// 🔥 OPENAI GENERATOR
// ==========================================================
async function generateWithOpenAI(prompt) {
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const response = await openai.responses.create({
    model,
    input: prompt,
    max_output_tokens: 4096,
  });

  return response.output_text || "";
}

// ==========================================================
// 🔥 DATE FORMATTER
// ==========================================================
function formatMonthYear(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date)) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

// ==========================================================
// 🔥 TEXT HELPERS
// ==========================================================
function normalizeLine(line) {
  return String(line || "").replace(/```/g, "").trim();
}

function stripMarkdownBold(text) {
  return String(text || "").replace(/\*\*(.*?)\*\*/g, "$1");
}

function isBulletLine(line) {
  const t = String(line || "").trim();
  return t.startsWith("•") || t.startsWith("-") || t.startsWith("*");
}

function stripBulletMarker(line) {
  const t = String(line || "").trim();
  if (t.startsWith("•") || t.startsWith("-") || t.startsWith("*")) {
    return t.slice(1).trim();
  }
  return t;
}

function isSectionHeader(line) {
  const upper = stripMarkdownBold(normalizeLine(line)).toUpperCase();
  const headers = new Set([
    "PROFESSIONAL SUMMARY",
    "SUMMARY",
    "SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "TECHNOLOGIES",
    "CERTIFICATIONS",
  ]);
  return headers.has(upper);
}

// ==========================================================
// 🔥 DOCX HELPERS
// ==========================================================
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
    children: [
      makeRun(stripMarkdownBold(text).toUpperCase(), {
        bold: true,
        size: HEADING_SIZE,
      }),
    ],
    spacing: { before: 160, after: 80 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        space: 2,
        color: "000000",
      },
    },
  });
}

function makeBodyParagraph(text, spacingAfter = 80) {
  return new Paragraph({
    children: [makeRun(text)],
    spacing: { after: spacingAfter },
  });
}

function makeBulletParagraph(text) {
  return new Paragraph({
    children: [makeRun(text)],
    bullet: { level: 0 },
    spacing: { after: 60 },
    indent: { left: 360, hanging: 180 },
  });
}

function parseHosTextToParagraphs(text) {
  const lines = String(text || "").split("\n");
  const paragraphs = [];

  for (const raw of lines) {
    if (!raw || !raw.trim()) continue;
    const line = normalizeLine(raw);

    if (isSectionHeader(line)) {
      paragraphs.push(makeHeadingParagraph(line));
      continue;
    }

    if (isBulletLine(line)) {
      paragraphs.push(makeBulletParagraph(stripBulletMarker(line)));
      continue;
    }

    paragraphs.push(makeBodyParagraph(line));
  }

  return paragraphs;
}

// ==========================================================
// 🔥 FORMAT ENFORCER
// ==========================================================
function enforceHosFormat({
  fullName = "",
  email = "",
  phone = "",
  location = "",
  resumeText = "",
}) {
  const cleaned = String(resumeText || "").replace(/```/g, "").trim();
  const rawLines = cleaned.split("\n").map(normalizeLine).filter(Boolean);

  const headerContact = [email, phone, location].filter(Boolean).join(" | ");

  const targetOrder = [
    "PROFESSIONAL SUMMARY",
    "SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "TECHNOLOGIES",
    "CERTIFICATIONS",
  ];

  const sections = {};
  let current = null;

  for (const line of rawLines) {
    const upper = stripMarkdownBold(line).toUpperCase();
    if (targetOrder.includes(upper) || upper === "SUMMARY") {
      current = upper === "SUMMARY" ? "PROFESSIONAL SUMMARY" : upper;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!current) continue;
    sections[current].push(line);
  }

  const out = [];
  out.push(fullName);
  out.push(headerContact);
  out.push("");

  for (const h of targetOrder) {
    out.push(h);
    (sections[h] || []).forEach((l) => out.push(l));
    out.push("");
  }

  return out.join("\n").trim() + "\n";
}

// ==========================================================
// 🚀 GENERATE RESUME
// ==========================================================
exports.generateResume = async (req, res) => {
  try {
    const {
      fullName,
      location,
      email,
      phone,
      experience = [],
      education = [],
      jobDescription,
    } = req.body;

    if (!fullName || !jobDescription) {
      return res.status(400).json({
        message: "Candidate name and job description are required",
      });
    }

    // EXPERIENCE INPUT (AI WILL ADD BULLETS + TECHNOLOGIES)
    const experienceText = Array.isArray(experience)
      ? experience
          .map((exp) => {
            const start = formatMonthYear(exp.startDate);
            const end = exp.endDate
              ? formatMonthYear(exp.endDate)
              : "Present";

            return `
Company: ${exp.company || ""}
Title: ${exp.title || ""}
Dates: ${start} to ${end}
`;
          })
          .join("\n")
      : "";

    // EDUCATION (NO YEARS)
    const educationText = Array.isArray(education)
      ? education
          .map((edu) => {
            const degree = edu.degree || "";
            const field = edu.field ? ` in ${edu.field}` : "";
            const school = edu.school || "";
            return `${degree}${field} | ${school}`;
          })
          .join("\n")
      : "";

    const prompt = `
You are a senior professional resume writer.

STRICT RULES:
- DO NOT invent companies.
- DO NOT invent schools.
- DO NOT change experience dates.
- For EACH company:
    • Write 4-6 strong bullet points aligned to the job description.
    • AFTER bullet points, add:
      Technologies Used: comma separated tools relevant to that role.
- Generate a TECHNOLOGIES section summarizing all technical skills.
- Generate a CERTIFICATIONS section relevant to the job description.
- Education format must be:
  Degree in Field | University Name
- Do NOT include education years.

EXPERIENCE FORMAT REQUIRED:

Company Name
Job Title — Date to Date
• Bullet
• Bullet
• Bullet
Technologies Used: Tool1, Tool2, Tool3

SECTION ORDER MUST BE EXACT:

PROFESSIONAL SUMMARY
SKILLS
EXPERIENCE
EDUCATION
TECHNOLOGIES
CERTIFICATIONS

WORK HISTORY:
${experienceText}

EDUCATION:
${educationText}

JOB DESCRIPTION:
${jobDescription}

Generate a complete ATS-optimized professional resume.
`;

    const resumeTextRaw = await generateWithOpenAI(prompt);

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
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Resume Generation Error:", error);
    return res.status(500).json({
      message: error.message || "Generation failed",
    });
  }
};

// ==========================================================
// WORD DOWNLOAD
// ==========================================================
exports.downloadResumeAsWord = async (req, res) => {
  try {
    const { name, text, email, phone, location } = req.body;

    const hosText = enforceHosFormat({
      fullName: name,
      email,
      phone,
      location,
      resumeText: text,
    });

    const doc = new Document({
      sections: [{ children: parseHosTextToParagraphs(hosText) }],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      \`attachment; filename="Resume_\${name.replace(/\\s+/g, "_")}.docx"\`
    );

    res.send(buffer);
  } catch (error) {
    console.error("❌ Word generation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate Word document",
    });
  }
};
