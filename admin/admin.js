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

function formatCurrency(amount) {
    return "₹" + Number(amount || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
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

    const paidAmount = document.getElementById("paidAmount");

    if (paidAmount) {
        paidAmount.textContent = formatCurrency(stats.paid);
    }
}

// ================================================
// 4. DISPLAY TOTAL BOOKING AMOUNT
// ================================================

function updateTotalPayment(bookings) {
    const paymentElement = document.getElementById("totalPayment");

    if (!paymentElement) {
        return;
    }

    const total = bookings
        .filter(booking =>
            String(booking.status).toLowerCase() === "confirmed"
        )
        .reduce((sum, booking) => {
            return sum + (Number(booking.amount) || 0);
        }, 0);

    paymentElement.textContent = formatCurrency(total);
}

// ================================================
// 5. DISPLAY GUEST PERSONAL DETAILS
// ================================================

function getGuestIdentityHTML(guest) {

    const mobile = guest.mobile
        ? escapeHTML(guest.mobile)
        : "Not provided";

    const email = guest.email
        ? escapeHTML(guest.email)
        : "Not provided";

    const aadhaar = guest.aadhaar_last4
        ? escapeHTML(guest.aadhaar_last4)
        : "Not provided";

    const pan = guest.pan_last4
        ? escapeHTML(guest.pan_last4)
        : "Not provided";

    return `
        <div style="
            margin-top:6px;
            padding:10px;
            background:#f4f7fb;
            border-radius:5px;
            font-size:13px;
            line-height:1.7;
        ">

            <div>
                <strong>Mobile Number:</strong>
                ${mobile}
            </div>

            <div>
                <strong>Email ID:</strong>
                ${email}
            </div>

            <div>
                <strong>Aadhaar (last 4 digits):</strong>
                ${aadhaar}
            </div>

            <div>
                <strong>PAN (last 4 characters):</strong>
                ${pan}
            </div>

        </div>
    `;
}

// ================================================
// 6. DISPLAY ROOM AND GUEST DETAILS
// ================================================

function getRoomDetailsHTML(booking) {

    const rooms = Array.isArray(booking.rooms)
        ? booking.rooms
        : [];

    if (rooms.length === 0) {
        return `
            <details>
                <summary>View Rooms & Guests</summary>
                <p>No separate room details available.</p>
            </details>
        `;
    }

    const totalGuests = rooms.reduce((sum, room) => {
        return sum + (
            Array.isArray(room.guests) ? room.guests.length : 0
        );
    }, 0);

    let html = `
        <details>
            <summary>
                View ${rooms.length} Room(s) /
                ${totalGuests} Guest(s)
            </summary>

            <div style="padding:10px;">
    `;

    rooms.forEach((room, index) => {

        const guests = Array.isArray(room.guests)
            ? room.guests
            : [];

        html += `
            <div style="
                border:1px solid #ddd;
                padding:10px;
                margin:8px 0;
                border-radius:6px;
            ">

                <strong>
                    Room ${escapeHTML(room.roomNumber || index + 1)}
                </strong>

                <p>Guests: ${guests.length}</p>

                <ul>
        `;

        guests.forEach((guest, guestIndex) => {

            html += `
                <li style="margin-bottom:12px;">

                    <strong>Guest ${guestIndex + 1}:</strong>
                    ${escapeHTML(guest.name)}

                    ${
                        guest.age !== null && guest.age !== undefined
                            ? " — Age: " + escapeHTML(guest.age)
                            : ""
                    }

                    ${getGuestIdentityHTML(guest)}

                </li>
            `;
        });

        html += `
                </ul>
            </div>
        `;
    });

    html += `
            </div>
        </details>
    `;

    return html;
}

// ================================================
// 7. DISPLAY ALL GUESTS AND ROOM COUNTS
// ================================================

function loadGuestRoomDetails(bookings) {

    const table = document.getElementById("guestRoomTable");

    if (!table) {
        return;
    }

    table.innerHTML = "";

    if (!Array.isArray(bookings) || bookings.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5">No guest records found.</td>
            </tr>
        `;

        return;
    }

    bookings.forEach(booking => {

        const rooms = Array.isArray(booking.rooms)
            ? booking.rooms
            : [];

        const totalGuests = rooms.reduce((sum, room) => {
            return sum + (
                Array.isArray(room.guests) ? room.guests.length : 0
            );
        }, 0);

        let guestHTML = "";

        if (rooms.length === 0) {

            guestHTML = "No separate guest details available.";

        } else {

            rooms.forEach((room, index) => {

                const guests = Array.isArray(room.guests)
                    ? room.guests
                    : [];

                guestHTML += `
                    <div style="
                        padding:8px;
                        margin-bottom:8px;
                        border:1px solid #ddd;
                        border-radius:5px;
                    ">

                        <strong>
                            Room ${escapeHTML(room.roomNumber || index + 1)}
                        </strong>

                        <ul>
                `;

                guests.forEach((guest, guestIndex) => {

                    guestHTML += `
                        <li style="margin-bottom:12px;">

                            <strong>Guest ${guestIndex + 1}:</strong>
                            ${escapeHTML(guest.name)}

                            ${
                                guest.age !== null && guest.age !== undefined
                                    ? " (Age: " + escapeHTML(guest.age) + ")"
                                    : ""
                            }

                            ${getGuestIdentityHTML(guest)}

                        </li>
                    `;
                });

                guestHTML += `
                        </ul>
                    </div>
                `;
            });
        }

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(booking.id)}</td>

            <td>${escapeHTML(booking.name)}</td>

            <td>${rooms.length}</td>

            <td>${totalGuests}</td>

            <td>${guestHTML}</td>
        `;

        table.appendChild(row);
    });
}

// ================================================
// 8. LOAD BOOKINGS
// ================================================

async function loadBookings() {

    const response = await apiFetch(`${API}/bookings`);

    if (!response.ok) {
        throw new Error("Unable to load bookings.");
    }

    const bookings = await response.json();

    const table = document.getElementById("bookingTable");

    if (!table) {
        throw new Error("Booking table not found in dashboard.html.");
    }

    table.innerHTML = "";

    if (!Array.isArray(bookings)) {
        throw new Error("Invalid booking data received.");
    }

    // Update total booking amount
    updateTotalPayment(bookings);

    // Update guest and room section
    loadGuestRoomDetails(bookings);

    if (bookings.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="10">No bookings found</td>
            </tr>
        `;

        return;
    }

    bookings.forEach(booking => {

        const id = Number(booking.id);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(booking.id)}</td>

            <td>${escapeHTML(booking.name)}</td>

            <td>${escapeHTML(booking.email)}</td>

            <td>${escapeHTML(booking.destination)}</td>

            <td>${escapeHTML(booking.hotel_name)}</td>

            <td>${formatCurrency(booking.hotel_price)}</td>

            <td>${escapeHTML(booking.nights)}</td>

            <td>${formatCurrency(booking.amount)}</td>

            <td>
                <select id="status-${id}">

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

                ${getRoomDetailsHTML(booking)}

                <button onclick="saveBooking(${id})">
                    Save
                </button>

                <button class="delete"
                    onclick="deleteBooking(${id})">
                    Delete
                </button>

            </td>
        `;

        table.appendChild(row);
    });
}

// ================================================
// 9. UPDATE BOOKING STATUS
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
// 10. DELETE BOOKING
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
// 11. ADMIN LOGOUT
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
// 12. SHOW MESSAGE
// ================================================

function showMessage(message) {

    const element = document.getElementById("message");

    if (element) {
        element.textContent = message;
    }
}

// ================================================
// 13. REFRESH DASHBOARD
// ================================================

async function refreshDashboard() {

    await loadBookings();

    await loadStats();
}

// ================================================
// 14. START DASHBOARD
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