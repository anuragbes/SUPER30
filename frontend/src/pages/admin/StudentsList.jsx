import { useEffect, useState } from "react";
import { axiosInstance } from "@/lib/axios";

import { toast } from "sonner";
import { CheckCheck, FileText, Mail, Search, Trash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PaginationControls from "@/components/PaginationControls";
import { SkeletonTableRow } from "@/components/SkeletonCard";

export default function StudentsList() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStream, setFilterStream] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [progressGenerate, setProgressGenerate] = useState({
    current: 0,
    total: 0,
  });
  const [progressSend, setProgressSend] = useState({ current: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formMode, setFormMode] = useState("senior");



  // Fetch students with filters
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/students/all`, {
        params: {
          search,
          stream: formMode === "senior" ? filterStream : "",
          classMoving: formMode === "junior" ? filterClass : "",
          target: filterTarget,
          status: filterStatus,
          page,
        },
      });

      const data = res.data.data || [];

      setStudents(data);
      setTotalPages(res.data.totalPages || 1);

      data.sort((a, b) => {
        const na = parseInt((a.studentId || "").replace(/\D/g, "")) || 0;
        const nb = parseInt((b.studentId || "").replace(/\D/g, "")) || 0;
        return na - nb;
      });

      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axiosInstance.get(`/api/admin/exam-settings`);
        setFormMode(res.data.formMode || "senior");
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [search, filterStream, filterClass, filterTarget, filterStatus, page, formMode]);

  const handleFilter = () => {
    fetchStudents();
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.studentId));
    }
  };

  // Generate Admit Cards (progress)
  const generateAdmitCards = async () => {
    if (selectedStudents.length === 0) {
      toast.error("No students selected");
      return;
    }

    setLoadingGenerate(true);
    setProgressGenerate({ current: 0, total: selectedStudents.length });

    try {
      for (let i = 0; i < selectedStudents.length; i++) {
        const studentId = selectedStudents[i];
        setProgressGenerate({ current: i + 1, total: selectedStudents.length });

        try {
          const res = await axiosInstance.post(
            `/api/admin/bulk-generate-admit-cards`,
            { selectedStudents: [studentId] }
          );

          if (!res.data.success) {
            toast.error(res.data.message || "Unable to generate admit card.");
            break;
          }

          setStudents((prev) =>
            prev.map((s) =>
              s.studentId === studentId
                ? { ...s, admitCardGenerated: true }
                : s,
            ),
          );
        } catch (error) {
          console.error("Generate admit card error:", error);
          const msg = error.response?.data?.message || error.response?.data?.error || "Failed to generate admit card. Please try again later.";
          toast.error(msg);
          break;
        }

        await new Promise((r) => setTimeout(r, 300));
      }

      fetchStudents();
    } finally {
      setLoadingGenerate(false);
      setProgressGenerate({ current: 0, total: 0 });
    }
  };

  // Send Admit Cards (progress)
  const sendAdmitCardEmails = async () => {
    if (selectedStudents.length === 0) {
      toast.error("No students selected");
      return;
    }

    setLoadingSend(true);
    setProgressSend({ current: 0, total: selectedStudents.length });

    try {
      for (let i = 0; i < selectedStudents.length; i++) {
        const studentId = selectedStudents[i];
        setProgressSend({ current: i + 1, total: selectedStudents.length });

        await axiosInstance.post(
          `/api/admin/bulk-send-admit-cards`,
          { selectedStudents: [studentId] }
        );

        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === studentId ? { ...s, admitCardSent: true } : s,
          ),
        );

        await new Promise((r) => setTimeout(r, 300));
      }

      toast.success("📩 All admit cards emailed successfully!");
      fetchStudents();
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Error sending some admit cards");
    } finally {
      setLoadingSend(false);
      setProgressSend({ current: 0, total: 0 });
    }
  };

  // Download single admit card
  const handleDownloadAdmitCard = async (studentId) => {
    try {
      const res = await axiosInstance.get(
        `/api/students/admit-card/${studentId}`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === studentId ? { ...s, admitCardGenerated: true } : s,
        ),
      );

      setTimeout(() => fetchStudents(), 800);
    } catch (error) {
      console.error("Failed to download admit card:", error);
      toast.error("Failed to download admit card");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterStream("");
    setFilterClass("");
    setFilterTarget("");
    setFilterStatus("");
    fetchStudents();
  };

  const handleDeleteStudent = async (studentId) => {
    if (
      !confirm(
        "Are you sure you want to delete this student? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const res = await axiosInstance.delete(
        `/api/admin/delete-student/${studentId}`
      );

      if (res.data.success) {
        toast.success("Student deleted successfully!");

        // Remove student locally without refetching whole list
        setStudents((prev) => prev.filter((s) => s.studentId !== studentId));
      } else {
        toast.error(res.data.message || "Failed to delete student.");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Error deleting student");
    }
  };

  return (
    <div>
      <div className="w-full min-h-screen bg-background p-4 sm:p-6 md:p-8 pb-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Student Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Generate and track Admit Card status
            </p>
          </div>

          {/* ================= Search Bar ================= */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by Name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
            />
          </div>

          {/* ================= Filters ================= */}
          <div className="">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1">
                {formMode === "junior" ? (
                  <Select
                    value={filterClass}
                    onValueChange={(value) => setFilterClass(value)}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground w-full">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="Class 8">Class 8</SelectItem>
                      <SelectItem value="Class 9">Class 9</SelectItem>
                      <SelectItem value="Class 10">Class 10</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={filterStream}
                    onValueChange={(value) => setFilterStream(value)}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground w-full">
                      <SelectValue placeholder="Select Stream" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="PCM">PCM</SelectItem>
                      <SelectItem value="PCB">PCB</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1">
                <Select
                  value={filterTarget}
                  onValueChange={(value) => setFilterTarget(value)}
                >
                  <SelectTrigger className="bg-background border-border text-foreground w-full">
                    <SelectValue placeholder="Select Target" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="NEET">NEET</SelectItem>
                    <SelectItem value="CBSE Board">CBSE Board</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1">
                <Select
                  value={filterStatus || "all"}
                  onValueChange={(value) =>
                    setFilterStatus(value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger className="bg-background border-border text-foreground w-full">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Generated">
                      Admit Card Generated
                    </SelectItem>
                    <SelectItem value="Sent">Admit Card Sent</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={clearFilters}
                  variant="default"
                  className="flex-1 sm:flex-initial"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* ================= Action Buttons ================= */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Button
              onClick={generateAdmitCards}
              disabled={loadingGenerate || loadingSend}
              variant="default"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <FileText className="w-4 h-4" />
              {loadingGenerate
                ? `Generating (${progressGenerate.current}/${progressGenerate.total})`
                : "Generate Admit Cards"}
            </Button>

            <Button
              onClick={sendAdmitCardEmails}
              disabled={loadingSend || loadingGenerate}
              variant="default"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Mail className="w-4 h-4" />
              {loadingSend
                ? `Sending (${progressSend.current}/${progressSend.total})`
                : "Send Emails"}
            </Button>
          </div>

          {/* ================= Progress Bars ================= */}
          {loadingGenerate && progressGenerate.total > 0 && (
            <div className="w-full bg-gray-200 h-2 rounded mb-3">
              <div
                className="bg-primary h-2 rounded"
                style={{
                  width: `${(progressGenerate.current / progressGenerate.total) * 100}%`,
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>
          )}

          {loadingSend && progressSend.total > 0 && (
            <div className="w-full bg-gray-200 h-2 rounded mb-3">
              <div
                className="bg-primary h-2 rounded"
                style={{
                  width: `${(progressSend.current / progressSend.total) * 100}%`,
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>
          )}

          {/* ================= Students Table ================= */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 text-left">
                  <tr className="border-b border-border bg-muted/20">
                    <th className="px-6 py-4 text-left">
                      <Checkbox
                        onChange={toggleSelectAll}
                        checked={
                          selectedStudents.length === students.length &&
                          students.length > 0
                        }
                        className="border-slate-300"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {formMode === "junior" ? "Class" : "Stream"}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    Array(5)
                      .fill(0)
                      .map((_, i) => <SkeletonTableRow key={i} />)
                  ) : students.length > 0 ? (
                    students.map((student) => (
                      <tr key={student._id}>
                        <td className="text-center">
                          {student.admitCardSent ? (
                            <span className="text-primary font-semibold inline-flex items-center gap-1">
                              <CheckCheck className="w-4 h-4" />
                            </span>
                          ) : (
                            <Checkbox
                              onChange={() => toggleStudent(student.studentId)}
                              checked={selectedStudents.includes(
                                student.studentId,
                              )}
                              className="h-4 w-4"
                            />
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {student.studentId}
                        </td>

                        <td className="px-6 py-4 text-sm text-foreground">
                          {student.studentName}
                        </td>

                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formMode === "junior" ? student.classMoving : student.stream}
                        </td>

                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {student.target}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          {student.admitCardSent ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 shadow-none border border-emerald-200">
                              Sent
                            </Badge>
                          ) : student.admitCardGenerated ? (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 shadow-none border border-primary/20">
                              Generated
                            </Badge>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 shadow-none border border-border">
                              Pending
                            </Badge>
                          )}
                        </td>

                        <td className="px-6 py-4 flex items-center gap-3">
                          {/* View */}
                          {student.admitCardGenerated ? (
                            <Button
                              onClick={() =>
                                handleDownloadAdmitCard(student.studentId)
                              }
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              View
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                            >
                              View
                            </Button>
                          )}

                          {/* Delete */}
                          <Trash
                            className="w-5 h-5 text-destructive/80 cursor-pointer hover:text-destructive transition"
                            onClick={() =>
                              handleDeleteStudent(student.studentId)
                            }
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <p className="text-slate-500">No students found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationControls
            page={page}
            setPage={setPage}
            totalPages={totalPages}
          />
        </div>
      </div>
    </div>
  );
}
