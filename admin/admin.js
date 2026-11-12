
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

function getBookingRooms(booking) {
    return Array.isArray(booking.rooms) ? booking.rooms : [];
}

function getTotalGuests(booking) {
    return getBookingRooms(booking).reduce((total, room) => {
        return total + (
            Array.isArray(room.guests) ? room.guests.length : 0
        );
    }, 0);
}

// ================================================
// 1A. PAYMENT METHOD DISPLAY
// ================================================

function getPaymentMethodLabel(booking) {
    const method = String(booking.payment_method || "").trim();

    if (method.toLowerCase() === "cash") {
        return "Cash";
    }

    if (
        method.toLowerCase() === "netbanking" ||
        method.toLowerCase() === "net banking"
    ) {
        return "Net Banking";
    }

    return method || "Not selected";
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

    const totalBookings = document.getElementById("totalBookings");
    const pendingBookings = document.getElementById("pendingBookings");
    const confirmedBookings = document.getElementById("confirmedBookings");
    const cancelledBookings = document.getElementById("cancelledBookings");
    const paidAmount = document.getElementById("paidAmount");

    if (totalBookings) {
        totalBookings.textContent = stats.total ?? 0;
    }

    if (pendingBookings) {
        pendingBookings.textContent = stats.pending ?? 0;
    }

    if (confirmedBookings) {
        confirmedBookings.textContent = stats.confirmed ?? 0;
    }

    if (cancelledBookings) {
        cancelledBookings.textContent = stats.cancelled ?? 0;
    }

    if (paidAmount) {
        paidAmount.textContent = formatCurrency(stats.paid);
    }
}

// ================================================
// 4. TOTAL PAYMENT
// Only Confirmed bookings are counted.
// ================================================

function updateTotalPayment(bookings) {
    const paymentElement = document.getElementById("totalPayment");

    if (!paymentElement) return;

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
// Aadhaar/PAN and Demo fields removed
// ================================================

function getGuestIdentityHTML(guest) {
    const mobile = guest.mobile
        ? escapeHTML(guest.mobile)
        : "Not provided";

    const email = guest.email
        ? escapeHTML(guest.email)
        : "Not provided";

    const cleanMessage = String(guest.message ?? "").trim();

    const message = cleanMessage
        ? escapeHTML(cleanMessage).replace(/\r?\n/g, "<br>")
        : "No message provided";
        const demoCode1 = guest.demoCode1
    ? escapeHTML(String(guest.demoCode1))
    : "Not provided";

const demoCode2 = guest.demoCode2
    ? escapeHTML(String(guest.demoCode2))
    : "Not provided";

    return `
        <div style="
            margin-top:8px;
            padding:10px;
            background:#f4f7fb;
            border-radius:6px;
            font-size:13px;
            line-height:1.7;
            overflow-wrap:anywhere;
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
    <strong>Custom Demo Code 1:</strong>
    ${demoCode1}
</div>

<div>
    <strong>Custom Demo Code 2:</strong>
    ${demoCode2}
</div>

            <div style="
                margin-top:8px;
                padding:8px;
                background:#ffffff;
                border-left:3px solid #2563eb;
                border-radius:4px;
            ">
                <strong>Guest Message:</strong>
                <div>${message}</div>
            </div>
        </div>
    `;
}

// ================================================
// 6. DISPLAY ROOM AND GUEST DETAILS
// ================================================

function getRoomDetailsHTML(booking) {
    const rooms = getBookingRooms(booking);
    const totalGuests = getTotalGuests(booking);

    if (rooms.length === 0) {
        return `
            <details>
                <summary>View Rooms & Guests</summary>
                <p>No separate room details available.</p>
            </details>
        `;
    }

    let html = `
        <details class="booking-room-details">
            <summary style="
                cursor:pointer;
                font-weight:600;
                color:#2563eb;
                padding:6px 0;
            ">
                View ${rooms.length} Room(s) /
                ${totalGuests} Guest(s)
            </summary>

            <div style="padding:10px;">
    `;

    rooms.forEach((room, index) => {
        const guests = Array.isArray(room.guests) ? room.guests : [];
        const roomNumber = room.roomNumber || index + 1;

        html += `
            <div style="
                border:1px solid #ddd;
                padding:12px;
                margin:10px 0;
                border-radius:7px;
                background:#ffffff;
            ">
                <h4 style="margin:0 0 8px;color:#1e293b;">
                    Room ${escapeHTML(roomNumber)}
                </h4>

                <p style="
                    margin:0 0 10px;
                    font-size:13px;
                    color:#555;
                ">
                    Total Guests: ${guests.length}
                </p>

                <div>
        `;

        if (guests.length === 0) {
            html += `<p>No guest details available.</p>`;
        }

        guests.forEach((guest, guestIndex) => {
            const guestName = guest.name || "Not provided";

            const age =
                guest.age !== null &&
                guest.age !== undefined &&
                guest.age !== ""
                    ? escapeHTML(guest.age)
                    : "Not provided";

            html += `
                <div style="
                    margin:10px 0;
                    padding:10px;
                    background:#f8fafc;
                    border-radius:6px;
                    border:1px solid #e5e7eb;
                ">
                    <strong>
                        Guest ${guestIndex + 1}:
                        ${escapeHTML(guestName)}
                    </strong>

                    <div style="margin-top:5px;">
                        <strong>Age:</strong> ${age}
                    </div>

                    ${getGuestIdentityHTML(guest)}
                </div>
            `;
        });

        html += `
                </div>
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

    if (!table) return;

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
        const rooms = getBookingRooms(booking);
        const totalGuests = getTotalGuests(booking);

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
                        padding:10px;
                        margin-bottom:10px;
                        border:1px solid #ddd;
                        border-radius:6px;
                    ">
                        <strong>
                            Room ${escapeHTML(room.roomNumber || index + 1)}
                        </strong>

                        <p>Total Guests: ${guests.length}</p>

                        <ul style="padding-left:20px;">
                `;

                guests.forEach((guest, guestIndex) => {
                    const age =
                        guest.age !== null &&
                        guest.age !== undefined &&
                        guest.age !== ""
                            ? escapeHTML(guest.age)
                            : "Not provided";

                    guestHTML += `
                        <li style="margin-bottom:15px;">
                            <strong>
                                Guest ${guestIndex + 1}:
                                ${escapeHTML(guest.name || "Not provided")}
                            </strong>

                            <div>
                                <strong>Age:</strong> ${age}
                            </div>

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

    if (!Array.isArray(bookings)) {
        throw new Error("Invalid booking data received.");
    }

    table.innerHTML = "";

    updateTotalPayment(bookings);
    loadGuestRoomDetails(bookings);

    if (bookings.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="12">No bookings found.</td>
            </tr>
        `;
        return;
    }

    bookings.forEach(booking => {
        const id = Number(booking.id);
        const rooms = getBookingRooms(booking);
        const totalGuests = getTotalGuests(booking);
        const paymentMethod = getPaymentMethodLabel(booking);

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
                ${escapeHTML(paymentMethod)}
            </td>

            <td>
                ${rooms.length} Room(s)
                <br>
                ${totalGuests} Guest(s)
            </td>

            <td>
                <select id="status-${id}" aria-label="Action status">
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
// 9. UPDATE ACTION STATUS
// Payment total updates from Confirmed bookings.
// ================================================

async function saveBooking(id) {
    const statusElement = document.getElementById(`status-${id}`);

    if (!statusElement) {
        showMessage("Action status field not found.");
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
                result.message || "Action status update failed."
            );
        }

        showMessage(
            status === "Confirmed"
                ? "Booking confirmed. Total Payment updated!"
                : status === "Cancelled"
                    ? "Booking cancelled. Total Payment updated!"
                    : "Booking status changed to Pending."
        );

        await refreshDashboard();

    } catch (error) {
        showMessage(error.message);
        await refreshDashboard().catch(() => {});
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
            { method: "DELETE" }
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
