import React, { useState, useEffect, useMemo } from "react";
import {
    FaSearch,
    FaPrint,
    FaDownload,
    FaSync,
    FaShieldAlt
} from "react-icons/fa";
import axios from "axios";

const API_BASE = (window.API_BASE_URL || "http://localhost:5000") + "/api/wallet";

function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedModule, setSelectedModule] = useState("All");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/audit-logs`);
            setLogs(res.data);
        } catch (err) {
            console.error("Error fetching audit logs:", err);
        } finally {
            setLoading(false);
        }
    };

    const getModule = (actionName) => {
        if (!actionName) return "General";
        const name = actionName.toUpperCase();
        if (name.includes("UPI") || name.includes("QR")) return "UPI Recharge";
        if (name.includes("WALLET")) return "Wallet";
        if (name.includes("CASH") || name.includes("CASHBOOK") || name.includes("RECEIPT") || name.includes("EXPENSE") || name.includes("DAILY_CASH")) return "Cashbook";
        if (name.includes("ORDER")) return "Orders";
        if (name.includes("INVENTORY") || name.includes("STORE") || name.includes("GRN") || name.includes("PURCHASE") || name.includes("ISSUE")) return "Store";
        return "General";
    };


    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // Module filter
            if (selectedModule !== "All") {
                const mod = getModule(log.action_name);
                if (mod !== selectedModule) return false;
            }

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesSearch = 
                    (log.action_name && log.action_name.toLowerCase().includes(term)) ||
                    (log.details && log.details.toLowerCase().includes(term)) ||
                    (log.severity && log.severity.toLowerCase().includes(term));
                if (!matchesSearch) return false;
            }

            // Date filter
            if (startDate || endDate) {
                if (!log.rawDate) return false;
                const logDate = new Date(log.rawDate);
                logDate.setHours(0, 0, 0, 0);

                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    if (logDate < start) return false;
                }

                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (logDate > end) return false;
                }
            }

            return true;
        });
    }, [logs, selectedModule, startDate, endDate, searchTerm]);

    const handleReset = () => {
        setSelectedModule("All");
        setStartDate("");
        setEndDate("");
        setSearchTerm("");
    };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        const dateRangeStr = startDate && endDate 
            ? `${startDate} to ${endDate}`
            : (startDate ? `From ${startDate}` : (endDate ? `Until ${endDate}` : "All Dates"));
        
        const html = `
            <html>
                <head>
                    <title>System Security Audit Logs</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 30px; color: #333; }
                        h2 { text-align: center; margin-bottom: 5px; }
                        p.subtitle { text-align: center; color: #666; font-size: 14px; margin-top: 0; margin-bottom: 25px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
                        th { background-color: #f3f4f6; font-weight: bold; }
                        .severity-critical { color: #dc2626; font-weight: bold; }
                        .severity-warning { color: #d97706; font-weight: bold; }
                        .severity-info { color: #2563eb; }
                        @media print {
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h2>SYSTEM AUDIT LOGS REPORT</h2>
                    <p class="subtitle">Module: ${selectedModule} | Date Range: ${dateRangeStr}</p>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 15%">Time Logged</th>
                                <th style="width: 15%">Module</th>
                                <th style="width: 20%">Action Type</th>
                                <th style="width: 40%">Description</th>
                                <th style="width: 10%">Severity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredLogs.map(log => `
                                <tr>
                                    <td>${log.time}</td>
                                    <td>${getModule(log.action_name)}</td>
                                    <td><strong>${log.action_name}</strong></td>
                                    <td>${log.details}</td>
                                    <td class="severity-${log.severity.toLowerCase()}">${log.severity}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleExportCSV = () => {
        const headers = ["Time Logged", "Module", "Action Type", "Description", "Severity"];
        const rows = filteredLogs.map(log => [
            log.time,
            getModule(log.action_name),
            log.action_name,
            `"${log.details.replace(/"/g, '""')}"`,
            log.severity
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `audit_logs_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="wallet-page" style={{ padding: "0 0 20px 0" }}>
            {/* HEADER CARD */}
            <div className="wallet-header-card">
                <div className="wallet-header-left">
                    <div className="wallet-icon-box">
                        <FaShieldAlt />
                    </div>
                    <div>
                        <h2>System Security Audit Logs</h2>
                        <p>Verify administrative event trails, tamper logs and critical security actions.</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button className="verify-btn" style={{ background: "#3b82f6", color: "#fff" }} onClick={fetchLogs}>
                        <FaSync />
                        Refresh
                    </button>
                    <div className="wallet-search">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Search logs details..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* AUDIT FILTER BLOCK */}
            <div style={{ background: "#ffffff", padding: "18px 24px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "25px" }}>
                <div style={{ display: "flex", gap: "15px", alignItems: "flex-end", flexWrap: "wrap" }}>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>Module</label>
                        <select 
                            value={selectedModule}
                            onChange={e => setSelectedModule(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", width: "160px", background: "#ffffff", color: "#0f172a" }}
                        >
                            <option value="All" style={{ color: "#0f172a", background: "#ffffff" }}>All Modules</option>
                            <option value="UPI Recharge" style={{ color: "#0f172a", background: "#ffffff" }}>UPI Recharge</option>
                            <option value="Wallet" style={{ color: "#0f172a", background: "#ffffff" }}>Wallet</option>
                            <option value="Cashbook" style={{ color: "#0f172a", background: "#ffffff" }}>Cashbook</option>
                            <option value="Store" style={{ color: "#0f172a", background: "#ffffff" }}>Store & Inventory</option>
                            <option value="Orders" style={{ color: "#0f172a", background: "#ffffff" }}>Orders</option>
                            <option value="General" style={{ color: "#0f172a", background: "#ffffff" }}>General</option>
                        </select>

                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>Start Date</label>
                        <input 
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            onClick={(e) => e.target.showPicker()}
                            onFocus={(e) => e.target.showPicker()}
                            style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", cursor: "pointer", background: "#ffffff", color: "#0f172a" }}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>End Date</label>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            onClick={(e) => e.target.showPicker()}
                            onFocus={(e) => e.target.showPicker()}
                            style={{ padding: "7px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", cursor: "pointer", background: "#ffffff", color: "#0f172a" }}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                            onClick={handleReset}
                            style={{ border: "1px solid #cbd5e1", background: "#f8fafc", color: "#475569", padding: "9px 16px", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: "600" }}
                        >
                            Reset
                        </button>
                        <button 
                            onClick={handlePrint}
                            style={{ border: "none", background: "#10b981", color: "#ffffff", padding: "9px 16px", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                            <FaPrint />
                            Print
                        </button>
                        <button 
                            onClick={handleExportCSV}
                            style={{ border: "none", background: "#6366f1", color: "#ffffff", padding: "9px 16px", borderRadius: "6px", fontSize: "14px", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                            <FaDownload />
                            Export CSV
                        </button>
                    </div>

                </div>
            </div>

            {/* AUDIT LOGS TABLE */}
            <div className="wallet-table-card" style={{ marginTop: "0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                    <h2 style={{ margin: 0 }}>Log History ({filteredLogs.length} entries shown)</h2>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>HMAC Verified Secure Log Trail</span>
                </div>
                
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading secure log entries...</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: "18%" }}>Time Logged</th>
                                <th style={{ width: "12%" }}>Module</th>
                                <th style={{ width: "20%" }}>Action Type</th>
                                <th style={{ width: "38%" }}>Log Message Description</th>
                                <th style={{ width: "12%" }}>Severity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                                        No log entries match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.log_id}>
                                        <td>{log.time}</td>
                                        <td>
                                            <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", color: "#475569" }}>
                                                {getModule(log.action_name).toUpperCase()}
                                            </span>
                                        </td>
                                        <td><strong>{log.action_name}</strong></td>
                                        <td style={{ fontSize: "13px", color: "#334155" }}>{log.details}</td>
                                        <td>
                                            <span className={`log-severity-${log.severity.toLowerCase()}`}>
                                                {log.severity}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default AuditLogs;
