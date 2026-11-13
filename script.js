
const form = document.getElementById("visitForm");
const locationBtn = document.getElementById("locationBtn");
const locationStatus = document.getElementById("locationStatus");
const locationAddress = document.getElementById("locationAddress");
const locationAddressInput = document.getElementById("locationAddressInput");
const statusMessage = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");
const visitTimeInput = document.getElementById("visitTime");

// Display current date and time
function updateVisitTime() {
    visitTimeInput.value = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "medium"
    });
}

updateVisitTime();

// Capture GPS location and retrieve readable address
locationBtn.addEventListener("click", function () {

    if (!navigator.geolocation) {
        locationStatus.textContent =
            "GPS is not supported by this browser.";
        return;
    }

    locationBtn.disabled = true;
    locationStatus.textContent = "Capturing GPS location...";
    locationAddress.textContent = "Finding your address...";

    // Clear any previously captured location
    latitudeInput.value = "";
    longitudeInput.value = "";
    locationAddressInput.value = "";

    navigator.geolocation.getCurrentPosition(

        async function (position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            latitudeInput.value = latitude;
            longitudeInput.value = longitude;

            locationStatus.textContent =
                "GPS location captured successfully.";

            try {

                // Ask our backend to convert GPS coordinates into an address
                const response = await fetch(
                    `/api/reverse-geocode?lat=${latitude}&lon=${longitude}`
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message || "Address lookup failed."
                    );
                }

                locationAddress.textContent = result.address;
                locationAddressInput.value = result.address;

            } catch (error) {

                console.error("Address lookup error:", error);

                locationAddress.textContent =
                    "GPS captured, but address could not be retrieved.";

                locationAddressInput.value = "";

            } finally {

                locationBtn.disabled = false;
            }
        },

        function (error) {

            locationBtn.disabled = false;

            locationStatus.textContent =
                "Unable to capture location. Please allow location access.";

            locationAddress.textContent = "Address not available.";

            console.error("GPS Error:", error);
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
});

// Submit visit details to Node.js backend
form.addEventListener("submit", async function (event) {

    event.preventDefault();

    if (!latitudeInput.value || !longitudeInput.value) {
        statusMessage.textContent =
            "Please capture your GPS location before submitting.";
        statusMessage.style.color = "#c0392b";
        return;
    }

    // Do not submit until the address lookup has finished
    if (locationBtn.disabled) {
        statusMessage.textContent =
            "Please wait while your location address is being retrieved.";
        statusMessage.style.color = "#c0392b";
        return;
    }

    const visitData = {
        empCode: document.getElementById("empCode").value.trim(),
        empName: document.getElementById("empName").value.trim(),
        customerName: document.getElementById("customerName").value.trim(),
        purpose: document.getElementById("purpose").value.trim(),
        latitude: latitudeInput.value,
        longitude: longitudeInput.value,
        locationAddress: locationAddressInput.value,
        visitTime: new Date().toISOString()
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    statusMessage.textContent = "Saving visit details...";
    statusMessage.style.color = "#1769aa";

    try {

        const response = await fetch("/api/visits", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(visitData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Submission failed.");
        }

        statusMessage.textContent =
            "Visit saved successfully! Visit ID: " + result.visitId;

        statusMessage.style.color = "green";

        form.reset();

        latitudeInput.value = "";
        longitudeInput.value = "";
        locationAddressInput.value = "";

        locationStatus.textContent = "Location not captured";
        locationAddress.textContent =
            "Area and address will appear here.";

        updateVisitTime();

    } catch (error) {

        console.error("Submission Error:", error);

        statusMessage.textContent =
            error.message || "Unable to save visit details.";

        statusMessage.style.color = "#c0392b";

    } finally {

        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Visit";
    }
});
