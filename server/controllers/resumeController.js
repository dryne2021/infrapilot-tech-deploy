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
// REQUIRED FUNCTION
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
// UPDATED RESUME GENERATION
// ==========================================================

exports.generateResume = async (req, res) => {
  try {
    const {
      fullName,
      targetRole,
      location,
      email,
      phone,
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

    // 🔥 EXPERIENCE (MANUALLY STRUCTURED — LIKE EDUCATION)
    const experienceBlock = Array.isArray(experience)
      ? experience
          .map(
            (exp) => `
Company: ${exp.company || ""}
Dates Worked: ${exp.startDate || ""} - ${exp.endDate || "Present"}
`
          )
          .join("\n")
      : "";

    // EDUCATION (UNCHANGED)
    const educationBlock = Array.isArray(education)
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

    const prompt = `
You are a senior professional resume writer.

STRICT RULES:

1. PROFESSIONAL SUMMARY → EXACTLY 8 bullet points.
2. SKILLS → EXACTLY 12 bullet points.
3. EXPERIENCE → Generate EXACTLY 12 bullet points TOTAL.
   - Do NOT repeat company names.
   - Do NOT describe companies.
   - Align strongly with job description.
4. TECHNOLOGIES → EXACTLY 3.
5. CERTIFICATIONS → EXACTLY 3.
6. ATS optimized.

FORMAT EXACTLY:

PROFESSIONAL SUMMARY
- bullets

SKILLS
- bullets

EXPERIENCE
- bullets

EDUCATION

TECHNOLOGIES

CERTIFICATIONS

JOB DESCRIPTION:
${jobDescription}
`.trim();

    const aiGeneratedContent = await generateWithOpenAI(prompt);

    // 🔥 MANUALLY INJECT EXPERIENCE BLOCK (LIKE EDUCATION)
    const finalResumeText = `
${fullName}
${[email, phone, location].filter(Boolean).join(" | ")}

${aiGeneratedContent.replace(
      "EXPERIENCE",
      `EXPERIENCE
${experienceBlock}`
    )}

EDUCATION
${educationBlock}
`;

    return res.status(200).json({
      success: true,
      resumeText: finalResumeText.trim(),
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

    const doc = new Document({
      sections: [{ children: parseHosTextToParagraphs(text) }],
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
