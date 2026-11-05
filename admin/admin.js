
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

async function checkLogin() {

    const response = await fetch(`${API}/check-login`);

    const result = await response.json();

    if (!result.loggedIn) {
        window.location.href = "/admin/login.html";
        return false;
    }

    return true;
}

async function loadStats() {

    const response = await fetch(`${API}/stats`);

    if (!response.ok) return;

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

    const response = await fetch(`${API}/bookings`);

    if (response.status === 401) {
        window.location.href = "/admin/login.html";
        return;
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
            <td>${booking.id}</td>

            <td>${escapeHTML(booking.name)}</td>

            <td>${escapeHTML(booking.email)}</td>

            <td>${escapeHTML(booking.destination)}</td>

            <td>${escapeHTML(booking.hotel_name)}</td>

            <td>₹${Number(booking.hotel_price).toLocaleString("en-IN")}</td>

            <td>${booking.nights}</td>

            <td>₹${Number(booking.amount).toLocaleString("en-IN")}</td>

           
            <td>
                <select id="status-${booking.id}">
                    <option value="Pending" ${booking.status === "Pending" ? "selected" : ""}>Pending</option>
                    <option value="Confirmed" ${booking.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
                    <option value="Cancelled" ${booking.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                </select>
            </td>

            <td>
                <button onclick="saveBooking(${booking.id})">Save</button>

                <button class="delete"
                    onclick="deleteBooking(${booking.id})">
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

        const paymentResponse = await fetch(
            `${API}/bookings/${id}/payment`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ payment_status })
            }
        );

        if (!paymentResponse.ok) {
            throw new Error("Payment update failed");
        }

        const statusResponse = await fetch(
            `${API}/bookings/${id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status })
            }
        );

        if (!statusResponse.ok) {
            throw new Error("Booking status update failed");
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

        const response = await fetch(
            `${API}/bookings/${id}`,
            { method: "DELETE" }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        showMessage("Booking deleted successfully!");

        await refreshDashboard();

    } catch (error) {
        showMessage(error.message);
    }
}

async function logout() {

    await fetch(`${API}/logout`, {
        method: "POST"
    });

    window.location.href = "/admin/login.html";
}

function showMessage(message) {
    document.getElementById("message").textContent = message;
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
        showMessage("Unable to connect to server");
    }
}

startDashboard();
