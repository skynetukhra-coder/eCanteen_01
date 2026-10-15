import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    FaClipboardList,
    FaDownload
} from "react-icons/fa";

import "./OrdersManagement.css";



function OrdersManagement({ searchQuery = "" }) {

    const [orders, setOrders] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {

        axios
            .get((window.API_BASE_URL || "http://localhost:5000") + "/api/orders")
            .then((res) => {
                setOrders(res.data);
            })
            .catch((err) => {
                console.error(
                    "Orders Fetch Error",
                    err
                );
            });

    }, []);

    const handleReset = () => {
        setStartDate("");
        setEndDate("");
    };

    const filteredOrders = (Array.isArray(orders) ? orders : []).filter(order => {
        // Search query filter
        const query = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || (
            String(order.id).toLowerCase().includes(query) ||
            String(order.employee).toLowerCase().includes(query) ||
            String(order.category).toLowerCase().includes(query) ||
            String(order.items).toLowerCase().includes(query) ||
            String(order.couponId).toLowerCase().includes(query) ||
            String(order.payment).toLowerCase().includes(query)
        );

        if (!matchesSearch) return false;
        if (!startDate && !endDate) return true;

        const orderTime = new Date(order.rawDate).getTime();
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (orderTime < start.getTime()) return false;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (orderTime > end.getTime()) return false;
        }
        return true;
    });

    const ordersCount = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => o.status === "REDEEMED").length;
    const pendingPickup = filteredOrders.filter(o => o.status === "COUPON_GENERATED").length;

    const printReport = () => {
        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <html>
                <head>
                    <title>Orders Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        h1 { margin-bottom: 5px; color: #2c3e50; }
                        p { margin-top: 0; color: #7f8c8d; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                        th { background-color: #f8f9fa; color: #2c3e50; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        .badge { display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e8f5e9; color: #2e7d32; }
                    </style>
                </head>
                <body>
                    <h1>Canteen Orders Report</h1>
                    <p>Generated on: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })}</p>
                    <p>Date Range: ${startDate || 'Start'} to ${endDate || 'End'}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Employee</th>
                                <th>Category</th>
                                <th>Items</th>
                                <th>Created At</th>
                                <th>Status</th>
                                <th>Amount</th>
                                <th>Payment</th>
                                <th>Coupon ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredOrders.map(o => `
                                <tr>
                                    <td>${o.id}</td>
                                    <td>${o.employee}</td>
                                    <td>${o.category}</td>
                                    <td>${o.items || ''}</td>
                                    <td>${o.createdAt}</td>
                                    <td><span class="badge">${o.status}</span></td>
                                    <td>${o.amount}</td>
                                    <td>${o.payment}</td>
                                    <td>${o.couponId || ''}</td>
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
        const headers = ["Order ID", "Employee", "Category", "Items Selected", "Created At", "Status", "Amount", "Payment Mode", "Coupon ID"];
        const rows = filteredOrders.map(o => [
            o.id,
            o.employee,
            o.category,
            `"${o.items ? o.items.replace(/"/g, '""') : ''}"`,
            o.createdAt,
            o.status,
            o.amount.replace("₹", ""),
            o.payment,
            o.couponId
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `orders_report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="orders-management">

            {/* HEADER CARD */}
            <div className="orders-header-card">

                <div className="orders-header-left">

                    <div className="orders-icon-box">
                        <FaClipboardList />
                    </div>

                    <div>
                        <h2>Orders Management</h2>
                        <p>
                            Track live orders, payment status,
                            pickup slots and completed meal transactions.
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

            {/* METRICS GRID */}
            <div className="orders-stats">

                <div className="stat-card">
                    <small>Total Orders</small>
                    <h2>{ordersCount}</h2>
                </div>

                <div className="stat-card">
                    <small>Completed</small>
                    <h2>{completedOrders}</h2>
                </div>

                <div className="stat-card">
                    <small>Pending Pickup</small>
                    <h2>{pendingPickup}</h2>
                </div>

            </div>

            <div className="orders-table-card">

                <div className="table-title">
                    Orders Management Records
                </div>

                <table>

                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Employee</th>
                            <th>Category</th>
                            <th>Items Selected</th>
                            <th>Created At</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Payment Mode</th>
                            <th>Coupon ID</th>
                        </tr>
                    </thead>

                    <tbody>

                        {filteredOrders.map((order) => (
                            <tr key={order.id}>

                                <td>{order.id}</td>

                                <td>{order.employee}</td>

                                <td>{order.category}</td>

                                <td
                                    style={{
                                        maxWidth: "250px",
                                        whiteSpace: "normal"
                                    }}
                                >
                                    {order.items}
                                </td>

                                <td>{order.createdAt}</td>

                                <td>
                                    <span className="paid-badge">
                                        {order.status}
                                    </span>
                                </td>

                                <td>{order.amount}</td>

                                <td>{order.payment}</td>

                                <td>{order.couponId}</td>

                            </tr>
                        ))}

                    </tbody>

                </table>

            </div>

        </div>
    );
}

export default OrdersManagement;