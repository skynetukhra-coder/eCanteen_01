import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    FaStar,
    FaCommentDots,
    FaSearch,
    FaFilter,
    FaTrash,
    FaUser,
    FaCheckCircle,
    FaExclamationTriangle
} from "react-icons/fa";
import "./AdminFeedback.css";

function AdminFeedback() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCount: 0,
        avgRating: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    });

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [selectedRating, setSelectedRating] = useState("ALL");

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const fetchFeedbacks = () => {
        setLoading(true);
        axios.get((window.API_BASE_URL || "http://localhost:5000") + "/api/feedback/all")
            .then(res => {
                if (res.data.success) {
                    setFeedbacks(res.data.feedbacks || []);
                    setStats({
                        totalCount: res.data.totalCount || 0,
                        avgRating: res.data.avgRating || 0,
                        ratingBreakdown: res.data.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                    });
                }
            })
            .catch(err => console.error("Error fetching feedback list:", err))
            .finally(() => setLoading(false));
    };

    const handleDelete = (id) => {
        if (!window.confirm("Are you sure you want to delete this feedback entry?")) return;

        axios.delete((window.API_BASE_URL || "http://localhost:5000") + `/api/feedback/${id}`)
            .then(res => {
                if (res.data.success) {
                    fetchFeedbacks();
                }
            })
            .catch(err => console.error("Error deleting feedback:", err));
    };

    const filteredFeedbacks = feedbacks.filter(item => {
        const matchesSearch =
            item.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.employee_id && String(item.employee_id).includes(searchTerm)) ||
            item.message.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
        const matchesRating = selectedRating === "ALL" || item.rating === parseInt(selectedRating, 10);

        return matchesSearch && matchesCategory && matchesRating;
    });

    const formatDateIST = (dateStr) => {
        if (!dateStr) return "-";
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) return String(dateStr);

        return parsedDate.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    };

    const renderStars = (rating) => {
        return (
            <div className="admin-stars">
                {[1, 2, 3, 4, 5].map(star => (
                    <FaStar
                        key={star}
                        className={star <= rating ? "star-gold" : "star-gray"}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="admin-feedback-container">
            <div className="admin-feedback-header">
                <div>
                    <h2><FaCommentDots style={{ color: "#3b82f6", marginRight: "10px" }} /> Customer Feedback Management</h2>
                    <p>View and manage all feedback submitted by employees and users.</p>
                </div>
                <button className="refresh-btn" onClick={fetchFeedbacks}>
                    Refresh List
                </button>
            </div>

            {/* KPI STATS CARDS */}
            <div className="feedback-kpi-grid">
                <div className="kpi-card kpi-blue">
                    <div className="kpi-icon"><FaCommentDots /></div>
                    <div>
                        <span className="kpi-label">Total Feedbacks</span>
                        <h3 className="kpi-value">{stats.totalCount}</h3>
                    </div>
                </div>

                <div className="kpi-card kpi-green">
                    <div className="kpi-icon"><FaStar /></div>
                    <div>
                        <span className="kpi-label">Average Rating</span>
                        <h3 className="kpi-value">{stats.avgRating} / 5.0</h3>
                    </div>
                </div>

                <div className="kpi-card kpi-purple">
                    <div className="kpi-icon"><FaCheckCircle /></div>
                    <div>
                        <span className="kpi-label">5-Star Feedback</span>
                        <h3 className="kpi-value">{stats.ratingBreakdown[5] || 0}</h3>
                    </div>
                </div>

                <div className="kpi-card kpi-orange">
                    <div className="kpi-icon"><FaExclamationTriangle /></div>
                    <div>
                        <span className="kpi-label">Needs Attention (&le;2 Stars)</span>
                        <h3 className="kpi-value">{(stats.ratingBreakdown[1] || 0) + (stats.ratingBreakdown[2] || 0)}</h3>
                    </div>
                </div>
            </div>

            {/* FILTERS & SEARCH BAR */}
            <div className="feedback-filter-bar">
                <div className="search-input-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by User Name, Employee ID, or Keyword..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-dropdowns">
                    <div className="filter-group">
                        <FaFilter className="filter-icon" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="ALL">All Categories</option>
                            <option value="General">General</option>
                            <option value="Food Quality">Food Quality</option>
                            <option value="Service">Service & Cleanliness</option>
                            <option value="Tiffin">Tiffin & Snacks</option>
                            <option value="Pricing">Pricing & Portions</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <select
                            value={selectedRating}
                            onChange={(e) => setSelectedRating(e.target.value)}
                        >
                            <option value="ALL">All Ratings</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* FEEDBACK TABLE / CARDS */}
            {loading ? (
                <div className="feedback-loading">Loading feedback data...</div>
            ) : filteredFeedbacks.length === 0 ? (
                <div className="feedback-empty">
                    <FaCommentDots className="empty-icon" />
                    <h4>No Feedback Found</h4>
                    <p>No feedback entries match your search criteria.</p>
                </div>
            ) : (
                <div className="feedback-table-wrapper">
                    <table className="feedback-table">
                        <thead>
                            <tr>
                                <th>User / Employee</th>
                                <th>Rating</th>
                                <th>Category</th>
                                <th>Feedback Message</th>
                                <th>Submitted At</th>
                                <th style={{ textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeedbacks.map((fb) => (
                                <tr key={fb.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar-icon"><FaUser /></div>
                                            <div>
                                                <strong className="user-name">{fb.user_name}</strong>
                                                {fb.employee_id && (
                                                    <span className="user-emp-id">Emp ID: {fb.employee_id}</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="rating-cell">
                                            {renderStars(fb.rating)}
                                            <span className="rating-num">{fb.rating}.0</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`category-badge badge-${fb.category.toLowerCase().replace(/[^a-z]/g, '')}`}>
                                            {fb.category}
                                        </span>
                                    </td>
                                    <td>
                                        <p className="feedback-msg-text">{fb.message}</p>
                                    </td>
                                    <td className="date-cell">
                                        {formatDateIST(fb.created_at)}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <button
                                            className="delete-action-btn"
                                            title="Delete Feedback"
                                            onClick={() => handleDelete(fb.id)}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminFeedback;
