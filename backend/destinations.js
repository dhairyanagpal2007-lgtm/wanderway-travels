
"use strict";

// ================================================
// WANDERWAY TRAVELS
// DESTINATION AND HOTEL CATALOGUE
// ================================================

// ================================================
// 1. INDIAN STATES
// ================================================

const indianDestinations = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam",
    "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

// ================================================
// 2. UNION TERRITORIES
// ================================================

const unionTerritories = [
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry"
];

// ================================================
// 3. INTERNATIONAL DESTINATIONS
// ================================================

const internationalDestinations = [
    "Singapore", "Indonesia", "Bali", "Thailand",
    "Dubai", "Malaysia", "Maldives", "Nepal",
    "Sri Lanka", "Japan", "France", "Italy",
    "Switzerland", "United Kingdom", "Australia",
    "Vietnam", "Cambodia", "Bhutan", "Philippines",
    "South Korea", "China", "Hong Kong", "Taiwan",
    "Turkey", "Greece", "Spain", "Portugal",
    "Germany", "Netherlands", "Austria",
    "Czech Republic", "Qatar", "Saudi Arabia",
    "Oman", "Egypt", "South Africa", "Kenya",
    "Morocco", "Mauritius", "Seychelles",
    "New Zealand", "Fiji", "Canada",
    "United States", "Mexico", "Brazil", "Peru",
    "Argentina"
];

// ================================================
// 4. HOTEL SETTINGS
// ================================================

const HOTELS_PER_DESTINATION = 70;

const STARTING_PRICE = 1200;
const PRICE_INCREMENT = 5;

const HOTEL_PREFIXES = [
    "Royal", "Golden", "Grand", "Silver",
    "Sunrise", "Blue", "Green", "Crystal",
    "Paradise", "Majestic"
];

const HOTEL_SUFFIXES = [
    "Palace", "Resort", "Suites", "Retreat",
    "Residency", "Inn", "Lodge"
];

// ================================================
// 5. HOTEL PHOTO COLLECTION
// ================================================

// Online sample hotel/property photos.
// Every hotel receives five different photos.
// Internet connection is required.

const HOTEL_PHOTOS = [
    "photo-1566073771259-6a8506099945",
    "photo-1564501049412-61c2a3083791",
    "photo-1571896349842-33c89424de2d",
    "photo-1568084680786-a84f91d1153c",
    "photo-1590490360182-c33d57733427",
    "photo-1542314831-068cd1dbfeeb",
    "photo-1582719508461-905c673771fd",
    "photo-1578683010236-d716f9a3f461",
    "photo-1596394516093-501ba68a0ba6",
    "photo-1611892440504-42a792e24d32",
    "photo-1595576508898-0ad5c879a061",
    "photo-1618773928121-c32242e63f39",
    "photo-1596436889106-be35e843f974",
    "photo-1601918774946-25832a4be0d6",
    "photo-1600607687939-ce8a6c25118c",
    "photo-1600210492486-724fe5c67fb0",
    "photo-1600566753086-00f18fb6b3ea",
    "photo-1600607687920-4e2a09cf159d",
    "photo-1600566753190-17f0baa2a6c3",
    "photo-1600607687937-f7c4c7f4e8b1"
];

function photoUrl(photoId) {
    return (
        "https://images.unsplash.com/" +
        photoId +
        "?auto=format&fit=crop&w=1200&q=80"
    );
}

// ================================================
// 6. DIFFERENT PHOTOS FOR EVERY HOTEL
// ================================================

function createHotelImages(hotelId) {

    // Generate a stable number from the hotel ID.
    let hash = 0;

    for (let i = 0; i < hotelId.length; i++) {
        hash = (
            hash * 31 + hotelId.charCodeAt(i)
        ) >>> 0;
    }

    const totalPhotos = HOTEL_PHOTOS.length;
    const start = hash % totalPhotos;

    const selectedPhotos = [];

    // Step 3 ensures five different positions
    // because it does not divide the collection size.
    for (let i = 0; i < 5; i++) {

        const index = (start + i * 3) % totalPhotos;

        selectedPhotos.push(
            photoUrl(HOTEL_PHOTOS[index])
        );
    }

    return {
        image_url: selectedPhotos[0],

        gallery_images: selectedPhotos.slice(1),

        fallback_image_url: ""
    };
}

// ================================================
// 7. FACILITIES
// ================================================

const FACILITY_POOL = [
    "Free Wi-Fi",
    "Swimming Pool",
    "Restaurant",
    "Room Service",
    "Fitness Centre",
    "Spa",
    "Free Parking",
    "Garden",
    "Breakfast Service",
    "Airport Shuttle",
    "Family Rooms",
    "Laundry Service",
    "Conference Room",
    "Rooftop Cafe",
    "24-Hour Reception",
    "Air Conditioning",
    "Travel Desk",
    "Luggage Storage"
];

// ================================================
// 8. UNIQUE FACILITY COMBINATIONS
// ================================================

function generateFacilityCombinations() {

    const combinations = [];
    const selected = [];

    function build(start) {

        if (selected.length === 5) {
            combinations.push([...selected]);
            return;
        }

        for (let i = start; i < FACILITY_POOL.length; i++) {

            selected.push(FACILITY_POOL[i]);

            build(i + 1);

            selected.pop();
        }
    }

    build(0);

    return combinations;
}

const facilityCombinations =
    generateFacilityCombinations();

// ================================================
// 9. DESTINATION COUNTS
// ================================================

const totalDestinations =
    indianDestinations.length +
    unionTerritories.length +
    internationalDestinations.length;

const totalRequiredHotels =
    totalDestinations * HOTELS_PER_DESTINATION;

if (facilityCombinations.length < totalRequiredHotels) {
    throw new Error("Not enough unique facility combinations.");
}

// ================================================
// 10. HOTEL ID GENERATOR
// ================================================

function makeHotelId(destination, index) {

    const slug = String(destination)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return slug + "-hotel-" + (index + 1);
}

// ================================================
// 11. HOTEL DESCRIPTION
// ================================================

function createHotelDescription(
    hotelName,
    destination,
    facilities
) {

    return (
        hotelName +
        " is a fictional sample hotel in " +
        destination +
        ". Sample facilities include " +
        facilities.join(", ") +
        ". Created for the WanderWay Travels college project."
    );
}

// ================================================
// 12. GENERATE HOTELS
// ================================================

function generateHotels(
    destinations,
    regionType,
    usedPrices,
    startingFacilityIndex
) {

    const hotels = [];

    let facilityIndex = startingFacilityIndex;

    for (const destination of destinations) {

        for (let i = 0; i < HOTELS_PER_DESTINATION; i++) {

            const hotelId = makeHotelId(destination, i);

            const prefix =
                HOTEL_PREFIXES[i % HOTEL_PREFIXES.length];

            const suffix =
                HOTEL_SUFFIXES[
                    Math.floor(i / HOTEL_PREFIXES.length)
                ];

            const hotelName =
                prefix + " " + destination + " " + suffix;

            let price =
                STARTING_PRICE +
                usedPrices.size * PRICE_INCREMENT;

            while (usedPrices.has(price)) {
                price += PRICE_INCREMENT;
            }

            usedPrices.add(price);

            const facilities =
                facilityCombinations[facilityIndex];

            if (!facilities) {
                throw new Error(
                    "Facility combination unavailable."
                );
            }

            facilityIndex++;

            const images = createHotelImages(hotelId);

            hotels.push({

                id: hotelId,

                destination,

                region_type: regionType,

                hotel_name: hotelName,

                price_per_night: price,

                description: createHotelDescription(
                    hotelName,
                    destination,
                    facilities
                ),

                image_url: images.image_url,

                gallery_images: images.gallery_images,

                fallback_image_url: images.fallback_image_url,

                facilities: [...facilities]
            });
        }
    }

    return {
        hotels,
        nextFacilityIndex: facilityIndex
    };
}

// ================================================
// 13. GENERATE COMPLETE HOTEL CATALOGUE
// ================================================

const usedPrices = new Set();

const stateResult = generateHotels(
    indianDestinations,
    "Indian State",
    usedPrices,
    0
);

const stateHotels = stateResult.hotels;

const unionResult = generateHotels(
    unionTerritories,
    "Union Territory",
    usedPrices,
    stateResult.nextFacilityIndex
);

const unionTerritoryHotels = unionResult.hotels;

const internationalResult = generateHotels(
    internationalDestinations,
    "International",
    usedPrices,
    unionResult.nextFacilityIndex
);

const internationalHotels = internationalResult.hotels;

const hotelCatalogue = [
    ...stateHotels,
    ...unionTerritoryHotels,
    ...internationalHotels
];

const indianHotelCatalogue = [
    ...stateHotels,
    ...unionTerritoryHotels
];

// ================================================
// 14. CHECK HOTEL IMAGE URLS
// ================================================

function checkHotelImages(hotels) {

    const mainImageURLs =
        hotels.map(hotel => hotel.image_url);

    const uniqueMainImageURLs =
        new Set(mainImageURLs);

    console.log("Total hotel records:", mainImageURLs.length);

    console.log(
        "Unique main image URLs:",
        uniqueMainImageURLs.size
    );

    console.log(
        "Repeated main image URLs:",
        mainImageURLs.length - uniqueMainImageURLs.size
    );

    const firstHotel = hotels[0];

    if (firstHotel) {

        const allFivePhotos = [
            firstHotel.image_url,
            ...firstHotel.gallery_images
        ];

        console.log(
            "First hotel's five unique photos:",
            new Set(allFivePhotos).size === 5
        );
    }
}

// ================================================
// 15. INITIALIZE POSTGRESQL HOTEL TABLE
// ================================================

async function initializeDestinationHotels(pool) {

    if (!pool || typeof pool.query !== "function") {
        throw new Error("A valid PostgreSQL connection is required.");
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS destination_hotels (
            id TEXT PRIMARY KEY,
            destination TEXT NOT NULL,
            region_type TEXT NOT NULL,
            hotel_name TEXT NOT NULL,
            price_per_night DOUBLE PRECISION NOT NULL,
            description TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            gallery_images TEXT DEFAULT '[]',
            facilities TEXT DEFAULT '[]',
            fallback_image_url TEXT DEFAULT ''
        )
    `);

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query("TRUNCATE TABLE destination_hotels");

        for (const hotel of hotelCatalogue) {

            await client.query(`
                INSERT INTO destination_hotels (
                    id,
                    destination,
                    region_type,
                    hotel_name,
                    price_per_night,
                    description,
                    image_url,
                    gallery_images,
                    facilities,
                    fallback_image_url
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                hotel.id,
                hotel.destination,
                hotel.region_type,
                hotel.hotel_name,
                hotel.price_per_night,
                hotel.description,
                hotel.image_url,
                JSON.stringify(hotel.gallery_images),
                JSON.stringify(hotel.facilities),
                hotel.fallback_image_url
            ]);
        }

        await client.query("COMMIT");

        checkHotelImages(hotelCatalogue);

        console.log("==================================");
        console.log("WANDERWAY HOTEL CATALOGUE READY");
        console.log("Destinations:", totalDestinations);
        console.log("Hotels per destination:", HOTELS_PER_DESTINATION);
        console.log("Total hotels:", hotelCatalogue.length);
        console.log("==================================");

    } catch (error) {

        await client.query("ROLLBACK");
        console.error("Hotel catalogue initialization failed:", error);
        throw error;

    } finally {
        client.release();
    }
}

// ================================================
// 16. EXPORT MODULE
// ================================================

module.exports = {
    indianDestinations,
    unionTerritories,
    internationalDestinations,
    stateHotels,
    unionTerritoryHotels,
    internationalHotels,
    indianHotelCatalogue,
    hotelCatalogue,
    generateHotels,
    createHotelImages,
    initializeDestinationHotels
};