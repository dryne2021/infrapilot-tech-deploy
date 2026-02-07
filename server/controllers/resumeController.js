// server/controllers/resumeController.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// ✅ Import DOCX ONCE at top (fixes Paragraph not defined)
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} = require("docx");

// ---------- ATS styling constants ----------
const FONT_FAMILY = "Times New Roman";
const BODY_SIZE = 18;    // docx uses half-points: 9pt * 2 = 18
const HEADING_SIZE = 24; // 12pt * 2 = 24

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

    console.log("📋 Job Description length:", jobDescription.length);
    console.log("👤 Generating resume for:", fullName);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is missing" });
    }

    const skillsList = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim())
      : [];

    const prompt = `
You are a professional resume writer and ATS optimization expert. Generate a resume STRICTLY following this exact format.

❌ DO NOT USE markdown, asterisks for bullets, or any special formatting in the output.
✅ Output must be PLAIN TEXT with the exact structure below.

================================================================================
${fullName.toUpperCase()}
================================================================================

PROFESSIONAL SUMMARY
• Start with total years of experience. Write 4-5 lines about career focus and key achievements. Use complete sentences.

================================================================================

SKILLS
• Technical Skills: ${skillsList.join(", ")}
• [Add other relevant skill groups based on the job description]
• Soft Skills: Leadership, Problem Solving, Communication, Team Collaboration

================================================================================

WORK EXPERIENCE

[Most Recent Job Title] | [Most Recent Company] | [Location] | [Start Date] – [End Date]
• Detailed bullet point explaining what you did, how you did it, and the impact/result. Use 2-3 lines per bullet.
• Use strong action verbs: Designed, Developed, Led, Managed, Implemented, Optimized, etc.
• Each role should have 6-8 detailed bullets. No first-person pronouns.
• Focus on quantifiable achievements with metrics where possible.
• Align bullets to match the job description requirements.

[Previous Job Title] | [Previous Company] | [Location] | [Start Date] – [End Date]
• Follow same structure with 6-8 detailed bullets
• Ensure chronological order, most recent first

================================================================================

EDUCATION
[Degree Name, e.g., Bachelor of Science in Computer Science]
[University Name] | [Location] | [Graduation Year]

================================================================================

CERTIFICATIONS
[Relevant Certification 1] | [Relevant Certification 2] | [Other relevant certifications]

================================================================================

FORMATTING RULES (MUST FOLLOW):
1. Use "•" for ALL bullets (not *, -, or any other symbol)
2. Put horizontal lines "================================================================================" between each major section
3. Keep section headers in ALL CAPS exactly as shown above
4. Each bullet point should be 2-3 lines of text (not one-line highlights)
5. No tables, columns, icons, emojis, or special characters
6. No markdown formatting of any kind
7. Use consistent date format: Month YYYY – Month YYYY (e.g., January 2020 – Present)
8. Education format: One line per degree, no bullets
9. Create realistic company names, job titles, and achievements based on the candidate's information
10. Tailor ALL content to match the job description requirements

NOW GENERATE THE RESUME TAILORED TO THIS JOB DESCRIPTION:

CANDIDATE INFORMATION:
Name: ${fullName}
Target Role: ${targetRole || "Professional Role"}
Location: ${location || ""}
Email: ${email || ""}
Phone: ${phone || ""}
Candidate Summary: ${summary || ""}

JOB DESCRIPTION:
${jobDescription}

Generate the complete resume following ALL formatting rules above. Output ONLY the resume text.
`;

    console.log("🤖 Sending to Gemini...");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
    });

    const result = await model.generateContent(prompt);
    const resumeText = result?.response?.text() || "";

    if (!resumeText.trim()) {
      return res.status(500).json({ message: "Empty response from AI" });
    }

    const cleanedText = resumeText.replace(/```/g, "").trim();

    console.log(`✅ Generated resume (${cleanedText.length} chars)`);

    return res.status(200).json({
      success: true,
      resumeText: cleanedText,
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

// ---------- Safe decoding ----------
function safeDecodeURIComponent(encodedURI) {
  try {
    return decodeURIComponent(encodedURI);
  } catch (error) {
    console.log("⚠️ First decode attempt failed, trying alternative...");
    try {
      const withSpaces = String(encodedURI).replace(/\+/g, " ");
      return decodeURIComponent(withSpaces);
    } catch (secondError) {
      console.log("⚠️ Second decode attempt failed, using raw data...");
      try {
        const encoded = encodeURI(String(encodedURI)).replace(/%25/g, "%");
        return decodeURIComponent(encoded);
      } catch (finalError) {
        console.log("⚠️ All decode attempts failed, returning raw string");
        return String(encodedURI);
      }
    }
  }
}

// ---------- ATS helpers ----------
function normalizeLine(line) {
  // Remove markdown bold **text**
  let s = line.replace(/\*\*(.*?)\*\*/g, "$1");

  // Trim
  s = s.trim();

  // Convert common bullet markers to a consistent marker
  // We'll keep bullets as paragraphs with bullet formatting.
  // Remove leading markdown bullet marker for text body
  // but we will detect bullets separately before stripping.
  return s;
}

function isHorizontalLine(line) {
  return line.trim().startsWith('=') && line.trim().length > 20;
}

function isBulletLine(line) {
  const t = line.trim();
  return t.startsWith("•") || t.startsWith("-") || t.startsWith("*");
}

function stripBulletMarker(line) {
  const t = line.trim();
  if (t.startsWith("•")) return t.slice(1).trim();
  if (t.startsWith("-")) return t.slice(1).trim();
  if (t.startsWith("*")) return t.slice(1).trim();
  return t;
}

function isSectionHeader(line) {
  const headers = [
    "PROFESSIONAL SUMMARY",
    "SUMMARY",
    "EXPERIENCE",
    "WORK EXPERIENCE",
    "EDUCATION",
    "SKILLS",
    "TECHNICAL SKILLS",
    "CERTIFICATIONS",
    "PROJECTS",
    "ACHIEVEMENTS",
    "CONTACT",
    "PROFESSIONAL PROFILE",
    "CORE COMPETENCIES",
    "LANGUAGES",
    "REFERENCES",
  ];

  const upperLine = line.toUpperCase().trim();

  // header match OR short all-caps line
  return (
    headers.some((h) => upperLine === h || upperLine.includes(h)) ||
    (upperLine.length > 2 && upperLine.length < 45 && upperLine === line.trim())
  );
}

function makeRun(text, opts = {}) {
  return new TextRun({
    text,
    font: FONT_FAMILY,
    size: opts.size ?? BODY_SIZE,
    bold: Boolean(opts.bold),
  });
}

function makeHeadingParagraph(text) {
  // 12pt heading, bold, ATS-safe (no weird styling)
  return new Paragraph({
    children: [makeRun(text.toUpperCase(), { bold: true, size: HEADING_SIZE })],
    spacing: { before: 240, after: 120 },
  });
}

function makeBodyParagraph(text) {
  return new Paragraph({
    children: [makeRun(text, { size: BODY_SIZE })],
    spacing: { after: 80 },
  });
}

function makeBulletParagraph(text) {
  return new Paragraph({
    children: [makeRun(text, { size: BODY_SIZE })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

// ✅ FIXED: uses globally imported Paragraph/TextRun/etc.
function parseResumeToParagraphs(resumeText) {
  const paragraphs = [];
  const lines = String(resumeText).split("\n");

  for (const raw of lines) {
    if (!raw || raw.trim() === "") continue;

    // Check for horizontal lines first
    if (isHorizontalLine(raw)) {
      // Skip horizontal lines or handle them as page breaks
      // For now, just skip them for cleaner output
      continue;
    }

    // normalize (strip markdown bold etc.)
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

// ---------- Download resume as Word (ATS format) ----------
exports.downloadResumeAsWord = async (req, res) => {
  try {
    console.log("📥 /api/v1/resume/download hit");
    console.log("Query params received:", req.query);

    const { name, text, jobTitle } = req.query;

    if (!name || !text) {
      return res.status(400).json({
        success: false,
        message: "Name and resume text are required",
      });
    }

    const decodedText = safeDecodeURIComponent(text);
    const decodedName = safeDecodeURIComponent(name);
    const decodedJobTitle = jobTitle
      ? safeDecodeURIComponent(jobTitle)
      : "Professional Resume";

    console.log(`Generating Word document for: ${decodedName}`);
    console.log(`Job Title: ${decodedJobTitle}`);
    console.log(`Resume text length: ${decodedText.length} characters`);

    // ✅ ATS-friendly doc: single column, simple text
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: FONT_FAMILY,
              size: BODY_SIZE,
            },
          },
        },
      },
      sections: [
        {
          properties: {},
          children: [
            // Name (centered, but still ATS-safe)
            new Paragraph({
              children: [
                makeRun(decodedName.toUpperCase(), {
                  bold: true,
                  size: HEADING_SIZE,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
            }),

            // Target title (optional)
            new Paragraph({
              children: [makeRun(decodedJobTitle, { size: BODY_SIZE })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
            }),

            // Body parsed from resume text
            ...parseResumeToParagraphs(decodedText),
          ],
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
    console.error(error.stack);

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

// Optional: generate resume directly as Word
exports.generateResumeAsWord = async (req, res) => {
  try {
    console.log("📄 /api/v1/resume/generate-word hit");

    const { fullName, targetRole, jobDescription, skills = [] } = req.body;

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
      ? skills.split(",").map((s) => s.trim())
      : [];

    const prompt = `
You are a professional resume writer and ATS optimization expert. Generate a resume STRICTLY following this exact format.

❌ DO NOT USE markdown, asterisks for bullets, or any special formatting in the output.
✅ Output must be PLAIN TEXT with the exact structure below.

================================================================================
${fullName.toUpperCase()}
================================================================================

PROFESSIONAL SUMMARY
• Start with total years of experience. Write 4-5 lines about career focus and key achievements. Use complete sentences.

================================================================================

SKILLS
• Technical Skills: ${skillsList.join(", ")}
• [Add other relevant skill groups based on the job description]
• Soft Skills: Leadership, Problem Solving, Communication, Team Collaboration

================================================================================

WORK EXPERIENCE

[Most Recent Job Title] | [Most Recent Company] | [Location] | [Start Date] – [End Date]
• Detailed bullet point explaining what you did, how you did it, and the impact/result. Use 2-3 lines per bullet.
• Use strong action verbs: Designed, Developed, Led, Managed, Implemented, Optimized, etc.
• Each role should have 6-8 detailed bullets. No first-person pronouns.
• Focus on quantifiable achievements with metrics where possible.
• Align bullets to match the job description requirements.

================================================================================

EDUCATION
[Degree Name, e.g., Bachelor of Science in Computer Science]
[University Name] | [Location] | [Graduation Year]

================================================================================

CERTIFICATIONS
[Relevant Certification 1] | [Relevant Certification 2] | [Other relevant certifications]

================================================================================

FORMATTING RULES (MUST FOLLOW):
1. Use "•" for ALL bullets (not *, -, or any other symbol)
2. Put horizontal lines "================================================================================" between each major section
3. Keep section headers in ALL CAPS exactly as shown above
4. Each bullet point should be 2-3 lines of text (not one-line highlights)
5. No tables, columns, icons, emojis, or special characters
6. No markdown formatting of any kind
7. Use consistent date format: Month YYYY – Month YYYY (e.g., January 2020 – Present)
8. Education format: One line per degree, no bullets

NOW GENERATE THE RESUME TAILORED TO THIS JOB DESCRIPTION:

TARGET ROLE: ${targetRole || "Professional Role"}
JOB DESCRIPTION:
${jobDescription}

Generate the complete resume following ALL formatting rules above. Output ONLY the resume text.
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
    });

    const result = await model.generateContent(prompt);
    let resumeText = result?.response?.text() || "";
    resumeText = resumeText.replace(/```/g, "").trim();

    if (!resumeText) {
      return res.status(500).json({ message: "Empty response from AI" });
    }

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
          children: [
            new Paragraph({
              children: [
                makeRun(fullName.toUpperCase(), {
                  bold: true,
                  size: HEADING_SIZE,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
            }),
            ...parseResumeToParagraphs(resumeText),
          ],
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