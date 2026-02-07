// server/controllers/resumeController.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs").promises;
const path = require("path");

// Helper function to generate DOCX from template
async function generateResumeDocxFromTemplate(resumeJson) {
  try {
    const PizZip = require("pizzip");
    const Docxtemplater = require("docxtemplater");
    
    // Use the specific template path
    const templatePath = path.join(__dirname, "..", "templates", "resume_template.docx");
    
    console.log("📄 Loading template from:", templatePath);
    
    // Read the template file
    const templateContent = await fs.readFile(templatePath, "binary");
    
    // Create a zip instance
    const zip = new PizZip(templateContent);
    
    // Initialize docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    
    // Format skills for template
    const skillsText = Array.isArray(resumeJson.skills) ? 
      resumeJson.skills.map(skill => `• ${skill}`).join("\n") : 
      (resumeJson.skills || "");
    
    // Format experience for template
    const experienceText = formatExperienceForTemplate(resumeJson.experience || []);
    
    // Format education for template
    const educationText = formatEducationForTemplate(resumeJson.education || []);
    
    // Format certifications for template
    const certificationsText = Array.isArray(resumeJson.certifications) ? 
      resumeJson.certifications.map(cert => `• ${cert}`).join("\n") : 
      (resumeJson.certifications || "");
    
    // Set the template variables matching your template
    const templateData = {
      // Template variables (ALL CAPS as in your template)
      FULL_NAME: resumeJson.fullName || "",
      EMAIL: resumeJson.email || "",
      PHONE: resumeJson.phone || "",
      LOCATION: resumeJson.location || "",
      SUMMARY: resumeJson.summary || "",
      SKILLS: skillsText,
      EXPERIENCE: experienceText,
      EDUCATION: educationText,
      CERTIFICATIONS: certificationsText
    };
    
    console.log("📝 Template data prepared:", Object.keys(templateData));
    
    // Render the document
    doc.render(templateData);
    
    // Get the buffer
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });
    
    return buf;
    
  } catch (error) {
    console.error("❌ Error generating DOCX from template:", error);
    if (error.properties && error.properties.errors) {
      console.error("Template errors:", error.properties.errors);
    }
    throw error;
  }
}

// Helper functions for template formatting
function formatExperienceForTemplate(experienceArray) {
  if (!Array.isArray(experienceArray) || experienceArray.length === 0) {
    return "• No experience information provided";
  }
  
  return experienceArray.map((exp) => {
    const title = exp.jobTitle || exp.title || exp.position || exp.role || "";
    const company = exp.company || exp.employer || exp.organization || "";
    const location = exp.location || exp.city || exp.state || exp.country || "";
    const startDate = exp.startDate || exp.start || exp.from || "";
    const endDate = exp.endDate || exp.end || exp.to || (exp.current ? "Present" : "");
    
    let description = "";
    if (exp.description) {
      if (Array.isArray(exp.description)) {
        description = exp.description.map(item => `  ◦ ${item}`).join("\n");
      } else if (typeof exp.description === "string") {
        // Split by newlines and format as sub-bullets
        description = exp.description.split('\n')
          .filter(line => line.trim())
          .map(line => `  ◦ ${line.trim()}`)
          .join("\n");
      }
    }
    
    const dateRange = startDate && endDate ? `${startDate} – ${endDate}` : (startDate || endDate || "");
    const locationInfo = location ? ` | ${location}` : "";
    
    return `• ${title} | ${company}${locationInfo} | ${dateRange}\n${description}`;
  }).join("\n\n");
}

function formatEducationForTemplate(educationArray) {
  if (!Array.isArray(educationArray) || educationArray.length === 0) {
    return "• No education information provided";
  }
  
  return educationArray.map((edu) => {
    const degree = edu.degree || edu.program || edu.course || "";
    const school = edu.school || edu.university || edu.college || edu.institution || "";
    const location = edu.location || edu.city || edu.state || edu.country || "";
    const graduationYear = edu.graduationYear || edu.year || edu.graduationDate || edu.completionYear || "";
    const gpa = edu.gpa || edu.grade || "";
    
    const gpaInfo = gpa ? ` (GPA: ${gpa})` : "";
    const locationInfo = location ? ` | ${location}` : "";
    
    return `• ${degree}${gpaInfo}\n  ${school}${locationInfo}${graduationYear ? ` | ${graduationYear}` : ""}`;
  }).join("\n\n");
}

// Extract JSON from AI response
function extractJson(text) {
  try {
    // Try to find JSON in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    // If no match, try to parse the whole text
    return JSON.parse(text);
  } catch (error) {
    console.error("JSON extraction failed:", error);
    return null;
  }
}

// Build resume prompt that asks for JSON output
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
    certifications = [],
    projects = []
  } = candidateData;

  return `You are a professional resume writer. Create a JSON resume based ONLY on the candidate's provided information. DO NOT invent or add any information not provided by the candidate.

CANDIDATE INFORMATION:
- Full Name: ${fullName}
- Target Role: ${targetRole || "Not specified"}
- Location: ${location || "Not specified"}
- Email: ${email || "Not specified"}
- Phone: ${phone || "Not specified"}
- Summary: ${summary || "Not provided"}

CANDIDATE SKILLS: ${JSON.stringify(skills)}
CANDIDATE EXPERIENCE: ${JSON.stringify(experience)}
CANDIDATE EDUCATION: ${JSON.stringify(education)}
CANDIDATE CERTIFICATIONS: ${JSON.stringify(certifications)}
CANDIDATE PROJECTS: ${JSON.stringify(projects)}

JOB DESCRIPTION TO TAILOR FOR:
${jobDescription}

GENERATE A JSON OBJECT WITH THIS STRUCTURE:
{
  "fullName": "${fullName}",
  "targetRole": "${targetRole || ""}",
  "location": "${location || ""}",
  "email": "${email || ""}",
  "phone": "${phone || ""}",
  "summary": "Write a professional summary (3-4 sentences) based ONLY on the candidate's provided information. Tailor it to match the job description requirements.",
  "skills": ["List skills from candidate data, prioritizing ones mentioned in job description. Use only skills mentioned by candidate."],
  "experience": [
    {
      "jobTitle": "Title from candidate data",
      "company": "Company from candidate data",
      "location": "Location from candidate data",
      "startDate": "Start date from candidate data (format: Month YYYY)",
      "endDate": "End date from candidate data (format: Month YYYY) or 'Present' if current",
      "current": true/false,
      "description": ["Write 3-5 achievement-focused bullet points tailored to the job description. Use ONLY information from candidate's experience data. Start each bullet with strong action verbs like Developed, Implemented, Led, Managed, etc."]
    }
  ],
  "education": [
    {
      "degree": "Degree from candidate data",
      "school": "School from candidate data",
      "location": "Location from candidate data",
      "graduationYear": "Year from candidate data",
      "gpa": "GPA from candidate data if provided"
    }
  ],
  "certifications": ["List certifications from candidate data only"]
}

CRITICAL RULES:
1. Use ONLY the candidate's provided information
2. Do NOT invent companies, schools, experiences, or any other information
3. If candidate didn't provide something, leave it as empty string or empty array
4. Tailor bullet points to match job description keywords while keeping factual
5. Make skills list relevant to job description but ONLY use skills mentioned by candidate
6. Focus on achievements and results in experience descriptions
7. Keep all content professional and concise
8. For dates, use format: "Month YYYY" (e.g., "January 2020")
9. If no data provided for a section, return empty array or empty string`;
}

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
      linkedin,
      jobId,
      jobDescription,
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: "Candidate name is required" });
    }

    if (!jobDescription) {
      return res.status(400).json({
        message: "Job description is required.",
      });
    }

    console.log("📋 Job Description length:", jobDescription.length);
    console.log("👤 Generating resume for:", fullName);
    console.log("📊 Using candidate's actual data only");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is missing" });
    }

    const candidateData = {
      fullName,
      targetRole,
      location,
      email,
      phone,
      summary,
      linkedin,
      skills: Array.isArray(skills) ? skills : 
             typeof skills === "string" ? skills.split(",").map(s => s.trim()).filter(s => s) : [],
      experience: Array.isArray(experience) ? experience : [],
      education: Array.isArray(education) ? education : [],
      certifications: Array.isArray(certifications) ? certifications : [],
      projects: Array.isArray(projects) ? projects : []
    };

    const prompt = buildResumePrompt(candidateData, jobDescription);
    
    const finalPrompt = `
IMPORTANT RULES:
- Return ONLY valid JSON
- No explanations, no markdown
- Response must start with { and end with }
- Use ONLY candidate's provided information
- Do NOT invent any companies, schools, or experiences
- If information is missing, use empty strings/arrays
- Format dates as "Month YYYY"

${prompt}
`;

    console.log("🤖 Sending to Gemini...");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: { 
        maxOutputTokens: 4096, 
        temperature: 0.2,
        responseMimeType: "application/json"
      },
    });

    const result = await model.generateContent(finalPrompt);
    const rawText = result?.response?.text() || "";

    console.log("📄 Raw AI response received");

    const resumeJson = extractJson(rawText);

    if (!resumeJson) {
      console.error("❌ Failed to extract JSON from:", rawText.substring(0, 500));
      return res.status(500).json({ 
        message: "Failed to generate valid resume data",
        rawText: rawText.substring(0, 500)
      });
    }

    console.log("✅ Generated resume JSON with template variables");

    // Generate DOCX from the template
    const docBuffer = await generateResumeDocxFromTemplate(resumeJson);

    const fileName = `Resume_${fullName.replace(/\s+/g, "_")}_${Date.now()}.docx`;

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
    console.error("❌ Error:", error);
    return res.status(500).json({
      message: error.message || "Generation failed",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// ---------- Download existing resume as Word ----------
exports.downloadResumeAsWord = async (req, res) => {
  try {
    console.log("📥 /api/v1/resume/download hit");

    const { name, text, jobTitle, email, phone, location, skills, experience, education, certifications, summary } = req.query;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Helper function to safely decode
    const safeDecode = (str) => str ? decodeURIComponent(str) : "";

    // Create resumeJson object from query parameters
    const resumeJson = {
      fullName: safeDecode(name),
      targetRole: safeDecode(jobTitle) || "",
      location: safeDecode(location) || "",
      email: safeDecode(email) || "",
      phone: safeDecode(phone) || "",
      summary: safeDecode(summary) || "Professional resume",
      skills: skills ? safeDecode(skills).split(",").map(s => s.trim()).filter(s => s) : [],
      experience: experience ? JSON.parse(safeDecode(experience)) : [],
      education: education ? JSON.parse(safeDecode(education)) : [],
      certifications: certifications ? safeDecode(certifications).split(",").map(c => c.trim()).filter(c => c) : []
    };

    console.log("📝 Generating DOCX from provided data");

    // Use the template function to generate DOCX
    const docBuffer = await generateResumeDocxFromTemplate(resumeJson);

    const fileName = `Resume_${resumeJson.fullName.replace(/\s+/g, "_")}_${Date.now()}.docx`;

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
    console.error("❌ Error creating Word document:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to create document",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ---------- Generate resume directly as Word ----------
exports.generateResumeAsWord = async (req, res) => {
  try {
    console.log("📄 /api/v1/resume/generate-word hit");

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
      linkedin,
      jobId,
      jobDescription,
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: "Candidate name is required" });
    }

    if (!jobDescription) {
      return res.status(400).json({
        message: "Job description is required.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is missing" });
    }

    const candidateData = {
      fullName,
      targetRole,
      location,
      email,
      phone,
      summary,
      linkedin,
      skills: Array.isArray(skills) ? skills : 
             typeof skills === "string" ? skills.split(",").map(s => s.trim()).filter(s => s) : [],
      experience: Array.isArray(experience) ? experience : [],
      education: Array.isArray(education) ? education : [],
      certifications: Array.isArray(certifications) ? certifications : [],
      projects: Array.isArray(projects) ? projects : []
    };

    const prompt = buildResumePrompt(candidateData, jobDescription);
    
    const finalPrompt = `
IMPORTANT RULES:
- Return ONLY valid JSON
- No explanations, no markdown
- Response must start with { and end with }
- Use ONLY candidate's provided information
- Do NOT invent any companies, schools, or experiences

${prompt}
`;

    console.log("🤖 Sending to Gemini for Word generation...");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: { 
        maxOutputTokens: 4096, 
        temperature: 0.2,
        responseMimeType: "application/json"
      },
    });

    const result = await model.generateContent(finalPrompt);
    const rawText = result?.response?.text() || "";

    const resumeJson = extractJson(rawText);

    if (!resumeJson) {
      console.error("❌ Failed to extract JSON");
      return res.status(500).json({ message: "Invalid JSON from AI" });
    }

    // Generate DOCX from the template
    const docBuffer = await generateResumeDocxFromTemplate(resumeJson);

    const fileName = `Resume_${fullName.replace(/\s+/g, "_")}_${Date.now()}.docx`;

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
    console.error("❌ Error generating Word resume:", error);
    res.status(500).json({
      message: error.message || "Generation failed",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};