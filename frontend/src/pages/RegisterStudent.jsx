import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import FormSection from "@/components/FormSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/FileUpload";
import { useUser, useAuth } from "@clerk/clerk-react";
import { compressPassport, compressIdentity } from "../utils/imageCompression";

// Drafts are scoped per Clerk user (not one shared global key) so one
// user's in-progress data can never surface in another user's session on a
// shared device, and expire after DRAFT_TTL_MS so stale PII doesn't linger
// in localStorage indefinitely.
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const getDraftKey = (userId) => `studentRegistrationDraft:${userId}`;

export default function RegisterStudent() {
  const navigate = useNavigate();

  const { user } = useUser();
  const { getToken, signOut } = useAuth();

  // Load draft from local storage
  const getInitialDraft = () => {
    if (!user?.id) return null;
    try {
      const saved = localStorage.getItem(getDraftKey(user.id));
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(getDraftKey(user.id));
        return null;
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse saved draft", e);
      return null;
    }
  };

  const draft = getInitialDraft();

  const [customSchool, setCustomSchool] = useState(draft?.customSchool || "");
  const [formMode, setFormMode] = useState("senior");
  const [isFetchingFormMode, setIsFetchingFormMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState(draft?.formData || {
    permanentAddress: "",
    presentAddress: "",
    studentMobile: "",
  });
  const [scholarship, setScholarship] = useState(draft?.scholarship || false);
  const [sameAsPermanent, setSameAsPermanent] = useState(draft?.sameAsPermanent || false);
  const [passportPhoto, setPassportPhoto] = useState(null);
  const [identityPhoto, setIdentityPhoto] = useState(null);
  const [registeredStudents, setRegisteredStudents] = useState([]);

  const backendURL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (user === null) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchRegistrations = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${backendURL}/api/students/my-registrations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRegisteredStudents(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch previous registrations", error);
      }
    };
    fetchRegistrations();
  }, [user, getToken, backendURL]);

  useEffect(() => {
    const fetchFormMode = async () => {
      try {
        const res = await axios.get(`${backendURL}/api/admin/exam-settings`);
        const mode = res.data.formMode || "senior";
        setFormMode(mode);
      } catch (error) {
        console.error("Failed to fetch form mode:", error);
      } finally {
        setIsFetchingFormMode(false);
      }
    };
    fetchFormMode();
  }, [backendURL]);

  useEffect(() => {
    if (!user) return;

    const email = user.primaryEmailAddress?.emailAddress || "";

    setFormData((prev) => ({
      ...prev,
      classMoving: prev.classMoving || (formMode === "junior" ? "Class 8" : "10th to 11th"),
      testCentre: prev.testCentre || "",
      email,
    }));
  }, [user, formMode]);

  // Auto-save draft to local storage whenever data changes
  useEffect(() => {
    if (!user?.id) return;
    const draftData = {
      formData,
      customSchool,
      scholarship,
      sameAsPermanent,
      savedAt: Date.now(),
    };
    localStorage.setItem(getDraftKey(user.id), JSON.stringify(draftData));
  }, [user?.id, formData, customSchool, scholarship, sameAsPermanent]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Character limit validation for address fields only
    if (
      (name === "permanentAddress" || name === "presentAddress") &&
      value.length > 110
    ) {
      return; // ignore entry if over limit
    }

    setFormData({ ...formData, [name]: value });
  };

  const MAX_FILE_SIZE_MB = 5;
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  const handleFileChange = (name, file) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only JPEG, PNG, and WebP images are allowed.",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error("File too large", {
        description: `Maximum allowed size is ${MAX_FILE_SIZE_MB} MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
      });
      return;
    }

    if (name === "passportPhoto") setPassportPhoto(file);
    if (name === "identityPhoto") setIdentityPhoto(file);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
    toast.success("Logged out successfully");
  };

  const handleClearForm = () => {
    if (window.confirm("Are you sure you want to clear the form? All entered data will be lost.")) {
      if (user?.id) localStorage.removeItem(getDraftKey(user.id));
      setCustomSchool("");
      setScholarship(false);
      setSameAsPermanent(false);
      setPassportPhoto(null);
      setIdentityPhoto(null);

      const email = user?.primaryEmailAddress?.emailAddress || "";
      setFormData({
        permanentAddress: "",
        presentAddress: "",
        studentMobile: "",
        classMoving: formMode === "junior" ? "Class 8" : "10th to 11th",
        testCentre: "",
        email,
      });

      toast.success("Form cleared successfully.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmittingRef.current || isSubmitting) return;

    // --- Validation Checks ---
    const requiredFields = [
      { key: 'studentName', label: 'Student Name' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'fatherName', label: 'Father Name' },
      { key: 'motherName', label: 'Mother Name' },
      { key: 'parentMobile', label: 'Parent Mobile No.' },
      { key: 'studentMobile', label: 'Student Mobile No.' },
      { key: 'permanentAddress', label: 'Permanent Address' },
      { key: 'presentAddress', label: 'Present Address' },
      { key: 'classMoving', label: 'Class' },
      { key: 'target', label: 'Target' },
      { key: 'previousResultPercentage', label: 'Previous Result Percentage' },
      { key: 'previousSchool', label: 'Current School Name' },
      { key: 'testCentre', label: 'Test Centre' },
    ];

    for (const field of requiredFields) {
      if (!formData[field.key]) {
        toast.error(`Please provide ${field.label}.`);
        return;
      }
    }

    // Mirrors the backend schema's exact match: /^[0-9]{10}$/ on
    // parentMobile/studentMobile/whatsappMobile (student.models.js). Optional
    // fields are only checked when non-empty, matching Mongoose's own
    // behavior of skipping the match validator on an empty string.
    const MOBILE_REGEX = /^[0-9]{10}$/;

    if (!MOBILE_REGEX.test(formData.parentMobile)) {
      toast.error("Please enter a valid 10-digit Parent Mobile Number.");
      return;
    }

    if (!MOBILE_REGEX.test(formData.studentMobile)) {
      toast.error("Please enter a valid 10-digit Student Mobile Number.");
      return;
    }

    if (formData.whatsappMobile && !MOBILE_REGEX.test(formData.whatsappMobile)) {
      toast.error("Please enter a valid 10-digit WhatsApp Number.");
      return;
    }

    if (formMode !== "junior" && !formData.stream) {
      toast.error("Please select a Stream.");
      return;
    }

    if (formMode === "junior" && !formData.studyCentre) {
      toast.error("Please select a Study Centre.");
      return;
    }

    if (formData.previousSchool === "Other" && !customSchool) {
      toast.error("Please enter your Custom School Name.");
      return;
    }

    if (scholarship && !formData.scholarshipDetails) {
      toast.error("Please enter Scholarship Details.");
      return;
    }

    if (!passportPhoto) {
      toast.error("Please upload your Passport Size Photo.");
      return;
    }

    if (!identityPhoto) {
      toast.error("Please upload your Identity Proof (Aadhar Card).");
      return;
    }
    // --- End Validation ---

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // --- Image Compression ---
      let finalPassportPhoto = passportPhoto;
      let finalIdentityPhoto = identityPhoto;

      if (passportPhoto) {
        toast.info("Optimizing passport photo...", { id: "compress-passport", duration: 10000 });
        finalPassportPhoto = await compressPassport(passportPhoto);
        toast.dismiss("compress-passport");
      }

      if (identityPhoto) {
        toast.info("Optimizing identity proof...", { id: "compress-identity", duration: 10000 });
        finalIdentityPhoto = await compressIdentity(identityPhoto);
        toast.dismiss("compress-identity");
      }

      const finalPreviousSchool =
        formData.previousSchool === "Other"
          ? customSchool
          : formData.previousSchool;

      const form = new FormData();

      form.append("previousSchool", finalPreviousSchool);

      Object.keys(formData).forEach((key) => {
        if (key !== "previousSchool") {
          if (formMode === "junior" && key === "stream") return;
          form.append(key, formData[key]);
        }
      });

      form.append("customSchool", customSchool);

      if (finalPassportPhoto) form.append("passportPhoto", finalPassportPhoto);
      if (finalIdentityPhoto) form.append("identityPhoto", finalIdentityPhoto);

      const token = await getToken();

      const res = await axios.post(
        `${backendURL}/api/students/register`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          }
        }
      );

      // Clear the draft once submission is successful
      if (user?.id) localStorage.removeItem(getDraftKey(user.id));

      toast.success("Registration Successful!", {
        description: `Student ID: ${res.data.studentId}`,
      });

      // Keep the user logged in to allow multiple registrations
      // await signOut();

      navigate(`/success/${res.data.studentId}`, {
        state: { studentName: formData.studentName }
      });

    } catch (error) {
      console.error("Registration Error:", error);
      toast.error("Registration Failed", {
        description: error.response?.data?.error || "Please check your inputs and try again, or contact support if the issue persists.",
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (isFetchingFormMode) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-muted-foreground animate-pulse text-sm">Loading Registration Form...</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-linear-to-br from-slate-50 to-slate-100 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">Student Registration</h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Complete the form below to enroll in our institution
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            Logout
          </Button>
        </div>

        {registeredStudents.length > 0 && (
          <div className="mb-6 p-4 sm:p-6 bg-blue-50/50 border border-blue-100 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">Your Previous Registrations</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {registeredStudents.map(student => (
                <div key={student.studentId} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col">
                  <p className="font-semibold text-slate-800 text-sm truncate">{student.studentName}</p>
                  <p className="text-xs text-slate-500 mt-1">ID: <span className="font-medium text-slate-700">{student.studentId}</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">Class: <span className="font-medium text-slate-700">{student.classMoving}</span></p>
                </div>
              ))}
            </div>
            <p className="text-sm text-blue-700 mt-4">You can register another student below.</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          className="space-y-4 sm:space-y-6"
        >
          {/* PERSONAL INFORMATION */}
          <FormSection title="Personal Information" description="Enter your basic personal details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Field>
                <FieldLabel htmlFor="studentName" className="block text-sm font-medium text-foreground mb-0.5">
                  Student Name<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input className="border border-slate-200 rounded-lg bg-white w-full"
                  id="studentName"
                  name="studentName"
                  placeholder="Enter Your Full Name"
                  value={formData.studentName || ""}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="dateOfBirth" className="block text-sm font-medium text-foreground mb-0.5">
                  Date of Birth<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input className="border border-slate-200 rounded-lg bg-white w-full"
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth || ""}
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="gender" className="block text-sm font-medium text-foreground mb-0.5">
                  Gender<span className="text-red-500"> *</span>
                </FieldLabel>

                <Select value={formData.gender || ""} name="gender" onValueChange={(value) => handleChange({ target: { name: "gender", value } })} required>
                  <SelectTrigger id="gender" className="border border-slate-200 rounded-lg bg-white w-full">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="email" className="block text-sm font-medium text-foreground mb-0.5">
                  Email Address<span className="text-red-500"> *</span> <span className="text-xs text-gray-500 ml-1">(Admit Card will be sent to this email)</span>
                </FieldLabel>
                <Input
                  className="border border-slate-200 rounded-lg bg-white w-full"
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ""}
                  readOnly
                  required
                />
              </Field>
            </div>
          </FormSection>

          {/* FAMILY INFORMATION */}
          <FormSection title="Family Information" description="Enter your parent's details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Father Name */}
              <Field>
                <FieldLabel htmlFor="fatherName" className="text-sm font-medium text-foreground mb-0.5">
                  Father Name<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input
                  id="fatherName"
                  name="fatherName"
                  placeholder="Enter Father's Full Name"
                  value={formData.fatherName || ""}
                  onChange={handleChange}
                  className="border border-slate-200 rounded-lg bg-white w-full"
                  required
                />
              </Field>

              {/* Mother Name */}
              <Field>
                <FieldLabel htmlFor="motherName" className="text-sm font-medium text-foreground mb-0.5">
                  Mother Name<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input
                  id="motherName"
                  name="motherName"
                  placeholder="Enter Mother's Full Name"
                  value={formData.motherName || ""}
                  onChange={handleChange}
                  className="border border-slate-200 rounded-lg bg-white w-full"
                  required
                />
              </Field>

              {/* Parent Mobile */}
              <Field>
                <FieldLabel htmlFor="parentMobile" className="text-sm font-medium text-foreground mb-0.5">
                  Parent Mobile No.<span className="text-red-500"> *</span>
                </FieldLabel>
                <div className="flex items-center w-full">
                  <span className="h-10 flex items-center px-3 bg-slate-100 border border-slate-200/60 rounded-l-lg text-sm text-slate-700 shadow-sm">
                    +91
                  </span>
                  <Input
                    className="h-10 bg-white border border-slate-200/60 border-l-0 rounded-l-none rounded-r-lg shadow-sm w-full"
                    type="tel"
                    id="parentMobile"
                    name="parentMobile"
                    placeholder="Enter Mobile Number"
                    value={formData.parentMobile || ""}
                    maxLength="10"
                    onChange={handleChange}
                    required
                  />
                </div>
              </Field>

              {/* WhatsApp Number */}
              <Field>
                <FieldLabel htmlFor="whatsappMobile" className="text-sm font-medium text-foreground mb-0.5">
                  WhatsApp Number
                </FieldLabel>
                <div className="flex items-center w-full">
                  <span className="h-10 flex items-center px-3 bg-slate-100 border border-slate-200/60 rounded-l-lg text-sm text-slate-700 shadow-sm">
                    +91
                  </span>
                  <Input
                    className="h-10 bg-white border border-slate-200/60 border-l-0 rounded-l-none rounded-r-lg shadow-sm w-full"
                    type="tel"
                    id="whatsappMobile"
                    name="whatsappMobile"
                    placeholder="Enter WhatsApp Number"
                    value={formData.whatsappMobile || ""}
                    maxLength="10"
                    onChange={handleChange}
                  />
                </div>
              </Field>

              {/* Student Mobile */}
              <Field>
                <FieldLabel htmlFor="studentMobile" className="text-sm font-medium text-foreground mb-0.5">
                  Student Mobile No.<span className="text-red-500"> *</span>
                </FieldLabel>
                <div className="flex items-center w-full">
                  <span className="h-10 flex items-center px-3 bg-slate-100 border border-slate-200/60 rounded-l-lg text-sm text-slate-700 shadow-sm">
                    +91
                  </span>
                  <Input
                    className="h-10 bg-slate-100 border border-slate-200/60 border-l-0 rounded-l-none rounded-r-lg shadow-sm w-full"
                    type="tel"
                    id="studentMobile"
                    name="studentMobile"
                    placeholder="Enter Mobile Number"
                    value={formData.studentMobile || ""}
                    maxLength="10"
                    onChange={handleChange}
                    required
                  />
                </div>
              </Field>
            </div>
          </FormSection>

          {/* ADDRESS INFORMATION */}
          <FormSection title="Address Information" description="Provide your residential details">
            <div className="space-y-4">

              <Field className="col-span-2">
                <FieldLabel htmlFor="permanentAddress" className="text-sm font-medium text-foreground mb-0.5">
                  Permanent Address<span className="text-red-500"> *</span>
                </FieldLabel>
                <textarea
                  id="permanentAddress"
                  name="permanentAddress"
                  value={formData.permanentAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      permanentAddress: val,
                      ...(sameAsPermanent ? { presentAddress: val } : {})
                    }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // block new line
                    }
                  }}
                  maxLength={110}
                  className="border rounded-lg p-3 w-full"
                />

                <p className="text-xs text-right">
                  {formData.permanentAddress.length} / 110
                </p>
              </Field>

              <div className="col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sameAsPermanent"
                  checked={sameAsPermanent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSameAsPermanent(checked);
                    if (checked) {
                      setFormData((prev) => ({ ...prev, presentAddress: prev.permanentAddress }));
                    }
                  }}
                  className="w-4 h-4 text-slate-800 border-slate-300 rounded focus:ring-slate-800"
                />
                <label htmlFor="sameAsPermanent" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Same as Permanent Address
                </label>
              </div>

              <Field className="col-span-2">
                <FieldLabel htmlFor="presentAddress" className="text-sm font-medium text-foreground mb-0.5">
                  Present Address<span className="text-red-500"> *</span>
                </FieldLabel>
                <textarea
                  id="presentAddress"
                  name="presentAddress"
                  value={formData.presentAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, presentAddress: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // block new line
                    }
                  }}
                  maxLength={110}
                  disabled={sameAsPermanent}
                  className={`border rounded-lg p-3 w-full ${sameAsPermanent ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                />

                <p className="text-xs text-right">
                  {formData.presentAddress.length} / 110
                </p>
              </Field>
            </div>
          </FormSection>

          {/* ACADEMIC INFORMATION */}
          <FormSection title="Academic Information" description="Select your academic preferences and school details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Field>
                <FieldLabel htmlFor="classMoving" className="text-sm font-medium text-foreground mb-0.5">
                  {formMode === "junior" ? "Class" : "Class Moving To"}<span className="text-red-500"> *</span>
                </FieldLabel>
                <Select
                  value={formData.classMoving || ""}
                  onValueChange={(value) => setFormData({ ...formData, classMoving: value })}
                >
                  <SelectTrigger id="classMoving" className="bg-gray-100 border border-slate-200 text-black w-full">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {formMode === "junior" ? (
                      <>
                        <SelectItem value="Class 8">Class 8</SelectItem>
                        <SelectItem value="Class 9">Class 9</SelectItem>
                        <SelectItem value="Class 10">Class 10</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="10th to 11th">10th to 11th</SelectItem>
                        <SelectItem value="11th to 12th">11th to 12th</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </Field>

              {formMode !== "junior" && (
                <Field>
                  <FieldLabel htmlFor="stream" className="text-sm font-medium text-foreground mb-0.5">
                    Select Stream<span className="text-red-500"> *</span>
                  </FieldLabel>
                  <Select
                    value={formData.stream || ""}
                    onValueChange={(value) => setFormData({ ...formData, stream: value })}
                  >
                    <SelectTrigger id="stream" className="border border-slate-200 rounded-lg bg-white w-full">
                      <SelectValue placeholder="Select Stream" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="PCM">PCM</SelectItem>
                      <SelectItem value="PCB">PCB</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="target" className="text-sm font-medium text-foreground mb-0.5">
                  Target<span className="text-red-500"> *</span>
                </FieldLabel>
                <Select
                  value={formData.target || ""}
                  onValueChange={(value) => setFormData({ ...formData, target: value })}
                >
                  <SelectTrigger id="target" className="border border-slate-200 rounded-lg bg-white w-full">
                    <SelectValue placeholder="Select Target" />
                  </SelectTrigger>

                  <SelectContent>
                    {formMode === "junior" ? (
                      <>
                        <SelectItem value="JEE Mains/ Advanced / Olympiads">JEE Mains/ Advanced / Olympiads</SelectItem>
                        <SelectItem value="NEET">NEET</SelectItem>
                        <SelectItem value="CBSE - Board">CBSE Board</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="JEE">JEE</SelectItem>
                        <SelectItem value="NEET">NEET</SelectItem>
                        <SelectItem value="CBSE Board">CBSE Board</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="previousResultPercentage" className="text-sm font-medium text-foreground mb-0.5">
                  Student's Previous Result (In Percentage)<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input
                  id="previousResultPercentage"
                  name="previousResultPercentage"
                  placeholder="Enter Percentage"
                  value={formData.previousResultPercentage || ""}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  onChange={handleChange}
                  className="border border-slate-200 rounded-lg bg-white w-full"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="previousSchool" className="text-sm font-medium text-foreground mb-0.5">
                  {formMode === "junior" ? "Current School Name" : "Previous School Name"}<span className="text-red-500"> *</span>
                </FieldLabel>

                <Select
                  value={formData.previousSchool || ""}
                  onValueChange={(value) => {
                    setFormData({ ...formData, previousSchool: value });
                    if (value !== "Other") setCustomSchool(""); // clear custom input
                  }}
                >
                  <SelectTrigger id="previousSchool" className="border border-slate-200 rounded-lg bg-white w-full">
                    <SelectValue placeholder="Select Current School" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Al-Momin International School, Gaya, Bihar">
                      Al-Momin International School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="British English School, Gaya, Bihar">
                      British English School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="British Public School, Gaya, Bihar">
                      British Public School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="City Public School, Gaya, Bihar">
                      City Public School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Co-operative Public School, Dubhal, Gaya, Bihar">
                      Co-operative Public School, Dubhal, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Creane Memorial High School, Gaya, Bihar">
                      Creane Memorial High School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="DAV Public School, Cantt Area, Gaya, Bihar">
                      DAV Public School, Cantt Area, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="DAV Public School, Rotary Campus, Gaya, Bihar">
                      DAV Public School, Rotary Campus, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="DPS Dubhal, Gaya, Bihar">
                      DPS Dubhal, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="G.D. Goenka Public School, Gaya, Bihar">
                      G.D. Goenka Public School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Gyan Bharti Global School, Gaya, Bihar">
                      Gyan Bharti Global School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Gyan Bharti Residential Complex, Gaya, Bihar">
                      Gyan Bharti Residential Complex, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Indus Vision Academy, Gaya, Bihar">
                      Indus Vision Academy, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Manav Bharti National School, Gaya, Bihar">
                      Manav Bharti National School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Modern Academy, Gaya, Bihar">
                      Modern Academy, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="National Public School, Gaya, Bihar">
                      National Public School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Nazareth Academy, Gaya, Bihar">
                      Nazareth Academy, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Open Minds – A Birla School, Gaya, Bihar">
                      Open Minds – A Birla School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Polytechnic English School, Gaya, Bihar">
                      Polytechnic English School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Pragati Path Academy, Gaya, Bihar">
                      Pragati Path Academy, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Secondary Delhi Public School, Gaya, Bihar">
                      Secondary Delhi Public School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="St. Louise Academy, Gaya, Bihar">
                      St. Louise Academy, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Unique English School, Gaya, Bihar">
                      Unique English School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Vidya Bharti English School, Gaya, Bihar">
                      Vidya Bharti English School, Gaya, Bihar
                    </SelectItem>

                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.previousSchool === "Other" && (
                  <Input
                    className="mt-3 border border-slate-300 rounded-lg bg-white"
                    placeholder="Enter Your School Name"
                    aria-label="Custom school name"
                    value={customSchool}
                    onChange={(e) => {
                      setCustomSchool(e.target.value);  // ONLY update customSchool
                    }}
                  />
                )}
              </Field>


              <Field>
                <FieldLabel htmlFor="testCentre" className="text-sm font-medium text-foreground mb-0.5">
                  Test Centre<span className="text-red-500"> *</span>
                </FieldLabel>
                {formMode === "junior" ? (
                  <Select
                    value={formData.testCentre || ""}
                    onValueChange={(value) => setFormData({ ...formData, testCentre: value })}
                  >
                    <SelectTrigger id="testCentre" className="border border-slate-200 rounded-lg bg-white w-full text-left" style={{ whiteSpace: "normal", lineHeight: "1.3" }}>
                      <SelectValue placeholder="Select Test Centre" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[90vw] sm:max-w-none w-[var(--radix-select-trigger-width)]">
                      <SelectItem className="whitespace-normal break-words py-2 text-left" value="British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)">
                        British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)
                      </SelectItem>
                      <SelectItem className="whitespace-normal break-words py-2 text-left" value="British English School, Gere, Manpur, Gaya (Bihar)">
                        British English School, Gere, Manpur, Gaya (Bihar)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={formData.testCentre || ""}
                    onValueChange={(value) => setFormData({ ...formData, testCentre: value })}
                  >
                    <SelectTrigger id="testCentre" className="border border-slate-200 rounded-lg bg-white w-full text-left" style={{ whiteSpace: "normal", lineHeight: "1.3" }}>
                      <SelectValue placeholder="Select Test Centre" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[90vw] sm:max-w-none w-[var(--radix-select-trigger-width)]">
                      <SelectItem className="whitespace-normal break-words py-2 text-left" value="British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)">
                        British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>

              {formMode === "junior" && (
                <Field>
                  <FieldLabel htmlFor="studyCentre" className="text-sm font-medium text-foreground mb-0.5">
                    Study Centre<span className="text-red-500"> *</span>
                  </FieldLabel>
                  <Select
                    value={formData.studyCentre || ""}
                    onValueChange={(value) => setFormData({ ...formData, studyCentre: value })}
                  >
                    <SelectTrigger id="studyCentre" className="border border-slate-200 rounded-lg bg-white w-full text-left" style={{ whiteSpace: "normal", lineHeight: "1.3" }}>
                      <SelectValue placeholder="Select Study Centre" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[90vw] sm:max-w-none w-[var(--radix-select-trigger-width)]">
                      <SelectItem className="whitespace-normal break-words py-2 text-left" value="British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)">
                        British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)
                      </SelectItem>
                      <SelectItem className="whitespace-normal break-words py-2 text-left" value="British English School, Gere, Manpur, Gaya (Bihar)">
                        British English School, Gere, Manpur, Gaya (Bihar)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
          </FormSection>

          {/* SCHOLARSHIP SECTION */}
          <FormSection title="Scholarship Details" description="Provide scholarship information if applicable">
            <div className="space-y-4">

              <Field>
                <FieldLabel htmlFor="scholarshipOffered" className="text-sm font-medium text-foreground mb-0.5">
                  Scholarship Offered Anywhere Else?<span className="text-red-500"> *</span>
                </FieldLabel>
                <Select
                  value={formData.scholarshipOffered === true ? "yes" : formData.scholarshipOffered === false ? "no" : ""}
                  onValueChange={(value) => {
                    const boolValue = value === "yes";
                    setScholarship(boolValue);
                    setFormData({ ...formData, scholarshipOffered: boolValue });
                  }}
                >
                  <SelectTrigger id="scholarshipOffered" className="border border-slate-200 rounded-lg bg-white w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="col-span-2">
                <FieldLabel htmlFor="scholarshipDetails" className="text-sm font-medium text-foreground mb-0.5">Scholarship Details</FieldLabel>
                <p className="text-[13px] text-muted-foreground mb-1">
                  If Yes, mention the scholarship name, provider, and amount/percentage of fee waived (e.g., Govt Merit Scholarship – 50% tuition fee)
                </p>
                <textarea
                  id="scholarshipDetails"
                  name="scholarshipDetails"
                  placeholder="Enter Scholarship Details"
                  value={formData.scholarshipDetails || ""}
                  onChange={handleChange}
                  disabled={!scholarship}
                  className={`border rounded-lg p-3 min-h-20 w-full placeholder:text-xs md:placeholder:text-sm ${!scholarship ? "bg-slate-100 cursor-not-allowed" : "bg-white"
                    }`}
                />
              </Field>
            </div>
          </FormSection>

          {/* DOCUMENT UPLOAD */}
          <FormSection title="Document Upload" description="Upload required documents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Field>
                <FieldLabel htmlFor="passportPhoto" className="text-sm font-medium text-foreground mb-0.5">
                  Recent Passport Size Photo<span className="text-red-500"> *</span>
                </FieldLabel>
                <FileUpload
                  id="passportPhoto"
                  name="passportPhoto"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  file={passportPhoto}
                  onFileSelect={handleFileChange}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="identityPhoto" className="text-sm font-medium text-foreground mb-0.5">
                  School ID Card / Identity Proof (Aadhar Card)<span className="text-red-500"> *</span>
                </FieldLabel>
                <FileUpload
                  id="identityPhoto"
                  name="identityPhoto"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  file={identityPhoto}
                  onFileSelect={handleFileChange}
                />
              </Field>
            </div>
          </FormSection>

          {isSubmitting && (
            <div className="mt-4 mb-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold mb-1">Please do not close or refresh this page!</p>
                <p>We are processing your application. This may take up to a minute depending on your internet connection.</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-center mt-2">
            <Button
              disabled={isSubmitting}
              type="submit"
              className="w-full sm:w-fit flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Spinner /> Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>

            <Button
              disabled={isSubmitting}
              type="button"
              variant="outline"
              onClick={handleClearForm}
              className="w-full sm:w-fit"
            >
              Clear Form
            </Button>
          </div>

        </form>
      </div>
    </main>
  );
}