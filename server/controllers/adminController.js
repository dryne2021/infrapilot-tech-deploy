// ✅ sets userId + ensures required education fields exist
// ✅ FIX: sanitize/resolve assignedRecruiter and assignedRecruiterId to real ObjectIds
exports.createCandidate = async (req, res, next) => {
  try {
    console.log("📥 [ADMIN] createCandidate payload:", req.body);

    // Copy body but we will sanitize some fields before saving
    const payload = {
      ...req.body,
      userId: req.user?._id,
    };

    /* ---------------------------------------------
       1) EDUCATION: ensure required fields exist
    --------------------------------------------- */
    const edu = Array.isArray(payload.education) ? payload.education : [];

    const hasValidEdu =
      edu.length > 0 &&
      edu.some(
        (e) =>
          e &&
          String(e.school || "").trim() &&
          String(e.degree || "").trim() &&
          String(e.field || "").trim()
      );

    if (!hasValidEdu) {
      payload.education = [
        {
          school: "Not Provided",
          degree: "Not Provided",
          field: "Not Provided",
          startYear: "",
          endYear: "",
        },
      ];
    } else {
      payload.education = edu.map((e) => ({
        ...e,
        school: String(e.school || "").trim(),
        degree: String(e.degree || "").trim(),
        field: String(e.field || "").trim(),
      }));
    }

    /* ---------------------------------------------
       2) RECRUITER ASSIGNMENT: sanitize inputs
       Candidate schema:
         - assignedRecruiterId -> ref "User" (legacy)
         - assignedRecruiter   -> ref "Recruiter" (truth)
       Fix rules:
         - If frontend sends "rec1" or any non-ObjectId => ignore + null
         - If frontend sends a valid ObjectId => verify recruiter exists
         - If it sends recruiter email => resolve recruiter by email
    --------------------------------------------- */
    const incomingAssignedRecruiter = payload.assignedRecruiter;

    // default: do not assign unless valid
    payload.assignedRecruiter = null;
    payload.assignedRecruiterId = null;
    payload.recruiterStatus = payload.recruiterStatus || "";
    payload.assignedDate = payload.assignedDate || null;

    if (incomingAssignedRecruiter) {
      // Case A: frontend sent a real Mongo ObjectId for Recruiter
      if (mongoose.Types.ObjectId.isValid(incomingAssignedRecruiter)) {
        const recruiter = await Recruiter.findById(incomingAssignedRecruiter).select(
          "_id userId status isActive"
        );

        if (!recruiter) {
          return next(new ErrorResponse("Recruiter not found for assignedRecruiter", 404));
        }

        // Optional: only allow assignment to active recruiters
        const recruiterActive =
          recruiter.status === "active" || recruiter.isActive === true;

        if (!recruiterActive) {
          return next(new ErrorResponse("Recruiter is not active", 400));
        }

        payload.assignedRecruiter = recruiter._id;     // Recruiter ref
        payload.assignedRecruiterId = recruiter.userId || null; // User ref (legacy)
        payload.recruiterStatus = payload.recruiterStatus || "new";
        payload.assignedDate = payload.assignedDate || new Date();
      } else {
        // Case B: treat as recruiter email (common from UI)
        const maybeEmail = String(incomingAssignedRecruiter).trim().toLowerCase();
        const recruiter = await Recruiter.findOne({ email: maybeEmail }).select(
          "_id userId status isActive"
        );

        if (recruiter) {
          const recruiterActive =
            recruiter.status === "active" || recruiter.isActive === true;

          if (!recruiterActive) {
            return next(new ErrorResponse("Recruiter is not active", 400));
          }

          payload.assignedRecruiter = recruiter._id;
          payload.assignedRecruiterId = recruiter.userId || null;
          payload.recruiterStatus = payload.recruiterStatus || "new";
          payload.assignedDate = payload.assignedDate || new Date();
        } else {
          // Case C: invalid string like "rec1" => ignore assignment
          console.warn(
            "⚠️ [ADMIN] createCandidate: invalid assignedRecruiter received, ignoring:",
            incomingAssignedRecruiter
          );
          payload.assignedRecruiter = null;
          payload.assignedRecruiterId = null;
          payload.recruiterStatus = "";
          payload.assignedDate = null;
        }
      }
    }

    /* ---------------------------------------------
       3) SAVE
       NOTE: Candidate.userId is unique+required in your schema.
       If admin is creating candidates on behalf of others,
       this will conflict. But we keep your current behavior.
    --------------------------------------------- */
    const created = await Candidate.create(payload);

    console.log(
      `✅ [ADMIN] candidate saved: ${created._id} email=${created.email || ""} name=${
        created.fullName || ""
      }`
    );

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("❌ [ADMIN] createCandidate error:", error);
    next(error);
  }
};
