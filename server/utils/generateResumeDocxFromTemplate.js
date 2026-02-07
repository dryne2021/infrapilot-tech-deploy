const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");

/**
 * Convert AI/DB resume JSON into template-ready strings.
 * You control exactly what goes into Word.
 */

function sanitizeText(value) {
  if (!value) return "";
  return String(value)
    .replace(/\t/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function formatSkills(skills = []) {
  // Keep flexible. You can group later if you want.
  return sanitizeText(skills.filter(Boolean).join(", "));
}

function formatEducation(education = []) {
  return sanitizeText(
    education
      .map((e) => {
        const a = [];
        if (e.degree || e.field) a.push([e.degree, e.field].filter(Boolean).join(" in "));
        if (e.school) a.push(e.school);
        const years = [e.startYear, e.endYear].filter(Boolean).join(" – ");
        if (years) a.push(years);
        return a.filter(Boolean).join(" | ");
      })
      .filter(Boolean)
      .join("\n")
  );
}

function formatCertifications(certs = []) {
  return sanitizeText(
    certs
      .map((c) => [c.name, c.issuer, c.year].filter(Boolean).join(" | "))
      .filter(Boolean)
      .join("\n")
  );
}

function formatExperience(experience = []) {
  // IMPORTANT: This enforces "controlled formatting" in one place.
  // The template stays clean. Experience text becomes one block.
  const blocks = experience
    .filter(Boolean)
    .map((job) => {
      const titleCompany = [job.title, job.company].filter(Boolean).join(" – ");
      const dates = [job.startDate, job.endDate].filter(Boolean).join(" – ");
      const meta = [dates, job.location].filter(Boolean).join(" | ");

      const headerLine = [titleCompany, meta].filter(Boolean).join(" | ");

      const bullets = (job.bullets || [])
        .filter(Boolean)
        .map((b) => `• ${sanitizeText(b)}`)
        .join("\n");

      return [sanitizeText(headerLine), bullets].filter(Boolean).join("\n");
    });

  return sanitizeText(blocks.join("\n\n"));
}

async function generateResumeDocxFromTemplate(resumeJson) {
  const templatePath = path.join(__dirname, "..", "templates", "resume_template.docx");

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found at: ${templatePath}`);
  }

  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true, // IMPORTANT: keeps \n as new lines in Word
  });

  // Map only what you allow into the Word doc (CONTROLLED)
  const data = {
    FULL_NAME: sanitizeText(resumeJson.fullName),
    EMAIL: sanitizeText(resumeJson.email),
    PHONE: sanitizeText(resumeJson.phone),
    LOCATION: sanitizeText(resumeJson.location),

    SUMMARY: sanitizeText(resumeJson.summary),
    SKILLS: formatSkills(resumeJson.skills),

    EXPERIENCE: formatExperience(resumeJson.experience),

    EDUCATION: formatEducation(resumeJson.education),
    CERTIFICATIONS: formatCertifications(resumeJson.certifications),
  };

  doc.render(data);

  const buffer = doc.getZip().generate({ type: "nodebuffer" });
  return buffer;
}

module.exports = generateResumeDocxFromTemplate;
