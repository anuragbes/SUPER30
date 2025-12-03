import axios from "axios";
import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "../App.css";
import { Users, BookOpen, FileText, Calendar, Shuffle, RotateCcw, Trash2 } from "lucide-react";
import ActionCard from "@/components/ActionCard";

export default function Dashboard() {
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingRoll, setLoadingRoll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState("alphabetical");
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [examDate, setExamDate] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(true);



  const token = localStorage.getItem("adminToken");
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#D7263D", "#6A4C93"];

  const backendURL = import.meta.env.VITE_BACKEND_URL;

  const fetchExamSettings = async () => {
    try {
      const res = await axios.get(`${backendURL}/api/admin/exam-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setExamDate(res.data.examDate || "");
      setLastDate(res.data.lastDateToRegister || "");
      setResultDate(res.data.resultDate || "");
      setRegistrationOpen(res.data.registrationOpen ?? true);
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
      };
      
      await axios.post(
        `${backendURL}/api/admin/exam-settings`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
      const res = await axios.get(`${backendURL}/api/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);

      const summaryRes = await axios.get(`${backendURL}/api/admin/summary-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error("Failed to load dashboard data");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchExamSettings();
  }, []);

  const resetCounter = async () => {
    if (!window.confirm("This will reset Student ID counter to STU0001. Continue?")) return;
    try {
      setLoadingReset(true);
      await axios.post(`${backendURL}/api/students/reset-id-counter`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Counter reset successfully. Next student will be STU0001.");
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
      toast.success(`Roll numbers generated (by stream) — order: ${order}`);
      fetchDashboardData();
    } catch {
      toast.error("Failed to generate roll numbers");
    } finally {
      setLoadingRoll(false);
    }
  };

  const clearDatabase = async () => {
    if (!window.confirm("⚠️ Are you sure? All student data will be erased permanently.")) return;

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

  const renderPieChart = (title, data, showLabel = true) => (
    <div className="flex flex-col bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-slate-100 hover:shadow-xl transition-shadow">
      <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground mb-4">{title}</h2>
      {data?.length > 0 ? (
        <div className="flex justify-center">
          <PieChart width={260} height={260}>
            <Pie 
              data={data} 
              cx="50%" 
              cy="50%" 
              outerRadius={75}
              innerRadius={40}
              dataKey="count" 
              label={showLabel ? ({ name, value }) => `${name}: ${value}` : false}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => `${value}`}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ paddingTop: "20px" }}
            />
          </PieChart>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-8">No data available</p>
      )}
    </div>
  );

  return (
    <div>
      <Navbar />
      <div className="w-full min-h-screen bg-gray-50 pt-20 sm:pt-24 px-4 sm:px-6 md:px-8 pb-8 space-y-6 sm:space-y-8">
        <div className="w-full max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl pb-6 sm:pb-8 font-bold text-foreground lg:text-4xl">Dashboard</h1>

          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">

              <div className="bg-linear-to-br from-blue-500/10 to-cyan-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-blue-200/20 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-blue-600">Total Students</h3>
                  <p className="text-xl sm:text-2xl font-bold text-blue-900">{summary.totalStudents}</p>
                </div>
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
              </div>

              <div className="bg-linear-to-br from-emerald-500/10 to-teal-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-emerald-200/20 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-emerald-600">PCM Students</h3>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-900">{summary.pcmCount}</p>
                </div>
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
              </div>

              <div className="bg-linear-to-br from-amber-500/10 to-orange-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-amber-200/20 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-amber-600">PCB Students</h3>
                  <p className="text-xl sm:text-2xl font-bold text-amber-900">{summary.pcbCount}</p>
                </div>
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />
              </div>

              <div className="bg-linear-to-br from-violet-500/10 to-purple-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-violet-200/20 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-violet-600">Admit Cards Generated</h3>
                  <p className="text-xl sm:text-2xl font-bold text-violet-900">{summary.admitCardGenerated}</p>
                </div>
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600 shrink-0" />
              </div>
            </div>
          )}

          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-4">Management Tools</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">

            <ActionCard
              title="Generate Roll Numbers"
              description="Assign roll numbers by stream"
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
              title="Set Exam Date"
              description="Configure the exam schedule"
              buttonLabel="Save Exam Date"
              onClick={() => updateExamSettings()}
              variant="default"
              icon={<Calendar size={20} />}
            >
              <label className="text-sm font-medium text-foreground block">Exam Date</label>
              <Input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="text-sm"
              />
            </ActionCard>
            
            <ActionCard
              title="Set Last Date to Register"
              description="Deadline for student registrations"
              buttonLabel="Save"
              onClick={() => updateExamSettings()}
              icon={<Calendar size={20} />}
            >
              <label className="text-sm font-medium block">Last Date</label>
              <Input
                type="date"
                value={lastDate}
                onChange={(e) => setLastDate(e.target.value)}
                className="text-sm"
              />
            </ActionCard>

            <ActionCard
              title="Set Result Date"
              description="Date when results will be announced"
              buttonLabel="Save"
              onClick={() => updateExamSettings()}
              icon={<Calendar size={20} />}
            >
              <label className="text-sm font-medium block">Result Date</label>
              <Input
                type="date"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                className="text-sm"
              />
            </ActionCard>

                        <ActionCard
              title={registrationOpen ? "Close Registration" : "Open Registration"}
              description="Open and Close Registration for Students"
              buttonLabel={registrationOpen ? "Close Registration" : "Open Registration"}
              onClick={async () => {
                const newValue = !registrationOpen;
                
                try {
                  await axios.post(
                    `${backendURL}/api/admin/exam-settings`,
                    {
                      examDate,
                      lastDateToRegister: lastDate,
                      resultDate,
                      registrationOpen: newValue,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  
                  toast.success(`Registration ${newValue ? 'opened' : 'closed'} successfully!`);
                  
                  // Update state after successful API call
                  setRegistrationOpen(newValue);
                  
                  // Refresh all settings to ensure sync
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
              <p className="text-xs text-muted-foreground">
                Permanently delete all student records. This action cannot be undone.
              </p>
            </ActionCard>
          </div>

          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground pt-8 mb-4">Analytics</h2>

          {stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderPieChart("Gender Distribution", stats.gender, true)}
              {renderPieChart("Stream", stats.stream, true)}
              {renderPieChart("Target Exam", stats.target, true)}
              {renderPieChart("Class Moving", stats.classMoving, false)}
              {renderPieChart("Test Centre", stats.testCentre, false)}
              {renderPieChart("Scholarship Offered", stats.scholarship, true)}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Loading charts...</p>
          )}

        </div>
      </div>
    </div>
  );
}