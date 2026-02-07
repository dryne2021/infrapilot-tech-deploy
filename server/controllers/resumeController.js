// server/controllers/resumeController.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs").promises;
const path = require("path");

// Helper function to fix template issues
async function fixTemplateContent(templatePath) {
  try {
    // Read the template
    const content = await fs.readFile(templatePath, "binary");
    const PizZip = require("pizzip");
    const zip = new PizZip(content);
    
    // Get the main document XML
    let xmlContent = zip.files["word/document.xml"].asText();
    
    // Fix common template issues:
    
    // 1. Fix split template tags (like {{CERT\nIFICATIONS}} or {{CERTIFICATIONS\n}})
    xmlContent = xmlContent.replace(/\{\{([^}]*)\n([^}]*)\}\}/g, '{{$1$2}}');
    
    // 2. Fix tags with spaces or line breaks inside
    xmlContent = xmlContent.replace(/\{\{\s*([^}]+)\s*\}\}/g, '{{$1}}');
    
    // 3. Make sure all tags are on single lines
    xmlContent = xmlContent.replace(/(\{\{[^}]*\}\})/g, (match) => {
      return match.replace(/\n/g, '').replace(/\r/g, '');
    });
    
    // Update the zip with fixed content
    zip.files["word/document.xml"] = xmlContent;
    
    return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
    
  } catch (error) {
    console.error("Template fix failed:", error.message);
    throw error;
  }
}

// Helper function to generate DOCX from template
async function generateResumeDocxFromTemplate(resumeJson) {
  try {
    const PizZip = require("pizzip");
    const Docxtemplater = require("docxtemplater");
    
    // Use the specific template path
    const templatePath = path.join(__dirname, "..", "templates", "resume_template.docx");
    
    console.log("📄 Loading template from:", templatePath);
    
    // First, try to fix any template issues
    let fixedBuffer;
    try {
      fixedBuffer = await fixTemplateContent(templatePath);
    } catch (fixError) {
      console.log("⚠️ Could not fix template, using original:", fixError.message);
      // Use original if fix fails
      fixedBuffer = await fs.readFile(templatePath, "binary");
    }
    
    // Create a zip instance from the (possibly fixed) template
    const zip = new PizZip(fixedBuffer);
    
    // Initialize docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // Format skills for template - simple bullet points
    let skillsText = "";
    if (Array.isArray(resumeJson.skills) && resumeJson.skills.length > 0) {
      skillsText = resumeJson.skills.map(skill => `• ${skill}`).join("\n");
    } else if (resumeJson.skills && typeof resumeJson.skills === "string") {
      skillsText = `• ${resumeJson.skills}`;
    } else {
      skillsText = "• Skills not specified";
    }
    
    // Format experience for template
    let experienceText = "";
    if (Array.isArray(resumeJson.experience) && resumeJson.experience.length > 0) {
      experienceText = resumeJson.experience.map((exp) => {
        const title = exp.jobTitle || exp.title || exp.position || exp.role || "Professional Role";
        const company = exp.company || exp.employer || exp.organization || "Company";
        const location = exp.location || exp.city || exp.state || exp.country || "";
        const startDate = exp.startDate || exp.start || exp.from || "";
        const endDate = exp.endDate || exp.end || exp.to || (exp.current ? "Present" : "");
        
        // Format description
        let description = "";
        if (exp.description) {
          if (Array.isArray(exp.description)) {
            description = exp.description.map(item => `  ◦ ${item}`).join("\n");
          } else if (typeof exp.description === "string") {
            // Clean and format description
            const points = exp.description
              .replace(/\. /g, '.\n')
              .split('\n')
              .filter(point => point.trim().length > 0)
              .map(point => `  ◦ ${point.trim()}`);
            
            description = points.join("\n");
          }
        }
        
        if (!description) {
          description = "  ◦ Responsibilities and achievements in this role";
        }
        
        const dateRange = startDate && endDate ? `${startDate} – ${endDate}` : (startDate || endDate || "");
        const locationInfo = location ? ` | ${location}` : "";
        
        return `• ${title} | ${company}${locationInfo}${dateRange ? ` | ${dateRange}` : ""}\n${description}`;
      }).join("\n\n");
    } else {
      experienceText = "• Experience not specified";
    }
    
    // Format education for template
    let educationText = "";
    if (Array.isArray(resumeJson.education) && resumeJson.education.length > 0) {
      educationText = resumeJson.education.map((edu) => {
        const degree = edu.degree || edu.program || edu.course || "Degree";
        const school = edu.school || edu.university || edu.college || edu.institution || "Institution";
        const location = edu.location || edu.city || edu.state || edu.country || "";
        const graduationYear = edu.graduationYear || edu.year || edu.graduationDate || edu.completionYear || "";
        const gpa = edu.gpa || edu.grade || "";
        
        const gpaInfo = gpa ? ` (GPA: ${gpa})` : "";
        const locationInfo = location ? ` | ${location}` : "";
        const yearInfo = graduationYear ? ` | ${graduationYear}` : "";
        
        return `• ${degree}${gpaInfo}\n  ${school}${locationInfo}${yearInfo}`;
      }).join("\n\n");
    } else {
      educationText = "• Education not specified";
    }
    
    // Format certifications for template
    let certificationsText = "";
    if (Array.isArray(resumeJson.certifications) && resumeJson.certifications.length > 0) {
      certificationsText = resumeJson.certifications.map(cert => `• ${cert}`).join("\n");
    } else if (resumeJson.certifications && typeof resumeJson.certifications === "string") {
      certificationsText = `• ${resumeJson.certifications}`;
    } else {
      certificationsText = "• Certifications not specified";
    }
    
    // Create template data - using EXACT variable names from your template
    const templateData = {
      FULL_NAME: resumeJson.fullName || "Candidate Name",
      EMAIL: resumeJson.email || "email@example.com",
      PHONE: resumeJson.phone || "(123) 456-7890",
      LOCATION: resumeJson.location || "City, State",
      SUMMARY: resumeJson.summary || "Professional summary not provided.",
      SKILLS: skillsText,
      EXPERIENCE: experienceText,
      EDUCATION: educationText,
      CERTIFICATIONS: certificationsText
    };
    
    console.log("📝 Setting template variables:", Object.keys(templateData));
    
    // Try to render
    try {
      doc.render(templateData);
    } catch (renderError) {
      console.error("❌ Render error:", renderError.message);
      
      // Try alternative approach: create a simple template
      if (renderError.message.includes("duplicate") || renderError.message.includes("tag")) {
        console.log("🔄 Creating simple template as fallback...");
        return await createSimpleDocx(resumeJson);
      }
      throw renderError;
    }
    
    // Get the buffer
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });
    
    return buf;
    
  } catch (error) {
    console.error("❌ Error generating DOCX:", error.message);
    
    // Final fallback: create a simple document
    try {
      return await createSimpleDocx(resumeJson);
    } catch (fallbackError) {
      console.error("❌ Even fallback failed:", fallbackError.message);
      throw error;
    }
  }
}

// Fallback function to create a simple DOCX without template
async function createSimpleDocx(resumeJson) {
  try {
    console.log("🔄 Creating simple DOCX as fallback");
    
    // Create a minimal document using docx library as fallback
    const { Document, Packer, Paragraph, TextRun } = require("docx");
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: resumeJson.fullName || "Resume",
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${resumeJson.email || ""} | ${resumeJson.phone || ""} | ${resumeJson.location || ""}`,
                size: 24,
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),
          new Paragraph({
            children: [
              new TextRun({
                text: "PROFESSIONAL SUMMARY",
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: resumeJson.summary || "Professional summary",
                size: 24,
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),
          new Paragraph({
            children: [
              new TextRun({
                text: "SKILLS",
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: Array.isArray(resumeJson.skills) ? resumeJson.skills.join(", ") : (resumeJson.skills || ""),
                size: 24,
              }),
            ],
          }),
        ],
      }],
    });
    
    return Packer.toBuffer(doc);
    
  } catch (error) {
    console.error("❌ Simple DOCX creation failed:", error.message);
    throw error;
  }
}

// Extract JSON from AI response
function extractJson(text) {
  try {
    let cleanedText = text.trim();
    
    // Remove markdown
    cleanedText = cleanedText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    
    // Find JSON
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonStr = cleanedText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    }
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("❌ JSON extraction failed:", error.message);
    return null;
  }
}

// Build resume prompt
function buildResumePrompt(candidateData, jobDescription) {
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
    certifications = []
  } = candidateData;

  return `Create a resume in JSON format using ONLY candidate's provided information.

CANDIDATE:
- Name: ${fullName}
- Target Role: ${targetRole || ""}
- Location: ${location || ""}
- Email: ${email || ""}
- Phone: ${phone || ""}
- Summary: ${summary || ""}
- Skills: ${JSON.stringify(skills)}
- Experience: ${JSON.stringify(experience)}
- Education: ${JSON.stringify(education)}
- Certifications: ${JSON.stringify(certifications)}

JOB DESCRIPTION:
${jobDescription}

OUTPUT JSON:
{
  "fullName": "${fullName}",
  "email": "${email || ""}",
  "phone": "${phone || ""}",
  "location": "${location || ""}",
  "summary": "Professional summary here",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "jobTitle": "Job title",
      "company": "Company",
      "location": "Location",
      "startDate": "Month YYYY",
      "endDate": "Month YYYY",
      "description": "Achievement 1. Achievement 2."
    }
  ],
  "education": [
    {
      "degree": "Degree",
      "school": "School",
      "location": "Location",
      "graduationYear": "YYYY"
    }
  ],
  "certifications": ["cert1", "cert2"]
}

RULES:
1. Use only candidate's information
2. No invented data
3. Tailor to job description`;
}

// ---------- Resume generation ----------
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
      jobDescription,
    } = req.body;

    if (!fullName || !jobDescription) {
      return res.status(400).json({ 
        message: "Name and job description are required" 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "API key missing" });
    }

    const candidateData = {
      fullName,
      targetRole,
      location,
      email,
      phone,
      summary,
      skills: Array.isArray(skills) ? skills : 
             typeof skills === "string" ? skills.split(",").map(s => s.trim()).filter(s => s) : [],
      experience: Array.isArray(experience) ? experience : [],
      education: Array.isArray(education) ? education : [],
      certifications: Array.isArray(certifications) ? certifications : []
    };

    const prompt = buildResumePrompt(candidateData, jobDescription);
    
    const finalPrompt = `Return ONLY JSON:\n\n${prompt}`;

    console.log("🤖 Calling AI...");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: { 
        maxOutputTokens: 4096, 
        temperature: 0.2,
      },
    });

    const result = await model.generateContent(finalPrompt);
    const rawText = result?.response?.text() || "";

    console.log("📄 AI response received");

    let resumeJson = extractJson(rawText);

    // If JSON extraction fails, use candidate data directly
    if (!resumeJson) {
      console.log("⚠️ Using candidate data directly");
      resumeJson = {
        fullName,
        email: email || "",
        phone: phone || "",
        location: location || "",
        summary: summary || `Experienced ${targetRole || "professional"}.`,
        skills: candidateData.skills,
        experience: candidateData.experience,
        education: candidateData.education,
        certifications: candidateData.certifications
      };
    }

    console.log("✅ Generating DOCX...");

    // Generate DOCX
    const docBuffer = await generateResumeDocxFromTemplate(resumeJson);

    const fileName = `Resume_${fullName.replace(/\s+/g, "_")}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    return res.send(docBuffer);

  } catch (error) {
    console.error("❌ Final error:", error.message);
    
    return res.status(500).json({
      message: "Resume generation failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ---------- Simple resume ----------
exports.generateSimpleResume = async (req, res) => {
  try {
    console.log("✅ /api/v1/resume/simple hit");

    const {
      fullName,
      email,
      phone,
      location,
      summary,
      skills = [],
      experience = [],
      education = [],
      certifications = [],
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: "Name required" });
    }

    const resumeJson = {
      fullName,
      email: email || "",
      phone: phone || "",
      location: location || "",
      summary: summary || `Professional resume for ${fullName}.`,
      skills: Array.isArray(skills) ? skills : 
             typeof skills === "string" ? skills.split(",").map(s => s.trim()).filter(s => s) : [],
      experience: Array.isArray(experience) ? experience : [],
      education: Array.isArray(education) ? education : [],
      certifications: Array.isArray(certifications) ? certifications : [],
    };

    console.log("📝 Generating simple resume");

    const docBuffer = await generateResumeDocxFromTemplate(resumeJson);

    const fileName = `Resume_${fullName.replace(/\s+/g, "_")}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    return res.send(docBuffer);

  } catch (error) {
    console.error("❌ Simple resume error:", error.message);
    return res.status(500).json({
      message: "Failed to generate resume",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ---------- Download resume ----------
exports.downloadResumeAsWord = async (req, res) => {
  try {
    console.log("📥 /api/v1/resume/download hit");

    const { 
      name = "Candidate", 
      email = "", 
      phone = "", 
      location = "", 
      summary = "", 
      skills = "", 
      experience = "", 
      education = "", 
      certifications = "" 
    } = req.query;

    // Helper
    const safeDecode = (str) => {
      if (!str) return "";
      try {
        return decodeURIComponent(str);
      } catch {
        return str;
      }
    };

    // Parse data
    const resumeJson = {
      fullName: safeDecode(name),
      email: safeDecode(email),
      phone: safeDecode(phone),
      location: safeDecode(location),
      summary: safeDecode(summary) || `Resume for ${safeDecode(name)}`,
      skills: skills ? safeDecode(skills).split(",").map(s => s.trim()).filter(s => s) : [],
      experience: experience ? JSON.parse(safeDecode(experience)) : [],
      education: education ? JSON.parse(safeDecode(education)) : [],
      certifications: certifications ? safeDecode(certifications).split(",").map(c => c.trim()).filter(c => c) : []
    };

    console.log("📝 Generating from query");

    const docBuffer = await generateResumeDocxFromTemplate(resumeJson);

    const fileName = `Resume_${resumeJson.fullName.replace(/\s+/g, "_")}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    
    return res.send(docBuffer);

  } catch (error) {
    console.error("❌ Download error:", error.message);
    
    res.status(500).json({
      success: false,
      message: "Failed to create document",
    });
  }
};

// ---------- Fix template endpoint ----------
exports.fixTemplate = async (req, res) => {
  try {
    console.log("🔧 Fixing template...");
    
    const templatePath = path.join(__dirname, "..", "templates", "resume_template.docx");
    
    // Read and fix template
    const content = await fs.readFile(templatePath, "binary");
    const PizZip = require("pizzip");
    const zip = new PizZip(content);
    
    let xmlContent = zip.files["word/document.xml"].asText();
    
    // Find all template variables
    const variableRegex = /\{\{([^}]+)\}\}/g;
    let match;
    const variables = [];
    
    while ((match = variableRegex.exec(xmlContent)) !== null) {
      variables.push(match[1].trim());
    }
    
    console.log("🔍 Found variables:", variables);
    
    // Show problematic areas
    const lines = xmlContent.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('{{') && line.includes('}}')) {
        console.log(`Line ${index + 1}: ${line.substring(0, 100)}`);
      }
    });
    
    return res.json({
      success: true,
      variables,
      message: "Template analyzed. Check console for details."
    });
    
  } catch (error) {
    console.error("❌ Fix template error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to analyze template",
      error: error.message
    });
  }
};