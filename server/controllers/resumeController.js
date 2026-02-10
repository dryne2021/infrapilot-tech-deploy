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
  // ✅ keep **bold** markers (we render them into DOCX runs)
  s = s.replace(/```/g, ""); // remove code fences
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

// ✅ Render **bold** segments into DOCX runs
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

  // If no markup found, ensure at least one run
  if (runs.length === 0) runs.push(makeRun(s, { size: opts.size }));

  return runs;
}

// ✅ Updated heading with line under it
function makeHeadingParagraph(text) {
  return new Paragraph({
    children: [
      makeRun(String(stripMarkdownBold(text)).toUpperCase(), {
        bold: true,
        size: HEADING_SIZE,
      }),
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

function makeBodyParagraph(text, spacingAfter = 80, boldAll = false) {
  return new Paragraph({
    children: boldAll
      ? [makeRun(stripMarkdownBold(text), { bold: true, size: BODY_SIZE })]
      : runsFromBoldMarkup(text, { size: BODY_SIZE }),
    spacing: { after: spacingAfter },
  });
}

// ✅ Improved bullet indent
function makeBulletParagraph(text) {
  return new Paragraph({
    children: runsFromBoldMarkup(text, { size: BODY_SIZE }),
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
    "TECHNOLOGIES",
    "CERTIFICATIONS",
  ];

  // Parse model sections
  const sections = {};
  let current = null;

  for (const line of bodyLines) {
    const upper = stripMarkdownBold(line).toUpperCase();
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
      const cu = stripMarkdownBold(c).toUpperCase();
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
        children: [makeRun(stripMarkdownBold(nameLine), { bold: true, size: NAME_SIZE })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      })
    );
  }

  if (contactLine) {
    paragraphs.push(
      new Paragraph({
        children: [makeRun(stripMarkdownBold(contactLine), { size: BODY_SIZE })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 140 },
      })
    );
  }

  let currentSection = null;

  for (; idx < lines.length; idx++) {
    const raw = lines[idx];
    if (!raw || raw.trim() === "") continue;

    const line = normalizeLine(raw);
    if (!line) continue;

    if (isSectionHeader(line)) {
      currentSection = stripMarkdownBold(line).toUpperCase();
      paragraphs.push(makeHeadingParagraph(line));
      continue;
    }

    if (isBulletLine(raw)) {
      const bulletText = normalizeLine(stripBulletMarker(raw));
      if (bulletText) paragraphs.push(makeBulletParagraph(bulletText));
      continue;
    }

    // ✅ Bold the heading line of each experience entry (role header line)
    const isExperienceRoleHeader =
      currentSection === "EXPERIENCE" &&
      line.includes("|") &&
      !isSectionHeader(line) &&
      !isBulletLine(raw);

    paragraphs.push(makeBodyParagraph(line, 80, isExperienceRoleHeader));
  }

  return paragraphs;
}

// ✅ NEW: format student-provided experience headers (locked)
function formatExperienceHeaders(experience = []) {
  return (Array.isArray(experience) ? experience : [])
    .map((e, i) => {
      const title = e?.title || "";
      const company = e?.company || "";
      const loc = e?.location || "";
      const dates = e?.dates || "";
      const id = e?.id || `exp${i + 1}`;
      // Keep the HOS role header line format you already use:
      // Title — Company, Location | Dates
      return `${id} | ${title} — ${company}, ${loc} | ${dates}`.trim();
    })
    .filter(Boolean)
    .join("\n");
}

// ✅ NEW: format student-provided education lines (locked)
function formatEducationLines(education = []) {
  return (Array.isArray(education) ? education : [])
    .map((ed) => {
      const degree = ed?.degree || "";
      const school = ed?.school || "";
      const loc = ed?.location || "";
      const year = ed?.year || "";
      return `${degree}, ${school}, ${loc}, ${year}`.replace(/\s+,/g, ",").trim();
    })
    .filter(Boolean)
    .join("\n");
}

// ✅ NEW: Build final resume text by locking header/experience/education from student data
function buildLockedHosResumeText({
  fullName = "",
  email = "",
  phone = "",
  location = "",
  aiText = "",
  experience = [],
  education = [],
}) {
  const cleaned = String(aiText || "").replace(/```/g, "").trim();
  const rawLines = cleaned.split("\n").map(normalizeLine).filter(Boolean);

  // Always correct header from provided facts
  const headerName = (fullName || "").trim();
  const contactParts = [];
  if (email) contactParts.push(email);
  if (phone) contactParts.push(phone);
  if (location) contactParts.push(location);
  const headerContact = contactParts.join(" | ");

  // Parse AI sections (we will NOT trust AI for EXPERIENCE/EDUCATION lines)
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

  // Split AI "EXPERIENCE" into bullet blocks per role (ignore any AI headers)
  const expBulletsById = {};
  const expLines = sections["EXPERIENCE"] || [];
  let currentId = null;

  for (const l of expLines) {
    const line = normalizeLine(l);
    if (!line) continue;

    // We expect AI to output the locked header lines we provided:
    // "exp1 | Title — Company, Location | Dates"
    // If it does, we use it ONLY to choose which role bullets are for.
    if (!isBulletLine(line) && line.includes("|") && /^\s*exp\d+\s*\|/i.test(line)) {
      const m = line.match(/^\s*(exp\d+)\s*\|/i);
      currentId = (m?.[1] || "").toLowerCase();
      if (currentId && !expBulletsById[currentId]) expBulletsById[currentId] = [];
      continue;
    }

    if (isBulletLine(line)) {
      const bullet = normalizeLine(stripBulletMarker(line));
      if (!bullet) continue;
      if (currentId) {
        expBulletsById[currentId] = expBulletsById[currentId] || [];
        expBulletsById[currentId].push(`• ${bullet}`);
      }
      continue;
    }
  }

  // Build final exact formatted text (HOS order)
  const out = [];
  out.push(headerName);
  out.push(headerContact);
  out.push("");

  // PROFESSIONAL SUMMARY (AI)
  out.push("PROFESSIONAL SUMMARY");
  (sections["PROFESSIONAL SUMMARY"] || []).forEach((l) => out.push(l));
  out.push("");

  // SKILLS (AI)
  out.push("SKILLS");
  (sections["SKILLS"] || []).forEach((l) => out.push(l));
  out.push("");

  // EXPERIENCE (LOCKED HEADERS + AI BULLETS)
  out.push("EXPERIENCE");
  const expArr = Array.isArray(experience) ? experience : [];
  expArr.forEach((e, i) => {
    const id = (e?.id || `exp${i + 1}`).toLowerCase();
    const title = e?.title || "";
    const company = e?.company || "";
    const loc = e?.location || "";
    const dates = e?.dates || "";
    const header = `${title} — ${company}, ${loc} | ${dates}`.trim();

    out.push(header);

    // Use AI bullets for this role only
    const bullets = expBulletsById[id] || [];
    bullets.forEach((b) => out.push(b));

    out.push("");
  });

  // EDUCATION (LOCKED)
  out.push("EDUCATION");
  const eduLines = formatEducationLines(education);
  if (eduLines) {
    eduLines.split("\n").forEach((l) => out.push(l));
  }
  out.push("");

  // TECHNOLOGIES (AI)
  out.push("TECHNOLOGIES");
  (sections["TECHNOLOGIES"] || []).forEach((l) => out.push(l));
  out.push("");

  // CERTIFICATIONS (AI)
  out.push("CERTIFICATIONS");
  (sections["CERTIFICATIONS"] || []).forEach((l) => out.push(l));
  out.push("");

  // Ensure final normalization is still applied
  return enforceHosFormat({
    fullName,
    email,
    phone,
    location,
    resumeText: out.join("\n"),
  });
}

// ---------- Helper: Call OpenAI to generate resume text ----------
// ✅ UPDATED: uses Responses API (works with gpt-5.2-pro)
async function generateWithOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.2-pro";
  const maxTokens = Number(process.env.OPENAI_MAX_TOKENS || 4096);

  const response = await openai.responses.create({
    model,
    input: prompt,
    max_output_tokens: maxTokens,
    // ✅ NOTE: temperature is not supported for gpt-5.2-pro, so it's removed
  });

  return response.output_text || response.output?.[0]?.content?.[0]?.text || "";
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
      experience = [],
      education = [],
      certifications = [],
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

    if (!Array.isArray(experience) || experience.length === 0) {
      return res.status(400).json({
        message:
          "Student experience is required (company/title/dates must come from the student).",
      });
    }

    if (!Array.isArray(education) || education.length === 0) {
      return res.status(400).json({
        message:
          "Student education is required (school/degree/year must come from the student).",
      });
    }

    const skillsList = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const lockedExperienceHeaders = formatExperienceHeaders(experience);
    const lockedEducationLines = formatEducationLines(education);
    const lockedCerts = Array.isArray(certifications)
      ? certifications.filter(Boolean).join(", ")
      : String(certifications || "");

    // ✅ Force EXACT output structure (your HOS format) + lock student fields
    const prompt = `
You are writing an ATS-friendly resume. Output MUST be plain text only (no markdown, no tables, no columns).

IMPORTANT LOCKED DATA RULES:
- Name, email, phone, location, companies, titles, dates, and schools are PROVIDED.
- You MUST NOT invent or modify any locked data.
- You ONLY generate: PROFESSIONAL SUMMARY bullets, SKILLS bullets, EXPERIENCE bullet points under each locked role, TECHNOLOGIES bullets, and CERTIFICATIONS list.

You MUST follow this EXACT format and section order, with the same headings and blank lines:

${fullName}
${email || ""} | ${phone || ""} | ${location || ""}

PROFESSIONAL SUMMARY
(Exactly 8 bullet points. Use leading bullet markers like "• ". Keep each point concise and tailored to the job description.)

SKILLS
(Exactly 12 bullet points. Use leading bullet markers like "• ".
Each bullet MUST be in this exact pattern: **Main Skill**: detail1, detail2, detail3
Example: • **Network Design**: LAN/WAN, Wireless Networks, Ubiquiti, Meraki, Cambium, Aruba, Cisco, Ruckus
Bold ONLY the main skill using **double asterisks** as shown.)

EXPERIENCE
(Use the following locked role headers EXACTLY as provided. For EACH role:
1) Output the locked header line EXACTLY (do not change it)
2) Then output EXACTLY 12 bullet points starting with "• " with measurable impact.
Do NOT add or remove roles. Do NOT change company/title/dates/location.)

EDUCATION
(Use the following locked education lines EXACTLY as provided. Do NOT add schools or degrees.)

TECHNOLOGIES
(Place this section ONLY after EDUCATION. Exactly 3 bullet points starting with "• ".)

CERTIFICATIONS
(Use the locked certifications if any. Do not invent certification providers/dates.)

LOCKED EXPERIENCE HEADERS (DO NOT CHANGE):
${lockedExperienceHeaders}

LOCKED EDUCATION (DO NOT CHANGE):
${lockedEducationLines}

LOCKED CERTIFICATIONS (if any; do not invent):
${lockedCerts}

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
- Headings must match exactly: PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, TECHNOLOGIES, CERTIFICATIONS
- Do not add extra sections (no Projects, no Links, no References).
- Use bullets under PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, and TECHNOLOGIES only.
- Output ONLY the resume text in the required format.
`.trim();

    const resumeTextRaw = await generateWithOpenAI(prompt);

    if (!resumeTextRaw.trim()) {
      return res.status(500).json({ message: "Empty response from AI" });
    }

    // ✅ LOCK student data: build final resume where header/experience headers/education come ONLY from student
    const hosText = buildLockedHosResumeText({
      fullName,
      email,
      phone,
      location,
      aiText: resumeTextRaw,
      experience,
      education,
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
    const source = req.method === "POST" ? req.body || {} : req.query || {};

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

    const {
      fullName,
      location,
      email,
      phone,
      targetRole,
      jobDescription,
      skills = [],
      summary,
      experience = [],
      education = [],
      certifications = [],
    } = req.body;

    if (!fullName || !jobDescription) {
      return res.status(400).json({
        message: "Candidate name and job description are required",
      });
    }

    if (!Array.isArray(experience) || experience.length === 0) {
      return res.status(400).json({
        message:
          "Student experience is required (company/title/dates must come from the student).",
      });
    }

    if (!Array.isArray(education) || education.length === 0) {
      return res.status(400).json({
        message:
          "Student education is required (school/degree/year must come from the student).",
      });
    }

    const skillsList = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const lockedExperienceHeaders = formatExperienceHeaders(experience);
    const lockedEducationLines = formatEducationLines(education);
    const lockedCerts = Array.isArray(certifications)
      ? certifications.filter(Boolean).join(", ")
      : String(certifications || "");

    const prompt = `
Output MUST be plain text only (no markdown, no tables).

IMPORTANT LOCKED DATA RULES:
- Name, email, phone, location, companies, titles, dates, and schools are PROVIDED.
- You MUST NOT invent or modify any locked data.
- You ONLY generate: PROFESSIONAL SUMMARY bullets, SKILLS bullets, EXPERIENCE bullet points under each locked role, TECHNOLOGIES bullets, and CERTIFICATIONS list.

Follow this EXACT format:

${fullName}
${email || ""} | ${phone || ""} | ${location || ""}

PROFESSIONAL SUMMARY
(Exactly 8 bullet points. Use leading bullet markers like "• ".)

SKILLS
(Exactly 12 bullet points. Use leading bullet markers like "• ".
Each bullet MUST be: **Main Skill**: detail1, detail2, detail3
Example: • **Network Design**: LAN/WAN, Wireless Networks, Ubiquiti, Meraki, Cambium, Aruba, Cisco, Ruckus
Bold ONLY the main skill using **double asterisks**.)

EXPERIENCE
(Use the following locked role headers EXACTLY as provided. For EACH role:
1) Output the locked header line EXACTLY (do not change it)
2) Then output EXACTLY 12 bullet points starting with "• " with measurable outcomes.
Do NOT add or remove roles. Do NOT change company/title/dates/location.)

EDUCATION
(Use the following locked education lines EXACTLY as provided. Do NOT add schools or degrees.)

TECHNOLOGIES
(ONLY after EDUCATION. Exactly 3 bullet points starting with "• ".)

CERTIFICATIONS
(Use the locked certifications if any. Do not invent providers/dates.)

LOCKED EXPERIENCE HEADERS (DO NOT CHANGE):
${lockedExperienceHeaders}

LOCKED EDUCATION (DO NOT CHANGE):
${lockedEducationLines}

LOCKED CERTIFICATIONS (if any; do not invent):
${lockedCerts}

JOB DESCRIPTION:
${jobDescription}

Target Role: ${targetRole || "Professional"}
Existing Summary (optional): ${summary || ""}
Skills provided: ${skillsList.join(", ")}

Rules:
- Headings must be exactly: PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, TECHNOLOGIES, CERTIFICATIONS
- No extra sections.
- Use bullets under PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, and TECHNOLOGIES only.
- Output ONLY the resume text.
`.trim();

    const resumeTextRaw = await generateWithOpenAI(prompt);

    if (!resumeTextRaw.trim()) {
      return res.status(500).json({ message: "Empty response from AI" });
    }

    // ✅ LOCK student data: build final resume where header/experience headers/education come ONLY from student
    const hosText = buildLockedHosResumeText({
      fullName,
      email,
      phone,
      location,
      aiText: resumeTextRaw,
      experience,
      education,
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
