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
// 🔥 UTILITIES
// ==========================================================
function toTitleCase(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeLine(line) {
  return String(line || "").replace(/```/g, "").trim();
}

function stripMarkdownBold(text) {
  return String(text || "").replace(/\*\*(.*?)\*\*/g, "$1");
}

function isSectionHeader(line) {
  const upper = stripMarkdownBold(normalizeLine(line)).toUpperCase();
  return [
    "PROFESSIONAL SUMMARY",
    "SUMMARY",
    "SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "CERTIFICATIONS",
  ].includes(upper);
}

function isExperienceHeader(line) {
  return line.includes("—") && line.includes("|");
}

function isTechnologiesUsed(line) {
  return line.toLowerCase().startsWith("technologies used");
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
// 🔥 DOCX HELPERS
// ==========================================================
function makeRun(text, opts = {}) {
  return new TextRun({
    text: String(text ?? ""),
    font: FONT_FAMILY,
    size: opts.size || BODY_SIZE,
    bold: Boolean(opts.bold),
  });
}

function makeNameParagraph(name) {
  return new Paragraph({
    children: [makeRun(name, { bold: true, size: NAME_SIZE })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
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
  const parts = text.split("|");
  const left = toTitleCase(parts[0].trim());
  const right = parts[1] ? parts[1].trim() : "";

  return new Paragraph({
    children: [makeRun(left + " | " + right, { bold: true })],
    spacing: { before: 120, after: 80 },
  });
}

function makeTechnologiesUsedParagraph(text) {
  return new Paragraph({
    children: [makeRun(text.toUpperCase(), { bold: true })],
    spacing: { before: 80, after: 60 },
  });
}

function makeBulletParagraph(text) {
  const colonIndex = text.indexOf(":");

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

function makeBodyParagraph(text) {
  return new Paragraph({
    children: [makeRun(text)],
    spacing: { after: 80 },
  });
}

function parseHosTextToParagraphs(text, fullName, contactLine) {
  const lines = String(text || "").split("\n");
  const paragraphs = [];

  paragraphs.push(makeNameParagraph(fullName));
  paragraphs.push(makeContactParagraph(contactLine));

  for (const raw of lines) {
    if (!raw || !raw.trim()) continue;

    const line = normalizeLine(raw);

    if (isSectionHeader(line)) {
      paragraphs.push(makeHeadingParagraph(line));
      continue;
    }

    if (isExperienceHeader(line)) {
      paragraphs.push(makeExperienceHeaderParagraph(line));
      continue;
    }

    if (isTechnologiesUsed(line)) {
      paragraphs.push(makeTechnologiesUsedParagraph(line));
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
// 🚀 GENERATE RESUME (FIXED PROMPT)
// ==========================================================
exports.generateResume = async (req, res) => {
  try {
    const { fullName, jobDescription } = req.body;

    if (!fullName || !jobDescription) {
      return res.status(400).json({
        message: "Candidate name and job description are required",
      });
    }

    const prompt = `
You are a senior professional resume writer.

Generate a complete professional resume.

STRICT RULES:
- Do NOT ask questions.
- Do NOT request additional input.
- Generate the resume directly.

FORMAT:

PROFESSIONAL SUMMARY
- 8 strong bullet points

SKILLS
- 12 skill categories formatted like:
  Front-End Development: React, Vue, HTML5

EXPERIENCE
Company — Title | Month Year to Month Year
- 12 detailed achievement bullets
TECHNOLOGIES USED: comma-separated tools

EDUCATION
Degree in Field | University

CERTIFICATIONS
- 3 certifications

JOB DESCRIPTION:
${jobDescription}
`;

    const resumeTextRaw = await generateWithOpenAI(prompt);

    return res.status(200).json({
      success: true,
      resumeText: resumeTextRaw,
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

    const contactLine = [
      email && `Email: ${email}`,
      phone && `Mobile: ${phone}`,
      location && `Location: ${location}`,
    ]
      .filter(Boolean)
      .join(" | ");

    const doc = new Document({
      sections: [
        {
          children: parseHosTextToParagraphs(
            text,
            name,
            contactLine
          ),
        },
      ],
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
