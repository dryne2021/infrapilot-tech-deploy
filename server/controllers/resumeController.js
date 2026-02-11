// server/controllers/resumeController.js

const OpenAI = require("openai");

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
const BODY_SIZE = 18;
const HEADING_SIZE = 24;
const NAME_SIZE = 24;

// ---------- OpenAI client ----------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Safe decoding ----------
function safeDecodeURIComponent(encodedURI) {
  try {
    return decodeURIComponent(encodedURI);
  } catch {
    return String(encodedURI);
  }
}

// ---------- Text helpers ----------
function normalizeLine(line) {
  let s = String(line || "");
  s = s.replace(/```/g, "");
  return s.trim();
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
  if (t.startsWith("•")) return t.slice(1).trim();
  if (t.startsWith("-")) return t.slice(1).trim();
  if (t.startsWith("*")) return t.slice(1).trim();
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

function runsFromBoldMarkup(text, opts = {}) {
  const s = String(text ?? "");
  const runs = [];
  const re = /\*\*(.+?)\*\*/g;

  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      runs.push(makeRun(s.slice(last, m.index), { size: opts.size }));
    }
    runs.push(makeRun(m[1], { bold: true, size: opts.size }));
    last = m.index + m[0].length;
  }

  if (last < s.length) {
    runs.push(makeRun(s.slice(last), { size: opts.size }));
  }

  if (runs.length === 0) runs.push(makeRun(s, { size: opts.size }));

  return runs;
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
    children: runsFromBoldMarkup(text, { size: BODY_SIZE }),
    spacing: { after: spacingAfter },
  });
}

function makeBulletParagraph(text) {
  return new Paragraph({
    children: runsFromBoldMarkup(text, { size: BODY_SIZE }),
    bullet: { level: 0 },
    spacing: { after: 60 },
    indent: { left: 360, hanging: 180 },
  });
}

// ---------- FORMAT ENFORCEMENT (KEPT) ----------
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

// ---------- OpenAI ----------
async function generateWithOpenAI(prompt) {
  const model = process.env.OPENAI_MODEL || "gpt-5.2-pro";
  const maxTokens = Number(process.env.OPENAI_MAX_TOKENS || 4096);

  const response = await openai.responses.create({
    model,
    input: prompt,
    max_output_tokens: maxTokens,
  });

  return response.output_text || "";
}

// ---------- Resume generation ----------
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
      jobDescription,
    } = req.body;

    if (!fullName || !jobDescription) {
      return res.status(400).json({
        message: "Candidate name and job description are required",
      });
    }

    const prompt = `
Write an ATS-friendly resume in plain text using sections:
PROFESSIONAL SUMMARY
SKILLS
EXPERIENCE
EDUCATION
TECHNOLOGIES
CERTIFICATIONS

Candidate:
Name: ${fullName}
Email: ${email || ""}
Phone: ${phone || ""}
Location: ${location || ""}
Target Role: ${targetRole || "Professional"}

Summary: ${summary || ""}
Skills: ${Array.isArray(skills) ? skills.join(", ") : skills}

Job Description:
${jobDescription}
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
    console.error("❌ Error:", error);
    return res.status(500).json({
      message: error.message || "Generation failed",
    });
  }
};

// ---------- Word Download ----------
exports.downloadResumeAsWord = async (req, res) => {
  try {
    const { name, text, email, phone, location } = req.body;

    if (!name || !text) {
      return res.status(400).json({
        success: false,
        message: "Name and resume text are required",
      });
    }

    const hosText = enforceHosFormat({
      fullName: name,
      email,
      phone,
      location,
      resumeText: text,
    });

    const doc = new Document({
      sections: [
        {
          children: parseHosTextToParagraphs(hosText),
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `Resume_${name.replace(/\s+/g, "_")}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error("❌ Word generation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate Word document",
    });
  }
};
