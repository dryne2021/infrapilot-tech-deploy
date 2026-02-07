const { Document, Packer, Paragraph, TextRun } = require("docx");
const fs = require("fs");

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          children: [new TextRun("[[FULL_NAME]]")],
        }),
        new Paragraph({
          children: [new TextRun("[[EMAIL]] | [[PHONE]] | [[LOCATION]]")],
        }),

        new Paragraph(""),
        new Paragraph("PROFESSIONAL SUMMARY"),
        new Paragraph("[[SUMMARY]]"),

        new Paragraph(""),
        new Paragraph("SKILLS"),
        new Paragraph("[[SKILLS]]"),

        new Paragraph(""),
        new Paragraph("EXPERIENCE"),
        new Paragraph("[[EXPERIENCE]]"),

        new Paragraph(""),
        new Paragraph("EDUCATION"),
        new Paragraph("[[EDUCATION]]"),

        new Paragraph(""),
        new Paragraph("CERTIFICATIONS"),
        new Paragraph("[[CERTIFICATIONS]]"),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("resume_template.docx", buffer);
  console.log("✅ Clean DOCX template created");
});
