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
// 🔥 EXPERIENCE CALCULATOR (NO OVERLAP COUNTING)
// ==========================================================
function calculateTotalExperienceYears(experience = []) {
  if (!Array.isArray(experience) || experience.length === 0) return 0;

  const ranges = experience
    .filter((exp) => exp.startDate)
    .map((exp) => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      return [start.getTime(), end.getTime()];
    })
    .filter(([s, e]) => !isNaN(s) && !isNaN(e) && e > s)
    .sort((a, b) => a[0] - b[0]);

  const merged = [];
  for (const range of ranges) {
    if (!merged.length) {
      merged.push(range);
    } else {
      const last = merged[merged.length - 1];
      if (range[0] <= last[1]) {
        last[1] = Math.max(last[1], range[1]);
      } else {
        merged.push(range);
      }
    }
  }

  let totalMonths = 0;
  merged.forEach(([start, end]) => {
    const s = new Date(start);
    const e = new Date(end);
    const months =
      (e.getFullYear() - s.getFullYear()) * 12 +
      (e.getMonth() - s.getMonth());
    totalMonths += months > 0 ? months : 0;
  });

  return Math.round(totalMonths / 12);
}

// ==========================================================
// 🔥 EXPERIENCE LEVEL DETECTOR
// ==========================================================
function getExperienceLevelLabel(years) {
  if (years >= 8) return "Senior-Level";
  if (years >= 4) return "Mid-Level";
  if (years >= 1) return "Junior-Level";
  return "Entry-Level";
}

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

    const totalExperienceYears = calculateTotalExperienceYears(experience);
    const levelLabel = getExperienceLevelLabel(totalExperienceYears);

    const experienceText = experience
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
      .join("\n");

    const educationText = education
      .map((edu) => {
        const degree = edu.degree || "";
        const field = edu.field ? ` in ${edu.field}` : "";
        const school = edu.school || "";
        return `${degree}${field} | ${school}`;
      })
      .join("\n");

    const prompt = `
STRICT EXPERIENCE RULES:
- Candidate has EXACTLY ${totalExperienceYears} years of professional experience.
- Candidate is ${levelLabel}.
- DO NOT modify this number.
- DO NOT use years from job description.

STRICT TITLE RULE:
- Use titles EXACTLY as provided.

FORMAT:
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

    return res.status(200).json({
      success: true,
      resumeText: resumeTextRaw,
      experienceYears: totalExperienceYears,
      level: levelLabel,
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
    const { name, text } = req.body;

    const doc = new Document({
      sections: [{ children: parseHosTextToParagraphs(text) }],
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