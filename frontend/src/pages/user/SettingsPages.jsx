import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArrowLeft,
  FaHome,
  FaClipboardList,
  FaTicketAlt,
  FaWallet,
  FaSignOutAlt,
  FaUser,
  FaLock,
  FaCreditCard,
  FaBell,
  FaSave
} from "react-icons/fa";
import "./Profile.css"; // Reuse profile styles for consistent layout

// Layout wrapper for all setting views
function SettingsLayout({ title, children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")) || {};

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="home-page">
      <div className="main-card">
        {/* HEADER */}
        <div className="department-header">
          <img
            src="/images/images.png"
            alt="Government Logo"
            className="dept-logo"
          />
          <div className="dept-title">
            <h1>
              Office of the Principal
              Accountant General (A&E), W.B.
            </h1>
            <p>Treasury Buildings, Kolkata - 700001</p>
          </div>
          <img
            src="/images/IA&AS_Logo.png"
            alt="IAAS Logo"
            className="dept-logo"
          />
        </div>

        {/* CONTENT */}
        <div className="profile-content" style={{ flex: 1, paddingBottom: "20px" }}>
          <button className="back-button" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Back
          </button>

          <div className="profile-title" style={{ marginBottom: "20px" }}>
            <h2>{title}</h2>
          </div>

          <div className="settings-card-content">
            {children}
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="bottom-footer">
          <div className="footer-item" onClick={() => navigate("/home")}>
            <FaHome />
            <span>Home</span>
          </div>
          <div className="footer-item" onClick={() => navigate("/orders")}>
            <FaClipboardList />
            <span>Orders</span>
          </div>
          <div className="footer-item" onClick={() => navigate("/coupons")}>
            <FaTicketAlt />
            <span>Coupons</span>
          </div>
          <div className="footer-item" onClick={() => navigate("/wallet")}>
            <FaWallet />
            <span>Wallet</span>
          </div>
          <div className="footer-item" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 1. Personal Information Component
export function PersonalInformation() {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    email: user.email || "",
    google_email: user.google_email || "",
    mobile: user.mobile || "",
    designation: user.designation || "N/A"
  });

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        (window.API_BASE_URL || "http://localhost:5000") + "/api/employee/profile/update",
        {
          employee_id: user.employee_id,
          ...formData
        }
      );
      
      if (response.data.success) {
        const updatedUser = { ...user, ...formData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        alert("Profile information updated successfully in database!");
      } else {
        alert(response.data.message || "Failed to update profile.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update profile. Server connection error.");
    }
  };

  return (
    <SettingsLayout title="Personal Information">
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "15px" }}>
          <img
            src={
              user.profile_image
                ? (user.profile_image.startsWith("http") ? user.profile_image : `${window.API_BASE_URL || "http://localhost:5000"}${user.profile_image}`)
                : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name || user.username || 'User')}`
            }
            alt="Profile Avatar"
            style={{ width: "90px", height: "90px", borderRadius: "50%", border: "3px solid #0b63f6", objectFit: "cover" }}
          />
        </div>
        
        <div className="settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>EMPLOYEE ID</label>
          <input
            type="text"
            value={user.employee_id || user.username || ""}
            disabled
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f1f5f9", color: "#64748b", cursor: "not-allowed", outline: "none" }}
          />
        </div>

        <div className="settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>FULL NAME</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            required
          />
        </div>

        <div className="settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>DESIGNATION</label>
          <input
            type="text"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            required
          />
        </div>

        <div className="settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>OFFICIAL EMAIL ADDRESS (NIC)</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            required
          />
        </div>

        <div className="settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>PERSONAL GOOGLE EMAIL (GMAIL)</label>
          <input
            type="email"
            value={formData.google_email}
            onChange={(e) => setFormData({ ...formData, google_email: e.target.value })}
            placeholder="Linked Gmail address (for Google login)"
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
          />
        </div>

        <div className="settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>MOBILE NUMBER</label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            required
          />
        </div>

        <button
          type="submit"
          style={{
            marginTop: "10px",
            background: "#0b63f6",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <FaSave /> Save Profile Changes
        </button>
      </form>
    </SettingsLayout>
  );
}

// 2. Change Password Component
export function ChangePassword() {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const [passwords, setPasswords] = useState({
    current: "",
    newPassword: "",
    confirm: ""
  });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      alert("New Password and Confirm Password do not match!");
      return;
    }
    
    try {
      const response = await axios.post(
        (window.API_BASE_URL || "http://localhost:5000") + "/api/auth/change-password",
        {
          employee_id: user.employee_id,
          current_password: passwords.current,
          new_password: passwords.newPassword
        }
      );
      
      if (response.data.success) {
        alert("Password updated successfully in database!");
        setPasswords({ current: "", newPassword: "", confirm: "" });
      } else {
        alert(response.data.message || "Failed to update password.");
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to update password. Server connection error.");
    }
  };

  return (
    <SettingsLayout title="Change Password">
      <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px", fontSize: "40px", color: "#64748b" }}>
          <FaLock />
        </div>

        <div className="settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>CURRENT PASSWORD</label>
          <input
            type="password"
            placeholder="Enter current password"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            required
          />
        </div>

        <div className="settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>NEW PASSWORD</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            required
          />
        </div>

        <div className="settings-field" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>CONFIRM NEW PASSWORD</label>
          <input
            type="password"
            placeholder="Confirm your new password"
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", outline: "none" }}
            required
          />
        </div>

        <button
          type="submit"
          style={{
            marginTop: "10px",
            background: "#0b63f6",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <FaSave /> Update Password
        </button>
      </form>
    </SettingsLayout>
  );
}

// 3. Payment Methods Component
export function PaymentMethods() {
  return (
    <SettingsLayout title="Payment Methods">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Method 1: eCanteen Wallet */}
        <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #cbd5e1", background: "linear-gradient(135deg, #0f172a, #1e293b)", color: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <FaWallet style={{ color: "#38bdf8" }} /> eCanteen Wallet
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", marginTop: "8px" }}>Primary</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Encrypted Balance Ledger</div>
          </div>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>ACTIVE</span>
        </div>

        {/* Method 2: UPI / GPay / PhonePe */}
        <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#475569", fontWeight: "600", textTransform: "uppercase" }}>
              <FaCreditCard style={{ color: "#0b63f6" }} /> Unified Payments Interface (UPI)
            </div>
            <div style={{ fontSize: "14px", color: "#64748b", marginTop: "6px" }}>Google Pay, PhonePe, BHIM App</div>
          </div>
          <span style={{ background: "#e2e8f0", color: "#475569", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>AVAILABLE</span>
        </div>

        {/* Note */}
        <div style={{ padding: "12px 16px", background: "#eff6ff", borderLeft: "4px solid #3b82f6", borderRadius: "4px", fontSize: "13px", color: "#1e3a8a", lineHeight: "1.5" }}>
          <strong>Note on Wallet Updates:</strong> Employees cannot modify their wallet directly. All recharges and allocations are managed securely by the Canteen administrator via cryptographic key signatures.
        </div>
      </div>
    </SettingsLayout>
  );
}

// 4. Notification Settings Component
export function NotificationSettings() {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(`notification_settings_${user.employee_id || "guest"}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      orderAlerts: true,
      rechargeAlerts: true,
      weeklyMenus: false
    };
  });

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    localStorage.setItem(
      `notification_settings_${user.employee_id || "guest"}`,
      JSON.stringify(settings)
    );
    alert("Notification settings saved successfully!");
  };

  return (
    <SettingsLayout title="Notification Settings">
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px", fontSize: "40px", color: "#64748b" }}>
          <FaBell />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Toggle 1 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <strong style={{ display: "block", fontSize: "14px", color: "#0f172a" }}>Order Preparation Alerts</strong>
              <small style={{ color: "#64748b", fontSize: "12px" }}>Receive alerts when order is ready for pickup.</small>
            </div>
            <input
              type="checkbox"
              checked={settings.orderAlerts}
              onChange={() => handleToggle("orderAlerts")}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
            />
          </div>

          {/* Toggle 2 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <strong style={{ display: "block", fontSize: "14px", color: "#0f172a" }}>Wallet Transaction SMS</strong>
              <small style={{ color: "#64748b", fontSize: "12px" }}>Get updates on recharges and menu deductions.</small>
            </div>
            <input
              type="checkbox"
              checked={settings.rechargeAlerts}
              onChange={() => handleToggle("rechargeAlerts")}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
            />
          </div>

          {/* Toggle 3 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong style={{ display: "block", fontSize: "14px", color: "#0f172a" }}>Weekly Canteen Menu Broadcasts</strong>
              <small style={{ color: "#64748b", fontSize: "12px" }}>Receive weekly food options and limits.</small>
            </div>
            <input
              type="checkbox"
              checked={settings.weeklyMenus}
              onChange={() => handleToggle("weeklyMenus")}
              style={{ width: "20px", height: "20px", cursor: "pointer" }}
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            marginTop: "20px",
            background: "#0b63f6",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <FaSave /> Save Preferences
        </button>
      </div>
    </SettingsLayout>
  );
}
