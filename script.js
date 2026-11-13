
const form = document.getElementById("visitForm");
const locationBtn = document.getElementById("locationBtn");
const locationStatus = document.getElementById("locationStatus");
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

// Capture GPS location
locationBtn.addEventListener("click", function () {

    if (!navigator.geolocation) {
        locationStatus.textContent =
            "GPS is not supported by this browser.";
        return;
    }

    locationBtn.disabled = true;
    locationStatus.textContent = "Capturing location...";

    navigator.geolocation.getCurrentPosition(

        function (position) {

            latitudeInput.value = position.coords.latitude;
            longitudeInput.value = position.coords.longitude;

            locationStatus.textContent =
                "Location captured successfully.";

            locationBtn.disabled = false;
        },

        function (error) {

            locationBtn.disabled = false;

            locationStatus.textContent =
                "Unable to capture location. Please allow location access.";

            console.error(error);
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
});

// Submit visit form
form.addEventListener("submit", function (event) {

    event.preventDefault();

    if (!latitudeInput.value || !longitudeInput.value) {
        statusMessage.textContent =
            "Please capture your GPS location before submitting.";
        statusMessage.style.color = "#c0392b";
        return;
    }

    const visitData = {
        EmployeeCode: document.getElementById("empCode").value.trim(),
        EmployeeName: document.getElementById("empName").value.trim(),
        CustomerName: document.getElementById("customerName").value.trim(),
        VisitPurpose: document.getElementById("purpose").value.trim(),
        Latitude: latitudeInput.value,
        Longitude: longitudeInput.value,
        VisitTime: new Date().toISOString()
    };

    console.log("Visit Details:", visitData);

    statusMessage.textContent =
        "Form validated successfully. Storage connection is pending.";

    statusMessage.style.color = "#1769aa";

    console.log("Ready to connect to Google Sheets or Excel.");
});

