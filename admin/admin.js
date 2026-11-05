
"use strict";

const API = "/api";

// ================================================
// 1. HELPER FUNCTIONS
// ================================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options
    });

    if (response.status === 401) {
        window.location.href = "/admin/login.html";
        throw new Error("Admin login required.");
    }

    return response;
}

// ================================================
// 2. CHECK ADMIN LOGIN
// ================================================

async function checkLogin() {
    const response = await apiFetch(`${API}/check-login`);
    const result = await response.json();

    if (!result.loggedIn) {
        window.location.href = "/admin/login.html";
        return false;
    }

    return true;
}

// ================================================
// 3. LOAD DASHBOARD STATISTICS
// ================================================

async function loadStats() {
    const response = await apiFetch(`${API}/stats`);

    if (!response.ok) {
        throw new Error("Unable to load statistics.");
    }

    const stats = await response.json();

    document.getElementById("totalBookings").textContent =
        stats.total;

    document.getElementById("pendingBookings").textContent =
        stats.pending;

    document.getElementById("confirmedBookings").textContent =
        stats.confirmed;

    document.getElementById("cancelledBookings").textContent =
        stats.cancelled;

    // This is the total amount marked as paid in the database.
    // It is not a payment-status control.
    const paidAmount = document.getElementById("paidAmount");

    if (paidAmount) {
        paidAmount.textContent =
            "₹" + Number(stats.paid).toLocaleString("en-IN");
    }
}

// ================================================
// 4. LOAD BOOKINGS
// ================================================

async function loadBookings() {
    const response = await apiFetch(`${API}/bookings`);

    if (!response.ok) {
        throw new Error("Unable to load bookings.");
    }

    const bookings = await response.json();

    const table = document.getElementById("bookingTable");

    table.innerHTML = "";

    if (bookings.length === 0) {
        table.innerHTML =
            '<tr><td colspan="10">No bookings found</td></tr>';
        return;
    }

    bookings.forEach(booking => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(booking.id)}</td>

            <td>${escapeHTML(booking.name)}</td>

            <td>${escapeHTML(booking.email)}</td>

            <td>${escapeHTML(booking.destination)}</td>

            <td>${escapeHTML(booking.hotel_name)}</td>

            <td>
                ₹${Number(booking.hotel_price).toLocaleString("en-IN")}
            </td>

            <td>${escapeHTML(booking.nights)}</td>

            <td>
                ₹${Number(booking.amount).toLocaleString("en-IN")}
            </td>

            <td>
                <select id="status-${booking.id}">
                    <option value="Pending"
                        ${booking.status === "Pending" ? "selected" : ""}>
                        Pending
                    </option>

                    <option value="Confirmed"
                        ${booking.status === "Confirmed" ? "selected" : ""}>
                        Confirmed
                    </option>

                    <option value="Cancelled"
                        ${booking.status === "Cancelled" ? "selected" : ""}>
                        Cancelled
                    </option>
                </select>
            </td>

            <td>
                <button onclick="saveBooking(${Number(booking.id)})">
                    Save
                </button>

                <button class="delete"
                    onclick="deleteBooking(${Number(booking.id)})">
                    Delete
                </button>
            </td>
        `;

        table.appendChild(row);
    });
}

// ================================================
// 5. UPDATE BOOKING STATUS
// ================================================

async function saveBooking(id) {
    const statusElement =
        document.getElementById(`status-${id}`);

    if (!statusElement) {
        showMessage("Booking status field not found.");
        return;
    }

    const status = statusElement.value;

    try {
        const response = await apiFetch(
            `${API}/bookings/${id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Booking status update failed."
            );
        }

        showMessage("Booking status updated successfully!");

        await refreshDashboard();

    } catch (error) {
        showMessage(error.message);
    }
}

// ================================================
// 6. DELETE BOOKING
// ================================================

async function deleteBooking(id) {
    if (!confirm("Do you want to delete this booking?")) {
        return;
    }

    try {
        const response = await apiFetch(
            `${API}/bookings/${id}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Booking deletion failed."
            );
        }

        showMessage("Booking deleted successfully!");

        await refreshDashboard();

    } catch (error) {
        showMessage(error.message);
    }
}

// ================================================
// 7. ADMIN LOGOUT
// ================================================

async function logout() {
    try {
        await apiFetch(`${API}/logout`, {
            method: "POST"
        });
    } catch (error) {
        showMessage(error.message);
    } finally {
        window.location.href = "/admin/login.html";
    }
}

// ================================================
// 8. SHOW MESSAGE
// ================================================

function showMessage(message) {
    const element = document.getElementById("message");

    if (element) {
        element.textContent = message;
    }
}

// ================================================
// 9. REFRESH DASHBOARD
// ================================================

async function refreshDashboard() {
    await loadBookings();
    await loadStats();
}

// ================================================
// 10. START DASHBOARD
// ================================================

async function startDashboard() {
    try {
        const loggedIn = await checkLogin();

        if (loggedIn) {
            await refreshDashboard();
        }
    } catch (error) {
        showMessage(error.message);
    }
}

startDashboard();
