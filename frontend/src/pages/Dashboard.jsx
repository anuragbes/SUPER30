import axios from "axios";
import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "../App.css";
import {
  Users,
  BookOpen,
  FileText,
  Calendar,
  Shuffle,
  RotateCcw,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Activity,
  ShieldAlert,
  Download,
  List,
  Settings,
  Shield,
  GraduationCap
} from "lucide-react";
import ActionCard from "@/components/ActionCard";
import { SkeletonStatCard, SkeletonChart } from "@/components/SkeletonCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingRoll, setLoadingRoll] = useState(false);
  const [loadingRemoveRoll, setLoadingRemoveRoll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState("alphabetical");
  const [removeStream, setRemoveStream] = useState("PCM");
  const [removeClass, setRemoveClass] = useState("Class 8");
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [examDate, setExamDate] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [formMode, setFormMode] = useState("senior");

  const token = localStorage.getItem("adminToken");
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#D7263D",
    "#6A4C93",
  ];

  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const googleSheetURL = import.meta.env.VITE_GOOGLE_SHEET_URL;

  const fetchExamSettings = async () => {
    try {
      const res = await axios.get(`${backendURL}/api/admin/exam-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setExamDate(res.data.examDate || "");
      setLastDate(res.data.lastDateToRegister || "");
      setResultDate(res.data.resultDate || "");
      setRegistrationOpen(res.data.registrationOpen ?? true);
      setFormMode(res.data.formMode || "senior");
    } catch (error) {
      console.error("Failed to fetch exam settings:", error);
    }
  };

  const updateExamSettings = async (data) => {
    try {
      const payload = data || {
        examDate,
        lastDateToRegister: lastDate,
        resultDate,
        registrationOpen,
        formMode,
      };

      await axios.post(`${backendURL}/api/admin/exam-settings`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Exam settings updated!");

      // Refresh settings from backend to ensure sync
      await fetchExamSettings();
    } catch (error) {
      toast.error("Failed to update settings");
      console.error(error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendURL}/api/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);

      const summaryRes = await axios.get(
        `${backendURL}/api/admin/summary-stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error("Failed to load dashboard data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchExamSettings();
  }, []);

  const resetCounter = async () => {
    if (
      !window.confirm(
        "This will reset Student ID counter to STU0001. Continue?",
      )
    )
      return;
    try {
      setLoadingReset(true);
      await axios.post(`${backendURL}/api/students/reset-id-counter`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(
        "Counter reset successfully. Next student will be STU0001.",
      );
    } catch {
      toast.error("Failed to reset counter");
    } finally {
      setLoadingReset(false);
    }
  };

  const generateRollNo = async () => {
    if (!order) {
      toast.warning("Please select order (alphabetical or random).");
      return;
    }

    try {
      setLoadingRoll(true);
      const payload = { order };
      await axios.post(`${backendURL}/api/admin/generate-rollno`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Roll numbers generated (${formMode === "junior" ? "by class" : "by stream"}) — order: ${order}`);
      fetchDashboardData();
    } catch {
      toast.error("Failed to generate roll numbers");
    } finally {
      setLoadingRoll(false);
    }
  };

  const removeRollNo = async () => {
    const isJunior = formMode === "junior";
    const label = isJunior ? removeClass : removeStream;

    if (!label) {
      toast.warning(isJunior ? "Please select a class." : "Please select a stream.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to remove all roll numbers for ${label}? This will clear roll numbers from both database and Google Sheet.`,
      )
    ) {
      return;
    }

    try {
      setLoadingRemoveRoll(true);
      const payload = isJunior ? { classGroup: removeClass } : { stream: removeStream };
      await axios.post(`${backendURL}/api/admin/remove-rollno`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Roll numbers removed for ${label}`);
      fetchDashboardData();
    } catch (error) {
      toast.error("Failed to remove roll numbers");
      console.error(error);
    } finally {
      setLoadingRemoveRoll(false);
    }
  };

  const clearDatabase = async () => {
    if (
      !window.confirm(
        "⚠️ Are you sure? All student data will be erased permanently.",
      )
    )
      return;

    try {
      setLoading(true);
      await axios.delete(`${backendURL}/api/admin/clear-database`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("✅ All student data cleared!");
      fetchDashboardData();
    } catch {
      toast.error("❌ Failed to clear data.");
    } finally {
      setLoading(false);
    }
  };

  const clearDate = async (dateField) => {
    let updatedData = {
      examDate,
      lastDateToRegister: lastDate,
      resultDate,
      registrationOpen,
    };

    if (dateField === "examDate") {
      setExamDate("");
      updatedData.examDate = "";
    } else if (dateField === "lastDate") {
      setLastDate("");
      updatedData.lastDateToRegister = "";
    } else if (dateField === "resultDate") {
      setResultDate("");
      updatedData.resultDate = "";
    }

    await updateExamSettings(updatedData);
    toast.success(
      `${dateField === "examDate" ? "Exam" : dateField === "lastDate" ? "Registration" : "Result"} date reset to "TO BE ANNOUNCED"`,
    );
  };

  const renderPieChart = (title, data, showLabel = true) => (
    <div className="flex flex-col bg-card rounded-2xl shadow-sm p-4 sm:p-6 border border-border hover:shadow-md transition-shadow">
      <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        {title}
      </h2>
      {data?.length > 0 ? (
        <div className="flex justify-center w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50}
                dataKey="count"
                label={
                  showLabel ? ({ name, value }) => `${name}: ${value}` : false
                }
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${value}`}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-8">
          No data available
        </p>
      )}
    </div>
  );

  return (
    <div>
      <Navbar />
      <div className="w-full min-h-screen bg-background pt-20 sm:pt-24 px-4 sm:px-6 md:px-8 pb-12 space-y-8">
        <div className="w-full max-w-7xl mx-auto space-y-10">
          
          {/* 1. GLOBAL STATUS HEADER */}
          <div className="bg-card border border-border shadow-sm rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Dashboard Overview
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    registrationOpen
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {registrationOpen ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <XCircle className="w-3 h-3 mr-1" />
                  )}
                  Registration {registrationOpen ? "Open" : "Closed"}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Mode: {formMode === "junior" ? "Junior (8-10)" : "Senior (11-12)"}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Exam Date</p>
                <p className="text-sm font-medium text-foreground mt-1">{examDate || "To Be Announced"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Last Date</p>
                <p className="text-sm font-medium text-foreground mt-1">{lastDate || "To Be Announced"}</p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Result Date</p>
                <p className="text-sm font-medium text-foreground mt-1">{resultDate || "To Be Announced"}</p>
              </div>
            </div>
          </div>

          {/* 2. SUMMARY STATISTICS SECTION */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Statistics</h2>
            {loading ? (
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${formMode === "junior" ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4`}>
                {Array(formMode === "junior" ? 5 : 4).fill(0).map((_, i) => <SkeletonStatCard key={i} />)}
              </div>
            ) : summary ? (
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${formMode === "junior" ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4`}>
                <div className="bg-card p-5 rounded-2xl shadow-sm border border-border flex flex-col gap-4 hover:shadow-md transition group">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md">Live</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{summary.totalStudents}</p>
                    <h3 className="text-sm font-medium text-muted-foreground mt-1">Total Students</h3>
                  </div>
                </div>

                {formMode === "junior" ? (
                  <>
                    <div className="bg-card p-5 rounded-2xl shadow-sm border border-border flex flex-col gap-4 hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">Class</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{summary.class8Count || 0}</p>
                        <h3 className="text-sm font-medium text-muted-foreground mt-1">Class 8 Students</h3>
                      </div>
                    </div>
                    <div className="bg-card p-5 rounded-2xl shadow-sm border border-border flex flex-col gap-4 hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">Class</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{summary.class9Count || 0}</p>
                        <h3 className="text-sm font-medium text-muted-foreground mt-1">Class 9 Students</h3>
                      </div>
                    </div>
                    <div className="bg-card p-5 rounded-2xl shadow-sm border border-border flex flex-col gap-4 hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">Class</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{summary.class10Count || 0}</p>
                        <h3 className="text-sm font-medium text-muted-foreground mt-1">Class 10 Students</h3>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-card p-5 rounded-2xl shadow-sm border border-border flex flex-col gap-4 hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">Stream</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{summary.pcmCount}</p>
                        <h3 className="text-sm font-medium text-muted-foreground mt-1">PCM Students</h3>
                      </div>
                    </div>

                    <div className="bg-card p-5 rounded-2xl shadow-sm border border-border flex flex-col gap-4 hover:shadow-md transition group">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">Stream</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{summary.pcbCount}</p>
                        <h3 className="text-sm font-medium text-muted-foreground mt-1">PCB Students</h3>
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-card p-5 rounded-2xl shadow-sm border border-border flex flex-col gap-4 hover:shadow-md transition group">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">Ready</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{summary.admitCardGenerated}</p>
                    <h3 className="text-sm font-medium text-muted-foreground mt-1">Admit Cards Generated</h3>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. QUICK ACTIONS SECTION */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => navigate("/admin/students")} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Users size={16} /> View Students
            </Button>
            <Button onClick={() => window.open(googleSheetURL, "_blank")} variant="outline" className="gap-2 border-border text-foreground">
              <Download size={16} /> Export Data
            </Button>
            <Button onClick={() => navigate("/register")} variant="outline" className="gap-2 border-border text-foreground">
              <ArrowUpRight size={16} /> Registration Form
            </Button>
            <Button onClick={fetchDashboardData} variant="secondary" className="gap-2 bg-muted text-foreground hover:bg-muted/80">
              <RotateCcw size={16} /> Refresh
            </Button>
          </div>

          {/* 4. MANAGEMENT TOOLS SECTION */}
          <div className="pt-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Management Tools</h2>
            
            <div className="space-y-8">
              {/* A. Registration Management */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Registration Management
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <ActionCard
                    title={registrationOpen ? "Close Registration" : "Open Registration"}
                    description="Open and Close Registration"
                    buttonLabel={registrationOpen ? "Close Registration" : "Open Registration"}
                    onClick={async () => {
                      const newValue = !registrationOpen;
                      try {
                        await axios.post(`${backendURL}/api/admin/exam-settings`, { examDate, lastDateToRegister: lastDate, resultDate, registrationOpen: newValue }, { headers: { Authorization: `Bearer ${token}` } });
                        toast.success(`Registration ${newValue ? "opened" : "closed"} successfully!`);
                        setRegistrationOpen(newValue);
                        await fetchExamSettings();
                      } catch (error) {
                        toast.error("Failed to update registration status");
                        console.error(error);
                      }
                    }}
                    variant={registrationOpen ? "destructive" : "default"}
                    icon={<Users size={20} />}
                  >
                    <p className="text-xs text-muted-foreground">
                      Current Status: <strong>{registrationOpen ? "Open" : "Closed"}</strong>
                    </p>
                  </ActionCard>

                  <ActionCard
                    title="Set Exam Date"
                    description="Configure the exam schedule"
                    buttonLabel="Save Exam Date"
                    onClick={() => updateExamSettings()}
                    variant="default"
                    icon={<Calendar size={20} />}
                  >
                    <label className="text-sm font-medium text-foreground block">Exam Date</label>
                    <div className="flex gap-2 mt-1">
                      <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="text-sm flex-1" />
                      <Button onClick={() => clearDate("examDate")} variant="outline" className="text-xs" title="Clear date">✕</Button>
                    </div>
                  </ActionCard>

                  <ActionCard
                    title="Set Last Date"
                    description="Deadline for student registrations"
                    buttonLabel="Save"
                    onClick={() => updateExamSettings()}
                    icon={<Calendar size={20} />}
                  >
                    <label className="text-sm font-medium block">Last Date</label>
                    <div className="flex gap-2 mt-1">
                      <Input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} className="text-sm flex-1" />
                      <Button onClick={() => clearDate("lastDate")} variant="outline" className="text-xs" title="Clear date">✕</Button>
                    </div>
                  </ActionCard>

                  <ActionCard
                    title="Set Result Date"
                    description="Date when results will be announced"
                    buttonLabel="Save"
                    onClick={() => updateExamSettings()}
                    icon={<Calendar size={20} />}
                  >
                    <label className="text-sm font-medium block">Result Date</label>
                    <div className="flex gap-2 mt-1">
                      <Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} className="text-sm flex-1" />
                      <Button onClick={() => clearDate("resultDate")} variant="outline" className="text-xs" title="Clear date">✕</Button>
                    </div>
                  </ActionCard>
                </div>
              </div>

              {/* B. Roll Number Management */}
              <div className="border-t border-border pt-8">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <List className="w-4 h-4" /> Roll Number Management
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ActionCard
                    title="Generate Roll Numbers"
                    description={formMode === "junior" ? "Assign roll numbers by class" : "Assign roll numbers by stream"}
                    buttonLabel={loadingRoll ? "Generating..." : "Generate Roll Numbers"}
                    onClick={generateRollNo}
                    disabled={loadingRoll}
                    variant="default"
                    icon={<Shuffle size={20} />}
                  >
                    <label className="text-sm font-medium text-foreground block">Select Order</label>
                    <select
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                      className="border border-input bg-background rounded-md p-2 w-full mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="alphabetical">Alphabetical (A → Z)</option>
                      <option value="random">Random</option>
                    </select>
                  </ActionCard>

                  <ActionCard
                    title="Remove Roll Numbers"
                    description={formMode === "junior" ? "Clear roll numbers for a class" : "Clear roll numbers for a stream"}
                    buttonLabel={loadingRemoveRoll ? "Removing..." : "Remove Roll Numbers"}
                    onClick={removeRollNo}
                    disabled={loadingRemoveRoll}
                    variant="destructive"
                    icon={<X size={20} />}
                  >
                    <label className="text-sm font-medium text-foreground block">
                      {formMode === "junior" ? "Select Class" : "Select Stream"}
                    </label>
                    {formMode === "junior" ? (
                      <select
                        value={removeClass}
                        onChange={(e) => setRemoveClass(e.target.value)}
                        className="border border-input bg-background rounded-md p-2 w-full mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="Class 8">Class 8</option>
                        <option value="Class 9">Class 9</option>
                        <option value="Class 10">Class 10</option>
                      </select>
                    ) : (
                      <select
                        value={removeStream}
                        onChange={(e) => setRemoveStream(e.target.value)}
                        className="border border-input bg-background rounded-md p-2 w-full mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="PCM">PCM</option>
                        <option value="PCB">PCB</option>
                      </select>
                    )}
                  </ActionCard>
                </div>
              </div>

              {/* C. System Configuration */}
              <div className="border-t border-border pt-8">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> System Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <ActionCard
                    title={formMode === "junior" ? "Switch to Senior" : "Switch to Junior"}
                    description="Toggle between Junior (8-10) and Senior (11-12)"
                    buttonLabel={formMode === "junior" ? "Switch to Senior" : "Switch to Junior"}
                    onClick={async () => {
                      const newMode = formMode === "junior" ? "senior" : "junior";
                      try {
                        await axios.post(`${backendURL}/api/admin/exam-settings`, { formMode: newMode }, { headers: { Authorization: `Bearer ${token}` } });
                        toast.success(`Switched to ${newMode === "junior" ? "Junior" : "Senior"} mode!`);
                        setFormMode(newMode);
                        await fetchExamSettings();
                      } catch (error) {
                        toast.error("Failed to switch mode");
                        console.error(error);
                      }
                    }}
                    variant={formMode === "junior" ? "default" : "warning"}
                    icon={<BookOpen size={20} />}
                  >
                    <p className="text-xs text-muted-foreground">
                      Current Mode: <strong>{formMode === "junior" ? "Junior (Class 8-10)" : "Senior (Class 11-12)"}</strong>
                    </p>
                  </ActionCard>

                  <ActionCard
                    title="Open Google Sheet"
                    description="View live student registration data"
                    buttonLabel="Open Sheet"
                    onClick={() => window.open(googleSheetURL, "_blank")}
                    variant="default"
                    icon={<FileText size={20} />}
                  >
                    <p className="text-xs text-muted-foreground">Opens the connected Google Sheet.</p>
                  </ActionCard>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            {/* 5. ANALYTICS SECTION */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Analytics Overview</h2>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(6).fill(0).map((_, i) => <SkeletonChart key={i} />)}
                </div>
              ) : stats ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderPieChart("Gender Distribution", stats.gender, true)}
                  {formMode !== "junior" && renderPieChart("Stream", stats.stream, true)}
                  {renderPieChart("Target Exam", stats.target, true)}
                  {renderPieChart("Class", stats.classMoving, false)}
                  {renderPieChart("Test Centre", stats.testCentre, false)}
                  {renderPieChart("Study Centre", stats.studyCentre, false)}
                  {renderPieChart("Scholarship Offered", stats.scholarship, true)}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8 bg-card rounded-2xl border border-border">No analytics data available</p>
              )}
            </div>
          </div>

          {/* 7. DANGEROUS OPERATIONS SECTION */}
          <div className="mt-12 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-6 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Danger Zone
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionCard
                title="Reset Student ID"
                description="Reset Student ID counter back to STU0001"
                buttonLabel={loadingReset ? "Resetting..." : "Reset Counter"}
                onClick={resetCounter}
                disabled={loadingReset}
                variant="warning"
                icon={<RotateCcw size={20} />}
              >
                <p className="text-xs text-muted-foreground">This will reset the student ID counter back to STU0001.</p>
              </ActionCard>

              <ActionCard
                title="Clear Database"
                description="Delete all student records permanently"
                buttonLabel={loading ? "Clearing..." : "Delete All Students"}
                onClick={clearDatabase}
                disabled={loading}
                variant="destructive"
                icon={<Trash2 size={20} />}
              >
                <p className="text-xs text-muted-foreground">Permanently delete all student records. This action cannot be undone.</p>
              </ActionCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
