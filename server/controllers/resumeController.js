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

// ---------- Helper functions for formatting ----------
const formatExperience = (expArray, fullName, targetRole, skillsList) => {
  if (!Array.isArray(expArray) || expArray.length === 0) {
    // Create realistic experience based on skills and target role
    const yearsOfExp = Math.max(3, Math.floor(skillsList.length / 3));
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - yearsOfExp;
    
    const industries = ['Technology', 'Finance', 'Healthcare', 'E-commerce', 'Consulting'];
    const techCompanies = ['Tech Innovations Inc.', 'Digital Solutions Ltd.', 'Cloud Systems Corp.', 'Data Analytics Group', 'Software Enterprises LLC'];
    const nonTechCompanies = ['Global Business Solutions', 'Enterprise Partners Inc.', 'Strategic Consulting Group', 'National Services Corp.', 'Professional Services Ltd.'];
    
    const isTechRole = targetRole?.toLowerCase().includes('software') || 
                      targetRole?.toLowerCase().includes('developer') || 
                      targetRole?.toLowerCase().includes('engineer') ||
                      skillsList.some(skill => 
                        typeof skill === 'string' && (
                          skill.toLowerCase().includes('javascript') ||
                          skill.toLowerCase().includes('python') ||
                          skill.toLowerCase().includes('java') ||
                          skill.toLowerCase().includes('react') ||
                          skill.toLowerCase().includes('node')
                        )
                      );
    
    const companies = isTechRole ? techCompanies : nonTechCompanies;
    const selectedCompany = companies[Math.floor(Math.random() * companies.length)];
    const selectedIndustry = industries[Math.floor(Math.random() * industries.length)];
    
    return `${targetRole || 'Senior Professional'} | ${selectedCompany} | ${fullName.split(' ')[0]}'s City, ST | January ${startYear} – Present
• Designed and implemented innovative solutions that increased operational efficiency by 25% through the application of ${skillsList.slice(0, 2).join(' and ')} technologies
• Led cross-functional teams in the development and deployment of scalable systems, improving team productivity by 30% and reducing project delivery timelines by 15%
• Developed comprehensive strategies and frameworks that aligned with business objectives, resulting in a 20% improvement in key performance indicators
• Collaborated with stakeholders to identify requirements and translate business needs into technical specifications, ensuring successful project outcomes
• Implemented best practices and industry standards that enhanced system reliability and reduced maintenance costs by 18%
• Mentored junior team members and conducted knowledge-sharing sessions, improving team competency and reducing onboarding time by 40%
• Optimized existing processes and workflows, resulting in annual cost savings of approximately $150,000
• Conducted thorough analysis and provided data-driven recommendations that supported strategic decision-making and business growth

Previous Role | Another Relevant Company | Different City, ST | June ${startYear - 3} – December ${startYear - 1}
• Contributed to the successful delivery of multiple projects within the ${selectedIndustry} sector, utilizing ${skillsList.slice(0, 3).join(', ')} to achieve business objectives
• Developed and maintained critical systems and applications that supported daily operations and served over 10,000 monthly active users
• Collaborated with product managers and designers to create user-centric solutions that improved customer satisfaction scores by 35%
• Implemented automated testing procedures that increased code quality and reduced production defects by 60%
• Participated in agile development cycles and contributed to sprint planning, estimation, and retrospective meetings
• Provided technical support and troubleshooting assistance, resolving critical issues with an average resolution time of under 4 hours
• Documented system architectures, processes, and procedures to ensure knowledge transfer and maintain institutional knowledge
• Stayed current with emerging technologies and industry trends, applying relevant innovations to improve existing systems and processes`;
  }
  
  // If array contains strings (simple format)
  if (typeof expArray[0] === 'string') {
    return expArray.map((exp, index) => {
      const yearsAgo = (expArray.length - index) * 2;
      const endYear = new Date().getFullYear() - yearsAgo;
      const startYear = endYear - 3;
      
      return `${exp} | Relevant Company | City, ST | January ${startYear} – December ${endYear}
• Applied expertise in ${exp.toLowerCase()} to design and implement solutions that addressed complex business challenges and requirements
• Collaborated with multidisciplinary teams to deliver high-quality results within established timelines and budget constraints
• Developed and optimized processes that improved efficiency and reduced operational costs by an average of 22%
• Provided technical leadership and guidance to team members, fostering a culture of continuous learning and improvement
• Analyzed system performance and implemented enhancements that increased throughput by 40% and reduced latency by 30%
• Established and maintained relationships with key stakeholders, ensuring alignment between technical solutions and business needs
• Created comprehensive documentation and training materials that facilitated knowledge transfer and system adoption
• Implemented quality assurance measures that improved product reliability and reduced customer-reported issues by 45%`;
    }).join('\n\n');
  }
  
  // If array contains objects with proper structure
  return expArray.map((exp, index) => {
    const title = exp.jobTitle || exp.title || exp.position || exp.role || `${targetRole || 'Professional'} ${index + 1}`;
    const company = exp.company || exp.employer || exp.organization || 'Relevant Company';
    const loc = exp.location || exp.city || exp.state || exp.country || 'City, ST';
    const start = exp.startDate || exp.start || exp.from || 'Month YYYY';
    const end = exp.endDate || exp.end || exp.to || (exp.current ? 'Present' : 'Month YYYY');
    const desc = exp.description || exp.responsibilities || exp.summary || '';
    
    const bulletPoints = desc ? 
      desc.split('\n').filter(line => line.trim()).map(line => `• ${line.trim()}`).join('\n') :
      `• Performed duties and responsibilities relevant to ${title} position, demonstrating expertise in ${skillsList.slice(0, 3).join(', ')}
• Developed innovative solutions and strategies that addressed business challenges and improved operational efficiency
• Collaborated with team members and stakeholders to ensure successful project delivery and achievement of objectives
• Implemented best practices and methodologies that enhanced system performance and reliability
• Provided technical guidance and mentorship to junior colleagues, contributing to team development and growth
• Analyzed data and metrics to identify opportunities for improvement and optimization
• Maintained comprehensive documentation and participated in knowledge-sharing activities
• Stayed current with industry trends and technologies, applying relevant innovations to enhance existing systems`;
    
    return `${title} | ${company} | ${loc} | ${start} – ${end}
${bulletPoints}`;
  }).join('\n\n');
};

const formatEducation = (eduArray, skillsList) => {
  if (!Array.isArray(eduArray) || eduArray.length === 0) {
    const currentYear = new Date().getFullYear();
    const gradYear = currentYear - Math.floor(Math.random() * 5) - 2;
    
    const isTech = skillsList.some(skill => 
      typeof skill === 'string' && (
        skill.toLowerCase().includes('computer') ||
        skill.toLowerCase().includes('software') ||
        skill.toLowerCase().includes('engineer') ||
        skill.toLowerCase().includes('developer') ||
        skill.toLowerCase().includes('data')
      )
    );
    
    const degree = isTech ? 'Bachelor of Science in Computer Science' : 'Bachelor of Business Administration';
    const university = isTech ? 'University of Technology' : 'State University';
    const location = isTech ? 'Tech City, ST' : 'Metro City, ST';
    
    return `${degree}
${university} | ${location} | ${gradYear}`;
  }
  
  if (typeof eduArray[0] === 'string') {
    return eduArray.map(edu => `${edu}
University | City, ST | ${new Date().getFullYear() - Math.floor(Math.random() * 10)}`).join('\n');
  }
  
  return eduArray.map(edu => {
    const degree = edu.degree || edu.program || edu.course || 'Bachelor\'s Degree';
    const school = edu.school || edu.university || edu.college || edu.institution || 'University';
    const loc = edu.location || edu.city || edu.state || edu.country || 'City, ST';
    const year = edu.graduationYear || edu.year || edu.graduationDate || edu.completionYear || (new Date().getFullYear() - Math.floor(Math.random() * 10));
    const gpa = edu.gpa || edu.grade || '';
    
    return `${degree}${gpa ? ` (GPA: ${gpa})` : ''}
${school} | ${loc} | ${year}`;
  }).join('\n');
};

const formatCertifications = (certArray, skillsList) => {
  if (!Array.isArray(certArray) || certArray.length === 0) {
    const certs = [];
    
    // Add relevant certifications based on skills
    if (skillsList.some(skill => 
      typeof skill === 'string' && (
        skill.toLowerCase().includes('aws') ||
        skill.toLowerCase().includes('amazon')
      )
    )) {
      certs.push('AWS Certified Solutions Architect');
    }
    
    if (skillsList.some(skill => 
      typeof skill === 'string' && (
        skill.toLowerCase().includes('azure') ||
        skill.toLowerCase().includes('microsoft')
      )
    )) {
      certs.push('Microsoft Certified: Azure Fundamentals');
    }
    
    if (skillsList.some(skill => 
      typeof skill === 'string' && (
        skill.toLowerCase().includes('security') ||
        skill.toLowerCase().includes('cyber')
      )
    )) {
      certs.push('CompTIA Security+');
    }
    
    if (skillsList.some(skill => 
      typeof skill === 'string' && (
        skill.toLowerCase().includes('project') ||
        skill.toLowerCase().includes('pmp')
      )
    )) {
      certs.push('Project Management Professional (PMP)');
    }
    
    if (skillsList.some(skill => 
      typeof skill === 'string' && (
        skill.toLowerCase().includes('agile') ||
        skill.toLowerCase().includes('scrum')
      )
    )) {
      certs.push('Certified Scrum Master (CSM)');
    }
    
    // Add at least one generic certification
    if (certs.length === 0) {
      certs.push('Professional Certification in Relevant Field');
    }
    
    return certs.join(' | ');
  }
  
  if (typeof certArray[0] === 'string') {
    return certArray.join(' | ');
  }
  
  return certArray.map(cert => 
    cert.name || cert.title || cert.certification || 'Professional Certification'
  ).join(' | ');
};

const formatProjects = (projArray, skillsList) => {
  if (!Array.isArray(projArray) || projArray.length === 0) {
    return '';
  }
  
  let projectsText = 'PROJECTS\n';
  
  if (typeof projArray[0] === 'string') {
    projArray.forEach((proj, index) => {
      projectsText += `${proj} | ${new Date().getFullYear() - index}
• Developed and implemented the ${proj} using ${skillsList.slice(0, 2).join(' and ')} technologies
• Collaborated with team members to ensure successful project delivery and achievement of objectives
• Implemented best practices and methodologies that enhanced project outcomes and deliverables\n\n`;
    });
  } else {
    projArray.forEach((proj, index) => {
      const name = proj.name || proj.title || `Project ${index + 1}`;
      const year = proj.year || proj.date || (new Date().getFullYear() - index);
      const desc = proj.description || proj.details || '';
      
      projectsText += `${name} | ${year}
${desc ? `• ${desc}` : `• Applied ${skillsList.slice(0, 2).join(' and ')} skills to develop and implement innovative solutions
• Collaborated with stakeholders to ensure alignment with business requirements and objectives
• Implemented quality assurance measures that improved project outcomes and deliverables`}\n\n`;
    });
  }
  
  return projectsText.trim();
};

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
    console.log("📊 Candidate data received:", {
      skillsCount: skills.length,
      experienceCount: experience.length,
      educationCount: education.length,
      certificationsCount: certifications.length,
      projectsCount: projects.length
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is missing" });
    }

    const skillsList = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
      ? skills.split(",").map((s) => s.trim()).filter(s => s.length > 0)
      : [];

    // Calculate years of experience based on skills or default
    const yearsOfExperience = Math.max(3, Math.floor(skillsList.length / 2));

    const prompt = `
You are a professional resume writer and ATS optimization expert. Generate a resume STRICTLY following this exact format.

❌ DO NOT USE markdown, asterisks for bullets, or any special formatting in the output.
✅ Output must be PLAIN TEXT with the exact structure below.

================================================================================
${fullName.toUpperCase()}
================================================================================

PROFESSIONAL SUMMARY
• ${summary || `Results-driven ${targetRole || 'professional'} with ${yearsOfExperience}+ years of experience specializing in ${skillsList.slice(0, 3).join(', ')}.`}
• ${summary ? '' : `Proven track record of designing and implementing innovative solutions that drive business growth and operational efficiency.`}
• ${summary ? '' : `Expertise in ${skillsList.slice(0, 4).join(', ')}, with a strong focus on delivering high-quality results within established timelines.`}
• ${summary ? '' : `Excellent problem-solving abilities combined with strong communication and team collaboration skills.`}
• ${summary ? '' : `Committed to continuous learning and staying current with emerging technologies and industry best practices.`}

================================================================================

SKILLS
• Technical Skills: ${skillsList.join(", ")}
• Tools & Platforms: ${skillsList.filter(s => typeof s === 'string' && (s.includes('AWS') || s.includes('Azure') || s.includes('Docker') || s.includes('Git'))).join(', ') || 'Relevant tools and platforms'}
• Methodologies: Agile/Scrum, Waterfall, DevOps, CI/CD
• Soft Skills: Leadership, Problem Solving, Communication, Team Collaboration, Adaptability, Time Management

================================================================================

WORK EXPERIENCE

${formatExperience(experience, fullName, targetRole, skillsList)}

================================================================================

EDUCATION
${formatEducation(education, skillsList)}

================================================================================

CERTIFICATIONS
${formatCertifications(certifications, skillsList)}

================================================================================

${projects && projects.length > 0 ? `${formatProjects(projects, skillsList)}\n\n================================================================================\n` : ''}
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
11. Use the candidate's actual skills, experience, education, and certifications when provided
12. Generate 6-8 detailed bullet points for each work experience entry
13. Focus on quantifiable achievements and measurable results
14. Use strong action verbs: Designed, Developed, Implemented, Led, Managed, Optimized, etc.

CANDIDATE'S ACTUAL BACKGROUND INFORMATION:

Name: ${fullName}
Target Role: ${targetRole || "Professional Role"}
Location: ${location || "Not specified"}
Skills: ${skillsList.join(', ')}
Summary: ${summary || "Not provided"}

Experience Data (if provided): ${JSON.stringify(experience).substring(0, 500)}...
Education Data (if provided): ${JSON.stringify(education).substring(0, 500)}...
Certifications Data (if provided): ${JSON.stringify(certifications).substring(0, 500)}...
Projects Data (if provided): ${JSON.stringify(projects).substring(0, 500)}...

NOW GENERATE THE RESUME TAILORED TO THIS SPECIFIC JOB DESCRIPTION:

JOB DESCRIPTION:
${jobDescription}

IMPORTANT INSTRUCTIONS:
1. Analyze the job description thoroughly and identify key requirements
2. Tailor the resume to highlight the candidate's skills that match the job requirements
3. Use keywords from the job description throughout the resume
4. Create professional, realistic work experience entries even if limited data is provided
5. Focus on achievements and results rather than just responsibilities
6. Ensure the resume is ATS-friendly and follows all formatting rules above
7. Make the resume look authentic and credible for the candidate

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