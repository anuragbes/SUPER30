import Admin from "../models/admin.models.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const adminLogin = async (req, res) => {
  try {
    console.log("✅ Login API hit");

    const { username, password } = req.body;

    console.log("🧾 Received Credentials:");
    console.log("username:", username);
    console.log("password:", password);
    

    const admin = await Admin.findOne({ username });

    console.log("🔒 Admin Found In DB:", admin);

    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const isMatch = await bcrypt.compare(password, admin.password);

    console.log("🔍 bcrypt compare():");
    console.log("Entered Password:", password);
    console.log("Stored Hash:", admin.password);
    console.log("isMatch result:", isMatch);

    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { adminId: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Login successful");

    res.json({ message: "Login successful", token });

  } catch (error) {
    console.log("❌ Error inside adminLogin:", error);
    res.status(500).json({ error: error.message });
  }
};

