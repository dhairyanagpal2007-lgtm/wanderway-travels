
"use strict";

const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const express = require("express");
const session = require("express-session");
const { DatabaseSync } = require("node:sqlite");

const destinationData = require("./destinations");

// ================================================
// 1. DESTINATION DATA
// ================================================

const indianDestinations =
    destinationData.indianDestinations || [];

const unionTerritories =
    destinationData.unionTerritories || [];

const internationalDestinations =
    destinationData.internationalDestinations || [];

const initializeDestinationHotels =
    destinationData.initializeDestinationHotels;

if (typeof initializeDestinationHotels !== "function") {
    throw new Error("initializeDestinationHotels is missing.");
}

// ================================================
// 2. APP CONFIGURATION
// ================================================

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const ROOT = path.join(__dirname, "..");

const HOTEL_IMAGES_PATH = path.join(
    __dirname,
    "public",
    "hotel-images"
);

const MAX_HOTELS_PER_DESTINATION = 100;

// ================================================
// 3. MIDDLEWARE
// ================================================

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(session({
    name: "wanderway.sid",

    secret:
        process.env.SESSION_SECRET ||
        "local-development-secret",

    resave: false,

    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ================================================
// 4. DATABASE CONNECTION
// ================================================

const db = new DatabaseSync(
    path.join(__dirname, "bookings.db")
);

// ================================================
// 5. BOOKINGS TABLE
// ================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        destination TEXT DEFAULT '',
        hotel_name TEXT DEFAULT '',
        hotel_price REAL DEFAULT 0,
        nights INTEGER DEFAULT 1,
        amount REAL DEFAULT 0,
        message TEXT DEFAULT '',
        status TEXT DEFAULT 'Pending',
        payment_status TEXT DEFAULT 'Pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// ================================================
// 6. UPDATE BOOKING COLUMNS
// ================================================

const existingColumns = new Set(
    db.prepare("PRAGMA table_info(bookings)")
        .all()
        .map(column => column.name)
);

const requiredColumns = [
    ["name", "TEXT DEFAULT ''"],
    ["email", "TEXT DEFAULT ''"],
    ["destination", "TEXT DEFAULT ''"],
    ["hotel_name", "TEXT DEFAULT ''"],
    ["hotel_price", "REAL DEFAULT 0"],
    ["nights", "INTEGER DEFAULT 1"],
    ["amount", "REAL DEFAULT 0"],
    ["message", "TEXT DEFAULT ''"],
    ["status", "TEXT DEFAULT 'Pending'"],
    ["payment_status", "TEXT DEFAULT 'Pending'"],
    ["created_at", "TEXT DEFAULT ''"]
];

for (const [column, definition] of requiredColumns) {

    if (!existingColumns.has(column)) {

        db.exec(`
            ALTER TABLE bookings
            ADD COLUMN ${column} ${definition}
        `);

        console.log("Added database column:", column);
    }
}

db.exec(`
    UPDATE bookings
    SET created_at = CURRENT_TIMESTAMP
    WHERE created_at IS NULL OR created_at = ''
`);

// ================================================
// 7. INITIALIZE HOTEL CATALOGUE
// ================================================

console.log("Initializing hotel catalogue...");

try {
    initializeDestinationHotels(db);
    console.log("Hotel catalogue initialization finished.");
} catch (error) {
    console.error("Hotel catalogue initialization failed:", error);
    process.exit(1);
}

// ================================================
// 8. VERIFY HOTEL TABLE
// ================================================

const hotelColumns = new Set(
    db.prepare("PRAGMA table_info(destination_hotels)")
        .all()
        .map(column => column.name)
);

const requiredHotelColumns = [
    "id",
    "destination",
    "hotel_name",
    "price_per_night",
    "description",
    "image_url",
    "gallery_images",
    "facilities",
    "fallback_image_url"
];

for (const column of requiredHotelColumns) {

    if (!hotelColumns.has(column)) {
        throw new Error(
            `destination_hotels is missing column: ${column}`
        );
    }
}

const catalogueStats = db.prepare(`
    SELECT
        COUNT(*) AS total,
        SUM(
            CASE WHEN price_per_night > 0
            THEN 1 ELSE 0 END
        ) AS validPrices,
        SUM(
            CASE WHEN image_url IS NOT NULL AND image_url != ''
            THEN 1 ELSE 0 END
        ) AS hotelsWithImages
    FROM destination_hotels
`).get();

console.log("Hotel catalogue records:", catalogueStats.total);
console.log("Records with positive prices:", catalogueStats.validPrices);
console.log("Hotels with image paths:", catalogueStats.hotelsWithImages);

// ================================================
// 9. ADMIN AUTHENTICATION
// ================================================

function requireAdmin(req, res, next) {

    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({
            success: false,
            message: "Admin login required."
        });
    }

    next();
}

// ================================================
// 10. DESTINATIONS API
// ================================================

app.get("/api/destinations", (req, res) => {

    res.json({
        success: true,
        states: indianDestinations,
        unionTerritories,
        international: internationalDestinations,

        totalDestinations:
            indianDestinations.length +
            unionTerritories.length +
            internationalDestinations.length
    });
});

// ================================================
// 11. HOTELS API
// ================================================

app.get("/api/hotels", (req, res) => {

    const destination =
        typeof req.query.destination === "string"
            ? req.query.destination.trim()
            : "";

    if (!destination) {
        return res.status(400).json({
            success: false,
            message: "Please select a destination."
        });
    }

    try {

        const allDestinations = [
            ...indianDestinations,
            ...unionTerritories,
            ...internationalDestinations
        ];

        const validDestination = allDestinations.some(
            item => item.toLowerCase() === destination.toLowerCase()
        );

        if (!validDestination) {
            return res.status(400).json({
                success: false,
                message: "Invalid destination selected."
            });
        }

        const hotels = db.prepare(`
            SELECT
                id,
                destination,
                hotel_name,
                CAST(price_per_night AS REAL) AS price_per_night,
                CAST(price_per_night AS REAL) AS price,
                CAST(price_per_night AS REAL) AS hotel_price,
                description,
                image_url,
                gallery_images,
                fallback_image_url,
                facilities

            FROM destination_hotels

            WHERE destination = ? COLLATE NOCASE

            ORDER BY hotel_name COLLATE NOCASE ASC

            LIMIT ?
        `).all(
            destination,
            MAX_HOTELS_PER_DESTINATION
        );

        const formattedHotels = hotels.map(hotel => {

            let galleryImages = [];
            let facilities = [];

            try {
                galleryImages = JSON.parse(
                    hotel.gallery_images || "[]"
                );

                if (!Array.isArray(galleryImages)) {
                    galleryImages = [];
                }
            } catch {
                galleryImages = [];
            }

            try {
                facilities = JSON.parse(
                    hotel.facilities || "[]"
                );

                if (!Array.isArray(facilities)) {
                    facilities = [];
                }
            } catch {
                facilities = [];
            }

            return {
                ...hotel,
                gallery_images: galleryImages,
                facilities
            };
        });

        res.json({
            success: true,
            destination,
            count: formattedHotels.length,
            maximumHotels: MAX_HOTELS_PER_DESTINATION,
            hotels: formattedHotels
        });

    } catch (error) {

        console.error("Hotel loading error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load hotels."
        });
    }
});

// ================================================
// 12. CUSTOMER BOOKING API
// ================================================

app.post("/api/bookings", (req, res) => {

    try {

        const {
            name,
            email,
            destination,
            hotel_name,
            nights,
            message
        } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof destination !== "string" ||
            typeof hotel_name !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !destination.trim() ||
            !hotel_name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        const numberOfNights = Number(nights);

        if (
            !Number.isInteger(numberOfNights) ||
            numberOfNights < 1 ||
            numberOfNights > 365
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter between 1 and 365 nights."
            });
        }

        const hotel = db.prepare(`
            SELECT
                hotel_name,
                destination,
                CAST(price_per_night AS REAL) AS price_per_night

            FROM destination_hotels

            WHERE destination = ? COLLATE NOCASE
              AND hotel_name = ? COLLATE NOCASE
              AND CAST(price_per_night AS REAL) > 0

            LIMIT 1
        `).get(
            destination.trim(),
            hotel_name.trim()
        );

        if (!hotel) {
            return res.status(400).json({
                success: false,
                message: "Hotel not found or price unavailable."
            });
        }

        const hotelPrice = Number(hotel.price_per_night);

        if (!Number.isFinite(hotelPrice) || hotelPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Hotel price is unavailable."
            });
        }

        const amount = hotelPrice * numberOfNights;

        const result = db.prepare(`
            INSERT INTO bookings (
                name,
                email,
                destination,
                hotel_name,
                hotel_price,
                nights,
                amount,
                message,
                status,
                payment_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending')
        `).run(
            name.trim(),
            email.trim(),
            hotel.destination,
            hotel.hotel_name,
            hotelPrice,
            numberOfNights,
            amount,
            typeof message === "string" ? message.trim() : ""
        );

        res.status(201).json({
            success: true,
            message: "Booking successful.",
            bookingId: Number(result.lastInsertRowid),
            destination: hotel.destination,
            hotelName: hotel.hotel_name,
            hotelPrice,
            nights: numberOfNights,
            amount,
            paymentStatus: "Pending"
        });

    } catch (error) {

        console.error("Booking error:", error);

        res.status(500).json({
            success: false,
            message: "Booking failed. Please try again."
        });
    }
});

// ================================================
// 13. ADMIN LOGIN
// ================================================

app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        return res.status(500).json({
            success: false,
            message: "Admin credentials are not configured in backend/.env"
        });
    }

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        email.trim() !== process.env.ADMIN_EMAIL.trim() ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password."
        });
    }

    req.session.regenerate(error => {

        if (error) {
            console.error("Session error:", error);

            return res.status(500).json({
                success: false,
                message: "Login error."
            });
        }

        req.session.isAdmin = true;

        res.json({
            success: true,
            message: "Login successful."
        });
    });
});

// ================================================
// 14. CHECK ADMIN LOGIN
// ================================================

app.get("/api/check-login", (req, res) => {

    res.json({
        loggedIn: !!(req.session && req.session.isAdmin)
    });
});

// ================================================
// 15. ADMIN LOGOUT
// ================================================

app.post("/api/logout", (req, res) => {

    req.session.destroy(error => {

        if (error) {
            console.error("Logout error:", error);

            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("wanderway.sid");

        res.json({
            success: true,
            message: "Logout successful."
        });
    });
});

// ================================================
// 16. ADMIN BOOKINGS API
// ================================================

app.get("/api/bookings", requireAdmin, (req, res) => {

    try {

        const bookings = db.prepare(`
            SELECT *
            FROM bookings
            ORDER BY id DESC
        `).all();

        res.json(bookings);

    } catch (error) {

        console.error("Booking loading error:", error);

        res.status(500).json({
            message: "Could not load bookings."
        });
    }
});

// ================================================
// 17. UPDATE BOOKING STATUS
// ================================================

app.patch("/api/bookings/:id/status", requireAdmin, (req, res) => {

    const id = Number(req.params.id);
    const { status } = req.body;

    if (
        !Number.isInteger(id) ||
        id < 1 ||
        !["Pending", "Confirmed", "Cancelled"].includes(status)
    ) {
        return res.status(400).json({
            message: "Invalid booking ID or status."
        });
    }

    const result = db.prepare(`
        UPDATE bookings
        SET status = ?
        WHERE id = ?
    `).run(status, id);

    if (!result.changes) {
        return res.status(404).json({
            message: "Booking not found."
        });
    }

    res.json({
        success: true,
        message: "Booking status updated."
    });
});

// ================================================
// 18. UPDATE PAYMENT STATUS
// ================================================

app.patch("/api/bookings/:id/payment", requireAdmin, (req, res) => {

    const id = Number(req.params.id);
    const { payment_status } = req.body;

    if (
        !Number.isInteger(id) ||
        id < 1 ||
        !["Paid", "Pending", "Failed"].includes(payment_status)
    ) {
        return res.status(400).json({
            message: "Invalid booking ID or payment status."
        });
    }

    const result = db.prepare(`
        UPDATE bookings
        SET payment_status = ?
        WHERE id = ?
    `).run(payment_status, id);

    if (!result.changes) {
        return res.status(404).json({
            message: "Booking not found."
        });
    }

    res.json({
        success: true,
        message: "Payment status updated."
    });
});

// ================================================
// 19. DASHBOARD STATISTICS
// ================================================

app.get("/api/stats", requireAdmin, (req, res) => {

    try {

        const total = db.prepare(`
            SELECT COUNT(*) AS count FROM bookings
        `).get().count;

        const pending = db.prepare(`
            SELECT COUNT(*) AS count
            FROM bookings WHERE status = 'Pending'
        `).get().count;

        const confirmed = db.prepare(`
            SELECT COUNT(*) AS count
            FROM bookings WHERE status = 'Confirmed'
        `).get().count;

        const cancelled = db.prepare(`
            SELECT COUNT(*) AS count
            FROM bookings WHERE status = 'Cancelled'
        `).get().count;

        const paid = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM bookings WHERE payment_status = 'Paid'
        `).get().total;

        res.json({
            total,
            pending,
            confirmed,
            cancelled,
            paid
        });

    } catch (error) {

        console.error("Statistics error:", error);

        res.status(500).json({
            message: "Could not load dashboard statistics."
        });
    }
});

// ================================================
// 20. DELETE BOOKING
// ================================================

app.delete("/api/bookings/:id", requireAdmin, (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: "Invalid booking ID."
        });
    }

    const result = db.prepare(`
        DELETE FROM bookings WHERE id = ?
    `).run(id);

    if (!result.changes) {
        return res.status(404).json({
            message: "Booking not found."
        });
    }

    res.json({
        success: true,
        message: "Booking deleted."
    });
});

// ================================================
// 21. ADMIN PAGES
// ================================================

app.get("/admin/login.html", (req, res) => {

    res.sendFile(
        path.join(ROOT, "admin", "login.html")
    );
});

app.get("/admin/dashboard.html", (req, res) => {

    if (!req.session.isAdmin) {
        return res.redirect("/admin/login.html");
    }

    res.sendFile(
        path.join(ROOT, "admin", "dashboard.html")
    );
});

// ================================================
// 22. SERVE HOTEL IMAGES
// ================================================

app.use(
    "/hotel-images",
    express.static(HOTEL_IMAGES_PATH, {
        dotfiles: "ignore",
        index: false
    })
);

// ================================================
// 23. PROTECT BACKEND FILES
// ================================================

app.use("/backend", (req, res) => {
    res.sendStatus(404);
});

// ================================================
// 24. FRONTEND STATIC FILES
// ================================================

app.use(express.static(ROOT, {
    index: "index.html",
    dotfiles: "ignore"
}));

// ================================================
// 25. START SERVER
// ================================================

const server = app.listen(PORT, () => {

    console.log("----------------------------------");
    console.log("WanderWay Travels server started");
    console.log(`Website: http://localhost:${PORT}`);
    console.log(`Hotel images: http://localhost:${PORT}/hotel-images/`);
    console.log("----------------------------------");
});

// ================================================
// 26. SERVER ERROR HANDLING
// ================================================

server.on("error", error => {

    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
    } else {
        console.error("Server error:", error);
    }
});

process.on("unhandledRejection", error => {
    console.error("Unhandled promise rejection:", error);
});
