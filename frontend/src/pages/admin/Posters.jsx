import { useEffect, useState, useCallback, useRef } from "react";
import { axiosInstance } from "@/lib/axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Upload, GripVertical } from "lucide-react";


const Posters = () => {
  const [posters, setPosters] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState({ type: null, id: null });
  const fileInputRef = useRef(null);


  // Fetch All Posters
  const fetchPosters = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/api/admin/posters/all`);
      if (res.data && res.data.data) {
        setPosters(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch posters:", err);
      toast.error("Failed to load posters");
    }
  }, [token]);

  useEffect(() => {
    fetchPosters();
  }, [fetchPosters]);

  // Upload Posters (supports multiple)
  const handleUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate each file
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        toast.error(`"${file.name}" is not a valid image (JPG, PNG, WebP only)`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 5MB size limit`);
        return;
      }
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("poster", file));

    setUploading(true);
    try {
      await axiosInstance.post(`/api/admin/posters`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(`${files.length} poster(s) uploaded successfully!`);
      fetchPosters();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload posters");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [token, fetchPosters]);

  // Toggle Status
  const toggleStatus = useCallback(async (id) => {
    try {
      setLoading({ type: "toggle", id });
      await axiosInstance.patch(
        `/api/admin/posters/${id}/toggle`,
        {}
      );

      setPosters((prev) =>
        prev.map((p) =>
          p._id === id ? { ...p, isActive: !p.isActive } : p
        )
      );
      toast.success("Poster status updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update poster status");
      fetchPosters();
    } finally {
      setLoading({ type: null, id: null });
    }
  }, [token, fetchPosters]);

  // Delete Poster
  const deletePoster = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this poster?")) return;

    try {
      setLoading({ type: "delete", id });
      await axiosInstance.delete(`/api/admin/posters/${id}`);
      toast.success("Poster deleted successfully!");
      fetchPosters();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete poster");
    } finally {
      setLoading({ type: null, id: null });
    }
  }, [token, fetchPosters]);

  // Move Poster Up/Down
  const movePoster = useCallback(async (index, direction) => {
    const newPosters = [...posters];
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= newPosters.length) return;

    // Swap
    [newPosters[index], newPosters[swapIndex]] = [newPosters[swapIndex], newPosters[index]];

    // Optimistic update
    setPosters(newPosters);

    try {
      const orderedIds = newPosters.map((p) => p._id);
      await axiosInstance.patch(
        `/api/admin/posters/reorder`,
        { orderedIds }
      );
      toast.success("Poster order updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reorder posters");
      fetchPosters();
    }
  }, [posters, token, fetchPosters]);

  return (
    <div>
      <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 pb-8 space-y-6 sm:space-y-8">
        <div className="w-full max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl pb-6 sm:pb-8 font-bold text-foreground lg:text-4xl">Poster Management</h1>

          {/* Upload Card */}
          <Card className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-md hover:shadow-lg transition-shadow mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Image className="w-6 h-6 text-[#00afd0]" />
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Upload New Poster</h2>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-[#00afd0]/50 transition-colors">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-500 mb-4">
                  Upload poster images (JPG, PNG, WebP - max 5MB each). <br />
                  Recommended format - WebP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleUpload}
                  className="hidden"
                  id="poster-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-[#00afd0] hover:bg-[#0295b3] text-white font-semibold"
                >
                  {uploading ? "Uploading..." : "Choose Files & Upload"}
                </Button>
              </div>

              <p className="text-xs text-slate-400">
                New posters are added to the end of the slider. Use the arrows below to reorder.
              </p>
            </div>
          </Card>

          {/* Posters List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                All Posters ({posters.length})
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <GripVertical size={14} /> Use arrows to reorder
                </span>
              </div>
            </div>

            {posters && posters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {posters.map((poster, index) => (
                  <Card
                    key={poster._id}
                    className={`bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow ${
                      !poster.isActive ? "opacity-60 border-red-200" : "border-slate-100"
                    }`}
                  >
                    {/* Image Preview */}
                    <div className="relative aspect-video bg-slate-50">
                      <img
                        src={poster.imageUrl}
                        alt={`Poster ${index + 1}`}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      {/* Order badge */}
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-md">
                        #{index + 1}
                      </span>
                      {/* Status badge */}
                      <span
                        className={`absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          poster.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {poster.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="p-3 flex items-center justify-between gap-2">
                      {/* Reorder Buttons */}
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => movePoster(index, "up")}
                          disabled={index === 0}
                          title="Move Up"
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => movePoster(index, "down")}
                          disabled={index === posters.length - 1}
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </Button>
                      </div>

                      {/* Toggle & Delete */}
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleStatus(poster._id)}
                          disabled={loading.id === poster._id && loading.type === "toggle"}
                          title={poster.isActive ? "Disable" : "Enable"}
                        >
                          {loading.id === poster._id && loading.type === "toggle" ? (
                            "..."
                          ) : poster.isActive ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deletePoster(poster._id)}
                          disabled={loading.id === poster._id && loading.type === "delete"}
                          title="Delete"
                        >
                          {loading.id === poster._id && loading.type === "delete" ? (
                            "..."
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
                <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No posters yet. Upload one to get started!</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Posters;
