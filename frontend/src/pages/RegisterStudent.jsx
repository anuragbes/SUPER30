import { useState, useEffect } from "react";
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


export default function RegisterStudent() {
  const navigate = useNavigate();

  const { user } = useUser();
  const { getToken, signOut } = useAuth();

  const [customSchool, setCustomSchool] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    permanentAddress: "",
    presentAddress: "",
    studentMobile: "", // Initialize
  });
  const [scholarship, setScholarship] = useState(false);
  const [passportPhoto, setPassportPhoto] = useState(null);
  const [identityPhoto, setIdentityPhoto] = useState(null);

  const backendURL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (user === null) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
  if (!user) return;

  const email = user.primaryEmailAddress?.emailAddress || "";

  setFormData((prev) => ({
    ...prev,
    classMoving: "10th to 11th",
    email,
  }));
}, [user]);

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

  const handleFileChange = (name, file) => {
    if (name === "passportPhoto") setPassportPhoto(file);
    if (name === "identityPhoto") setIdentityPhoto(file);
  };

  const handleLogout = async () => {
        await signOut();
        navigate("/");
        toast.success("Logged out successfully");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {

      const finalPreviousSchool =
        formData.previousSchool === "Other"
          ? customSchool
          : formData.previousSchool;

      const form = new FormData();

      form.append("previousSchool", finalPreviousSchool);

      Object.keys(formData).forEach((key) => {
        if (key !== "previousSchool") {
          form.append(key, formData[key]);
        }
      });

      form.append("customSchool", customSchool);

      if (passportPhoto) form.append("passportPhoto", passportPhoto);
      if (identityPhoto) form.append("identityPhoto", identityPhoto);

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


      toast.success("Registration Successful!", {
        description: `Student ID: ${res.data.studentId}`,
      });

      navigate(`/success/${res.data.studentId}`, {
        state: { studentName: formData.studentName }
      });

    } catch (error) {
      toast.error("Registration Failed", {
        description: error.response?.data?.error || error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
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

        <form
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          className="space-y-4 sm:space-y-6"
        >
          {/* PERSONAL INFORMATION */}
          <FormSection title="Personal Information" description="Enter your basic personal details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Field>
                <FieldLabel className="block text-sm font-medium text-foreground mb-0.5">
                  Student Name<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input className="border border-slate-200 rounded-lg bg-white w-full"
                  name="studentName"
                  placeholder="Enter Your Full Name"
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="block text-sm font-medium text-foreground mb-0.5">
                  Date of Birth<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input className="border border-slate-200 rounded-lg bg-white w-full"
                  type="date"
                  name="dateOfBirth"
                  onChange={handleChange}
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="block text-sm font-medium text-foreground mb-0.5">
                  Gender<span className="text-red-500"> *</span>
                </FieldLabel>

                <Select name="gender" onValueChange={(value) => handleChange({ target: { name: "gender", value } })} required>
                  <SelectTrigger className="border border-slate-200 rounded-lg bg-white w-full">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel className="block text-sm font-medium text-foreground mb-0.5">
                  Email Address<span className="text-red-500"> *</span> <span className="text-xs text-gray-500 ml-1">(Admit Card will be sent to this email)</span>
                </FieldLabel>
                <Input
                  className="border border-slate-200 rounded-lg bg-white w-full"
                  type="email"
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
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Father Name<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input
                  name="fatherName"
                  placeholder="Enter Father's Full Name"
                  onChange={handleChange}
                  className="border border-slate-200 rounded-lg bg-white w-full"
                  required
                />
              </Field>

              {/* Mother Name */}
              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Mother Name<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input
                  name="motherName"
                  placeholder="Enter Mother's Full Name"
                  onChange={handleChange}
                  className="border border-slate-200 rounded-lg bg-white w-full"
                  required
                />
              </Field>

              {/* Parent Mobile */}
              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Parent Mobile No.<span className="text-red-500"> *</span>
                </FieldLabel>
                <div className="flex items-center w-full">
                  <span className="h-10 flex items-center px-3 bg-slate-100 border border-slate-200/60 rounded-l-lg text-sm text-slate-700 shadow-sm">
                    +91
                  </span>
                  <Input
                    className="h-10 bg-white border border-slate-200/60 border-l-0 rounded-l-none rounded-r-lg shadow-sm w-full"
                    type="tel"
                    name="parentMobile"
                    placeholder="Enter Mobile Number"
                    maxLength="10"
                    onChange={handleChange}
                    required
                  />
                </div>
              </Field>

              {/* WhatsApp Number */}
              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  WhatsApp Number
                </FieldLabel>
                <div className="flex items-center w-full">
                  <span className="h-10 flex items-center px-3 bg-slate-100 border border-slate-200/60 rounded-l-lg text-sm text-slate-700 shadow-sm">
                    +91
                  </span>
                  <Input
                    className="h-10 bg-white border border-slate-200/60 border-l-0 rounded-l-none rounded-r-lg shadow-sm w-full"
                    type="tel"
                    name="whatsappMobile"
                    placeholder="Enter WhatsApp Number"
                    maxLength="10"
                    onChange={handleChange}
                  />
                </div>
              </Field>

              {/* Student Mobile */}
              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Student Mobile No.<span className="text-red-500"> *</span>
                </FieldLabel>
                <div className="flex items-center w-full">
                  <span className="h-10 flex items-center px-3 bg-slate-100 border border-slate-200/60 rounded-l-lg text-sm text-slate-700 shadow-sm">
                    +91
                  </span>
                  <Input
                    className="h-10 bg-slate-100 border border-slate-200/60 border-l-0 rounded-l-none rounded-r-lg shadow-sm w-full"
                    type="tel"
                    name="studentMobile"
                    placeholder="Enter Mobile Number"
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
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Permanent Address<span className="text-red-500"> *</span>
                </FieldLabel>
                <textarea
                  name="permanentAddress"
                  value={formData.permanentAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, permanentAddress: e.target.value })
                  }
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

              <Field className="col-span-2">
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Present Address<span className="text-red-500"> *</span>
                </FieldLabel>
                <textarea
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
                  className="border rounded-lg p-3 w-full"
                />

                <p className="text-xs text-right">
                  {formData.presentAddress.length} / 110
                </p>
              </Field>
            </div>
          </FormSection>

          {/* ACADEMIC INFORMATION */}
          <FormSection title="Academic Information" description="Select your academic preferences and previous school details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Class Moving To<span className="text-red-500"> *</span>
                </FieldLabel>
                <Select
                  value={formData.classMoving || ""}
                  onValueChange={(value) => setFormData({ ...formData, classMoving: value })}
                >
                  <SelectTrigger className="bg-gray-100 border border-slate-200 text-black w-full">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10th to 11th">10th to 11th</SelectItem>
                    <SelectItem value="11th to 12th">11th to 12th</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Select Stream<span className="text-red-500"> *</span>
                </FieldLabel>
                <Select
                  value={formData.stream || ""}
                  onValueChange={(value) => setFormData({ ...formData, stream: value })}
                >
                  <SelectTrigger className="border border-slate-200 rounded-lg bg-white w-full">
                    <SelectValue placeholder="Select Stream" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="PCM">PCM</SelectItem>
                    <SelectItem value="PCB">PCB</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Target<span className="text-red-500"> *</span>
                </FieldLabel>
                <Select
                  value={formData.target || ""}
                  onValueChange={(value) => setFormData({ ...formData, target: value })}
                >
                  <SelectTrigger className="border border-slate-200 rounded-lg bg-white w-full">
                    <SelectValue placeholder="Select Target" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="NEET">NEET</SelectItem>
                    <SelectItem value="CBSE Board">CBSE Board</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Student's Previous Result (In Percentage)<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input
                  name="previousResultPercentage"
                  placeholder="Enter Percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  onChange={handleChange}
                  className="border border-slate-200 rounded-lg bg-white w-full"
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Previous School Name<span className="text-red-500"> *</span>
                </FieldLabel>

                <Select
                  value={formData.previousSchool || ""}
                  onValueChange={(value) => {
                    setFormData({ ...formData, previousSchool: value });
                    if (value !== "Other") setCustomSchool(""); // clear custom input
                  }}
                >
                  <SelectTrigger className="border border-slate-200 rounded-lg bg-white w-full">
                    <SelectValue placeholder="Select Previous School" />
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
                    value={customSchool}
                    onChange={(e) => {
                      setCustomSchool(e.target.value);  // ONLY update customSchool
                    }}
                  />
                )}
              </Field>


              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Test Centre<span className="text-red-500"> *</span>
                </FieldLabel>
                <Select value="British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)" disabled>
                  <SelectTrigger className="bg-gray-100 cursor-not-allowed text-slate-700 border border-slate-200 rounded-lg opacity-70 w-full text-left" style={{ whiteSpace: "normal", lineHeight: "1.3" }} >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)">
                      British School Gurukul, Near Chopra Agencies, South Bisar Tank, Gaya (Bihar)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FormSection>

          {/* SCHOLARSHIP SECTION */}
          <FormSection title="Scholarship Details" description="Provide scholarship information if applicable">
            <div className="space-y-4">

              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Scholarship Offered?<span className="text-red-500"> *</span>
                </FieldLabel>
                <Select
                  value={formData.scholarshipOffered === true ? "yes" : formData.scholarshipOffered === false ? "no" : ""}
                  onValueChange={(value) => {
                    const boolValue = value === "yes";
                    setScholarship(boolValue);
                    setFormData({ ...formData, scholarshipOffered: boolValue });
                  }}
                >
                  <SelectTrigger className="border border-slate-200 rounded-lg bg-white w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="col-span-2">
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">Scholarship Details</FieldLabel>
                <textarea
                  name="scholarshipDetails"
                  placeholder="Specify Scholarship details"
                  onChange={handleChange}
                  disabled={!scholarship}
                  className={`border rounded-lg p-3 min-h-20 w-full ${!scholarship ? "bg-slate-100 cursor-not-allowed" : "bg-white"
                    }`}
                />
              </Field>
            </div>
          </FormSection>

          {/* DOCUMENT UPLOAD */}
          <FormSection title="Document Upload" description="Upload required documents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  Recent Passport Size Photo<span className="text-red-500"> *</span>
                </FieldLabel>
                <FileUpload
                  name="passportPhoto"
                  accept="image/*"
                  onFileSelect={handleFileChange}
                />
              </Field>

              <Field>
                <FieldLabel className="text-sm font-medium text-foreground mb-0.5">
                  School ID Card / Identity Proof (Aadhar Card)<span className="text-red-500"> *</span>
                </FieldLabel>
                <FileUpload
                  name="identityPhoto"
                  accept="image/*"
                  onFileSelect={handleFileChange}
                />
              </Field>
            </div>
          </FormSection>

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

        </form>
      </div>
    </main>
  );
}