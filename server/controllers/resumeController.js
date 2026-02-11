// ==========================================================
// 🚀 UPDATED RESUME GENERATION — COMPANY + DATES ONLY
// ==========================================================

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

    // 🔥 ONLY SEND COMPANY + DATES (NO BULLETS FROM DB)
    const experienceText = Array.isArray(experience)
      ? experience
          .map((exp) => `
Company: ${exp.company || ""}
Dates Worked: ${exp.startDate || ""} - ${exp.endDate || "Present"}
`)
          .join("\n")
      : "";

    // 🔥 ONLY SEND SCHOOL + YEARS
    const educationText = Array.isArray(education)
      ? education
          .map((edu) => `
School: ${edu.school || ""}
Degree: ${edu.degree || ""}
Years Attended: ${edu.startYear || ""} - ${edu.endYear || ""}
`)
          .join("\n")
      : "";

    const certificationsText = Array.isArray(certifications)
      ? certifications.join(", ")
      : certifications;

    const prompt = `
You are a senior professional resume writer.

STRICT RULES:
- Use ONLY the company names and dates provided.
- Use ONLY the school names and education years provided.
- DO NOT invent fake companies.
- DO NOT invent fake schools.
- For each company listed, generate 3-5 strong professional bullet achievements.
- Bullet points must be tailored to the job description.
- Bullet points must show measurable impact where possible.
- Resume must be ATS optimized.
- Clean formatting. No explanations.

FORMAT EXACTLY:

PROFESSIONAL SUMMARY
SKILLS
EXPERIENCE
EDUCATION
TECHNOLOGIES
CERTIFICATIONS

CANDIDATE INFORMATION:

Name: ${fullName}
Email: ${email || ""}
Phone: ${phone || ""}
Location: ${location || ""}
Target Role: ${targetRole || "Professional"}

SUMMARY:
${summary || ""}

SKILLS:
${Array.isArray(skills) ? skills.join(", ") : skills}

WORK HISTORY (Only company names and dates provided):
${experienceText}

EDUCATION HISTORY:
${educationText}

CERTIFICATIONS:
${certificationsText || ""}

JOB DESCRIPTION:
${jobDescription}

Generate a complete professional resume.
For EXPERIENCE:
- Show company name
- Show dates worked
- Under each company generate strong tailored bullet achievements aligned to the job description.

For EDUCATION:
- Show school name
- Show degree and years attended.

Do NOT leave sections empty.
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
    console.error("❌ Resume Generation Error:", error);
    return res.status(500).json({
      message: error.message || "Generation failed",
    });
  }
};
