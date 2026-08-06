import { useEffect, useState } from "react";
import { axiosInstance } from "@/lib/axios";

import { toast } from "sonner";
import { CheckCheck, FileText, Mail, RotateCcw, Search, Trash } from "lucide-react";
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStream, setFilterStream] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [progressGenerate, setProgressGenerate] = useState({
    current: 0,
    total: 0,
  });
  const [progressSend, setProgressSend] = useState({ current: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formMode, setFormMode] = useState("senior");
  const [stats, setStats] = useState({ sentViaBrevo: 0, sentViaResend: 0, admitCardSent: 0 });
  const [emailProvider, setEmailProvider] = useState("brevo");

  const currentProviderLimit = emailProvider === "brevo" 
    ? Math.max(0, (stats.brevo?.limit || 300) - (stats.brevo?.used || 0))
    : Math.max(0, (stats.resend?.limit || 100) - (stats.resend?.used || 0));

  const isQuotaExceeded = selectedStudents.length > currentProviderLimit;

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get(`/api/admin/summary-stats`);
      setStats(res.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };



  // Fetch students with filters
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/students/all`, {
        params: {
          search: debouncedSearch,
          stream: formMode === "senior" ? filterStream : "",
          classMoving: formMode === "junior" ? filterClass : "",
          target: filterTarget,
          status: filterStatus,
          page,
        },
      });

      const data = res.data.data || [];

      data.sort((a, b) => {
        const na = parseInt((a.studentId || "").replace(/\D/g, "")) || 0;
        const nb = parseInt((b.studentId || "").replace(/\D/g, "")) || 0;
        return na - nb;
      });

      setStudents(data);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching students:", error);
      if (error.response?.status !== 401) {
        toast.error("Failed to load students");
      }
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
    fetchStats();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  useEffect(() => {
    fetchStudents();
  }, [debouncedSearch, filterStream, filterClass, filterTarget, filterStatus, page, formMode]);


  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length && students.length > 0) {
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
      let totalSent = 0;
      let totalSkipped = 0;

      for (let i = 0; i < selectedStudents.length; i++) {
        const studentId = selectedStudents[i];
        setProgressSend({ current: i + 1, total: selectedStudents.length });

        const res = await axiosInstance.post(
          `/api/admin/bulk-send-admit-cards`,
          { selectedStudents: [studentId], provider: emailProvider }
        );

        if (res.data.skippedList && res.data.skippedList.length > 0) {
          totalSkipped += 1;
        } else {
          totalSent += 1;
          setStudents((prev) =>
            prev.map((s) =>
              s.studentId === studentId ? { ...s, admitCardSent: true } : s,
            ),
          );
        }

        await new Promise((r) => setTimeout(r, 300));
      }

      if (totalSkipped > 0 && totalSent === 0) {
        toast.info(`Skipped ${totalSkipped} students (already sent)`);
      } else if (totalSkipped > 0) {
        toast.success(`Sent ${totalSent} emails (Skipped ${totalSkipped} already sent)`);
      } else {
        toast.success(`All ${totalSent} admit cards emailed successfully!`);
      }
      
      fetchStudents();
      fetchStats();
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Error sending some admit cards");
    } finally {
      setLoadingSend(false);
      setProgressSend({ current: 0, total: 0 });
    }
  };

  // Reset Admit Cards
  const resetAdmitCards = async () => {
    const hasSelection = selectedStudents.length > 0;

    const confirmed = window.confirm(
      hasSelection
        ? `This will reset the admit card status of ${selectedStudents.length} selected student(s).\n\nThey will be marked as Pending and can be regenerated and emailed again.\n\nDo you want to continue?`
        : "No students selected. This will reset the admit card status of ALL students.\n\nThey will be marked as Pending and can be regenerated and emailed again.\n\nDo you want to continue?"
    );

    if (!confirmed) return;

    setLoadingReset(true);

    try {
      const res = await axiosInstance.post(`/api/admin/reset-admit-cards`, {
        selectedStudents: hasSelection ? selectedStudents : undefined,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setSelectedStudents([]);
        fetchStudents();
        fetchStats();
      } else {
        toast.error(res.data.message || "Failed to reset admit cards.");
      }
    } catch (error) {
      console.error("Error resetting admit cards:", error);
      const msg = error.response?.data?.error || "Failed to reset admit cards. Please try again.";
      toast.error(msg);
    } finally {
      setLoadingReset(false);
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

      // Deferred, not immediate: the new tab's PDF viewer fetches the blob's
      // bytes asynchronously after window.open() returns, so revoking right
      // away can invalidate the URL before that fetch happens, breaking the
      // PDF load. 1s is comfortably longer than that (non-network, in-memory)
      // fetch takes, while still freeing the blob promptly afterward.
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);

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
    setPage(1);
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
      <div className="w-full min-h-dvh bg-background p-4 sm:p-6 md:p-8 pb-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="space-y-2 flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                Student Management
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Generate and track Admit Card status
              </p>
            </div>
            
            <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border border-border mt-4 sm:mt-0 shadow-sm">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Sent</span>
                <span className="text-lg font-bold text-foreground leading-none">{stats.admitCardSent || 0}</span>
              </div>
              <div className="h-8 w-px bg-border mx-2"></div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-muted-foreground">Brevo:</span>
                  <span className="text-foreground">{stats.sentViaBrevo || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-muted-foreground">Resend:</span>
                  <span className="text-foreground">{stats.sentViaResend || 0}</span>
                </div>
              </div>
              <div className="h-8 w-px bg-border mx-2"></div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Brevo Limit</span>
                <div className="flex items-end gap-1">
                  <span className={`text-lg font-bold leading-none ${(stats.brevo?.used || 0) >= (stats.brevo?.limit || 300) ? 'text-destructive' : 'text-foreground'}`}>
                    {stats.brevo?.used || 0}
                  </span>
                  <span className="text-xs text-muted-foreground mb-0.5">/ {stats.brevo?.limit || 300}</span>
                </div>
                {stats.brevo?.nextReset && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                    Resets: {new Date(stats.brevo.nextReset).toLocaleString("en-IN", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="h-8 w-px bg-border mx-2"></div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Resend Limit</span>
                <div className="flex items-end gap-1">
                  <span className={`text-lg font-bold leading-none ${(stats.resend?.used || 0) >= (stats.resend?.limit || 100) ? 'text-destructive' : 'text-foreground'}`}>
                    {stats.resend?.used || 0}
                  </span>
                  <span className="text-xs text-muted-foreground mb-0.5">/ {stats.resend?.limit || 100}</span>
                </div>
                {stats.resend?.nextReset && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                    Resets: {new Date(stats.resend.nextReset).toLocaleString("en-IN", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ================= Search Bar ================= */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by Name or ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                    onValueChange={(value) => { setFilterClass(value); setPage(1); }}
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
                    onValueChange={(value) => { setFilterStream(value); setPage(1); }}
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
                  onValueChange={(value) => { setFilterTarget(value); setPage(1); }}
                >
                  <SelectTrigger className="bg-background border-border text-foreground w-full">
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
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1">
                <Select
                  value={filterStatus || "all"}
                  onValueChange={(value) => {
                    setFilterStatus(value === "all" ? "" : value);
                    setPage(1);
                  }}
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            
            {/* Left: Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
              onClick={generateAdmitCards}
              disabled={loadingGenerate || loadingSend || loadingReset}
              variant="default"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <FileText className="w-4 h-4" />
              {loadingGenerate
                ? `Generating (${progressGenerate.current}/${progressGenerate.total})`
                : "Generate Admit Cards"}
            </Button>

            <Button
              onClick={resetAdmitCards}
              disabled={loadingReset || loadingGenerate || loadingSend}
              variant="destructive"
              className="gap-2"
            >
              <RotateCcw className={`w-4 h-4 ${loadingReset ? "animate-spin" : ""}`} />
              {loadingReset ? "Resetting..." : "Reset Admit Cards"}
            </Button>

            <Button
              onClick={sendAdmitCardEmails}
              disabled={loadingSend || loadingGenerate || loadingReset || isQuotaExceeded}
              variant="default"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Mail className="w-4 h-4" />
              {loadingSend
                ? `Sending (${progressSend.current}/${progressSend.total})`
                : "Send Emails"}
            </Button>

            <div className="flex items-center bg-muted/50 p-1 rounded-md border border-border">
              <Button
                variant={emailProvider === "brevo" ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-3 text-xs ${emailProvider === "brevo" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setEmailProvider("brevo")}
                disabled={loadingSend}
              >
                Brevo
              </Button>
              <Button
                variant={emailProvider === "resend" ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-3 text-xs ${emailProvider === "resend" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setEmailProvider("resend")}
                disabled={loadingSend}
              >
                Resend
              </Button>
            </div>
            </div>

            {/* Right: Selected Count & Quota Warning */}
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${isQuotaExceeded ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/40 border-border'}`}>
              <span className={`text-sm font-medium whitespace-nowrap ${isQuotaExceeded ? 'text-destructive' : ''}`}>
                Selected: <span className="font-bold">{selectedStudents.length}</span> / {currentProviderLimit}
              </span>
              {isQuotaExceeded && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedStudents((prev) => prev.slice(0, currentProviderLimit));
                    toast.success(`Selection reduced to ${currentProviderLimit}`);
                  }} 
                  className="h-7 text-xs px-2 border-destructive/30 text-destructive hover:bg-destructive/10 whitespace-nowrap"
                >
                  Reduce to {currentProviderLimit}
                </Button>
              )}
              {selectedStudents.length > 0 && !isQuotaExceeded && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedStudents([])} className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">Clear</Button>
              )}
            </div>
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
                          <Checkbox
                            onChange={() => toggleStudent(student.studentId)}
                            checked={selectedStudents.includes(
                              student.studentId,
                            )}
                            className="h-4 w-4"
                          />
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
                          <div className="flex flex-col items-start gap-1">
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
                            {student.admitCardSent && (
                              <div className="text-[10px] text-muted-foreground whitespace-nowrap mt-1 flex flex-col gap-0.5">
                                {student.admitCardProvider && (
                                  <span className="flex items-center gap-1">
                                    <span className="font-semibold text-slate-500">Provider:</span> 
                                    <span className="capitalize">{student.admitCardProvider}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 flex items-center gap-3">
                          {/* View */}
                          {(student.admitCardGenerated || student.admitCardSent) ? (
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
