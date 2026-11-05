
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // ==========================================
    // 1. ELEMENTS AND SETTINGS
    // ==========================================

    const bookingForm = document.getElementById("bookingForm");
    const destinationSelect = document.getElementById("destination");
    const hotelSelect = document.getElementById("hotel_name");
    const nightsInput = document.getElementById("nights");

    const hotelPriceInput = document.getElementById("hotelPrice");
    const totalPriceInput = document.getElementById("totalPrice");
    const displayNights = document.getElementById("displayNights");

    const bookingMessage = document.getElementById("bookingMessage");
    const bookingButton = document.getElementById("bookingButton");

    const popularHotelsContainer =
        document.getElementById("popularHotels");

    const hotelCount = document.getElementById("hotelCount");

    const MAX_HOTELS_PER_DESTINATION = 100;
    const HOTELS_PER_DESTINATION = 4;
    const CARDS_PER_PAGE = 12;

    let allPopularHotels = [];
    let currentDestinationHotels = [];
    let visibleHotelCount = CARDS_PER_PAGE;
    let selectedHotelPrice = 0;

    // ==========================================
    // 2. GENERAL HELPER FUNCTIONS
    // ==========================================

    function parseArray(value) {
        if (Array.isArray(value)) return value;

        if (typeof value === "string") {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }

        return [];
    }

    function getHotelArray(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.hotels)) return data.hotels;
        if (Array.isArray(data?.destinations)) return data.destinations;
        return [];
    }

    function getDestinationNames(data) {
        const names = [
            ...(Array.isArray(data.states) ? data.states : []),
            ...(Array.isArray(data.unionTerritories)
                ? data.unionTerritories : []),
            ...(Array.isArray(data.international)
                ? data.international : [])
        ];

        return [...new Set(
            names.filter(name =>
                typeof name === "string" && name.trim()
            )
        )];
    }

    function getHotelPrice(hotel) {
        if (!hotel) return 0;

        const price = Number(
            String(hotel.price_per_night ?? "")
                .replace(/[₹,\s]/g, "")
        );

        return Number.isFinite(price) && price > 0 ? price : 0;
    }

    function getHotelName(hotel) {
        return hotel?.hotel_name || hotel?.name || "Unnamed Hotel";
    }

    function getHotelDestination(hotel) {
        return hotel?.destination || "";
    }

    function getHotelFacilities(hotel) {
        return parseArray(hotel?.facilities);
    }

    function getHotelDescription(hotel) {
        return hotel?.description ||
            `Explore ${getHotelName(hotel)} in ${getHotelDestination(hotel)}.`;
    }

    function formatPrice(price) {
        return Number(price).toLocaleString("en-IN");
    }

    function setDisplayedPrices(hotelPrice, totalPrice) {
        if (hotelPriceInput) {
            hotelPriceInput.textContent = hotelPrice;
        }

        if (totalPriceInput) {
            totalPriceInput.textContent = totalPrice;
        }
    }

    async function fetchJSON(url, options = {}) {
        const response = await fetch(url, options);

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("Invalid server response.");
        }

        if (!response.ok || data.success === false) {
            throw new Error(data.message || "Something went wrong.");
        }

        return data;
    }

    // ==========================================
    // 3. HOTEL IMAGE FUNCTIONS
    // IMPORTANT: USE BACKEND IMAGE DATA
    // ==========================================

    function isValidImageURL(url) {
        if (typeof url !== "string" || !url.trim()) {
            return false;
        }

        try {
            const parsed = new URL(url, window.location.origin);

            return (
                parsed.protocol === "https:" ||
                parsed.protocol === "http:" ||
                parsed.protocol === "data:"
            );
        } catch {
            return false;
        }
    }

    function getHotelImages(hotel) {
        if (!hotel) return [];

        // Read images directly from destinations.js through the API.
        const mainImage = hotel.image_url || "";

        const galleryImages = parseArray(hotel.gallery_images);

        const images = [
            mainImage,
            ...galleryImages
        ];

        // Remove empty and duplicate image URLs.
        return [...new Set(
            images.filter(isValidImageURL)
        )];
    }

    function getHotelFallbackImage(hotel) {
        if (!hotel) return "";

        const fallback = hotel.fallback_image_url || "";

        return isValidImageURL(fallback) ? fallback : "";
    }

    function getImageFallbackList(hotel, currentImage) {
        const images = getHotelImages(hotel);
        const fallback = getHotelFallbackImage(hotel);

        return [
            ...images.filter(url => url !== currentImage),
            fallback
        ].filter((url, index, array) =>
            url && url !== currentImage && array.indexOf(url) === index
        );
    }

    function setHotelImage(image, imageURL, fallbackURLs = []) {
        if (!image) return;

        const fallbacks = Array.isArray(fallbackURLs)
            ? fallbackURLs
            : [fallbackURLs];

        const candidates = [
            imageURL,
            ...fallbacks
        ].filter((url, index, array) =>
            isValidImageURL(url) &&
            array.indexOf(url) === index
        );

        let currentIndex = 0;

        image.onerror = function () {
            currentIndex++;

            if (currentIndex < candidates.length) {
                image.src = candidates[currentIndex];
                return;
            }

            image.onerror = null;
            image.style.background = "#e5e7eb";
            image.alt = "Hotel photograph could not be loaded";
        };

        if (candidates.length > 0) {
            image.style.display = "block";
            image.src = candidates[0];
        } else {
            image.style.background = "#e5e7eb";
            image.alt = "Hotel photograph unavailable";
        }
    }

    function setHotelGalleryImage(image, hotel, imageURL) {
        setHotelImage(
            image,
            imageURL,
            getImageFallbackList(hotel, imageURL)
        );
    }

    // ==========================================
    // 4. ADD WEBSITE STYLES
    // ==========================================

    function addWebsiteStyles() {
        if (document.getElementById("hotelExtraStyles")) return;

        const style = document.createElement("style");
        style.id = "hotelExtraStyles";

        style.textContent = `
            #hotelDetailsModal {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 9999;
                background: rgba(0,0,0,0.75);
                overflow-y: auto;
                padding: 20px;
            }

            #hotelModalContent {
                max-width: 900px;
                margin: 25px auto;
                background: white;
                border-radius: 14px;
                padding: 25px;
                position: relative;
            }

            #closeHotelModal {
                position: absolute;
                right: 15px;
                top: 12px;
                border: none;
                background: #e74c3c;
                color: white;
                border-radius: 50%;
                width: 35px;
                height: 35px;
                font-size: 22px;
                cursor: pointer;
            }

            #modalMainImage {
                width: 100%;
                height: 420px;
                object-fit: cover;
                border-radius: 10px;
                margin: 15px 0;
                background: #eee;
            }

            #modalGallery {
                display: grid;
                grid-template-columns: repeat(auto-fit,minmax(100px,1fr));
                gap: 10px;
                margin: 15px 0;
            }

            #modalGallery img {
                width: 100%;
                height: 85px;
                object-fit: cover;
                border-radius: 7px;
                cursor: pointer;
            }

            #modalGallery img:hover {
                outline: 2px solid #168044;
            }

            #modalFacilities ul {
                display: flex;
                flex-wrap: wrap;
                gap: 9px;
                list-style: none;
                padding: 0;
            }

            #modalFacilities li {
                background: #eaf3ff;
                color: #174b80;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 14px;
            }

            #selectedHotelPreview {
                display: none;
                margin: 20px 0;
                padding: 18px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 12px;
                box-shadow: 0 3px 12px rgba(0,0,0,0.08);
                width: 100%;
            }

            #selectedHotelPreview .preview-main-image {
                width: 100%;
                height: 260px;
                object-fit: cover;
                border-radius: 10px;
                background: #eee;
            }

            #selectedHotelPreview .preview-gallery {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 8px;
                margin: 12px 0;
            }

            #selectedHotelPreview .preview-gallery img {
                width: 100%;
                height: 75px;
                object-fit: cover;
                border-radius: 7px;
                cursor: pointer;
            }

            #selectedHotelPreview .preview-gallery img:hover {
                outline: 2px solid #168044;
            }

            #selectedHotelPreview p {
                margin: 8px 0;
                line-height: 1.6;
            }

            #selectedHotelPreview .preview-price {
                color: #168044;
                font-size: 20px;
                font-weight: bold;
            }

            #selectedHotelPreview .preview-facilities {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
            }

            #selectedHotelPreview .preview-facility {
                background: #eaf3ff;
                color: #174b80;
                padding: 7px 11px;
                border-radius: 20px;
                font-size: 13px;
            }

            .hotel-facility-preview {
                margin: 10px 0;
                color: #555;
                font-size: 13px;
            }

            .hotel-sample-note {
                color: #777;
                font-size: 12px;
                margin-top: 10px;
            }

            #showMoreHotels {
                display: block;
                margin: 25px auto;
            }

            @media(max-width:600px) {
                #hotelDetailsModal {
                    padding: 8px;
                }

                #hotelModalContent {
                    padding: 16px;
                    margin: 10px auto;
                }

                #modalMainImage {
                    height: 250px;
                }

                #selectedHotelPreview .preview-main-image {
                    height: 190px;
                }

                #selectedHotelPreview .preview-gallery img {
                    height: 50px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    addWebsiteStyles();

    // ==========================================
    // 5. CREATE HOTEL DETAILS MODAL
    // ==========================================

    function createHotelModal() {
        if (document.getElementById("hotelDetailsModal")) return;

        const modal = document.createElement("div");
        modal.id = "hotelDetailsModal";

        const content = document.createElement("div");
        content.id = "hotelModalContent";

        const closeButton = document.createElement("button");
        closeButton.id = "closeHotelModal";
        closeButton.textContent = "×";
        closeButton.setAttribute("aria-label", "Close hotel details");

        const title = document.createElement("h2");
        title.id = "modalHotelName";

        const destination = document.createElement("p");
        destination.id = "modalDestination";

        const mainImage = document.createElement("img");
        mainImage.id = "modalMainImage";
        mainImage.alt = "Hotel photograph";

        const gallery = document.createElement("div");
        gallery.id = "modalGallery";

        const description = document.createElement("p");
        description.id = "modalDescription";

        const price = document.createElement("h3");
        price.id = "modalPrice";

        const facilitiesHeading = document.createElement("h3");
        facilitiesHeading.textContent = "Hotel Facilities";

        const facilities = document.createElement("div");
        facilities.id = "modalFacilities";

        const note = document.createElement("p");
        note.className = "hotel-sample-note";
        note.textContent =
            "Sample catalogue listing. Details and photographs are illustrative.";

        const bookButton = document.createElement("button");
        bookButton.id = "modalBookButton";
        bookButton.className = "btn";
        bookButton.textContent = "Book This Hotel";

        content.append(
            closeButton,
            title,
            destination,
            mainImage,
            gallery,
            description,
            price,
            facilitiesHeading,
            facilities,
            note,
            bookButton
        );

        modal.appendChild(content);
        document.body.appendChild(modal);

        closeButton.addEventListener("click", closeHotelModal);

        modal.addEventListener("click", event => {
            if (event.target === modal) closeHotelModal();
        });

        bookButton.addEventListener("click", async () => {
            const hotel = modal.currentHotel;

            if (hotel) {
                closeHotelModal();
                await selectHotelForBooking(hotel);
            }
        });
    }

    createHotelModal();

    function closeHotelModal() {
        const modal = document.getElementById("hotelDetailsModal");

        if (modal) modal.style.display = "none";
    }

    // ==========================================
    // 6. CREATE HOTEL SELECTION PREVIEW
    // ==========================================

    function createHotelSelectionPreview() {
        if (!hotelSelect) return;
        if (document.getElementById("selectedHotelPreview")) return;

        const preview = document.createElement("div");
        preview.id = "selectedHotelPreview";

        const heading = document.createElement("h3");
        heading.textContent = "Selected Hotel Information";

        const mainImage = document.createElement("img");
        mainImage.id = "previewHotelMainImage";
        mainImage.className = "preview-main-image";
        mainImage.alt = "Selected hotel photograph";

        const gallery = document.createElement("div");
        gallery.id = "previewHotelGallery";
        gallery.className = "preview-gallery";

        const name = document.createElement("h3");
        name.id = "previewHotelName";

        const destination = document.createElement("p");
        destination.id = "previewHotelDestination";

        const description = document.createElement("p");
        description.id = "previewHotelDescription";

        const price = document.createElement("p");
        price.id = "previewHotelPrice";
        price.className = "preview-price";

        const facilitiesHeading = document.createElement("h4");
        facilitiesHeading.textContent = "Hotel Facilities";

        const facilities = document.createElement("div");
        facilities.id = "previewHotelFacilities";
        facilities.className = "preview-facilities";

        const note = document.createElement("p");
        note.className = "hotel-sample-note";
        note.textContent =
            "Illustrative sample hotel information and photographs.";

        preview.append(
            heading,
            mainImage,
            gallery,
            name,
            destination,
            description,
            price,
            facilitiesHeading,
            facilities,
            note
        );

        hotelSelect.insertAdjacentElement("afterend", preview);
    }

    // ==========================================
    // 7. SHOW SELECTED HOTEL PREVIEW
    // ==========================================

    function showSelectedHotelPreview(hotel) {
        const preview = document.getElementById("selectedHotelPreview");

        if (!preview) return;

        if (!hotel) {
            preview.style.display = "none";
            return;
        }

        const images = getHotelImages(hotel);

        const mainImage =
            document.getElementById("previewHotelMainImage");

        setHotelGalleryImage(mainImage, hotel, images[0]);

        document.getElementById("previewHotelName").textContent =
            getHotelName(hotel);

        document.getElementById("previewHotelDestination").textContent =
            "Destination: " + getHotelDestination(hotel);

        document.getElementById("previewHotelDescription").textContent =
            getHotelDescription(hotel);

        document.getElementById("previewHotelPrice").textContent =
            `₹${formatPrice(getHotelPrice(hotel))} per night`;

        const gallery =
            document.getElementById("previewHotelGallery");

        gallery.replaceChildren();

        images.forEach((imageURL, index) => {
            const thumbnail = document.createElement("img");

            thumbnail.alt = `Hotel photograph ${index + 1}`;
            thumbnail.loading = "lazy";

            setHotelGalleryImage(thumbnail, hotel, imageURL);

            thumbnail.addEventListener("click", () => {
                setHotelGalleryImage(mainImage, hotel, imageURL);
            });

            gallery.appendChild(thumbnail);
        });

        const facilitiesContainer =
            document.getElementById("previewHotelFacilities");

        facilitiesContainer.replaceChildren();

        const facilities = getHotelFacilities(hotel);

        if (facilities.length) {
            facilities.forEach(facility => {
                const item = document.createElement("span");
                item.className = "preview-facility";
                item.textContent = facility;
                facilitiesContainer.appendChild(item);
            });
        } else {
            facilitiesContainer.textContent =
                "Facilities information unavailable";
        }

        preview.style.display = "block";
    }

    // ==========================================
    // 8. LOAD DESTINATIONS
    // ==========================================

    async function loadDestinations() {
        if (!destinationSelect) return;

        try {
            const data = await fetchJSON("/api/destinations");
            const destinations = getDestinationNames(data);

            destinationSelect.innerHTML =
                '<option value="">Select Destination</option>';

            destinations.forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                destinationSelect.appendChild(option);
            });

            console.log(destinations.length, "destinations loaded.");

        } catch (error) {
            console.error("Destination loading error:", error);

            destinationSelect.innerHTML =
                '<option value="">Unable to load destinations</option>';
        }
    }

    // ==========================================
    // 9. LOAD HOTELS FOR SELECTED DESTINATION
    // ==========================================

    async function loadHotels(destination) {
        if (!hotelSelect) return [];

        hotelSelect.innerHTML =
            '<option value="">Loading hotels...</option>';

        hotelSelect.disabled = true;

        selectedHotelPrice = 0;
        currentDestinationHotels = [];

        showSelectedHotelPreview(null);
        setDisplayedPrices("₹0", "₹0");

        if (!destination) {
            hotelSelect.innerHTML =
                '<option value="">Select destination first</option>';

            updatePrice();
            return [];
        }

        try {
            const url =
                `/api/hotels?destination=${encodeURIComponent(destination)}` +
                `&limit=${MAX_HOTELS_PER_DESTINATION}`;

            const data = await fetchJSON(url);
            const hotels = getHotelArray(data);

            currentDestinationHotels = hotels;

            hotelSelect.innerHTML =
                '<option value="">Select Hotel</option>';

            hotels.forEach(hotel => {
                const option = document.createElement("option");

                const name = getHotelName(hotel);
                const price = getHotelPrice(hotel);

                option.value = name;

                option.textContent = price > 0
                    ? `${name} - ₹${formatPrice(price)} / night`
                    : `${name} - Price unavailable`;

                option.dataset.price = String(price);

                hotelSelect.appendChild(option);
            });

            hotelSelect.disabled = hotels.length === 0;

            if (hotelCount) {
                hotelCount.textContent =
                    `${hotels.length} hotels available in ${destination}`;
            }

            if (hotels.length === 0) {
                hotelSelect.innerHTML =
                    '<option value="">No hotels available</option>';
            }

            updatePrice();
            return hotels;

        } catch (error) {
            console.error("Hotel loading error:", error);

            currentDestinationHotels = [];

            hotelSelect.innerHTML =
                '<option value="">Unable to load hotels</option>';

            if (hotelCount) {
                hotelCount.textContent = "Unable to load hotels.";
            }

            updatePrice();
            return [];
        }
    }

    // ==========================================
    // 10. HOTEL PRICE AND TOTAL CALCULATION
    // ==========================================

    function updatePrice() {
        if (!hotelSelect) return;

        const selectedOption =
            hotelSelect.options[hotelSelect.selectedIndex];

        if (!selectedOption || !selectedOption.value) {
            selectedHotelPrice = 0;
            setDisplayedPrices("₹0", "₹0");

            if (displayNights) {
                displayNights.textContent = nightsInput?.value || "1";
            }

            return;
        }

        const selectedHotel = currentDestinationHotels.find(
            hotel => getHotelName(hotel) === hotelSelect.value
        );

        const optionPrice = Number(selectedOption.dataset.price);

        selectedHotelPrice =
            Number.isFinite(optionPrice) && optionPrice > 0
                ? optionPrice
                : getHotelPrice(selectedHotel);

        if (selectedHotelPrice <= 0) {
            setDisplayedPrices("Price unavailable", "₹0");
            return;
        }

        let nights = Number(nightsInput?.value);

        if (!Number.isInteger(nights) || nights < 1) {
            nights = 1;
        }

        nights = Math.min(nights, 365);

        const totalAmount = selectedHotelPrice * nights;

        setDisplayedPrices(
            `₹${formatPrice(selectedHotelPrice)}`,
            `₹${formatPrice(totalAmount)}`
        );

        if (displayNights) {
            displayNights.textContent = String(nights);
        }
    }

    // ==========================================
    // 11. SHOW HOTEL DETAILS MODAL
    // ==========================================

    function showHotelDetails(hotel) {
        const modal = document.getElementById("hotelDetailsModal");

        if (!modal) return;

        modal.currentHotel = hotel;

        document.getElementById("modalHotelName").textContent =
            getHotelName(hotel);

        document.getElementById("modalDestination").textContent =
            getHotelDestination(hotel);

        document.getElementById("modalDescription").textContent =
            getHotelDescription(hotel);

        document.getElementById("modalPrice").textContent =
            `₹${formatPrice(getHotelPrice(hotel))} per night`;

        const images = getHotelImages(hotel);

        const mainImage =
            document.getElementById("modalMainImage");

        setHotelGalleryImage(mainImage, hotel, images[0]);

        const gallery = document.getElementById("modalGallery");
        gallery.replaceChildren();

        images.forEach((imageURL, index) => {
            const thumbnail = document.createElement("img");

            thumbnail.alt = `Hotel gallery image ${index + 1}`;
            thumbnail.loading = "lazy";

            setHotelGalleryImage(thumbnail, hotel, imageURL);

            thumbnail.addEventListener("click", () => {
                setHotelGalleryImage(mainImage, hotel, imageURL);
            });

            gallery.appendChild(thumbnail);
        });

        const facilitiesContainer =
            document.getElementById("modalFacilities");

        facilitiesContainer.replaceChildren();

        const facilityList = document.createElement("ul");
        const facilities = getHotelFacilities(hotel);

        if (facilities.length > 0) {
            facilities.forEach(facility => {
                const item = document.createElement("li");
                item.textContent = facility;
                facilityList.appendChild(item);
            });
        } else {
            const item = document.createElement("li");
            item.textContent = "Facilities not provided";
            facilityList.appendChild(item);
        }

        facilitiesContainer.appendChild(facilityList);
        modal.style.display = "block";
    }

    // ==========================================
    // 12. SELECT HOTEL FOR BOOKING
    // ==========================================

    async function selectHotelForBooking(hotel) {
        if (!destinationSelect || !hotelSelect) return;

        const destination = getHotelDestination(hotel);

        destinationSelect.value = destination;

        const hotels = await loadHotels(destination);

        const matchingHotel = hotels.find(item =>
            getHotelName(item) === getHotelName(hotel)
        );

        if (!matchingHotel) {
            alert("This hotel could not be selected. Please try again.");
            return;
        }

        hotelSelect.value = getHotelName(matchingHotel);

        updatePrice();
        showSelectedHotelPreview(matchingHotel);

        document.getElementById("booking")?.scrollIntoView({
            behavior: "smooth"
        });
    }

    // ==========================================
    // 13. CREATE HOTEL CARD
    // ==========================================

    function createHotelCard(hotel) {
        const card = document.createElement("div");
        card.className = "hotel-card";

        const image = document.createElement("img");

        image.alt = `${getHotelName(hotel)} hotel photograph`;
        image.loading = "lazy";

        const hotelImages = getHotelImages(hotel);

        setHotelGalleryImage(image, hotel, hotelImages[0]);

        const name = document.createElement("h3");
        name.textContent = getHotelName(hotel);

        const location = document.createElement("p");
        location.textContent = getHotelDestination(hotel);

        const price = document.createElement("h4");
        price.textContent =
            `₹${formatPrice(getHotelPrice(hotel))} / night`;

        const facilities = document.createElement("p");
        facilities.className = "hotel-facility-preview";

        const facilityList = getHotelFacilities(hotel);

        facilities.textContent = facilityList.length
            ? facilityList.slice(0, 3).join(" • ")
            : "Facilities not provided";

        const detailsButton = document.createElement("button");
        detailsButton.className = "btn";
        detailsButton.textContent = "View Details";

        detailsButton.addEventListener("click", () => {
            showHotelDetails(hotel);
        });

        const bookButton = document.createElement("button");
        bookButton.className = "btn";
        bookButton.textContent = "Book Now";

        bookButton.addEventListener("click", async () => {
            await selectHotelForBooking(hotel);
        });

        card.append(
            image,
            name,
            location,
            price,
            facilities,
            detailsButton,
            bookButton
        );

        return card;
    }

    // ==========================================
    // 14. DISPLAY HOTEL CARDS
    // ==========================================

    function displayPopularHotels() {
        if (!popularHotelsContainer) return;

        popularHotelsContainer.replaceChildren();

        const hotelsToShow =
            allPopularHotels.slice(0, visibleHotelCount);

        hotelsToShow.forEach(hotel => {
            popularHotelsContainer.appendChild(
                createHotelCard(hotel)
            );
        });

        if (hotelCount) {
            hotelCount.textContent =
                `${allPopularHotels.length} sample hotels loaded`;
        }

        document.getElementById("showMoreHotels")?.remove();

        if (visibleHotelCount < allPopularHotels.length) {
            const moreButton = document.createElement("button");

            moreButton.id = "showMoreHotels";
            moreButton.className = "btn";
            moreButton.textContent = "Show More Hotels";

            moreButton.addEventListener("click", () => {
                visibleHotelCount += CARDS_PER_PAGE;
                displayPopularHotels();
            });

            popularHotelsContainer.after(moreButton);
        }
    }

    // ==========================================
    // 15. LOAD POPULAR HOTELS
    // ==========================================

    async function loadPopularHotels() {
        if (!popularHotelsContainer) return;

        popularHotelsContainer.textContent = "Loading hotels...";

        try {
            const destinationData =
                await fetchJSON("/api/destinations");

            const destinationNames =
                getDestinationNames(destinationData);

            allPopularHotels = [];

            for (let i = 0; i < destinationNames.length; i += 10) {
                const group = destinationNames.slice(i, i + 10);

                const results = await Promise.all(
                    group.map(async destination => {
                        try {
                            const url =
                                `/api/hotels?destination=${encodeURIComponent(destination)}` +
                                `&limit=${HOTELS_PER_DESTINATION}`;

                            const data = await fetchJSON(url);

                            return getHotelArray(data);

                        } catch (error) {
                            console.error(
                                `Unable to load hotels for ${destination}:`,
                                error
                            );

                            return [];
                        }
                    })
                );

                results.forEach(hotels => {
                    allPopularHotels.push(...hotels);
                });
            }

            visibleHotelCount = CARDS_PER_PAGE;
            displayPopularHotels();

            console.log(
                `${allPopularHotels.length} sample hotels loaded successfully.`
            );

        } catch (error) {
            console.error("Popular hotel loading error:", error);

            popularHotelsContainer.textContent =
                "Unable to load hotels. Please check the server.";

            if (hotelCount) {
                hotelCount.textContent = "Hotel loading failed.";
            }
        }
    }

    // ==========================================
    // 16. DESTINATION CHANGE
    // ==========================================

    if (destinationSelect) {
        destinationSelect.addEventListener("change", async () => {
            await loadHotels(destinationSelect.value);
            updatePrice();
        });
    }

    // ==========================================
    // 17. HOTEL CHANGE
    // ==========================================

    if (hotelSelect) {
        hotelSelect.addEventListener("change", () => {
            updatePrice();

            const selectedHotel = currentDestinationHotels.find(
                hotel => getHotelName(hotel) === hotelSelect.value
            );

            showSelectedHotelPreview(selectedHotel || null);
        });
    }

    // ==========================================
    // 18. NUMBER OF NIGHTS CHANGE
    // ==========================================

    if (nightsInput) {
        nightsInput.addEventListener("input", updatePrice);
        nightsInput.addEventListener("change", updatePrice);
    }

    // ==========================================
    // 19. BOOKING FORM SUBMISSION
    // ==========================================

    if (bookingForm) {
        bookingForm.addEventListener("submit", async event => {
            event.preventDefault();

            updatePrice();

            if (!hotelSelect?.value || selectedHotelPrice <= 0) {
                if (bookingMessage) {
                    bookingMessage.textContent =
                        "Please select a hotel with a valid price.";

                    bookingMessage.style.color = "red";
                }

                return;
            }

            const nights = Number(nightsInput?.value);

            if (
                !Number.isInteger(nights) ||
                nights < 1 ||
                nights > 365
            ) {
                if (bookingMessage) {
                    bookingMessage.textContent =
                        "Please enter between 1 and 365 nights.";

                    bookingMessage.style.color = "red";
                }

                return;
            }

            if (bookingButton) {
                bookingButton.disabled = true;
                bookingButton.textContent = "Processing...";
            }

            if (bookingMessage) {
                bookingMessage.textContent = "";
            }

            try {
                const formData = new FormData(bookingForm);

                const bookingData = {
                    name: formData.get("name"),
                    email: formData.get("email"),
                    destination: formData.get("destination"),
                    hotel_name: formData.get("hotel_name"),
                    nights: nights,
                    message: formData.get("message") || ""
                };

                const result = await fetchJSON(
                    "/api/bookings",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(bookingData)
                    }
                );

                if (bookingMessage) {
                    bookingMessage.textContent =
                        result.message ||
                        "Booking submitted successfully!";

                    bookingMessage.style.color = "green";
                }

                bookingForm.reset();

                if (hotelSelect) {
                    hotelSelect.innerHTML =
                        '<option value="">Select destination first</option>';

                    hotelSelect.disabled = true;
                }

                selectedHotelPrice = 0;
                currentDestinationHotels = [];

                showSelectedHotelPreview(null);
                setDisplayedPrices("₹0", "₹0");

                if (displayNights) {
                    displayNights.textContent = "1";
                }

            } catch (error) {
                console.error("Booking error:", error);

                if (bookingMessage) {
                    bookingMessage.textContent =
                        error.message || "Booking failed. Please try again.";

                    bookingMessage.style.color = "red";
                }

            } finally {
                if (bookingButton) {
                    bookingButton.disabled = false;
                    bookingButton.textContent = "Book Now";
                }
            }
        });
    }

    // ==========================================
    // 20. INITIALIZE WEBSITE
    // ==========================================

    createHotelSelectionPreview();

    if (hotelSelect) {
        hotelSelect.disabled = true;
    }

    setDisplayedPrices("₹0", "₹0");

    if (displayNights) {
        displayNights.textContent = nightsInput?.value || "1";
    }

    await loadDestinations();
    await loadPopularHotels();

});
