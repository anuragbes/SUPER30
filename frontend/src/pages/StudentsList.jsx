import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { toast } from "sonner";
import { CheckCheck, FileText, Mail, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PaginationControls from "@/components/PaginationControls";

export default function StudentsList() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStream, setFilterStream] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [progressGenerate, setProgressGenerate] = useState({ current: 0, total: 0 });
  const [progressSend, setProgressSend] = useState({ current: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const token = localStorage.getItem("adminToken");
  const backendURL = import.meta.env.VITE_BACKEND_URL;

  // ✅ Fetch students with filters
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendURL}/api/students/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search,
          stream: filterStream,
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
    fetchStudents();
  }, [search, filterStream, filterTarget, filterStatus, page]);

  const handleFilter = () => {
    fetchStudents();
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.studentId));
    }
  };

  // ✅ Generate Admit Cards (progress)
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
          const res = await axios.post(
            `${backendURL}/api/admin/bulk-generate-admit-cards`,
            { selectedStudents: [studentId] },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!res.data.success) {
            toast.error(res.data.message || "Unable to generate admit card.");
            break;
          }

          setStudents((prev) =>
            prev.map((s) =>
              s.studentId === studentId ? { ...s, admitCardGenerated: true } : s
            )
          );
        } catch (error) {
          const msg =
            error.response?.data?.message ||
            error.message ||
            "Failed to generate admit card.";

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

  // ✅ Send Admit Cards (progress)
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

        await axios.post(
          `${backendURL}/api/admin/bulk-send-admit-cards`,
          { selectedStudents: [studentId] },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === studentId ? { ...s, admitCardSent: true } : s
          )
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

  // ✅ Download single admit card
  const handleDownloadAdmitCard = async (studentId) => {
    try {
      const res = await axios.get(`${backendURL}/api/students/admit-card/${studentId}`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === studentId ? { ...s, admitCardGenerated: true } : s
        )
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
    setFilterTarget("");
    setFilterStatus("");
    fetchStudents();
  };

  return (
    <div>
      <Navbar />
      <div className="w-full min-h-screen bg-gray-50 pt-20 sm:pt-24 px-4 sm:px-6 md:px-8 pb-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">Student Management</h1>
            <p className="text-sm sm:text-base text-slate-600">Generate and track Admit Card status</p>
          </div>

          {/* ================= Search Bar ================= */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by Name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
            />
          </div>

          {/* ================= Filters ================= */}
          <div className="">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1">
                <Select
                  value={filterStream}
                  onValueChange={(value) => setFilterStream(value)}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 w-full">
                    <SelectValue placeholder="Select Stream" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="PCM">PCM</SelectItem>
                    <SelectItem value="PCB">PCB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1">
                <Select
                  value={filterTarget}
                  onValueChange={(value) => setFilterTarget(value)}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 w-full">
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
                  onValueChange={(value) => setFilterStatus(value === "all" ? "" : value)}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 w-full">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Generated">Admit Card Generated</SelectItem>
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
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
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
                className="bg-blue-600 h-2 rounded"
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
                className="bg-green-600 h-2 rounded"
                style={{
                  width: `${(progressSend.current / progressSend.total) * 100}%`,
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>
          )}

          {/* ================= Students Table ================= */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 text-left">
                  <tr className="border-b border-slate-200 bg-slate-50">
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Stream
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {students.length > 0 ? (
                    students.map((student) => (
                      <tr key={student._id}>
                        <td className="text-center">
                          {student.admitCardSent ? (
                            <span className="text-green-600 font-semibold inline-flex items-center gap-1">
                              <CheckCheck className="w-4 h-4" />
                            </span>
                          ) : (
                            <Checkbox
                              onChange={() => toggleStudent(student.studentId)}
                              checked={selectedStudents.includes(student.studentId)}
                              className="h-4 w-4"
                            />
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          {student.studentId}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-900">
                          {student.studentName}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {student.stream}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {student.target}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          {student.admitCardSent ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                              Sent
                            </Badge>
                          ) : student.admitCardGenerated ? (
                            <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100">
                              Generated
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                              Pending
                            </Badge>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {student.admitCardGenerated ? (
                            <Button
                              onClick={() =>
                                handleDownloadAdmitCard(student.studentId)
                              }
                              variant="default"
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              View / Download
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-slate-200 text-slate-400 hover:bg-slate-200 cursor-not-allowed"
                            >
                              View / Download
                            </Button>
                          )}
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
              <PaginationControls page={page} setPage={setPage} totalPages={totalPages} />

        </div>
      </div>
    </div>
  );
}
