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
// 🔥 REQUIRED FUNCTION
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

// ---------- Text helpers ----------
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

// 🔥 NEW: Safe Date Formatter
function formatMonthYear(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date)) return "";

  return date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
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

// ---------- Format enforcement ----------
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
// 🚀 UPDATED RESUME GENERATION — FIXED DATE FORMATTING
// ==========================================================

exports.generateResume = async (req, res) => {
  try {
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
      jobDescription,
    } = req.body;

    if (!fullName || !jobDescription) {
      return res.status(400).json({
        message: "Candidate name and job description are required",
      });
    }

    // 🔥 FIXED EXPERIENCE FORMATTING
    const experienceText = Array.isArray(experience)
      ? experience
          .map((exp) => {
            const start = formatMonthYear(exp.startDate);
            const end = exp.endDate
              ? formatMonthYear(exp.endDate)
              : "Present";

            return `
Company: ${exp.company || ""}
Dates Worked: ${start} - ${end}
`;
          })
          .join("\n")
      : "";

    const educationText = Array.isArray(education)
      ? education
          .map(
            (edu) => `
School: ${edu.school || ""}
Degree: ${edu.degree || ""}
Years Attended: ${edu.startYear || ""} - ${edu.endYear || ""}
`
          )
          .join("\n")
      : "";

    const certificationsText = Array.isArray(certifications)
      ? certifications.join(", ")
      : certifications;

    const prompt = `
You are a senior professional resume writer.

STRICT RULES:
- Use ONLY the company names and dates provided.
- Use ONLY the school names and education years provided.
- Do NOT invent fake companies.
- Do NOT invent fake schools.
- For each company listed, generate 3-5 strong professional bullet achievements.
- Bullet points must align to the job description.
- ATS optimized.
- Clean formatting.

FORMAT EXACTLY:

PROFESSIONAL SUMMARY
SKILLS
EXPERIENCE
EDUCATION
TECHNOLOGIES
CERTIFICATIONS

CANDIDATE INFORMATION:

Name: ${fullName}
Email: ${email || ""}
Phone: ${phone || ""}
Location: ${location || ""}
Target Role: ${targetRole || "Professional"}

SUMMARY:
${summary || ""}

SKILLS:
${Array.isArray(skills) ? skills.join(", ") : skills}

WORK HISTORY:
${experienceText}

EDUCATION HISTORY:
${educationText}

CERTIFICATIONS:
${certificationsText || ""}

JOB DESCRIPTION:
${jobDescription}

Generate a complete professional resume.
`.trim();

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

// ---------- Word Download ----------
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
      `attachment; filename="Resume_${name.replace(/\s+/g, "_")}.docx"`
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
