// server/controllers/resumeController.js - FIXED VERSION

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Function to generate resume
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

    // Validate
    if (!fullName) {
      return res.status(400).json({ message: "Candidate name is required" });
    }

    if (!jobDescription) {
      return res.status(400).json({ 
        message: "Job description is required. Please paste the job description you want to tailor the resume for." 
      });
    }

    console.log("📋 Job Description length:", jobDescription.length);
    console.log("👤 Generating resume for:", fullName);

    // Get API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is missing" });
    }

    // Prepare skills list
    const skillsList = Array.isArray(skills) ? skills : 
                      typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : [];

    // Build prompt
    const prompt = `
Create a professional resume for ${fullName} that is TAILORED SPECIFICALLY to this job description:

JOB DESCRIPTION:
${jobDescription}

CANDIDATE INFORMATION:
Name: ${fullName}
Target Role: ${targetRole || 'Professional'}
Location: ${location || ''}
Email: ${email || ''}
Phone: ${phone || ''}
Summary: ${summary || ''}

Skills: ${skillsList.join(', ')}

Experience: ${experience.length} position(s)
Education: ${education.length} degree(s)

INSTRUCTIONS:
1. Read the job description carefully
2. Create a resume that matches the requirements in the job description
3. Use keywords and skills mentioned in the job description
4. Make it professional and ATS-friendly
5. Include quantifiable achievements
6. Tailor the summary to the specific job

Generate ONLY the resume text.
`;

    console.log("🤖 Sending to Gemini...");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.3,
      },
    });

    const result = await model.generateContent(prompt);
    const resumeText = result?.response?.text() || "";

    if (!resumeText.trim()) {
      return res.status(500).json({ message: "Empty response from AI" });
    }

    // Clean up
    const cleanedText = resumeText.replace(/```/g, "").trim();

    console.log(`✅ Generated resume (${cleanedText.length} chars)`);

    return res.status(200).json({
      success: true,
      resumeText: cleanedText,
      jobDescriptionLength: jobDescription.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      message: error.message || "Generation failed",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Helper function to safely decode URI components
function safeDecodeURIComponent(encodedURI) {
  try {
    // First try to decode
    return decodeURIComponent(encodedURI);
  } catch (error) {
    console.log("⚠️ First decode attempt failed, trying alternative...");
    
    // If it fails, it might already be decoded or have plus signs
    try {
      // Replace plus signs with spaces before decoding
      const withSpaces = encodedURI.replace(/\+/g, ' ');
      return decodeURIComponent(withSpaces);
    } catch (secondError) {
      console.log("⚠️ Second decode attempt failed, using raw data...");
      
      // If it's still failing, try to clean the URI
      try {
        // Encode only the problematic characters then decode
        const encoded = encodeURI(encodedURI).replace(/%25/g, '%');
        return decodeURIComponent(encoded);
      } catch (finalError) {
        console.log("⚠️ All decode attempts failed, returning raw string");
        // Return the original string as a last resort
        return encodedURI;
      }
    }
  }
}

// Function to download resume as Word document - FIXED VERSION
exports.downloadResumeAsWord = async (req, res) => {
  try {
    console.log("📥 /api/v1/resume/download hit");
    console.log("Query params received:", req.query);

    const { name, text, jobTitle } = req.query;
    
    if (!name || !text) {
      return res.status(400).json({ 
        success: false,
        message: "Name and resume text are required" 
      });
    }

    // Log raw values before decoding
    console.log("Raw text length:", text.length);
    console.log("Raw name:", name);
    
    // Use safe decoding
    const decodedText = safeDecodeURIComponent(text);
    const decodedName = safeDecodeURIComponent(name);
    const decodedJobTitle = jobTitle ? safeDecodeURIComponent(jobTitle) : "Professional Resume";

    console.log(`Generating Word document for: ${decodedName}`);
    console.log(`Job Title: ${decodedJobTitle}`);
    console.log(`Resume text length: ${decodedText.length} characters`);

    // Import docx
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx");

    // Create Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: "RESUME",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          }),
          
          // Candidate Name
          new Paragraph({
            children: [
              new TextRun({
                text: decodedName.toUpperCase(),
                bold: true,
                size: 32,
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          
          // Job Title
          new Paragraph({
            text: `Applying for: ${decodedJobTitle}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          
          // Parse resume text into paragraphs
          ...parseResumeToParagraphs(decodedText)
        ]
      }]
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    
    // Set headers for file download
    const fileName = `Resume_${decodedName.replace(/\s+/g, '_')}_${Date.now()}.docx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
    
    console.log(`✅ Word document generated: ${fileName}`);
    
  } catch (error) {
    console.error("❌ Error creating Word document:", error);
    console.error(error.stack);
    
    // Fallback: send as text file with safe decoding
    try {
      const decodedText = safeDecodeURIComponent(req.query.text || '');
      const decodedName = safeDecodeURIComponent(req.query.name || 'Candidate');
      const fileName = `Resume_${decodedName.replace(/\s+/g, '_')}.txt`;
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(decodedText);
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
      res.status(500).json({ 
        success: false,
        message: "Failed to create document",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: "Check if the resume text contains malformed URI characters"
      });
    }
  }
};

// Helper function to parse resume text into Word paragraphs
function parseResumeToParagraphs(resumeText) {
  const paragraphs = [];
  const lines = resumeText.split('\n');
  
  for (const line of lines) {
    if (line.trim() === '') continue;
    
    // Check if line is a section header (all caps or has colons)
    if (isSectionHeader(line)) {
      paragraphs.push(
        new Paragraph({
          text: line.toUpperCase(),
          heading: HeadingLevel.HEADING_2,
          bold: true,
          spacing: { before: 400, after: 200 }
        })
      );
    } else if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
      // Bullet points
      paragraphs.push(
        new Paragraph({
          text: line,
          bullet: { level: 0 },
          indent: { left: 400 },
          spacing: { after: 100 }
        })
      );
    } else {
      // Regular paragraph
      paragraphs.push(
        new Paragraph({
          text: line,
          spacing: { after: 100 }
        })
      );
    }
  }
  
  return paragraphs;
}

// Helper function to identify section headers
function isSectionHeader(line) {
  const headers = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'EXPERIENCE', 'WORK EXPERIENCE',
    'EDUCATION', 'SKILLS', 'TECHNICAL SKILLS', 'CERTIFICATIONS',
    'PROJECTS', 'ACHIEVEMENTS', 'CONTACT', 'PROFESSIONAL PROFILE',
    'CORE COMPETENCIES', 'LANGUAGES', 'REFERENCES'
  ];
  
  const upperLine = line.toUpperCase().trim();
  return headers.some(header => upperLine.includes(header)) || 
         (line.length < 50 && line === line.toUpperCase());
}

// Optional: Function to generate resume directly as Word
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
      jobId,
      jobDescription,
    } = req.body;

    // Validate
    if (!fullName || !jobDescription) {
      return res.status(400).json({ 
        message: "Candidate name and job description are required" 
      });
    }

    // First generate the resume text
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is missing" });
    }

    const skillsList = Array.isArray(skills) ? skills : 
                      typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : [];

    const prompt = `
Create a professional resume for ${fullName} that is TAILORED SPECIFICALLY to this job description:

JOB DESCRIPTION:
${jobDescription}

CANDIDATE INFORMATION:
Name: ${fullName}
Target Role: ${targetRole || 'Professional'}
Location: ${location || ''}
Email: ${email || ''}
Phone: ${phone || ''}
Summary: ${summary || ''}

Skills: ${skillsList.join(', ')}

Experience: ${experience.length} position(s)
Education: ${education.length} degree(s)

INSTRUCTIONS:
1. Read the job description carefully
2. Create a resume that matches the requirements in the job description
3. Use keywords and skills mentioned in the job description
4. Make it professional and ATS-friendly
5. Include quantifiable achievements
6. Tailor the summary to the specific job

Generate ONLY the resume text.
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.3,
      },
    });

    const result = await model.generateContent(prompt);
    let resumeText = result?.response?.text() || "";

    if (!resumeText.trim()) {
      return res.status(500).json({ message: "Empty response from AI" });
    }

    // Clean up
    resumeText = resumeText.replace(/```/g, "").trim();

    console.log(`✅ Generated resume (${resumeText.length} chars)`);

    // Now convert to Word document
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require("docx");

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "RESUME",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: fullName.toUpperCase(),
                bold: true,
                size: 32,
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          
          new Paragraph({
            text: `Applying for: ${targetRole || 'Professional Position'}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          
          ...parseResumeToParagraphs(resumeText)
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `Resume_${fullName.replace(/\s+/g, '_')}_${Date.now()}.docx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
    
    console.log(`✅ Word document generated directly: ${fileName}`);
    
  } catch (error) {
    console.error("❌ Error generating Word resume:", error);
    res.status(500).json({ 
      message: error.message || "Generation failed",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};