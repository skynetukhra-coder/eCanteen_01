import React, { useState, useEffect } from "react";
import {
    FaSearch,
    FaWallet,
    FaPlus,
    FaHistory,
    FaExclamationTriangle,
    FaShieldAlt,
    FaDownload,
    FaCheck,
    FaTimes,
    FaQrcode
} from "react-icons/fa";
import "./WalletManagement.css";
import axios from "axios";

const API_BASE = (window.API_BASE_URL || "http://localhost:5000") + "/api/wallet";

const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const isDateInRange = (dateVal, startStr, endStr) => {
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    const dateYMD = d.toLocaleDateString("en-CA");
    if (startStr && dateYMD < startStr) return false;
    if (endStr && dateYMD > endStr) return false;
    return true;
};

const getPageNumbers = (current, total) => {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [];
    if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(total);
    } else if (current >= total - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        pages.push("...");
        pages.push(current - 1);
        pages.push(current);
        pages.push(current + 1);
        pages.push("...");
        pages.push(total);
    }
    return pages;
};

function WalletManagement() {
    const [employees, setEmployees] = useState([]);
    const [recharges, setRecharges] = useState([]);
    const [userRecharges, setUserRecharges] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [rechargeToday, setRechargeToday] = useState(0);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [currentRechargePage, setCurrentRechargePage] = useState(1);
    const rechargeItemsPerPage = 10;
    const [methodFilter, setMethodFilter] = useState("ALL"); // ALL, UPI_QR, ADMIN_MANUAL

    // Modal control
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [modifyType, setModifyType] = useState("RECHARGE"); // RECHARGE or DEDUCT
    const [amount, setAmount] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [pendingTxId, setPendingTxId] = useState(null);
    const [isAutoFilled, setIsAutoFilled] = useState(false);

    // Get current logged in admin
    const adminUser = JSON.parse(localStorage.getItem("user")) || {};

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [listRes, rechargesRes, userRechargesRes, statsRes] = await Promise.all([
                axios.get(`${API_BASE}/list`),
                axios.get(`${API_BASE}/recharges`),
                axios.get(`${API_BASE}/user-recharges`),
                axios.get(`${API_BASE}/stats`)
            ]);
            setEmployees(listRes.data || []);
            setRecharges(rechargesRes.data || []);
            setUserRecharges(userRechargesRes.data || []);
            setRechargeToday(statsRes.data.todayRecharges || 0);
        } catch (err) {
            console.error("Error fetching wallet data:", err);
        }
    };

    const handleOpenModal = (emp, type) => {
        setSelectedEmp(emp);
        setModifyType(type);
        setAmount("");
        setAdminPassword("");
        setPendingTxId(null);
        setIsAutoFilled(false);
        setIsModalOpen(true);
    };

    const handleApproveUserRecharge = async (recharge) => {
        if (!window.confirm(`Are you sure you want to approve wallet recharge of ₹${parseFloat(recharge.amount).toFixed(2)} for ${recharge.employee_name || 'Employee'}?`)) {
            return;
        }

        try {
            const res = await axios.post(`${API_BASE}/approve-user-recharge`, {
                transaction_id: recharge.transaction_id,
                admin_id: adminUser?.employee_id || 1
            });
            alert(res.data.message || "User wallet recharge approved successfully!");
            fetchData();
        } catch (err) {
            console.error("Approve recharge error:", err);
            alert(err.response?.data?.message || "Failed to approve recharge request.");
        }
    };

    const handleOpenApproveModal = (recharge) => {
        const emp = employees.find(e => String(e.employee_id) === String(recharge.employee_id)) || {
            employee_id: recharge.employee_id,
            full_name: recharge.employee_name || "Employee",
            username: recharge.employee_code || `EMP-${recharge.employee_id}`
        };
        setSelectedEmp(emp);
        setModifyType("RECHARGE");
        setAmount(recharge.amount);
        setAdminPassword("");
        setPendingTxId(recharge.transaction_id);
        setIsAutoFilled(true);
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        const amtVal = parseFloat(amount);
        if (isNaN(amtVal) || amtVal <= 0) {
            alert("Please enter a valid amount greater than zero.");
            return;
        }
        if (!adminPassword) {
            alert("Admin password is required to authorize this modification.");
            return;
        }

        try {
            if (pendingTxId) {
                // Approving a user self-service recharge request
                const res = await axios.post(`${API_BASE}/approve-user-recharge`, {
                    transaction_id: pendingTxId,
                    admin_id: adminUser.employee_id,
                    admin_password: adminPassword
                });
                alert(res.data.message || "User wallet recharge approved successfully!");
            } else {
                // Direct manual recharge / deduction
                const signedAmount = modifyType === "RECHARGE" ? amtVal : -amtVal;
                const res = await axios.post(`${API_BASE}/modify`, {
                    employee_id: selectedEmp.employee_id,
                    amount: signedAmount,
                    admin_id: adminUser.employee_id,
                    admin_password: adminPassword
                });
                alert(res.data.message || "Wallet modified successfully!");
            }

            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Operation failed. Please check admin password.");
        }
    };

    const handleModifySubmit = handleModalSubmit;

    const handleCancelUserRecharge = async (transactionId, empName) => {
        if (!window.confirm(`Are you sure you want to cancel the wallet recharge request for ${empName}?`)) {
            return;
        }

        try {
            const res = await axios.post(`${API_BASE}/cancel-user-recharge`, {
                transaction_id: transactionId
            });
            alert(res.data.message || "Wallet recharge request cancelled.");
            fetchData();
        } catch (err) {
            console.error("Cancel recharge error:", err);
            alert(err.response?.data?.message || "Failed to cancel recharge request.");
        }
    };

    const handleVerifyAll = async () => {
        try {
            const res = await axios.post(`${API_BASE}/verify-all`);
            alert(`Integrity Scan Complete!\nTotal wallets checked: ${res.data.total_checked}\nDiscrepancies found: ${res.data.tampered_count}`);
            fetchData();
        } catch (err) {
            alert("Verification scan failed.");
        }
    };

    const handleReset = () => {
        setStartDate("");
        setEndDate("");
        setSearchTerm("");
        setMethodFilter("ALL");
        setCurrentPage(1);
        setCurrentRechargePage(1);
    };

    const handleSetToday = () => {
        const t = getTodayStr();
        setStartDate(t);
        setEndDate(t);
        setCurrentPage(1);
        setCurrentRechargePage(1);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
        setCurrentRechargePage(1);
    };

    const handleStartDateChange = (val) => {
        setStartDate(val);
        setCurrentPage(1);
        setCurrentRechargePage(1);
    };

    const handleEndDateChange = (val) => {
        setEndDate(val);
        setCurrentPage(1);
        setCurrentRechargePage(1);
    };

    const handleMethodFilterChange = (val) => {
        setMethodFilter(val);
        setCurrentRechargePage(1);
    };

    const isMatchMethod = (paymentMethod, filter) => {
        if (!filter || filter === "ALL") return true;
        const pm = (paymentMethod || "").toLowerCase();
        if (filter === "ADMIN_MANUAL") {
            return pm.includes("admin") || pm.includes("manual");
        }
        if (filter === "UPI_QR") {
            return pm.includes("upi") || pm.includes("qr") || pm.includes("scan") || pm.includes("chooser");
        }
        return true;
    };

    const filteredUserRecharges = userRecharges.filter(r => {
        if (startDate || endDate) {
            if (!isDateInRange(r.rawDate, startDate, endDate)) return false;
        }
        if (methodFilter !== "ALL") {
            if (!isMatchMethod(r.payment_method, methodFilter)) return false;
        }
        if (searchTerm.trim() !== "") {
            const term = searchTerm.toLowerCase().trim();
            const matchEmpName = r.employee_name && r.employee_name.toLowerCase().includes(term);
            const matchEmpCode = r.employee_code && r.employee_code.toLowerCase().includes(term);
            const matchUtr = r.utr_number && r.utr_number.toLowerCase().includes(term);
            const matchMethod = r.payment_method && r.payment_method.toLowerCase().includes(term);
            if (!matchEmpName && !matchEmpCode && !matchUtr && !matchMethod) return false;
        }
        return true;
    });

    const totalRechargeSum = filteredUserRecharges
        .filter(r => r.status === "SUCCESS")
        .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

    const totalRechargePages = Math.ceil(filteredUserRecharges.length / rechargeItemsPerPage) || 1;
    const paginatedUserRecharges = filteredUserRecharges.slice(
        (currentRechargePage - 1) * rechargeItemsPerPage,
        currentRechargePage * rechargeItemsPerPage
    );

    // Collect IDs of employees who have recharge activity on the selected date
    const dateRechargeEmpIds = new Set(
        filteredUserRecharges.map(r => Number(r.employee_id))
    );

    const filteredEmployees = employees.filter((emp) => {
        // When searching, search the entire employee list across full name, employee code, and designation
        if (searchTerm.trim() !== "") {
            const term = searchTerm.toLowerCase().trim();
            return (
                (emp.full_name && emp.full_name.toLowerCase().includes(term)) ||
                (emp.username && emp.username.toLowerCase().includes(term)) ||
                (emp.designation && emp.designation.toLowerCase().includes(term))
            );
        }

        // When date filter is active, show only records of that particular selected date
        if (startDate || endDate) {
            const hasRecharge = dateRechargeEmpIds.has(Number(emp.employee_id));
            const hasDateMatch = emp.updated_at && isDateInRange(emp.updated_at, startDate, endDate);
            return hasRecharge || hasDateMatch;
        }

        // No search and no date filter -> display all database employee wallets
        return true;
    });

    const totalWalletBalance = employees.reduce((sum, emp) => sum + parseFloat(emp.balance || 0), 0);
    const hasTamperedWallets = employees.some(emp => emp.is_tampered);

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const printReport = () => {
        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <html>
                <head>
                    <title>Wallet Recharges Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        h1 { margin-bottom: 5px; color: #2c3e50; }
                        p { margin-top: 0; color: #7f8c8d; font-size: 14px; }
                        .summary-bar { background: #f1f5f9; padding: 10px 15px; border-radius: 6px; margin: 15px 0; font-size: 14px; font-weight: 600; color: #1e293b; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                        th { background-color: #f8f9fa; color: #2c3e50; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .badge-success { color: #15803d; font-weight: bold; }
                        .badge-pending { color: #d97706; font-weight: bold; }
                        .badge-cancelled { color: #dc2626; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>Canteen Wallet Recharges Report</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <p>Date Range: ${startDate || 'Start'} to ${endDate || 'End'}</p>
                    <div class="summary-bar">
                        Total Records: ${filteredUserRecharges.length} &nbsp;|&nbsp; 
                        Total Recharged Amount: ₹${totalRechargeSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Employee ID</th>
                                <th>Employee Name</th>
                                <th>Amount (₹)</th>
                                <th>Method</th>
                                <th>Transaction / UTR ID</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredUserRecharges.length === 0 ? `
                                <tr>
                                    <td colspan="7" style="text-align: center; color: #888; padding: 20px;">
                                        No recharge transactions found for the selected date range.
                                    </td>
                                </tr>
                            ` : filteredUserRecharges.map(r => `
                                <tr>
                                    <td>${r.time}</td>
                                    <td>${r.employee_code}</td>
                                    <td>${r.employee_name}</td>
                                    <td>₹${parseFloat(r.amount).toFixed(2)}</td>
                                    <td>${r.payment_method}</td>
                                    <td>${r.utr_number}</td>
                                    <td>
                                        <span class="${r.status === 'SUCCESS' ? 'badge-success' : r.status === 'PENDING' ? 'badge-pending' : 'badge-cancelled'}">
                                            ${r.status === 'SUCCESS' ? 'RECHARGED' : r.status}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.close();
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const exportToCSV = () => {
        const headers = ["Date & Time", "Employee ID", "Employee Name", "Amount (₹)", "Payment Method", "Transaction / UTR ID", "Status"];
        const rows = filteredUserRecharges.map(r => [
            `"${r.time || ''}"`,
            `"${r.employee_code || ''}"`,
            `"${r.employee_name || ''}"`,
            r.amount,
            `"${r.payment_method || ''}"`,
            `"${r.utr_number || ''}"`,
            `"${r.status === 'SUCCESS' ? 'RECHARGED' : r.status}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `wallet_recharges_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="wallet-page">
            {/* HEADER CARD */}
            <div className="wallet-header-card">
                <div className="wallet-header-left">
                    <div className="wallet-icon-box">
                        <FaWallet />
                    </div>
                    <div>
                        <h2>Wallet Management</h2>
                        <p>Manage employee canteen wallets, approve self-service UPI/QR recharges, and verify HMAC hashes.</p>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "15px", alignItems: "flex-end" }}>
                    {/* ROW 1: Date filters, Reset, Print, CSV */}
                    <div className="orders-date-filter-block" style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="filter-input-group">
                            <label>Start</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => handleStartDateChange(e.target.value)} 
                                onClick={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch (_) {} }}
                                style={{ cursor: "pointer" }}
                            />
                        </div>
                        <div className="filter-input-group">
                            <label>End</label>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => handleEndDateChange(e.target.value)} 
                                onClick={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch (_) {} }}
                                style={{ cursor: "pointer" }}
                            />
                        </div>
                        <button className="today-filter-btn" onClick={handleSetToday} title="Show Today's Date">
                            Today
                        </button>
                        <button className="reset-filter-btn" onClick={handleReset} title="Clear Filters (Show All Database Records)">
                            Reset
                        </button>
                        <button className="print-report-btn" onClick={printReport}>
                            Print
                        </button>
                        <button className="export-csv-btn" onClick={exportToCSV}>
                            <FaDownload /> CSV
                        </button>
                    </div>

                    {/* ROW 2: Search Input and Run Integrity Scan Button */}
                    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                        <div className="wallet-search" style={{ height: "42px", padding: "0 16px", display: "flex", alignItems: "center" }}>
                            <FaSearch />
                            <input
                                type="text"
                                placeholder="Search by employee name, code, UTR..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                style={{ height: "100%", background: "transparent", border: "none", outline: "none" }}
                            />
                        </div>

                        <button className="verify-btn" onClick={handleVerifyAll} style={{ margin: 0, height: "42px", padding: "0 20px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <FaShieldAlt />
                            Run Integrity Scan
                        </button>
                    </div>
                </div>
            </div>

            {/* TAMPER DETECTED ALERT BANNER */}
            {hasTamperedWallets && (
                <div className="tamper-banner">
                    <FaExclamationTriangle />
                    <span>
                        CRITICAL WARNING: Out-of-band wallet balance tampering has been detected!
                        Discrepancies have been logged automatically in the system audit logs.
                    </span>
                </div>
            )}

            {/* KPI CARDS */}
            <div className="wallet-stats">
                <div className="wallet-stat-card">
                    <FaWallet />
                    <h3>₹{totalWalletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
                    <p>Total Wallet Balance</p>
                </div>

                <div className="wallet-stat-card">
                    <FaPlus />
                    <h3>₹{rechargeToday.toLocaleString("en-IN", { minimumFractionDigits: 0 })}</h3>
                    <p>Recharge Today (Dynamic)</p>
                </div>

                <div className="wallet-stat-card">
                    <FaHistory />
                    <h3>{employees.length}</h3>
                    <p>Active Wallets</p>
                </div>
            </div>

            {/* 1. USER SELF-SERVICE WALLET RECHARGES PANEL (MOVED ABOVE EMPLOYEE WALLETS) */}
            <div className="user-recharges-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FaQrcode style={{ fontSize: "22px", color: "#2563eb" }} />
                        <h2 style={{ margin: 0 }}>Wallet Recharges & Self-Service Requests</h2>
                    </div>
                    {(startDate || endDate) && (
                        <span style={{ background: "#eff6ff", color: "#2563eb", padding: "5px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>
                            Date: {startDate === endDate ? startDate : `${startDate || 'Start'} to ${endDate || 'End'}`} &nbsp;|&nbsp; {filteredUserRecharges.length} {filteredUserRecharges.length === 1 ? 'Record' : 'Records'} &nbsp;|&nbsp; Total: ₹{totalRechargeSum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                    )}
                </div>
                <p>Process pending self-service UPI/QR recharge requests and view wallet top-up history of the selected date.</p>

                <table>
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Employee Code</th>
                            <th>Employee Name</th>
                            <th>Amount (₹)</th>
                            <th style={{ minWidth: "165px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                    <span>Method</span>
                                    <select
                                        value={methodFilter}
                                        onChange={(e) => handleMethodFilterChange(e.target.value)}
                                        className="method-header-dropdown"
                                        title="Filter by payment method"
                                    >
                                        <option value="ALL">ALL</option>
                                        <option value="UPI_QR">UPI/QR scan</option>
                                        <option value="ADMIN_MANUAL">Admin Manual</option>
                                    </select>
                                </div>
                            </th>
                            <th>Transaction / UTR ID</th>
                            <th>Actions / Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUserRecharges.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                                    {startDate || endDate 
                                        ? `No wallet recharge records found for ${startDate === endDate ? startDate : `${startDate} to ${endDate}`}.`
                                        : "No wallet recharge records found."}
                                </td>
                            </tr>
                        ) : (
                            paginatedUserRecharges.map((r) => (
                                <tr key={r.transaction_id}>
                                    <td>{r.time}</td>
                                    <td><strong>{r.employee_code}</strong></td>
                                    <td>{r.employee_name}</td>
                                    <td>
                                        <strong style={{ color: "#16a34a", fontSize: "15px" }}>
                                             ₹{parseFloat(r.amount).toFixed(2)}
                                        </strong>
                                    </td>
                                    <td>
                                        <span 
                                            className="method-badge upi" 
                                            style={{ 
                                                 background: r.payment_method === "Admin Manual" ? "#eff6ff" : "#f0fdf4", 
                                                color: r.payment_method === "Admin Manual" ? "#2563eb" : "#16a34a", 
                                                padding: "4px 8px", 
                                                borderRadius: "6px", 
                                                fontSize: "12px", 
                                                fontWeight: "600" 
                                            }}
                                        >
                                            {r.payment_method}
                                        </span>
                                    </td>
                                    <td>
                                        <strong style={{ letterSpacing: "0.5px", color: "#1e293b" }}>
                                            {r.utr_number}
                                        </strong>
                                    </td>
                                    <td>
                                        {r.status === "PENDING" ? (
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <button
                                                    className="approve-user-btn"
                                                    onClick={() => handleApproveUserRecharge(r)}
                                                >
                                                    <FaCheck /> Recharge
                                                </button>
                                                <button
                                                    className="cancel-user-btn"
                                                    onClick={() => handleCancelUserRecharge(r.transaction_id, r.employee_name)}
                                                >
                                                    <FaTimes /> Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <span
                                                className={
                                                    r.status === "SUCCESS"
                                                        ? "status-badge-success"
                                                        : "status-badge-cancelled"
                                                }
                                            >
                                                {r.status === "SUCCESS" ? "RECHARGED" : "CANCELLED"}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* PAGINATION: 10 RECORDS PER PAGE FOR WALLET RECHARGES */}
                {filteredUserRecharges.length > 0 && (
                    <div className="wallet-pagination-container">
                        <div className="wallet-pagination-info">
                            Showing <strong>{(currentRechargePage - 1) * rechargeItemsPerPage + 1}</strong> to{" "}
                            <strong>{Math.min(currentRechargePage * rechargeItemsPerPage, filteredUserRecharges.length)}</strong> of{" "}
                            <strong>{filteredUserRecharges.length}</strong> recharge records
                            {totalRechargePages > 1 && <span> (Page {currentRechargePage} of {totalRechargePages})</span>}
                        </div>

                        <div className="wallet-pagination-controls">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentRechargePage(1)}
                                disabled={currentRechargePage === 1}
                                title="First Page"
                            >
                                &laquo;
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentRechargePage(p => Math.max(p - 1, 1))}
                                disabled={currentRechargePage === 1}
                                title="Previous Page"
                            >
                                &lsaquo; Prev
                            </button>

                            {getPageNumbers(currentRechargePage, totalRechargePages).map((pageNum, idx) =>
                                pageNum === "..." ? (
                                    <span key={`recharge-ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                                ) : (
                                    <button
                                        key={`recharge-${pageNum}`}
                                        className={`pagination-btn page-num-btn ${currentRechargePage === pageNum ? "active" : ""}`}
                                        onClick={() => setCurrentRechargePage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            )}

                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentRechargePage(p => Math.min(p + 1, totalRechargePages))}
                                disabled={currentRechargePage === totalRechargePages}
                                title="Next Page"
                            >
                                Next &rsaquo;
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentRechargePage(totalRechargePages)}
                                disabled={currentRechargePage === totalRechargePages}
                                title="Last Page"
                            >
                                &raquo;
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. EMPLOYEE TABLE (MOVED BELOW RECHARGES, 10 PER PAGE WITH SEARCH ACROSS ALL EMPLOYEES) */}
            <div className="wallet-table-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                    <h2 style={{ margin: 0 }}>Employee Canteen Wallets (Database Records)</h2>
                    <span style={{ color: "#64748b", fontSize: "13px" }}>
                        {searchTerm ? (
                            <span>Search results across <strong>all {employees.length} employees</strong>: <strong>{filteredEmployees.length}</strong> matching</span>
                        ) : (startDate || endDate) ? (
                            <span>Wallets active/recharged for selected date: <strong>{filteredEmployees.length}</strong> records</span>
                        ) : (
                            <span>Total database records: <strong>{filteredEmployees.length}</strong></span>
                        )}
                    </span>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Employee Code</th>
                            <th>Name</th>
                            <th>Designation</th>
                            <th>Wallet Balance</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center", color: "#666", padding: "24px" }}>
                                    {searchTerm 
                                        ? `No employee wallets found matching "${searchTerm}".`
                                        : (startDate || endDate) 
                                            ? `No employee wallet records found for the selected date (${startDate === endDate ? startDate : `${startDate} to ${endDate}`}). Use search above to find any employee from the entire database.`
                                            : "No employee wallets found."}
                                </td>
                            </tr>
                        ) : (
                            paginatedEmployees.map((emp) => (
                                <tr key={emp.employee_id}>
                                    <td>{emp.username}</td>
                                    <td>{emp.full_name}</td>
                                    <td>{emp.designation || "N/A"}</td>
                                    <td>
                                        <strong>₹{parseFloat(emp.balance).toFixed(2)}</strong>
                                        {emp.is_tampered && (
                                            <span className="tamper-badge" title="HMAC Signature Mismatch!">
                                                TAMPERED
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button
                                                className="recharge-btn"
                                                onClick={() => handleOpenModal(emp, "RECHARGE")}
                                            >
                                                Recharge
                                            </button>
                                            <button
                                                className="deduct-btn"
                                                onClick={() => handleOpenModal(emp, "DEDUCT")}
                                            >
                                                Deduct
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* PAGINATION: 10 RECORDS PER PAGE */}
                {filteredEmployees.length > 0 && (
                    <div className="wallet-pagination-container">
                        <div className="wallet-pagination-info">
                            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                            <strong>{Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</strong> of{" "}
                            <strong>{filteredEmployees.length}</strong> records
                            {totalPages > 1 && <span> (Page {currentPage} of {totalPages})</span>}
                        </div>

                        <div className="wallet-pagination-controls">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                title="First Page"
                            >
                                &laquo;
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                title="Previous Page"
                            >
                                &lsaquo; Prev
                            </button>

                            {getPageNumbers(currentPage, totalPages).map((pageNum, idx) =>
                                pageNum === "..." ? (
                                    <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                                ) : (
                                    <button
                                        key={pageNum}
                                        className={`pagination-btn page-num-btn ${currentPage === pageNum ? "active" : ""}`}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            )}

                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                title="Next Page"
                            >
                                Next &rsaquo;
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                title="Last Page"
                            >
                                &raquo;
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: RECHARGE / DEDUCT WALLET BALANCE */}
            {isModalOpen && selectedEmp && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>
                            {pendingTxId 
                                ? "Confirm User UPI Wallet Recharge" 
                                : modifyType === "RECHARGE" ? "Recharge Wallet" : "Deduct Balance"}
                        </h2>
                        <p style={{ margin: "5px 0 20px 0", color: "#4b5563" }}>
                            Target Employee: <strong>{selectedEmp.full_name}</strong> ({selectedEmp.username})
                        </p>
                        <form onSubmit={handleModalSubmit} className="modal-form">
                            <div className="form-field">
                                <label>Recharge Amount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="e.g. 500"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    disabled={isAutoFilled}
                                    style={{
                                        background: isAutoFilled ? "#f1f5f9" : "white",
                                        cursor: isAutoFilled ? "not-allowed" : "text",
                                        fontWeight: isAutoFilled ? "700" : "normal",
                                        color: isAutoFilled ? "#0f172a" : "inherit"
                                    }}
                                />
                                {isAutoFilled && (
                                    <small style={{ color: "#2563eb", marginTop: "4px", display: "block", fontSize: "12px", fontWeight: "500" }}>
                                        🔒 Amount auto-filled from user's UPI payment submission. Locked for verification accuracy.
                                    </small>
                                )}
                            </div>

                            <div className="form-field">
                                <label>Admin Verification PIN/Password</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Enter your admin password"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn" style={{ background: "#16a34a" }}>
                                    {pendingTxId ? "Confirm & Credit Balance" : "Confirm Action"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WalletManagement;