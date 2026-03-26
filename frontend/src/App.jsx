import React, { useState } from "react";

function App() {
    const [isEditing, setIsEditing] = useState(false);

    const [user, setUser] = useState({
        name: "Melikhan Demirkale",
        email: "melikhan@mail.com",
        phone: "+90 555 000 00 00",
        address: "Istanbul, Turkey",
    });

    const [formData, setFormData] = useState(user);

    const handleEditClick = () => {
        setFormData(user);
        setIsEditing(true);
    };

    const handleCancelClick = () => {
        setFormData(user);
        setIsEditing(false);
    };

    const handleSaveClick = () => {
        setUser(formData);
        setIsEditing(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.avatar}>M</div>

                <h1 style={styles.title}>User Profile</h1>
                <p style={styles.subtitle}>Manage your personal information</p>

                {!isEditing ? (
                    <div style={styles.infoContainer}>
                        <div style={styles.infoRow}>
                            <span style={styles.label}>Full Name</span>
                            <span style={styles.value}>{user.name}</span>
                        </div>

                        <div style={styles.infoRow}>
                            <span style={styles.label}>Email</span>
                            <span style={styles.value}>{user.email}</span>
                        </div>

                        <div style={styles.infoRow}>
                            <span style={styles.label}>Phone</span>
                            <span style={styles.value}>{user.phone}</span>
                        </div>

                        <div style={styles.infoRow}>
                            <span style={styles.label}>Address</span>
                            <span style={styles.value}>{user.address}</span>
                        </div>

                        <div style={styles.buttonGroup}>
                            <button style={styles.primaryButton} onClick={handleEditClick}>
                                Edit Profile
                            </button>
                            <button style={styles.logoutButton}>Logout</button>
                        </div>
                    </div>
                ) : (
                    <div style={styles.formContainer}>
                        <label style={styles.inputLabel}>Full Name</label>
                        <input
                            style={styles.input}
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                        />

                        <label style={styles.inputLabel}>Email</label>
                        <input
                            style={styles.input}
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                        />

                        <label style={styles.inputLabel}>Phone</label>
                        <input
                            style={styles.input}
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                        />

                        <label style={styles.inputLabel}>Address</label>
                        <textarea
                            style={styles.textarea}
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                        />

                        <div style={styles.buttonGroup}>
                            <button style={styles.saveButton} onClick={handleSaveClick}>
                                Save Changes
                            </button>
                            <button style={styles.cancelButton} onClick={handleCancelClick}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
    },
    card: {
        width: "100%",
        maxWidth: "500px",
        backgroundColor: "#1e293b",
        borderRadius: "18px",
        padding: "32px",
        boxSizing: "border-box",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        color: "white",
    },
    avatar: {
        width: "90px",
        height: "90px",
        borderRadius: "50%",
        backgroundColor: "#3b82f6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "36px",
        fontWeight: "bold",
        margin: "0 auto 20px auto",
    },
    title: {
        textAlign: "center",
        margin: "0 0 8px 0",
        fontSize: "36px",
    },
    subtitle: {
        textAlign: "center",
        margin: "0 0 28px 0",
        color: "#cbd5e1",
        fontSize: "15px",
    },
    infoContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    infoRow: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        backgroundColor: "#0f172a",
        padding: "14px",
        borderRadius: "10px",
    },
    label: {
        fontSize: "13px",
        color: "#94a3b8",
        fontWeight: "bold",
    },
    value: {
        fontSize: "16px",
        color: "#f8fafc",
    },
    formContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    inputLabel: {
        fontSize: "14px",
        color: "#cbd5e1",
        marginTop: "4px",
    },
    input: {
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #475569",
        outline: "none",
        backgroundColor: "#0f172a",
        color: "white",
        fontSize: "14px",
    },
    textarea: {
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #475569",
        outline: "none",
        backgroundColor: "#0f172a",
        color: "white",
        fontSize: "14px",
        minHeight: "80px",
        resize: "vertical",
    },
    buttonGroup: {
        display: "flex",
        gap: "12px",
        marginTop: "22px",
        flexWrap: "wrap",
    },
    primaryButton: {
        flex: 1,
        minWidth: "140px",
        padding: "12px",
        backgroundColor: "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "bold",
    },
    logoutButton: {
        flex: 1,
        minWidth: "140px",
        padding: "12px",
        backgroundColor: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "bold",
    },
    saveButton: {
        flex: 1,
        minWidth: "140px",
        padding: "12px",
        backgroundColor: "#22c55e",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "bold",
    },
    cancelButton: {
        flex: 1,
        minWidth: "140px",
        padding: "12px",
        backgroundColor: "#64748b",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "bold",
    },
};

export default App;