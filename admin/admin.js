
"use strict";

const API = "/api";

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

async function checkLogin() {
    const response = await apiFetch(`${API}/check-login`);
    const result = await response.json();

    if (!result.loggedIn) {
        window.location.href = "/admin/login.html";
        return false;
    }

    return true;
}

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

    document.getElementById("paidAmount").textContent =
        "₹" + Number(stats.paid).toLocaleString("en-IN");
}

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
            '<tr><td colspan="11">No bookings found</td></tr>';
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
            <td>₹${Number(booking.hotel_price).toLocaleString("en-IN")}</td>
            <td>${escapeHTML(booking.nights)}</td>
            <td>₹${Number(booking.amount).toLocaleString("en-IN")}</td>

            <td>
                <select id="status-${booking.id}">
                    <option value="Pending" ${booking.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="Confirmed" ${booking.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
                    <option value="Cancelled" ${booking.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                </select>
            </td>

            <td>
                <select id="payment-${booking.id}">
                    <option value="Pending" ${booking.payment_status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="Paid" ${booking.payment_status === "Paid" ? "selected" : ""}>Paid</option>
                    <option value="Failed" ${booking.payment_status === "Failed" ? "selected" : ""}>Failed</option>
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

async function saveBooking(id) {
    const payment_status =
        document.getElementById(`payment-${id}`).value;

    const status =
        document.getElementById(`status-${id}`).value;

    try {
        const paymentResponse = await apiFetch(
            `${API}/bookings/${id}/payment`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ payment_status })
            }
        );

        const paymentResult = await paymentResponse.json();

        if (!paymentResponse.ok) {
            throw new Error(
                paymentResult.message || "Payment update failed."
            );
        }

        const statusResponse = await apiFetch(
            `${API}/bookings/${id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status })
            }
        );

        const statusResult = await statusResponse.json();

        if (!statusResponse.ok) {
            throw new Error(
                statusResult.message || "Booking status update failed."
            );
        }

        showMessage("Booking updated successfully!");
        await refreshDashboard();

    } catch (error) {
        showMessage(error.message);
    }
}

async function deleteBooking(id) {
    if (!confirm("Do you want to delete this booking?")) {
        return;
    }

    try {
        const response = await apiFetch(
            `${API}/bookings/${id}`,
            { method: "DELETE" }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Delete failed.");
        }

        showMessage("Booking deleted successfully!");
        await refreshDashboard();

    } catch (error) {
        showMessage(error.message);
    }
}

async function logout() {
    try {
        await apiFetch(`${API}/logout`, {
            method: "POST"
        });
    } finally {
        window.location.href = "/admin/login.html";
    }
}

function showMessage(message) {
    const element = document.getElementById("message");

    if (element) {
        element.textContent = message;
    }
}

async function refreshDashboard() {
    await loadBookings();
    await loadStats();
}

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
