
const express = require("express");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(__dirname));

// MySQL connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "customer_visit_tracking",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Health check
app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");

        res.json({
            success: true,
            message: "Backend and MySQL connected successfully!"
        });

    } catch (error) {
        console.error("Database connection error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

// Reverse geocoding: GPS coordinates to readable address
let lastGeocodeRequest = 0;

app.get("/api/reverse-geocode", async (req, res) => {
    try {
        const lat = Number(req.query.lat);
        const lon = Number(req.query.lon);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            lat < -90 || lat > 90 ||
            lon < -180 || lon > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid GPS coordinates."
            });
        }

        // Keep requests at least 1 second apart
        const waitTime = Math.max(
            0,
            1100 - (Date.now() - lastGeocodeRequest)
        );

        if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        lastGeocodeRequest = Date.now();

        const url = new URL(
            "https://nominatim.openstreetmap.org/reverse"
        );

        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("lat", String(lat));
        url.searchParams.set("lon", String(lon));
        url.searchParams.set("addressdetails", "1");

        const response = await fetch(url, {
            headers: {
                "User-Agent": "EllenbarrieCustomerVisitTracking/1.0"
            }
        });

        if (!response.ok) {
            throw new Error("Address service returned an error.");
        }

        const data = await response.json();

        if (!data.display_name) {
            return res.status(404).json({
                success: false,
                message: "Address could not be found."
            });
        }

        res.json({
            success: true,
            address: data.display_name
        });

    } catch (error) {
        console.error("Address lookup error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve the location address."
        });
    }
});

// Save customer visit details
app.post("/api/visits", async (req, res) => {
    try {
        const {
            empCode,
            empName,
            customerName,
            purpose,
            latitude,
            longitude,
            locationAddress,
            visitTime
        } = req.body;

        // Validate required fields
        if (
            !empCode ||
            !empName ||
            !customerName ||
            !purpose ||
            latitude === undefined ||
            longitude === undefined ||
            !visitTime
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required visit details."
            });
        }

        const lat = Number(latitude);
        const lng = Number(longitude);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 || lat > 90 ||
            lng < -180 || lng > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid GPS coordinates."
            });
        }

        const parsedVisitTime = new Date(visitTime);

        if (Number.isNaN(parsedVisitTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid visit time."
            });
        }

        // Convert date to MySQL DATETIME format
        const mysqlVisitTime = parsedVisitTime
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

        const sql = `
            INSERT INTO visit_data
            (
                employee_code,
                employee_name,
                customer_name,
                visit_purpose,
                latitude,
                longitude,
                location_address,
                visit_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            String(empCode).trim(),
            String(empName).trim(),
            String(customerName).trim(),
            String(purpose).trim(),
            lat,
            lng,
            locationAddress ? String(locationAddress).trim() : null,
            mysqlVisitTime
        ];

        const [result] = await db.execute(sql, values);

        res.status(201).json({
            success: true,
            message: "Customer visit saved successfully!",
            visitId: result.insertId
        });

    } catch (error) {
        console.error("Visit submission error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to save visit details."
        });
    }
});

// Start server
async function startServer() {
    try {
        await db.query("SELECT 1");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log("MySQL database connected successfully.");
        });

    } catch (error) {
        console.error("Unable to connect to MySQL:", error.message);
        process.exit(1);
    }
}

startServer();
