import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    FaUserPlus,
    FaEdit,
    FaTrash,
    FaSearch,
    FaUsers,
    FaUserShield,
    FaUserTie,
    FaTimes,
    FaCheck,
    FaUserCog,
    FaIdCard
} from "react-icons/fa";

import "./UserManagement.css";

function UserManagement({ searchQuery = "" }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [localSearch, setLocalSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null for Add, user object for Edit
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        full_name: "",
        role: "EMPLOYEE",
        email: "",
        google_email: "",
        mobile: "",
        designation: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(
                (window.API_BASE_URL || "http://localhost:5000") + "/api/employee/list"
            );
            setUsers(res.data || []);
        } catch (err) {
            console.error("Error fetching users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const openAddModal = () => {
        setEditingUser(null);
        setFormData({
            username: "",
            password: "",
            full_name: "",
            role: "EMPLOYEE",
            email: "",
            google_email: "",
            mobile: "",
            designation: ""
        });
        setFormError("");
        setFormSuccess("");
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            employee_id: user.employee_id,
            username: user.username || "",
            password: "", // Keep blank unless updating
            full_name: user.full_name || "",
            role: user.role || "EMPLOYEE",
            email: user.email || "",
            google_email: user.google_email || "",
            mobile: user.mobile || "",
            designation: user.designation || ""
        });
        setFormError("");
        setFormSuccess("");
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setFormSuccess("");

        if (!formData.username || !formData.full_name) {
            setFormError("Username (Employee Code) and Full Name are required.");
            return;
        }

        setSubmitting(true);
        try {
            if (editingUser) {
                // Update User
                const res = await axios.put(
                    (window.API_BASE_URL || "http://localhost:5000") + "/api/employee/update",
                    formData
                );
                if (res.data.success) {
                    setFormSuccess("User details updated successfully!");
                    setTimeout(() => {
                        setIsModalOpen(false);
                        fetchUsers();
                    }, 1200);
                } else {
                    setFormError(res.data.message || "Failed to update user.");
                }
            } else {
                // Insert User
                const res = await axios.post(
                    (window.API_BASE_URL || "http://localhost:5000") + "/api/employee/add",
                    formData
                );
                if (res.data.success) {
                    setFormSuccess(`User '${formData.full_name}' added successfully!`);
                    setTimeout(() => {
                        setIsModalOpen(false);
                        fetchUsers();
                    }, 1200);
                } else {
                    setFormError(res.data.message || "Failed to add user.");
                }
            }
        } catch (err) {
            console.error("Save User Error:", err);
            setFormError(err.response?.data?.message || "Error saving user details.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (user.username === "WBKLE2242172" || user.username === "admin" || user.username === "admin_user") {
            alert("System Admin accounts cannot be deleted.");
            return;
        }

        if (window.confirm(`Are you sure you want to delete user '${user.full_name}' (${user.username})? This will also clear their wallet.`)) {
            try {
                const res = await axios.delete(
                    (window.API_BASE_URL || "http://localhost:5000") + `/api/employee/delete/${user.employee_id}`
                );
                if (res.data.success) {
                    alert("User deleted successfully.");
                    fetchUsers();
                } else {
                    alert(res.data.message || "Failed to delete user.");
                }
            } catch (err) {
                console.error("Delete Error:", err);
                alert(err.response?.data?.message || "Error deleting user.");
            }
        }
    };

    const activeSearch = searchQuery || localSearch;

    const filteredUsers = users.filter((u) => {
        const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
        if (!activeSearch) return matchesRole;
        const q = activeSearch.toLowerCase();
        const matchesSearch =
            (u.full_name && u.full_name.toLowerCase().includes(q)) ||
            (u.username && u.username.toLowerCase().includes(q)) ||
            (u.designation && u.designation.toLowerCase().includes(q)) ||
            (u.mobile && u.mobile.includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q));
        return matchesRole && matchesSearch;
    });

    const totalCount = users.length;
    const empCount = users.filter(u => u.role === "EMPLOYEE").length;
    const adminCount = users.filter(u => u.role === "ADMIN").length;
    const staffCount = users.filter(u => u.role === "CASHIER" || u.role === "STAFF").length;

    return (
        <div className="user-management-container">
            {/* KPI METRICS */}
            <div className="um-kpis-grid">
                <article className="um-kpi-card">
                    <div className="um-kpi-icon-wrapper" style={{ color: "#0b63f6", background: "#0b63f612" }}>
                        <FaUsers />
                    </div>
                    <div className="um-kpi-info">
                        <span className="um-kpi-label">Total Users</span>
                        <strong className="um-kpi-value">{totalCount}</strong>
                    </div>
                </article>

                <article className="um-kpi-card">
                    <div className="um-kpi-icon-wrapper" style={{ color: "#16a34a", background: "#16a34a12" }}>
                        <FaUserTie />
                    </div>
                    <div className="um-kpi-info">
                        <span className="um-kpi-label">Active Employees</span>
                        <strong className="um-kpi-value">{empCount}</strong>
                    </div>
                </article>

                <article className="um-kpi-card">
                    <div className="um-kpi-icon-wrapper" style={{ color: "#7c3aed", background: "#7c3aed12" }}>
                        <FaUserShield />
                    </div>
                    <div className="um-kpi-info">
                        <span className="um-kpi-label">Administrators</span>
                        <strong className="um-kpi-value">{adminCount}</strong>
                    </div>
                </article>

                <article className="um-kpi-card">
                    <div className="um-kpi-icon-wrapper" style={{ color: "#ea580c", background: "#ea580c12" }}>
                        <FaUserCog />
                    </div>
                    <div className="um-kpi-info">
                        <span className="um-kpi-label">Cashier & Staff</span>
                        <strong className="um-kpi-value">{staffCount}</strong>
                    </div>
                </article>
            </div>

            {/* CONTROLS BAR (SEARCH, FILTER & ADD BUTTON) */}
            <div className="um-controls-bar">
                <div className="um-controls-left">
                    <div className="um-search-box">
                        <input
                            type="text"
                            className="um-search-input"
                            placeholder="Search by name, emp code, designation, mobile..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                        />
                        <FaSearch className="um-search-icon" />
                    </div>

                    <select
                        className="um-select-filter"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="ALL">All Roles</option>
                        <option value="EMPLOYEE">Employees Only</option>
                        <option value="ADMIN">Admins Only</option>
                        <option value="CASHIER">Cashiers Only</option>
                        <option value="STAFF">Kitchen Staff Only</option>
                    </select>
                </div>

                <button className="um-add-user-btn" onClick={openAddModal}>
                    <FaUserPlus /> Add New User
                </button>
            </div>

            {/* USERS TABLE */}
            <article className="um-table-card">
                <div className="um-table-header">
                    <h3>Employee Directory & User Accounts ({filteredUsers.length})</h3>
                </div>

                <div className="um-table-container">
                    <table className="um-users-table">
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Emp Code / Username</th>
                                <th>Full Name</th>
                                <th>Designation</th>
                                <th>Mobile</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                                        Loading employee directory...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                                        No users found matching your search query.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.employee_id}>
                                        <td>
                                            <img
                                                src={u.profile_image ? `${window.API_BASE_URL || "http://localhost:5000"}${u.profile_image}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=0b63f6&color=fff`}
                                                alt={u.full_name}
                                                className="um-profile-photo"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=0b63f6&color=fff`;
                                                }}
                                            />
                                        </td>
                                        <td><span className="um-username-tag">{u.username}</span></td>
                                        <td><strong>{u.full_name}</strong></td>
                                        <td>{u.designation || "EMPLOYEE"}</td>
                                        <td>{u.mobile || "N/A"}</td>
                                        <td>
                                            <span
                                                className={`um-role-badge ${
                                                    u.role === "ADMIN" ? "um-role-admin" :
                                                    u.role === "CASHIER" ? "um-role-cashier" :
                                                    u.role === "STAFF" ? "um-role-staff" : "um-role-employee"
                                                }`}
                                            >
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <button
                                                    className="um-action-btn-edit"
                                                    onClick={() => openEditModal(u)}
                                                >
                                                    <FaEdit /> Edit
                                                </button>

                                                <button
                                                    className="um-action-btn-delete"
                                                    onClick={() => handleDeleteUser(u)}
                                                >
                                                    <FaTrash /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </article>

            {/* MODAL FORM FOR INSERT & EDIT USER */}
            {isModalOpen && (
                <div className="um-modal-overlay">
                    <div className="um-modal-card">
                        {/* MODAL HEADER */}
                        <div className="um-modal-header">
                            <h3>
                                {editingUser ? <FaEdit /> : <FaUserPlus />}
                                {editingUser ? `Edit User: ${editingUser.full_name}` : "Insert New Employee / User"}
                            </h3>
                            <button
                                className="um-modal-close-btn"
                                onClick={() => setIsModalOpen(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* MODAL BODY FORM */}
                        <form className="um-modal-form" onSubmit={handleFormSubmit}>
                            {formError && (
                                <div style={{ background: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: "10px", border: "1px solid #fecaca", marginBottom: "20px", fontSize: "13px", fontWeight: "500" }}>
                                    {formError}
                                </div>
                            )}

                            {formSuccess && (
                                <div style={{ background: "#f0fdf4", color: "#166534", padding: "12px 16px", borderRadius: "10px", border: "1px solid #bbf7d0", marginBottom: "20px", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <FaCheck /> {formSuccess}
                                </div>
                            )}

                            <div className="um-form-grid">
                                <div className="um-form-field">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        className="um-form-input"
                                        placeholder="e.g. Avijit Roy"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="um-form-field">
                                    <label>Emp Code / Username *</label>
                                    <input
                                        type="text"
                                        className="um-form-input"
                                        placeholder="e.g. WBKLE2242172"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toUpperCase() })}
                                        required
                                        style={{ textTransform: "uppercase" }}
                                    />
                                </div>

                                <div className="um-form-field">
                                    <label>User Role</label>
                                    <select
                                        className="um-form-select"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="EMPLOYEE">EMPLOYEE (Standard User)</option>
                                        <option value="ADMIN">ADMIN (System Administrator)</option>
                                        <option value="CASHIER">CASHIER (Counter Staff)</option>
                                        <option value="STAFF">KITCHEN STAFF</option>
                                    </select>
                                </div>

                                <div className="um-form-field">
                                    <label>Designation</label>
                                    <input
                                        type="text"
                                        className="um-form-input"
                                        placeholder="e.g. ACCOUNTANT / AUDITOR"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                    />
                                </div>

                                <div className="um-form-field">
                                    <label>Mobile Number</label>
                                    <input
                                        type="text"
                                        className="um-form-input"
                                        placeholder="e.g. 9874483288"
                                        value={formData.mobile}
                                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                    />
                                </div>

                                <div className="um-form-field">
                                    <label>Password {editingUser ? "(Leave blank to keep current)" : "(Default: 12345)"}</label>
                                    <input
                                        type="password"
                                        className="um-form-input"
                                        placeholder={editingUser ? "Enter new password..." : "Default: 12345"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>

                                <div className="um-form-field">
                                    <label>Official Email</label>
                                    <input
                                        type="email"
                                        className="um-form-input"
                                        placeholder="e.g. name@cag.gov.in"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div className="um-form-field">
                                    <label>Google Email (OAuth)</label>
                                    <input
                                        type="email"
                                        className="um-form-input"
                                        placeholder="e.g. user@gmail.com"
                                        value={formData.google_email}
                                        onChange={(e) => setFormData({ ...formData, google_email: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* MODAL FOOTER */}
                            <div className="um-modal-footer">
                                <button
                                    type="button"
                                    className="um-btn-cancel"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="um-btn-submit"
                                    disabled={submitting}
                                >
                                    {submitting ? "Saving..." : editingUser ? "Update User" : "Insert User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;
