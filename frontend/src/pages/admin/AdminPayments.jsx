import React, {
    useEffect,
    useState
} from "react";

import {
    FaMoneyBillWave,
    FaDownload,
    FaCheck,
    FaTimes
} from "react-icons/fa";

import "./AdminPayments.css";
import axios from "axios";

function AdminPayments() {

    const [payments, setPayments] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const res = await axios.get((window.API_BASE_URL || "http://localhost:5000") + "/api/payments");
            setPayments(res.data || []);
        } catch (err) {
            console.error("Error fetching payments:", err);
        }
    };

    const handleStatusAction = async (paymentId, orderId, action) => {
        if (actionLoading) return;
        const actionText = action === "APPROVE" ? "approve" : "cancel";
        if (!window.confirm(`Are you sure you want to ${actionText} payment ${paymentId}?`)) {
            return;
        }

        try {
            setActionLoading(paymentId);
            const res = await axios.post(
                (window.API_BASE_URL || "http://localhost:5000") + "/api/payments/update-status",
                {
                    payment_id: paymentId,
                    order_id: orderId,
                    action: action
                }
            );

            if (res.data.success) {
                alert(res.data.message);
                fetchPayments();
            } else {
                alert(res.data.message || "Failed to update payment status.");
            }
        } catch (err) {
            console.error("Status update error:", err);
            alert(err.response?.data?.message || "Error updating payment status.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReset = () => {
        setStartDate("");
        setEndDate("");
    };

    const filteredPayments = payments.filter(payment => {
        if (!startDate && !endDate) return true;

        const paymentTime = new Date(payment.rawDate).getTime();
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (paymentTime < start.getTime()) return false;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (paymentTime > end.getTime()) return false;
        }
        return true;
    });

    const successCount = filteredPayments.filter(p => p.payment_status === "SUCCESS").length;
    const pendingCount = filteredPayments.filter(p => p.payment_status === "PENDING").length;
    const failedCount = filteredPayments.filter(p => p.payment_status === "FAILED" || p.payment_status === "CANCELLED").length;
    const collectionAmount = filteredPayments
        .filter(p => p.payment_status === "SUCCESS")
        .reduce((total, p) => total + Number(p.amount), 0);

    const isUpiMethod = (method) => {
        if (!method) return false;
        const m = method.toLowerCase();
        return m.includes("upi") || m.includes("phonepe") || m.includes("gpay") || m.includes("google pay") || m.includes("amazon pay") || m.includes("supermoney") || m.includes("scan qr");
    };

    const printReport = () => {
        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <html>
                <head>
                    <title>Payments Settlement Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        h1 { margin-bottom: 5px; color: #2c3e50; }
                        p { margin-top: 0; color: #7f8c8d; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                        th { background-color: #f8f9fa; color: #2c3e50; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .status-success { color: #15803d; font-weight: 600; }
                        .status-failed { color: #b91c1c; font-weight: 600; }
                        .status-pending { color: #d97706; font-weight: 600; }
                    </style>
                </head>
                <body>
                    <h1>Canteen Payments Settlement Report</h1>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <p>Date Range: ${startDate || 'Start'} to ${endDate || 'End'}</p>
                    <p>Total Success: ${successCount} | Pending: ${pendingCount} | Cancelled/Failed: ${failedCount} | Total Collection: ₹${collectionAmount.toFixed(2)}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Payment ID</th>
                                <th>Order ID</th>
                                <th>Employee Name</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Status</th>
                                <th>Payment Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredPayments.map(p => `
                                <tr>
                                    <td>${p.payment_id}</td>
                                    <td>${p.order_id}</td>
                                    <td>${p.employee_name}</td>
                                    <td>₹${p.amount}</td>
                                    <td>${isUpiMethod(p.payment_method) ? 'UPI' : p.payment_method}</td>
                                    <td>${p.payment_status}</td>
                                    <td>${p.payment_date}</td>
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
        const headers = ["Payment ID", "Order ID", "Employee Name", "Amount", "Method", "Status", "Remarks", "Payment Date"];
        const rows = filteredPayments.map(p => [
            p.payment_id,
            p.order_id,
            p.employee_name,
            p.amount,
            isUpiMethod(p.payment_method) ? "UPI" : p.payment_method,
            p.payment_status,
            p.remarks || "",
            p.payment_date
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `payments_settlement_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (

        <main className="ec-section-page">

            {/* HERO */}

            <div className="payments-header-card">

                <div className="payments-header-left">

                    <div className="payments-icon-box">
                        <FaMoneyBillWave />
                    </div>

                    <div>
                        <h2>Payment Management</h2>

                        <p>
                            Track payment transactions, approve UPI payments, and manage settlement records.
                        </p>
                    </div>

                </div>

                <div className="orders-date-filter-block">
                    <div className="filter-input-group">
                        <label>Start</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            onClick={(e) => e.target.showPicker()}
                            onFocus={(e) => e.target.showPicker()}
                            style={{ cursor: "pointer" }}
                        />
                    </div>
                    <div className="filter-input-group">
                        <label>End</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            onClick={(e) => e.target.showPicker()}
                            onFocus={(e) => e.target.showPicker()}
                            style={{ cursor: "pointer" }}
                        />
                    </div>
                    <button className="reset-filter-btn" onClick={handleReset}>
                        Reset
                    </button>
                    <button className="print-report-btn" onClick={printReport}>
                        Print
                    </button>
                    <button className="export-csv-btn" onClick={exportToCSV}>
                        <FaDownload /> CSV
                    </button>
                </div>

            </div>

            {/* METRICS */}

            <section className="section-metrics">

                <article>
                    <small>
                        Approved (Success)
                    </small>

                    <strong style={{ color: "#16a34a" }}>
                        {successCount}
                    </strong>
                </article>

                <article>
                    <small>
                        Pending Confirmation
                    </small>

                    <strong style={{ color: "#d97706" }}>
                        {pendingCount}
                    </strong>
                </article>

                <article>
                    <small>
                        Total Approved Collection
                    </small>

                    <strong style={{ color: "#001b4d" }}>
                        ₹{collectionAmount.toFixed(2)}
                    </strong>
                </article>

            </section>

            {/* TABLE */}

            <section className="section-grid">

                <article className="ec-panel section-table full-width-table">

                    <div className="panel-head">

                        <h3>
                            Payment Records
                        </h3>

                    </div>

                    <div className="table-scroll">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Payment ID
                                    </th>

                                    <th>
                                        Order ID
                                    </th>

                                    <th>
                                        Employee Name
                                    </th>

                                    <th>
                                        Amount
                                    </th>

                                    <th>
                                        Method
                                    </th>

                                    <th>
                                        Status / Actions
                                    </th>

                                    <th>
                                        Payment Date
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {
                                    filteredPayments.map(
                                        payment => {
                                            const isUpi = isUpiMethod(payment.payment_method);
                                            const isPending = payment.payment_status === "PENDING" || payment.order_status === "PENDING_APPROVAL";

                                            return (
                                                <tr key={payment.payment_id}>

                                                    <td>
                                                        <strong>{payment.payment_id}</strong>
                                                    </td>

                                                    <td>
                                                        {payment.order_id}
                                                    </td>

                                                    <td>
                                                        {payment.employee_name}
                                                    </td>

                                                    <td>
                                                        <strong>₹{parseFloat(payment.amount).toFixed(2)}</strong>
                                                    </td>

                                                    <td>
                                                        <span className={`method-badge ${isUpi ? "upi" : payment.payment_method === "Wallet" ? "wallet" : "cash"}`}>
                                                            {isUpi ? "UPI" : payment.payment_method}
                                                        </span>
                                                        {payment.remarks && (
                                                            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                                                {payment.remarks}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td>
                                                        {isPending ? (
                                                            <div className="action-buttons-group">
                                                                <button
                                                                    className="approve-action-btn"
                                                                    onClick={() => handleStatusAction(payment.payment_id, payment.order_id, "APPROVE")}
                                                                    disabled={actionLoading === payment.payment_id}
                                                                >
                                                                    <FaCheck /> Approve
                                                                </button>
                                                                <button
                                                                    className="cancel-action-btn"
                                                                    onClick={() => handleStatusAction(payment.payment_id, payment.order_id, "CANCEL")}
                                                                    disabled={actionLoading === payment.payment_id}
                                                                >
                                                                    <FaTimes /> Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span
                                                                className={
                                                                    payment.payment_status === "SUCCESS"
                                                                        ? "status-success"
                                                                        : payment.payment_status === "CANCELLED" || payment.payment_status === "FAILED"
                                                                            ? "status-cancelled"
                                                                            : "status-pending"
                                                                }
                                                            >
                                                                {payment.payment_status}
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td>
                                                        {payment.payment_date}
                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )
                                }

                            </tbody>

                        </table>

                    </div>

                </article>

            </section>

        </main>

    );

}

export default AdminPayments;