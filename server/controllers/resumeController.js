// server/controllers/resumeController.js

const OpenAI = require("openai");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
  AlignmentType,
} = require("docx");

// ---------- ATS styling constants ----------
const FONT_FAMILY = "Times New Roman";
const BODY_SIZE = 18;
const HEADING_SIZE = 24;
const NAME_SIZE = 32;

// ---------- OpenAI client ----------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==========================================================
// 🔥 CAPITALIZATION HELPERS
// ==========================================================
function capitalizeWords(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function capitalizeCompanyInHeader(line = "") {
  if (!line.includes("—")) return line;
  const [company, rest] = line.split("—");
  return `${capitalizeWords(company.trim())} —${rest}`;
}

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
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
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
  if (isBulletLine(t)) return t.slice(1).trim();
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
    "CERTIFICATIONS",
  ]);
  return headers.has(upper);
}

function isExperienceHeader(line) {
  return line.includes("—") && line.includes("|");
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

function makeNameParagraph(text) {
  return new Paragraph({
    children: [
      makeRun(capitalizeWords(text), {
        bold: true,
        size: NAME_SIZE,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  });
}

function makeContactParagraph(text) {
  return new Paragraph({
    children: [makeRun(text)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
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

function makeExperienceHeaderParagraph(text) {
  const fixed = capitalizeCompanyInHeader(text);
  return new Paragraph({
    children: [makeRun(fixed, { bold: true })],
    spacing: { before: 120, after: 80 },
  });
}

function makeBodyParagraph(text, spacingAfter = 80) {
  return new Paragraph({
    children: [makeRun(text)],
    spacing: { after: spacingAfter },
  });
}

function makeBulletParagraph(text) {
  const colonIndex = text.indexOf(":");

  if (text.toUpperCase().startsWith("TECHNOLOGIES USED:")) {
    return new Paragraph({
      children: [makeRun(text, { bold: true })],
      spacing: { after: 60 },
    });
  }

  if (colonIndex !== -1) {
    const category = text.substring(0, colonIndex + 1);
    const rest = text.substring(colonIndex + 1);

    return new Paragraph({
      children: [
        makeRun(category, { bold: true }),
        makeRun(rest),
      ],
      bullet: { level: 0 },
      spacing: { after: 60 },
      indent: { left: 360, hanging: 180 },
    });
  }

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

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;

    const line = normalizeLine(raw);

    if (i === 0) {
      paragraphs.push(makeNameParagraph(line));
      continue;
    }

    if (i === 1) {
      paragraphs.push(makeContactParagraph(line));
      continue;
    }

    if (isSectionHeader(line)) {
      paragraphs.push(makeHeadingParagraph(line));
      continue;
    }

    if (isExperienceHeader(line)) {
      paragraphs.push(makeExperienceHeaderParagraph(line));
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
  out.push(capitalizeWords(fullName));
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

IMPORTANT RULES:
- TECHNOLOGIES USED must ALWAYS be generated based strictly on the JOB DESCRIPTION.
- Extract relevant tools, frameworks, programming languages, platforms, and software mentioned in the job description.
- If technologies are not explicitly listed, infer them logically from responsibilities.
- CERTIFICATIONS must be professionally relevant to the JOB DESCRIPTION.
- Generate exactly 3 certifications aligned with the job role.
- Do NOT leave TECHNOLOGIES USED empty.
- Do NOT leave CERTIFICATIONS empty.

PROFESSIONAL SUMMARY:
- 8 bullet points tailored to the job description.

SKILLS:
- 12 skill categories relevant to the job.
- Format: Front-End Development: React, Vue, HTML5

EXPERIENCE:
- For each job:
  - First line formatted exactly:
    Company — Title | Month Year to Month Year
  - 12 detailed bullet points tailored to the job description.
  - After the bullet points, add:
    TECHNOLOGIES USED: <comma separated technologies derived from job description>

CERTIFICATIONS:
- 3 certifications aligned with the job description.

FORMAT STRICTLY:

PROFESSIONAL SUMMARY
SKILLS
EXPERIENCE
EDUCATION
CERTIFICATIONS

WORK HISTORY:
${experienceText}

EDUCATION HISTORY:
${educationText}

JOB DESCRIPTION:
${jobDescription}
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

    const safeName = (name || "Resume").replace(/\s+/g, "_");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Resume_${safeName}.docx"`
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
