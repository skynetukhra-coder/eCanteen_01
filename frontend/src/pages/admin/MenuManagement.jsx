import React, { useState, useEffect } from "react";
import {
    FaUtensils,
    FaPlus,
    FaEdit,
    FaTrash,
    FaDownload
} from "react-icons/fa";

import breakfastImg from "../../assets/images/breakfast.jpg";
import lunchImg from "../../assets/images/lunch.jpg";
import snacksImg from "../../assets/images/snacks.jpg";

import "./MenuManagement.css";

function MenuManagement({ searchQuery = "" }) {

    const [activeMeal, setActiveMeal] = useState("Breakfast");
    const [items, setItems] = useState([]);
    const [showModal, setShowModal] = useState(false);

    // Dynamic slots configuration
    const [slotsLoading, setSlotsLoading] = useState(true);
    const [tempSlots, setTempSlots] = useState({
        breakfast: { start_time: "", end_time: "" },
        lunch: { start_time: "", end_time: "" },
        tiffin: { start_time: "", end_time: "" }
    });

    // Helper to convert 12-hour (e.g. "06:00 AM") to 24-hour (e.g. "06:00")
    const convertTo24Hour = (timeStr) => {
        if (!timeStr) return "";
        const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return "";
        let [_, hours, minutes, modifier] = match;
        let hrs = parseInt(hours, 10);
        if (modifier.toUpperCase() === "PM" && hrs < 12) hrs += 12;
        if (modifier.toUpperCase() === "AM" && hrs === 12) hrs = 0;
        return `${String(hrs).padStart(2, "0")}:${minutes}`;
    };

    // Helper to convert 24-hour (e.g. "06:00") to 12-hour (e.g. "06:00 AM")
    const convertTo12Hour = (timeStr) => {
        if (!timeStr) return "";
        const [hours, minutes] = timeStr.split(":");
        let hrs = parseInt(hours, 10);
        const modifier = hrs >= 12 ? "PM" : "AM";
        hrs = hrs % 12;
        hrs = hrs ? hrs : 12; // the hour '0' should be '12'
        return `${String(hrs).padStart(2, "0")}:${minutes} ${modifier}`;
    };

    useEffect(() => {
        fetchSlots();
    }, []);

    const fetchSlots = async () => {
        try {
            setSlotsLoading(true);
            const res = await fetch(window.API_BASE_URL + "/api/menu/slots/all");
            const data = await res.json();
            const slots = {};
            data.forEach(s => {
                slots[s.category.toLowerCase()] = { 
                    start_time: convertTo24Hour(s.start_time), 
                    end_time: convertTo24Hour(s.end_time) 
                };
            });
            setTempSlots(prev => ({ ...prev, ...slots }));
        } catch (err) {
            console.error("Error fetching slots:", err);
        } finally {
            setSlotsLoading(false);
        }
    };

    const handleUpdateSlots = async (e) => {
        e.preventDefault();
        try {
            const payload = Object.keys(tempSlots).map(cat => ({
                category: cat.charAt(0).toUpperCase() + cat.slice(1),
                start_time: convertTo12Hour(tempSlots[cat].start_time),
                end_time: convertTo12Hour(tempSlots[cat].end_time)
            }));

            const res = await fetch(window.API_BASE_URL + "/api/menu/slots/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slots: payload })
            });
            const data = await res.json();
            if (data.success) {
                alert("Meal time slots updated successfully!");
                fetchSlots();
            } else {
                alert("Failed to update slots: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Error updating slots:", err);
            alert("Error updating slots: " + err.message);
        }
    };

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const handleReset = () => {
        setStartDate("");
        setEndDate("");
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [selectedImage, setSelectedImage] =
        useState(null);

    const [formData, setFormData] = useState({
        image_url: "",
        category: "Breakfast",
        item_name: "",
        price: "",
        available_qty: "",
        is_active: "ACTIVE",
        issued: 0
    });

    const closeModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setEditId(null);
        setFormData({
            image_url: "",
            category: "Breakfast",
            item_name: "",
            price: "",
            available_qty: "",
            is_active: "ACTIVE",
            issued: 0
        });
        setSelectedImage(null);
    };

    const handleEdit = (item) => {
        setSelectedImage(null);
        setFormData({
            image_url: item.image_url,
            category: item.category,
            item_name: item.item_name,
            price: item.price,
            available_qty: item.available_qty,
            is_active: item.is_active,
            issued: item.issued ?? 0
        });

        setEditId(item.item_id);

        setIsEditing(true);

        setShowModal(true);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = async () => {
        try {
            let imageUrl = formData.image_url;

            if (selectedImage) {
                const uploadData = new FormData();
                uploadData.append(
                    "image",
                    selectedImage
                );

                const uploadResponse =
                    await fetch(
                        window.API_BASE_URL + "/api/menu/upload",
                        {
                            method: "POST",
                            body: uploadData
                        }
                    );

                const uploadResult =
                    await uploadResponse.json();

                imageUrl =
                    uploadResult.image_url;
            }

            let url =
                window.API_BASE_URL + "/api/menu";

            let method = "POST";

            if (isEditing) {
                url =
                    `${window.API_BASE_URL}/api/menu/${editId}`;

                method = "PUT";
            }

            console.log("Selected Image:", selectedImage);

            const payload = {
                ...formData,
                image_url: imageUrl
            };

            const response =
                await fetch(url, {
                    method,
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify(payload)
                });

            const data = await response.json();

            if (data.success) {
                fetchItems();
                closeModal();
                alert(isEditing ? "Menu item updated successfully!" : "Menu item added successfully!");
            } else {
                alert("Failed to save menu item: " + (data.message || "Unknown error"));
            }

        } catch (error) {
            console.error(error);
            alert("Error saving menu item: " + error.message);
        }
    };

    const mealCards = [
        {
            name: "Breakfast",
            image: breakfastImg,
            subtitle: "Manage breakfast items",
        },
        {
            name: "Lunch",
            image: lunchImg,
            subtitle: "Manage lunch items",
        },
        {
            name: "Tiffin",
            image: snacksImg,
            subtitle: "Manage tiffin items",
        },
    ];

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const response = await fetch(window.API_BASE_URL + "/api/menu");
            const data = await response.json();
            setItems(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this item?"
        );

        if (!confirmDelete) return;

        try {
            const res = await fetch(
                `${window.API_BASE_URL}/api/menu/${id}`,
                {
                    method: "DELETE",
                }
            );
            const data = await res.json();
            if (data.success) {
                alert("Menu item deleted successfully!");
                fetchItems();
            } else {
                alert("Failed to delete item: " + (data.message || "Unknown error"));
            }
        } catch (error) {
            console.error(error);
            alert("Error deleting item: " + error.message);
        }
    };

    return (
        <div className="menu-management">

            <div className="menu-header-card">

                <div className="menu-header-left">

                    <div className="menu-icon-box">
                        <FaUtensils />
                    </div>

                    <div>
                        <h2>Menu Management</h2>
                        <p>
                            Manage Breakfast, Lunch and Tiffin Items
                        </p>
                    </div>

                </div>

                <div className="menu-date-filter-block">
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
                    <button 
                        className="print-report-btn"
                        onClick={async () => {
                            try {
                                let url = window.API_BASE_URL + "/api/menu/sales-report";
                                const params = new URLSearchParams();
                                if (startDate) params.append("startDate", startDate);
                                if (endDate) params.append("endDate", endDate);
                                if (params.toString()) {
                                    url += `?${params.toString()}`;
                                }
                                const res = await fetch(url);
                                const reportData = await res.json();

                                const printWindow = window.open("", "_blank");
                                const filteredItems = (Array.isArray(reportData) ? reportData : []).filter(
                                    (item) => item.category === activeMeal &&
                                    item.is_active === "ACTIVE" &&
                                    (item.issued && Number(item.issued) > 0) &&
                                    (!searchQuery || item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                );

                                const totalIssued = filteredItems.reduce((sum, item) => sum + Number(item.issued ?? 0), 0);
                                const totalAmount = filteredItems.reduce((sum, item) => sum + ((item.issued ?? 0) * Number(item.price)), 0);
                                
                                printWindow.document.write(`
                                    <html>
                                        <head>
                                            <title>Menu Items Report</title>
                                            <style>
                                                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                                                h1 { margin-bottom: 5px; color: #2c3e50; }
                                                p { margin-top: 0; color: #7f8c8d; font-size: 14px; }
                                                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
                                                th { background-color: #f8f9fa; color: #2c3e50; }
                                                tr:nth-child(even) { background-color: #f9f9f9; }
                                                tfoot td { font-weight: bold; background-color: #f1f5f9; border-top: 2px solid #2c3e50; font-size: 13px; }
                                            </style>
                                        </head>
                                        <body>
                                            <h1>Canteen Menu Report (${activeMeal === "Snacks" ? "Tiffin" : activeMeal})</h1>
                                            <p>Generated on: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })}</p>
                                            <p>Date Range: ${startDate || 'All Time'} to ${endDate || 'All Time'}</p>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Item Name</th>
                                                        <th>Issued Items</th>
                                                        <th>Price</th>
                                                        <th>Total Price</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${filteredItems.map(item => `
                                                        <tr>
                                                            <td>${item.item_name}</td>
                                                            <td>${item.issued ?? 0}</td>
                                                            <td>₹${Number(item.price).toFixed(2)}</td>
                                                            <td>₹${((item.issued ?? 0) * item.price).toFixed(2)}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <td>Total</td>
                                                        <td>${totalIssued}</td>
                                                        <td>-</td>
                                                        <td>₹${totalAmount.toFixed(2)}</td>
                                                    </tr>
                                                </tfoot>
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
                            } catch (err) {
                                console.error(err);
                                alert("Failed to generate print report");
                            }
                        }}
                    >
                        Print
                    </button>
                    <button 
                        className="export-csv-btn"
                        onClick={async () => {
                            try {
                                let url = window.API_BASE_URL + "/api/menu/sales-report";
                                const params = new URLSearchParams();
                                if (startDate) params.append("startDate", startDate);
                                if (endDate) params.append("endDate", endDate);
                                if (params.toString()) {
                                    url += `?${params.toString()}`;
                                }
                                const res = await fetch(url);
                                const reportData = await res.json();

                                const filteredItems = (Array.isArray(reportData) ? reportData : []).filter(
                                    (item) => item.category === activeMeal &&
                                    item.is_active === "ACTIVE" &&
                                    (item.issued && Number(item.issued) > 0) &&
                                    (!searchQuery || item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                );

                                const totalIssued = filteredItems.reduce((sum, item) => sum + Number(item.issued ?? 0), 0);
                                const totalAmount = filteredItems.reduce((sum, item) => sum + ((item.issued ?? 0) * Number(item.price)), 0);
                                
                                const headers = ["Item Name", "Issued Items", "Price", "Total Price"];
                                const rows = filteredItems.map(item => [
                                    item.item_name,
                                    item.issued ?? 0,
                                    item.price,
                                    ((item.issued ?? 0) * item.price).toFixed(2)
                                ]);
                                rows.push(["Total", totalIssued, "-", totalAmount.toFixed(2)]);

                                const csvContent = "data:text/csv;charset=utf-8," 
                                    + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
                                
                                const encodedUri = encodeURI(csvContent);
                                const link = document.createElement("a");
                                link.setAttribute("href", encodedUri);
                                link.setAttribute("download", `menu_report_${activeMeal}_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            } catch (err) {
                                console.error(err);
                                alert("Failed to export CSV");
                            }
                        }}
                    >
                        <FaDownload /> CSV
                    </button>
                    <button
                        className="add-item-btn"
                        onClick={() => {
                            setIsEditing(false);
                            setEditId(null);
                            setSelectedImage(null);

                            setFormData({
                                image_url: "",
                                category: "Breakfast",
                                item_name: "",
                                price: "",
                                available_qty: "",
                                is_active: "ACTIVE",
                                issued: 0
                            });

                            setShowModal(true);
                        }}
                    >
                        <FaPlus /> Add Item
                    </button>
                </div>

            </div>

            {/* TIME SLOTS CONFIGURATION PANEL */}
            <div className="time-slots-config-card" style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "25px" }}>
                <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", color: "#1e293b", fontWeight: "700" }}>Meal Time Slots Configuration</h3>
                {slotsLoading ? (
                    <div style={{ fontSize: "14px", color: "#64748b" }}>Loading time slots...</div>
                ) : (
                    <form onSubmit={handleUpdateSlots} style={{ display: "flex", gap: "20px", alignItems: "flex-end", flexWrap: "wrap" }}>
                        {Object.keys(tempSlots).map((cat) => (
                            <div key={cat} style={{ display: "flex", gap: "10px", alignItems: "center", background: "#f8fafc", padding: "10px 15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <span style={{ fontWeight: "600", minWidth: "80px", textTransform: "capitalize", fontSize: "14px", color: "#475569" }}>{cat}:</span>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={{ fontSize: "10px", color: "#64748b" }}>Start Time</label>
                                    <input 
                                        type="time" 
                                        value={tempSlots[cat].start_time}
                                        onChange={(e) => setTempSlots({
                                            ...tempSlots,
                                            [cat]: { ...tempSlots[cat], start_time: e.target.value }
                                        })}
                                        style={{ width: "120px", padding: "4px 8px", fontSize: "13px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                    />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                    <label style={{ fontSize: "10px", color: "#64748b" }}>End Time</label>
                                    <input 
                                        type="time" 
                                        value={tempSlots[cat].end_time}
                                        onChange={(e) => setTempSlots({
                                            ...tempSlots,
                                            [cat]: { ...tempSlots[cat], end_time: e.target.value }
                                        })}
                                        style={{ width: "120px", padding: "4px 8px", fontSize: "13px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                    />
                                </div>
                            </div>
                        ))}
                        <button 
                            type="submit" 
                            style={{ background: "#7c3aed", color: "#ffffff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                            Update Slots
                        </button>
                    </form>
                )}
            </div>

            <div className="meal-cards">

                {mealCards.map((meal) => (

                    <div
                        key={meal.name}
                        className={`meal-card ${activeMeal === meal.name
                            ? "active"
                            : ""
                            }`}
                        onClick={() =>
                            setActiveMeal(meal.name)
                        }
                    >

                        <img
                            src={meal.image}
                            alt={meal.name}
                        />

                        <div className="meal-overlay">
                            <h2>{meal.name}</h2>
                            <p>{meal.subtitle}</p>
                        </div>

                    </div>

                ))}

            </div>

            <div className="menu-table-card">

                <div className="table-title">
                    {activeMeal} Menu
                </div>

                <table className="menu-table">

                    <thead>

                        <tr>
                            <th>ID</th>
                            <th>Image</th>
                            <th>Category</th>
                            <th>Item Name</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Issued</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>

                    </thead>

                    <tbody>

                        {(Array.isArray(items) ? items : [])
                            .filter(
                                (item) =>
                                    item.category === activeMeal &&
                                    (!searchQuery || item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
                            )
                            .sort((a, b) => {
                                if (a.is_active === "ACTIVE" && b.is_active !== "ACTIVE") return -1;
                                if (a.is_active !== "ACTIVE" && b.is_active === "ACTIVE") return 1;
                                return 0;
                            })
                            .map((item) => (

                                <tr
                                    key={item.item_id}
                                >

                                    <td>
                                        {item.item_id}
                                    </td>

                                    <td>

                                        <img
                                            className="table-image"
                                            src={`${window.API_BASE_URL}${item.image_url}`}
                                            alt={item.item_name}
                                            onError={(e) => {
                                                console.log(
                                                    "Image failed:",
                                                    `${window.API_BASE_URL}${item.image_url}`
                                                );
                                            }}
                                        />

                                    </td>

                                    <td>
                                        {item.category}
                                    </td>

                                    <td>
                                        {item.item_name}
                                    </td>

                                    <td>
                                        ₹{item.price}
                                    </td>

                                    <td>
                                        {
                                            item.available_qty
                                        }
                                    </td>

                                    <td>
                                        {item.issued ?? 0}
                                    </td>

                                    <td>

                                        {item.is_active === "ACTIVE"
                                            ? "ACTIVE"
                                            : "INACTIVE"}

                                    </td>

                                    <td>

                                        {new Date(
                                            item.created_at
                                        ).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}

                                    </td>

                                    <td>

                                        <div className="action-buttons">

                                            <button
                                                className="edit-btn"
                                                onClick={() => handleEdit(item)}
                                            >
                                                <FaEdit />
                                            </button>

                                            <button
                                                className="delete-btn"
                                                onClick={() =>
                                                    handleDelete(
                                                        item.item_id
                                                    )
                                                }
                                            >
                                                <FaTrash />
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            ))}

                    </tbody>

                </table>

            </div>

            {
                showModal && (

                    <div className="modal-overlay">

                        <div className="modal-box">

                            <h2>
                                {isEditing
                                    ? "Edit Menu Item"
                                    : "Add New Menu Item"}
                            </h2>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                    setSelectedImage(
                                        e.target.files[0]
                                    )
                                }
                            />

                             {selectedImage ? (
                                <img
                                    src={URL.createObjectURL(selectedImage)}
                                    alt="Preview"
                                    style={{
                                        width: "120px",
                                        height: "120px",
                                        objectFit: "cover",
                                        borderRadius: "10px",
                                        border: "1px solid #ddd",
                                        marginTop: "10px"
                                    }}
                                />
                            ) : formData.image_url ? (
                                <img
                                    src={`${window.API_BASE_URL}${formData.image_url}`}
                                    alt="Preview"
                                    style={{
                                        width: "120px",
                                        height: "120px",
                                        objectFit: "cover",
                                        borderRadius: "10px",
                                        border: "1px solid #ddd",
                                        marginTop: "10px"
                                    }}
                                />
                            ) : null}

                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                            >
                                <option>Breakfast</option>
                                <option>Lunch</option>
                                <option>Tiffin</option>
                            </select>

                            <input
                                type="text"
                                name="item_name"
                                placeholder="Item Name"
                                value={formData.item_name}
                                onChange={handleChange}
                            />

                            <input
                                type="number"
                                name="price"
                                placeholder="Price"
                                value={formData.price}
                                onChange={handleChange}
                            />

                            <input
                                type="number"
                                name="available_qty"
                                placeholder="Quantity"
                                value={formData.available_qty}
                                onChange={handleChange}
                            />

                            <input
                                type="number"
                                name="issued"
                                placeholder="Issued Quantity"
                                value={formData.issued}
                                onChange={handleChange}
                            />

                            <select
                                name="is_active"
                                value={formData.is_active}
                                onChange={handleChange}
                            >
                                <option value="ACTIVE">
                                    ACTIVE
                                </option>

                                <option value="INACTIVE">
                                    INACTIVE
                                </option>

                            </select>

                            <div className="modal-actions">

                                <button
                                    className="save-btn"
                                    onClick={() => {

                                        handleSave();
                                    }}
                                >
                                    Save
                                </button>

                                <button
                                    className="cancel-btn"
                                    onClick={closeModal}
                                >
                                    Cancel
                                </button>

                            </div>

                        </div>

                    </div>

                )
            }

        </div >
    );
}

export default MenuManagement;