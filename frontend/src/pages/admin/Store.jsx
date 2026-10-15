import React, { useState, useEffect } from "react";
import {
    FaBoxOpen,
    FaRupeeSign,
    FaExclamationTriangle,
    FaCalendarAlt,
    FaPlus,
    FaDownload,
    FaUpload,
    FaCog,
    FaFileAlt,
    FaCartPlus,
} from "react-icons/fa";
import "./Store.css";
import axios from "axios";

const API_BASE = (window.API_BASE_URL || "http://localhost:5000") + "/api/inventory";

function Store() {
    const [inventoryList, setInventoryList] = useState([]);
    const [purchasesList, setPurchasesList] = useState([]);
    const [issuesList, setIssuesList] = useState([]);

    // Modal Visibility States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [isStoreLogsOpen, setIsStoreLogsOpen] = useState(false);
    const [isIssuesLogOpen, setIsIssuesLogOpen] = useState(false);
    const [logsTab, setLogsTab] = useState("inventory");

    // Form States - Add Item
    const [addItemForm, setAddItemForm] = useState({
        item_code: "",
        item_name: "",
        category: "Grains",
        unit: "Kg",
        minimum_stock: "0",
        unit_cost: "0"
    });

    // Form States - GRN Purchase
    const [purchaseForm, setPurchaseForm] = useState({
        invoice_number: "",
        item_code: "",
        item_name: "",
        category: "Grains",
        unit: "Kg",
        supplier_name: "",
        quantity: "",
        unit_cost: ""
    });
    const [invoiceFile, setInvoiceFile] = useState(null);

    // Form States - Stock Issue
    const [issueForm, setIssueForm] = useState({
        item_code: "",
        quantity: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [invRes, purRes, issRes] = await Promise.all([
                axios.get(API_BASE),
                axios.get(`${API_BASE}/purchases`),
                axios.get(`${API_BASE}/issues`)
            ]);
            setInventoryList(invRes.data);
            setPurchasesList(purRes.data);
            setIssuesList(issRes.data);
        } catch (err) {
            console.error("Error fetching store data:", err);
        }
    };

    // Unique item code mapping for editable searchable dropdown & autofilling names
    const uniqueItemMap = React.useMemo(() => {
        const map = new Map();
        if (Array.isArray(inventoryList)) {
            inventoryList.forEach(item => {
                if (item.item_code) {
                    map.set(item.item_code.trim(), item.item_name);
                }
            });
        }
        if (Array.isArray(purchasesList)) {
            purchasesList.forEach(pur => {
                if (pur.item_code) {
                    map.set(pur.item_code.trim(), pur.item_name);
                }
            });
        }
        return map;
    }, [inventoryList, purchasesList]);

    const handleAddItemCodeChange = (e) => {
        const code = e.target.value;
        const name = uniqueItemMap.get(code.trim()) || "";
        setAddItemForm(prev => ({
            ...prev,
            item_code: code,
            item_name: name ? name : prev.item_name
        }));
    };

    const handlePurchaseItemCodeChange = (e) => {
        const code = e.target.value;
        const name = uniqueItemMap.get(code.trim()) || "";
        setPurchaseForm(prev => ({
            ...prev,
            item_code: code,
            item_name: name ? name : prev.item_name
        }));
    };

    // Form Submits
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/add`, addItemForm);
            setIsAddModalOpen(false);
            setAddItemForm({
                item_code: "",
                item_name: "",
                category: "Grains",
                unit: "Kg",
                minimum_stock: "0",
                unit_cost: "0"
            });
            fetchData();
            alert("Item added/updated in inventory successfully!");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add inventory item.");
        }
    };

    const handlePurchaseSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append("invoice_number", purchaseForm.invoice_number);
            formData.append("item_code", purchaseForm.item_code);
            formData.append("item_name", purchaseForm.item_name);
            formData.append("category", purchaseForm.category);
            formData.append("unit", purchaseForm.unit);
            formData.append("supplier_name", purchaseForm.supplier_name);
            formData.append("quantity", purchaseForm.quantity);
            formData.append("unit_cost", purchaseForm.unit_cost);
            if (invoiceFile) {
                formData.append("invoice", invoiceFile);
            }

            await axios.post(`${API_BASE}/purchase`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            setIsPurchaseModalOpen(false);
            setPurchaseForm({
                invoice_number: "",
                item_code: "",
                item_name: "",
                category: "Grains",
                unit: "Kg",
                supplier_name: "",
                quantity: "",
                unit_cost: ""
            });
            setInvoiceFile(null);
            fetchData();
            alert("Purchase registered successfully! Inventory updated.");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to log store purchase.");
        }
    };

    const handleIssueSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/issue`, issueForm);
            setIsIssueModalOpen(false);
            setIssueForm({
                item_code: "",
                quantity: ""
            });
            fetchData();
            alert("Items issued successfully!");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to issue items.");
        }
    };

    // Calculate metrics
    const totalStockValue = inventoryList.reduce((sum, item) => {
        return sum + (Number(item.current_stock) * Number(item.last_purchased_price || item.unit_cost || 0));
    }, 0);

    const lowStockCount = inventoryList.filter(item => {
        return Number(item.current_stock) <= Number(item.minimum_stock);
    }).length;

    return (
        <div className="store-page">
            <div className="store-header-card">
                <div className="store-header-left">
                    <div className="store-icon-box">
                        <FaBoxOpen />
                    </div>
                    <div>
                        <h2>Store / Inventory Management</h2>
                        <p>Track ingredient stocks, supplier purchases, and counter allocations.</p>
                    </div>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <FaBoxOpen className="kpi-icon blue" />
                    <div>
                        <h2>{inventoryList.length}</h2>
                        <p>Total Items</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <FaRupeeSign className="kpi-icon green" />
                    <div>
                        <h2>₹{totalStockValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                        <p>Current Stock Value</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <FaExclamationTriangle className="kpi-icon orange" />
                    <div>
                        <h2>{lowStockCount}</h2>
                        <p>Low Stock Items</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <FaCalendarAlt className="kpi-icon red" />
                    <div>
                        <h2>0</h2>
                        <p>Expiring Soon</p>
                    </div>
                </div>
            </div>

            {/* STOCK TABLE */}
            <div className="card">
                <div className="card-header">
                    <h3>Current Stock Summary</h3>
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Unit</th>
                                <th>Current Stock</th>
                                <th>Min Stock</th>
                                <th>Status</th>
                                <th>Last Purchased Price (₹)</th>
                            </tr>
                        </thead>

                        <tbody>
                            {inventoryList.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center", color: "#666" }}>
                                        No items available in store inventory.
                                    </td>
                                </tr>
                            ) : (
                                inventoryList.map((item) => {
                                    const isLow = Number(item.current_stock) <= Number(item.minimum_stock);
                                    return (
                                        <tr key={item.item_id}>
                                            <td>{item.item_code}</td>
                                            <td>{item.item_name}</td>
                                            <td>{item.category}</td>
                                            <td>{item.unit}</td>
                                            <td>{Number(item.current_stock).toFixed(2)}</td>
                                            <td>{Number(item.minimum_stock).toFixed(2)}</td>
                                            <td>
                                                <span className={isLow ? "badge warning" : "badge success"}>
                                                    {isLow ? "Low Stock" : "In Stock"}
                                                </span>
                                            </td>
                                            <td>₹{Number(item.last_purchased_price || item.unit_cost || 0).toFixed(2)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="card">
                <h3 className="section-title">Store Quick Actions</h3>

                <div className="action-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                    <div className="action-card" onClick={() => setIsAddModalOpen(true)}>
                        <div className="action-icon green-bg">
                            <FaPlus />
                        </div>
                        <span>Add Item</span>
                    </div>

                    <div className="action-card" onClick={() => setIsPurchaseModalOpen(true)}>
                        <div className="action-icon orange-bg">
                            <FaCartPlus />
                        </div>
                        <span>New Purchase (GRN)</span>
                    </div>

                    <div className="action-card" onClick={() => setIsIssueModalOpen(true)}>
                        <div className="action-icon purple-bg">
                            <FaUpload />
                        </div>
                        <span>Stock Issue</span>
                    </div>

                    <div className="action-card" onClick={() => setIsIssuesLogOpen(true)}>
                        <div className="action-icon red-bg" style={{ background: "#ef4444" }}>
                            <FaFileAlt />
                        </div>
                        <span>Stocks Issued</span>
                    </div>

                    <div className="action-card" onClick={() => setIsStoreLogsOpen(true)}>
                        <div className="action-icon blue-bg" style={{ background: "#3b82f6" }}>
                            <FaCog />
                        </div>
                        <span>Store Logs</span>
                    </div>
                </div>
            </div>

            {/* TWO COLUMN */}
            <div className="two-column">
                <div className="card" style={{ gridColumn: "span 2" }}>
                    <h3>Recent Purchases (Ledger History) - Immutable Records</h3>

                    <table>
                        <thead>
                            <tr>
                                <th>Invoice No.</th>
                                <th>Item Code</th>
                                <th>Item Name</th>
                                <th>Supplier</th>
                                <th>Qty (Unit)</th>
                                <th>Unit Cost</th>
                                <th>Total Cost</th>
                                <th>Invoice Bill</th>
                                <th>Date</th>
                            </tr>
                        </thead>

                        <tbody>
                            {purchasesList.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: "center", color: "#666" }}>
                                        No store purchases logged yet.
                                    </td>
                                </tr>
                            ) : (
                                purchasesList.map((pur) => (
                                    <tr key={pur.purchase_id}>
                                        <td>{pur.invoice_number || <span style={{color: "#9ca3af", fontStyle: "italic"}}>N/A</span>}</td>
                                        <td>{pur.item_code}</td>
                                        <td>{pur.item_name}</td>
                                        <td>{pur.supplier_name}</td>
                                        <td>{Number(pur.quantity).toFixed(2)} ({pur.unit})</td>
                                        <td>₹{Number(pur.unit_cost).toFixed(2)}</td>
                                        <td>₹{Number(pur.total_amount).toFixed(2)}</td>
                                        <td>
                                            {pur.invoice_path ? (
                                                <a
                                                    href={`${window.API_BASE_URL || "http://localhost:5000"}${pur.invoice_path}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="invoice-link"
                                                >
                                                    View Invoice
                                                </a>
                                            ) : (
                                                <span className="no-invoice">No Invoice</span>
                                            )}
                                        </td>
                                        <td>{new Date(pur.purchase_date).toLocaleDateString("en-IN")}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: ADD ITEM */}
            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Add/Update Inventory Item</h2>
                        <form onSubmit={handleAddSubmit} className="modal-form">
                            <div className="form-field">
                                <label>Item Code</label>
                                <input
                                    type="text"
                                    list="purchase-item-codes"
                                    required
                                    placeholder="e.g. ITM001"
                                    value={addItemForm.item_code}
                                    onChange={handleAddItemCodeChange}
                                />
                            </div>
                            <div className="form-field">
                                <label>Item Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Basmati Rice"
                                    value={addItemForm.item_name}
                                    onChange={e => setAddItemForm({ ...addItemForm, item_name: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label>Category</label>
                                <select
                                    value={addItemForm.category}
                                    onChange={e => setAddItemForm({ ...addItemForm, category: e.target.value })}
                                >
                                    <option value="Grains">Grains</option>
                                    <option value="Pulses">Pulses</option>
                                    <option value="Dairy">Dairy</option>
                                    <option value="Beverages">Beverages</option>
                                    <option value="Spices">Spices</option>
                                    <option value="Vegetables">Vegetables</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Unit</label>
                                <select
                                    value={addItemForm.unit}
                                    onChange={e => setAddItemForm({ ...addItemForm, unit: e.target.value })}
                                >
                                    <option value="Kg">Kg</option>
                                    <option value="Ltr">Ltr</option>
                                    <option value="Units">Units</option>
                                    <option value="Packets">Packets</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Minimum Stock Level</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={addItemForm.minimum_stock}
                                    onChange={e => setAddItemForm({ ...addItemForm, minimum_stock: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label>Unit Cost (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={addItemForm.unit_cost}
                                    onChange={e => setAddItemForm({ ...addItemForm, unit_cost: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: NEW PURCHASE (GRN) */}
            {isPurchaseModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>New Store Purchase</h2>
                        <form onSubmit={handlePurchaseSubmit} className="modal-form">
                            <div className="form-field">
                                <label>Invoice Number (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. INV-1025"
                                    value={purchaseForm.invoice_number}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, invoice_number: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label>Item Code</label>
                                <input
                                    type="text"
                                    list="purchase-item-codes"
                                    required
                                    placeholder="e.g. ITM001"
                                    value={purchaseForm.item_code}
                                    onChange={handlePurchaseItemCodeChange}
                                />
                            </div>
                            <div className="form-field">
                                <label>Item Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Basmati Rice"
                                    value={purchaseForm.item_name}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, item_name: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label>Category</label>
                                <select
                                    value={purchaseForm.category}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, category: e.target.value })}
                                >
                                    <option value="Grains">Grains</option>
                                    <option value="Pulses">Pulses</option>
                                    <option value="Dairy">Dairy</option>
                                    <option value="Beverages">Beverages</option>
                                    <option value="Spices">Spices</option>
                                    <option value="Vegetables">Vegetables</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Unit</label>
                                <select
                                    value={purchaseForm.unit}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, unit: e.target.value })}
                                >
                                    <option value="Kg">Kg</option>
                                    <option value="Ltr">Ltr</option>
                                    <option value="Units">Units</option>
                                    <option value="Packets">Packets</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Supplier Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Shivam Traders"
                                    value={purchaseForm.supplier_name}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, supplier_name: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label>Quantity Purchased</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="e.g. 50"
                                    value={purchaseForm.quantity}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label>Unit Cost (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="e.g. 80.00"
                                    value={purchaseForm.unit_cost}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, unit_cost: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label>Upload Invoice / Bill Receipt</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={e => setInvoiceFile(e.target.files[0])}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsPurchaseModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Register Purchase</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: STOCK ISSUE */}
            {isIssueModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Issue Stock (Inventory Drawdown)</h2>
                        <form onSubmit={handleIssueSubmit} className="modal-form">
                            <div className="form-field">
                                <label>Item Code</label>
                                <input
                                    type="text"
                                    list="purchase-item-codes"
                                    required
                                    placeholder="e.g. ITM001"
                                    value={issueForm.item_code}
                                    onChange={e => setIssueForm({ ...issueForm, item_code: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label>Quantity to Issue</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="e.g. 10"
                                    value={issueForm.quantity}
                                    onChange={e => setIssueForm({ ...issueForm, quantity: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsIssueModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">Issue Stock</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: STOCKS ISSUED LOGS */}
            {isIssuesLogOpen && (
                <div className="modal-overlay" style={{ zIndex: 1050 }}>
                    <div className="modal-content" style={{ maxWidth: "800px", width: "90%" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h2>Stocks Issued History</h2>
                            <button className="cancel-btn" onClick={() => setIsIssuesLogOpen(false)} style={{ padding: "4px 8px" }}>×</button>
                        </div>
                        <div className="table-wrapper" style={{ maxHeight: "400px", overflowY: "auto" }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Issue ID</th>
                                        <th>Item Code</th>
                                        <th>Item Name</th>
                                        <th>Qty Issued</th>
                                        <th>Remarks</th>
                                        <th>Issued Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issuesList.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: "center", color: "#666" }}>
                                                No stock issues logged yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        issuesList.map((iss) => (
                                            <tr key={iss.issue_id}>
                                                <td>{iss.issue_id}</td>
                                                <td>{iss.item_code}</td>
                                                <td>{iss.item_name}</td>
                                                <td><strong>{Number(iss.quantity).toFixed(2)}</strong></td>
                                                <td>{iss.remarks || "Stock Issue"}</td>
                                                <td>{new Date(iss.issued_date).toLocaleString("en-IN")}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: STORE LOGS (TABBED SYSTEM LOGS) */}
            {isStoreLogsOpen && (
                <div className="modal-overlay" style={{ zIndex: 1050 }}>
                    <div className="modal-content" style={{ maxWidth: "1000px", width: "95%" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <h2>Store Inventory Logs Console</h2>
                            <button className="cancel-btn" onClick={() => setIsStoreLogsOpen(false)} style={{ padding: "4px 8px" }}>×</button>
                        </div>

                        {/* TABS */}
                        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                            <button 
                                className={`tab-btn ${logsTab === "inventory" ? "active" : ""}`}
                                onClick={() => setLogsTab("inventory")}
                                style={{ padding: "8px 16px", border: "none", background: logsTab === "inventory" ? "#3b82f6" : "transparent", color: logsTab === "inventory" ? "white" : "#475569", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                            >
                                Current Stock / Manual Adds
                            </button>
                            <button 
                                className={`tab-btn ${logsTab === "purchases" ? "active" : ""}`}
                                onClick={() => setLogsTab("purchases")}
                                style={{ padding: "8px 16px", border: "none", background: logsTab === "purchases" ? "#3b82f6" : "transparent", color: logsTab === "purchases" ? "white" : "#475569", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                            >
                                Purchase Logs (GRN Ledger)
                            </button>
                            <button 
                                className={`tab-btn ${logsTab === "issues" ? "active" : ""}`}
                                onClick={() => setLogsTab("issues")}
                                style={{ padding: "8px 16px", border: "none", background: logsTab === "issues" ? "#3b82f6" : "transparent", color: logsTab === "issues" ? "white" : "#475569", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                            >
                                Stock Drawdown Logs (Issues)
                            </button>
                        </div>

                        <div className="table-wrapper" style={{ maxHeight: "450px", overflowY: "auto" }}>
                            {logsTab === "inventory" && (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Item Code</th>
                                            <th>Item Name</th>
                                            <th>Category</th>
                                            <th>Unit</th>
                                            <th>Current Stock</th>
                                            <th>Min Stock</th>
                                            <th>Base Unit Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryList.map((item) => (
                                            <tr key={item.item_id}>
                                                <td>{item.item_code}</td>
                                                <td>{item.item_name}</td>
                                                <td>{item.category}</td>
                                                <td>{item.unit}</td>
                                                <td>{Number(item.current_stock).toFixed(2)}</td>
                                                <td>{Number(item.minimum_stock).toFixed(2)}</td>
                                                <td>₹{Number(item.unit_cost).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {logsTab === "purchases" && (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Invoice No.</th>
                                            <th>Item Code</th>
                                            <th>Item Name</th>
                                            <th>Supplier</th>
                                            <th>Qty Purchased</th>
                                            <th>Unit Cost</th>
                                            <th>Total Cost</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchasesList.map((pur) => (
                                            <tr key={pur.purchase_id}>
                                                <td>{pur.invoice_number || "N/A"}</td>
                                                <td>{pur.item_code}</td>
                                                <td>{pur.item_name}</td>
                                                <td>{pur.supplier_name}</td>
                                                <td>{Number(pur.quantity).toFixed(2)} ({pur.unit})</td>
                                                <td>₹{Number(pur.unit_cost).toFixed(2)}</td>
                                                <td>₹{Number(pur.total_amount).toFixed(2)}</td>
                                                <td>{new Date(pur.purchase_date).toLocaleDateString("en-IN")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {logsTab === "issues" && (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Issue ID</th>
                                            <th>Item Code</th>
                                            <th>Item Name</th>
                                            <th>Qty Issued</th>
                                            <th>Remarks</th>
                                            <th>Issued Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {issuesList.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: "center", color: "#666" }}>
                                                    No stock issues logged yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            issuesList.map((iss) => (
                                                <tr key={iss.issue_id}>
                                                    <td>{iss.issue_id}</td>
                                                    <td>{iss.item_code}</td>
                                                    <td>{iss.item_name}</td>
                                                    <td><strong>{Number(iss.quantity).toFixed(2)}</strong></td>
                                                    <td>{iss.remarks || "Stock Issue"}</td>
                                                    <td>{new Date(iss.issued_date).toLocaleString("en-IN")}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <datalist id="purchase-item-codes">
                {Array.from(uniqueItemMap.keys()).map(code => (
                    <option key={code} value={code} label={uniqueItemMap.get(code)} />
                ))}
            </datalist>
        </div>
    );
}

export default Store;