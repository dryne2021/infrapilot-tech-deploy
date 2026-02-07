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
    
    // Format skills for template - bullet points
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
        
        // Format description as bullet points
        let description = "";
        if (exp.description) {
          if (Array.isArray(exp.description)) {
            description = exp.description.map(item => `  ◦ ${item}`).join("\n");
          } else if (typeof exp.description === "string") {
            // Split by newlines or periods
            const points = exp.description.split(/[\.\n]/)
              .filter(point => point.trim().length > 0)
              .map(point => point.trim());
            
            if (points.length > 0) {
              description = points.map(point => `  ◦ ${point}`).join("\n");
            } else {
              description = "  ◦ Experience details not provided";
            }
          }
        } else {
          description = "  ◦ Experience details not provided";
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
    
    // Set the template variables - EXACTLY as they appear in your template
    const templateData = {
      // NOTE: These variable names must match EXACTLY what's in your Word template
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
    
    console.log("📝 Template variables being set:", Object.keys(templateData));
    
    // Render the document
    doc.render(templateData);
    
    // Get the buffer
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });
    
    return buf;
    
  } catch (error) {
    console.error("❌ Error generating DOCX:", error.message);
    
    // Debug: Check what's in the template
    try {
      const templatePath = path.join(__dirname, "..", "templates", "resume_template.docx");
      const templateContent = await fs.readFile(templatePath, "binary");
      const PizZip = require("pizzip");
      const zip = new PizZip(templateContent);
      const xmlContent = zip.files["word/document.xml"].asText();
      
      // Find all template variables in the document
      const variableRegex = /\{\{([^}]+)\}\}/g;
      let match;
      const templateVariables = [];
      while ((match = variableRegex.exec(xmlContent)) !== null) {
        templateVariables.push(match[1].trim());
      }
      
      console.log("🔍 Found these variables in template:", templateVariables);
      console.log("📋 Trying to set these variables:", Object.keys(templateData || {}));
      
    } catch (debugError) {
      console.error("Debug failed:", debugError.message);
    }
    
    throw error;
  }
}

// Extract JSON from AI response
function extractJson(text) {
  try {
    // Clean the text
    let cleanedText = text.trim();
    
    // Remove markdown code blocks
    cleanedText = cleanedText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    
    // Find JSON object
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonStr = cleanedText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    }
    
    // Try parsing the whole text
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("❌ JSON extraction error:", error.message);
    console.log("Raw text (first 500 chars):", text.substring(0, 500));
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

  return `You are a professional resume writer. Create a tailored resume in JSON format.

CANDIDATE INFORMATION:
- Name: ${fullName}
- Target Role: ${targetRole || "Not specified"}
- Location: ${location || "Not specified"}
- Email: ${email || "Not specified"}
- Phone: ${phone || "Not specified"}
- Summary: ${summary || "Not provided"}
- Skills: ${JSON.stringify(skills)}
- Experience: ${JSON.stringify(experience)}
- Education: ${JSON.stringify(education)}
- Certifications: ${JSON.stringify(certifications)}

JOB DESCRIPTION:
${jobDescription}

OUTPUT FORMAT (JSON ONLY):
{
  "fullName": "${fullName}",
  "email": "${email || ""}",
  "phone": "${phone || ""}",
  "location": "${location || ""}",
  "summary": "Write a 2-3 sentence professional summary based on the candidate's background and tailored to the job description.",
  "skills": ["List relevant skills from candidate data"],
  "experience": [
    {
      "jobTitle": "Job title from candidate data",
      "company": "Company from candidate data",
      "location": "Location from candidate data",
      "startDate": "Start date (Month YYYY)",
      "endDate": "End date (Month YYYY) or 'Present'",
      "description": "Write 3-4 bullet point achievements. Start each with action verbs."
    }
  ],
  "education": [
    {
      "degree": "Degree from candidate data",
      "school": "School from candidate data",
      "location": "Location from candidate data",
      "graduationYear": "Year from candidate data"
    }
  ],
  "certifications": ["List certifications from candidate data"]
}

RULES:
1. Use ONLY information provided by the candidate
2. Do NOT invent companies, schools, or experiences
3. Tailor content to match job requirements
4. Focus on achievements and results
5. Use professional language`;
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

    console.log("👤 Generating for:", fullName);

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
      skills: Array.isArray(skills) ? skills : 
             typeof skills === "string" ? skills.split(",").map(s => s.trim()).filter(s => s) : [],
      experience: Array.isArray(experience) ? experience : [],
      education: Array.isArray(education) ? education : [],
      certifications: Array.isArray(certifications) ? certifications : []
    };

    const prompt = buildResumePrompt(candidateData, jobDescription);
    
    const finalPrompt = `IMPORTANT: Return ONLY valid JSON. No explanations, no markdown.

${prompt}`;

    console.log("🤖 Sending to Gemini...");

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

    console.log("📄 AI Response received");

    const resumeJson = extractJson(rawText);

    if (!resumeJson) {
      console.error("❌ JSON extraction failed, using fallback");
      // Create fallback resume from candidate data
      const fallbackResume = {
        fullName,
        email: email || "",
        phone: phone || "",
        location: location || "",
        summary: summary || `Experienced ${targetRole || "professional"} with skills in ${candidateData.skills.slice(0, 3).join(", ")}.`,
        skills: candidateData.skills,
        experience: candidateData.experience.map(exp => ({
          jobTitle: exp.jobTitle || exp.title || "",
          company: exp.company || exp.employer || "",
          location: exp.location || "",
          startDate: exp.startDate || exp.start || "",
          endDate: exp.endDate || exp.end || (exp.current ? "Present" : ""),
          description: exp.description || "Responsibilities and achievements in this role."
        })),
        education: candidateData.education,
        certifications: candidateData.certifications
      };
      
      const docBuffer = await generateResumeDocxFromTemplate(fallbackResume);
      
      const fileName = `Resume_${fullName.replace(/\s+/g, "_")}.docx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
      return res.send(docBuffer);
    }

    console.log("✅ Resume JSON generated");

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
    console.error("❌ Error:", error.message);
    
    return res.status(500).json({
      message: "Resume generation failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ---------- Simple resume generation ----------
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
      return res.status(400).json({ message: "Candidate name is required" });
    }

    // Create resume from direct data
    const resumeJson = {
      fullName,
      email: email || "",
      phone: phone || "",
      location: location || "",
      summary: summary || `Experienced professional seeking new opportunities.`,
      skills: Array.isArray(skills) ? skills : 
             typeof skills === "string" ? skills.split(",").map(s => s.trim()).filter(s => s) : [],
      experience: Array.isArray(experience) ? experience : [],
      education: Array.isArray(education) ? education : [],
      certifications: Array.isArray(certifications) ? certifications : [],
    };

    console.log("📝 Generating simple resume");

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
    console.error("❌ Error in simple resume:", error.message);
    return res.status(500).json({
      message: "Failed to generate resume",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ---------- Download existing resume ----------
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

    // Helper function
    const safeDecode = (str) => {
      if (!str) return "";
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    };

    // Parse JSON or use as text
    let experienceArray = [];
    if (experience) {
      try {
        const decoded = safeDecode(experience);
        experienceArray = JSON.parse(decoded);
      } catch (e) {
        experienceArray = [{
          jobTitle: "Professional Role",
          company: "Company",
          description: safeDecode(experience)
        }];
      }
    }

    let educationArray = [];
    if (education) {
      try {
        const decoded = safeDecode(education);
        educationArray = JSON.parse(decoded);
      } catch (e) {
        educationArray = [{
          degree: "Degree",
          school: "Institution",
          description: safeDecode(education)
        }];
      }
    }

    // Create resume object
    const resumeJson = {
      fullName: safeDecode(name),
      email: safeDecode(email),
      phone: safeDecode(phone),
      location: safeDecode(location),
      summary: safeDecode(summary) || "Professional resume",
      skills: skills ? safeDecode(skills).split(",").map(s => s.trim()).filter(s => s) : [],
      experience: experienceArray,
      education: educationArray,
      certifications: certifications ? safeDecode(certifications).split(",").map(c => c.trim()).filter(c => c) : []
    };

    console.log("📝 Generating DOCX from query data");

    // Generate DOCX
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
    console.error("❌ Error:", error.message);
    
    res.status(500).json({
      success: false,
      message: "Failed to create document",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ---------- Test template ----------
exports.testTemplate = async (req, res) => {
  try {
    console.log("🔧 Testing template");
    
    // Test data
    const testResume = {
      fullName: "John Doe",
      email: "john.doe@example.com",
      phone: "(123) 456-7890",
      location: "New York, NY",
      summary: "Experienced software developer with 5+ years in web application development. Skilled in JavaScript, React, and Node.js. Passionate about creating efficient and scalable solutions.",
      skills: ["JavaScript", "React", "Node.js", "Python", "AWS", "Docker", "Git", "REST APIs"],
      experience: [
        {
          jobTitle: "Senior Software Developer",
          company: "Tech Solutions Inc",
          location: "New York, NY",
          startDate: "January 2020",
          endDate: "Present",
          description: "Developed customer-facing web applications using modern frameworks. Led a team of 3 developers. Implemented CI/CD pipelines reducing deployment time by 60%."
        },
        {
          jobTitle: "Software Developer",
          company: "Digital Innovations",
          location: "Boston, MA",
          startDate: "June 2017",
          endDate: "December 2019",
          description: "Built RESTful APIs and frontend interfaces. Collaborated with UX designers to implement responsive designs. Reduced page load time by 40% through optimization."
        }
      ],
      education: [
        {
          degree: "Bachelor of Science in Computer Science",
          school: "State University",
          location: "Boston, MA",
          graduationYear: "2017",
          gpa: "3.8"
        }
      ],
      certifications: ["AWS Certified Developer", "React Professional Certification", "Scrum Master Certified"]
    };
    
    const docBuffer = await generateResumeDocxFromTemplate(testResume);
    
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Test_Resume.docx"`
    );
    
    return res.send(docBuffer);
    
  } catch (error) {
    console.error("❌ Test error:", error.message);
    
    // Try to diagnose the template issue
    try {
      const templatePath = path.join(__dirname, "..", "templates", "resume_template.docx");
      const content = await fs.readFile(templatePath, "binary");
      const PizZip = require("pizzip");
      const zip = new PizZip(content);
      const xml = zip.files["word/document.xml"].asText();
      
      const vars = [];
      const regex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = regex.exec(xml)) !== null) {
        vars.push(match[1].trim());
      }
      
      console.log("🔍 Variables in template:", vars);
      
    } catch (e) {
      console.error("Could not analyze template:", e.message);
    }
    
    return res.status(500).json({
      message: "Template test failed",
      error: error.message
    });
  }
};