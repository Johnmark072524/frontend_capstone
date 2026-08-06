// ==========================================
// 🚀 GLOBAL SECURITY BOUNCER (RUNS IMMEDIATELY)
// ==========================================
(function enforceSecurity() {
  const currentPath = window.location.pathname.toLowerCase();

  // Check if the user has active session data
  const storedRole = sessionStorage.getItem("userRole");
  const storedUserId = sessionStorage.getItem("userId");

  const isLoggedIn = storedRole && storedUserId;

  // RULE 1: If NOT logged in, but trying to access ANY dashboard -> Kick to Login
  if (!isLoggedIn && currentPath.includes("dashboard")) {
    window.location.replace("login.html");
    return;
  }

  // RULE 2: If LOGGED IN, but trying to go back to the Login page -> Kick to Dashboard
  if (isLoggedIn && currentPath.includes("login.html")) {
    const userRole = String(storedRole).toLowerCase();

    if (userRole.includes("admin") || userRole.includes("cpdo")) {
      window.location.replace("admin_dashboard.html");
    } else if (userRole.includes("ceo") || userRole.includes("engineer")) {
      window.location.replace("ceo_dashboard.html");
    } else {
      window.location.replace("barangay_dashboard.html");
    }
  }
})();

// A reusable function for all your API calls
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...API_HEADERS, // Automatically adds your ngrok fix from config.js
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed with status: ${response.status}`);
  }

  return response.json();
}

// ==========================================
// 🚀 SECURE IMAGE FETCHER (BULLETPROOF VERSION)
// ==========================================
window.loadSecureImage = function(imgElementId, imageName) {
  const imgEl = document.getElementById(imgElementId);
  if (!imgEl) return;

  // 🛡️ THE FIX: Catch empty, "no_image.jpg", AND literal strings of "undefined" or "null"
  if (!imageName ||
    imageName === 'no_image.jpg' ||
    String(imageName).trim().toLowerCase() === 'undefined' ||
    String(imageName).trim().toLowerCase() === 'null') {

    imgEl.src = "https://placehold.co/500x300/png?text=No+Photo+Provided";
    imgEl.style.display = 'block';
    return; // Stop here, do not fetch!
  }

  const url = String(imageName).startsWith("http") ? imageName : `${API_BASE_URL}/uploads/${imageName}`;

  // Force the download securely behind the scenes
  fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    .then(res => {
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      imgEl.src = URL.createObjectURL(blob);
      imgEl.style.display = 'block';
    })
    .catch(err => {
      console.error("Failed to load secure image:", err);
      imgEl.src = "https://placehold.co/500x300/png?text=Image+Error";
      imgEl.style.display = 'block';
    });
};

// ==========================================
// 🔍 GLOBAL FULLSCREEN IMAGE LIGHTBOX
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Automatically inject the Lightbox HTML into every dashboard
  if (!document.getElementById("fullscreen-image-modal")) {
    const modalHtml = `
        <div id="fullscreen-image-modal">
            <span class="close-fullscreen-btn" onclick="closeFullscreenImage()">&times;</span>
            <img id="fullscreen-modal-img" src="" alt="Full Size">
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
});

// Function to open the big picture
function openFullscreenImage(imgElement) {
  const imgSrc = imgElement.src;

  // Don't open if it's still the loading placeholder text
  if (imgSrc.includes('placehold.co') || !imgSrc) return;

  const modal = document.getElementById("fullscreen-image-modal");
  const modalImg = document.getElementById("fullscreen-modal-img");

  modalImg.src = imgSrc;
  modal.style.display = "flex"; // Shows the modal
}

// Function to close the big picture
function closeFullscreenImage() {
  const modal = document.getElementById("fullscreen-image-modal");
  modal.style.display = "none";
}

// ==========================================
// GLOBAL MAP VARIABLES (Must remain empty at first!)
// ==========================================
let map;
let mapMarker;
let selectedLat = 14.8139; // Default center of San Jose del Monte
let selectedLng = 121.0453; // Default center of San Jose del Monte
let redIcon; // Just declare it, don't build it yet!

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 🚀 CEO DASHBOARD: THE "ADMIN MAGIC" WATCHDOG
  // ==========================================
  // 1. Initial Load Check (Using the layout ID instead of table IDs)
  if (document.getElementById('view-dashboard')) {
    if (typeof loadCEODashboardData === 'function') {
      loadCEODashboardData();
    }
  }

  // 2. The Watchdog for the Main CEO Dashboard Tab
  const ceoDashboardSection = document.getElementById('view-dashboard');
  if (ceoDashboardSection) {
    const observer1 = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && !ceoDashboardSection.classList.contains('hidden')) {
          if (typeof loadCEODashboardData === 'function') loadCEODashboardData();
        }
      });
    });
    observer1.observe(ceoDashboardSection, { attributes: true });
  }

  // 3. The Watchdog for the Repair Projects Tab
  const ceoRepairSection = document.getElementById('view-repair');
  if (ceoRepairSection) {
    const observer2 = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && !ceoRepairSection.classList.contains('hidden')) {
          if (typeof loadCEODashboardData === 'function') loadCEODashboardData();
        }
      });
    });
    observer2.observe(ceoRepairSection, { attributes: true });
  }

  // ==========================================
  // 🚀 ADMIN DASHBOARD: REPAIR TRACKING WATCHDOG
  // ==========================================
  const trackingSection = document.getElementById('view-tracking');
  if (trackingSection) {
    const trackingObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && !trackingSection.classList.contains('hidden')) {
          if (typeof loadTrackingData === 'function') loadTrackingData();
        }
      });
    });
    trackingObserver.observe(trackingSection, { attributes: true });
  }

  // ==========================================
  // 🛡️ THE LEAFLET SAFETY CHECK 🛡️
  // ==========================================
  if (typeof L !== 'undefined') {

    // ⬇️ 1. SAFE TO DEFINE THE RED ICON HERE ⬇️
    redIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const mapModal = document.getElementById('map-modal');
    const btnCloseMap = document.getElementById('close-map-btn');

    // ------------------------------------------
    // A. "DEFINE ON MAP" FOR ADD REPORT FORM
    // ------------------------------------------
    const btnDefineMap = document.getElementById('btn-define-map');

    if (btnDefineMap && mapModal) {
      btnDefineMap.addEventListener('click', () => {

        // 🧹 1. RESET THE MAP STATE FOR NEW REPORTS 🧹
        selectedLat = 14.8139; // Default San Jose del Monte Lat
        selectedLng = 121.0453; // Default San Jose del Monte Lng

        // If the map is already loaded, sweep off the old Edit marker and reset the camera!
        if (map) {
          map.setView([selectedLat, selectedLng], 14);
          if (mapMarker) {
            map.removeLayer(mapMarker);
            mapMarker = null; // Completely clear the old memory
          }
        }

        // Open the modal
        mapModal.classList.remove('hidden');

        // Load the map if it hasn't been loaded yet
        if (!map) {
          map = L.map('roadwiseMap').setView([selectedLat, selectedLng], 14);
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(map);

          // ==========================================
          // 🔍 THE NEW GEOCODER (SEARCH BAR)
          // ==========================================
          L.Control.geocoder({
            defaultMarkGeocode: false,
            geocoder: L.Control.Geocoder.nominatim({
              geocodingQueryParams: {
                countrycodes: 'ph',
                viewbox: "120.95,14.90,121.15,14.75",
                bounded: 1
              }
            })
          })
            .on('markgeocode', function(e) {

              // 🚀 THE FIX: Force a close-up street-level zoom (Level 17)
              // Instead of fitting the whole boundary, we dive straight into the center!
              const targetLatLng = e.geocode.center;
              map.setView(targetLatLng, 17);

              // Note: The user must still click the road to drop the red pin.
              showToast("Camera moved! Click the exact road to drop the pin.", "success");
            })
            .addTo(map);
          // ==========================================

          map.on('click', function(e) {
            selectedLat = e.latlng.lat;
            selectedLng = e.latlng.lng;
            if (mapMarker) map.removeLayer(mapMarker);
            mapMarker = L.marker([selectedLat, selectedLng], {icon: redIcon}).addTo(map);
          });
        }

        // 🛡️ 2. PREVENT EDIT MODAL CROSS-TALK 🛡️
        // Grab the button freshly from the DOM every time to avoid detachment bugs
        const liveSaveBtn = document.getElementById('btn-save-coords');
        const newSaveBtn = liveSaveBtn.cloneNode(true);
        liveSaveBtn.parentNode.replaceChild(newSaveBtn, liveSaveBtn);

        newSaveBtn.addEventListener('click', () => {
          if(!mapMarker) {
            alert("Please click on the map to drop a pin first!");
            return;
          }
          // Save specifically to the ADD form's hidden inputs
          document.getElementById('latitude').value = selectedLat;
          document.getElementById('longitude').value = selectedLng;

          document.getElementById('coords-display').textContent = `Locked: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;

          mapModal.classList.add('hidden');
          showToast("Location locked successfully!", "success");
        });

        setTimeout(() => { map.invalidateSize(); }, 200);
      });

      // Close buttons logic
      if (btnCloseMap) {
        btnCloseMap.addEventListener('click', () => mapModal.classList.add('hidden'));
      }
    }

    // ------------------------------------------
    // B. "UPDATE LOCATION" FOR EDIT MODAL
    // ------------------------------------------
    const btnEditDefineMap = document.getElementById('btn-edit-define-map');

    if (btnEditDefineMap && mapModal) {
      btnEditDefineMap.addEventListener('click', () => {

        const currentLat = parseFloat(document.getElementById('edit-latitude').value);
        const currentLng = parseFloat(document.getElementById('edit-longitude').value);

        // Open the modal
        mapModal.classList.remove('hidden');

        // Load the map if it hasn't been loaded yet
        if (!map) {
          map = L.map('roadwiseMap').setView([14.8139, 121.0453], 14);
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(map);

          map.on('click', function(e) {
            selectedLat = e.latlng.lat;
            selectedLng = e.latlng.lng;
            if (mapMarker) map.removeLayer(mapMarker);
            mapMarker = L.marker([selectedLat, selectedLng], {icon: redIcon}).addTo(map);
          });
        }

        // If they already have coordinates saved, put the pin there and zoom in!
        if (!isNaN(currentLat) && !isNaN(currentLng)) {
          selectedLat = currentLat;
          selectedLng = currentLng;
          map.setView([selectedLat, selectedLng], 18);

          if (mapMarker) map.removeLayer(mapMarker);
          mapMarker = L.marker([selectedLat, selectedLng], {icon: redIcon}).addTo(map);
        } else {
          // Failsafe: if they are editing a report that never had a map pin
          map.setView([14.8139, 121.0453], 14);
          if (mapMarker) { map.removeLayer(mapMarker); mapMarker = null; }
        }

        // 🛡️ PREVENT ADD MODAL CROSS-TALK 🛡️
        const liveSaveBtn = document.getElementById('btn-save-coords');
        const newSaveBtn = liveSaveBtn.cloneNode(true);
        liveSaveBtn.parentNode.replaceChild(newSaveBtn, liveSaveBtn);

        newSaveBtn.addEventListener('click', () => {
          if(!mapMarker) {
            alert("Please click on the map to drop a pin first!");
            return;
          }
          // Save specifically to the EDIT modal's hidden inputs
          document.getElementById('edit-latitude').value = selectedLat;
          document.getElementById('edit-longitude').value = selectedLng;
          document.getElementById('edit-modal-gps').textContent = `${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;

          mapModal.classList.add('hidden');
          showToast("Location updated successfully!", "success");
        });

        setTimeout(() => { map.invalidateSize(); }, 200);
      });
    }

  } // <--- END OF THE SAFETY CHECK!


  // ==========================================
  // IMAGE UPLOAD & PREVIEW LOGIC
  // ==========================================
  const imageInput = document.getElementById('damageImageFile');
  const imagePreview = document.getElementById('imagePreview');
  const fileNameDisplay = document.getElementById('fileNameDisplay');

  if (imageInput) {
    imageInput.addEventListener('change', function() {
      const file = this.files[0];

      if (file) {
        // --- NEW: FILE SIZE SECURITY CHECK ---
        const maxSizeInMB = 5;
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

        if (file.size > maxSizeInBytes) {
          // Reject the file and warn the user
          showToast(`File is too large! Please choose an image smaller than ${maxSizeInMB}MB.`, "error");

          // Reset the hidden input and preview
          this.value = "";
          imagePreview.style.display = 'none';
          imagePreview.src = "";
          fileNameDisplay.textContent = "";
          return; // Stop running the rest of the code
        }
        // -------------------------------------

        fileNameDisplay.textContent = file.name;

        const reader = new FileReader();
        reader.onload = function(e) {
          imagePreview.src = e.target.result;
          imagePreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
      } else {
        imagePreview.style.display = 'none';
        imagePreview.src = "";
        fileNameDisplay.textContent = "";
      }
    });
  }

  // ==========================================
// 1. SIDEBAR NAVIGATION & SPA HISTORY LOGIC
// ==========================================
// ⚠️ Kept global so the rest of app.js (like Profile Logic) doesn't crash!
  const navLinks = document.querySelectorAll('.nav-menu li[data-target]');
  const contentSections = document.querySelectorAll('.content-section');

// 🛠 Helper Function to switch views safely
  function switchView(targetId) {
    if (!targetId) return;

    // 1. Update UI Classes
    navLinks.forEach(nav => nav.classList.remove('active'));
    contentSections.forEach(section => section.classList.add('hidden'));

    const activeLink = document.querySelector(`.nav-menu li[data-target="${targetId}"]`);
    if (activeLink) activeLink.classList.add('active');

    const targetSection = document.getElementById(targetId);
    if (targetSection) targetSection.classList.remove('hidden');

    // 2. 🚀 SMART DATA LOADING: Only fetch if we are on the CEO page
    const isCEODashboard = window.location.pathname.toLowerCase().includes("ceo");
    if (isCEODashboard && (targetId === 'view-dashboard' || targetId === 'view-repair')) {
      if (typeof window.loadCEODashboardData === 'function') {
        window.loadCEODashboardData();
      }
    }
  }

// 👆 Handle Sidebar Clicks
  navLinks.forEach(link => {
    link.addEventListener('click', function(event) {
      event.preventDefault();
      const targetId = this.getAttribute('data-target');

      // 📝 THE HISTORY TRICK: Write it down in the browser's memory
      history.pushState({ target: targetId }, "", "#" + targetId);

      switchView(targetId);
    });
  });

// ⏪ THE BACK BUTTON WATCHER
  window.addEventListener('popstate', function(event) {
    if (event.state && event.state.target) {
      switchView(event.state.target);
    } else {
      // Default to dashboard if they go all the way back
      const defaultHash = window.location.hash.replace('#', '') || 'view-dashboard';
      switchView(defaultHash);
    }
  });

// 🟢 INITIAL LOAD: If they refresh the page, keep them on the same tab
  document.addEventListener("DOMContentLoaded", () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      switchView(hash);
    }
  });

// ==========================================
// ADMIN DASHBOARD: ACCEPT & VALIDATE LOGIC
// ==========================================
  const btnAcceptValidate = document.getElementById('btn-accept-validate');
  const acceptConfirmModal = document.getElementById('accept-confirm-modal');
  const btnCancelAccept = document.getElementById('btn-cancel-accept');
  const btnConfirmAccept = document.getElementById('btn-confirm-accept');

  if (btnAcceptValidate) {
    btnAcceptValidate.addEventListener('click', () => {
      acceptConfirmModal.classList.remove('hidden');

      // Force the modal to the very front using JavaScript
      acceptConfirmModal.style.position = 'fixed';
      acceptConfirmModal.style.top = '0';
      acceptConfirmModal.style.left = '0';
      acceptConfirmModal.style.width = '100vw';
      acceptConfirmModal.style.height = '100vh';
      acceptConfirmModal.style.zIndex = '2147483647';
      acceptConfirmModal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    });
  }

  if (btnCancelAccept) {
    btnCancelAccept.addEventListener('click', () => {
      acceptConfirmModal.classList.add('hidden');
    });
  }

// 3. SEND TO DATABASE
  if (btnConfirmAccept) {
    // ⬇️ WE CATCH THE EVENT 'e' HERE ⬇️
    btnConfirmAccept.addEventListener('click', (e) => {
      e.preventDefault(); // THIS STOPS THE BROWSER FROM HANGING UP!

      if (!currentReviewReportId) {
        console.error("No report ID found to update!");
        return;
      }

      btnConfirmAccept.innerHTML = "⏳ Validating...";
      btnConfirmAccept.disabled = true;

      fetch(`${API_BASE_URL}/api/reports/${currentReviewReportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "Validated" })
      })
        .then(response => {
          if (!response.ok) throw new Error("Failed to validate report");
          return response.text();
        })
        .then(text => {
          // ✅ Trigger the Toast instead of the alert!
          showToast("Report successfully validated!");

          acceptConfirmModal.classList.add('hidden');
          document.getElementById('review-modal').classList.add('hidden');

          // Reload the table
          if (typeof loadAdminReports === 'function') loadAdminReports();
        })
        .catch(error => {
          console.error("Error validating report:", error);
          // ❌ Trigger the Error Toast!
          showToast("❌ Failed to connect. Press F12 for details.", true);
        })
        .finally(() => {
          btnConfirmAccept.innerHTML = "Yes, Validate It";
          btnConfirmAccept.disabled = false;
        });
    });
  }

  // ==========================================
// 3. REJECTION FEEDBACK LOGIC
// ==========================================
  const btnShowReject = document.getElementById('btn-show-reject');
  const feedbackForm = document.getElementById('reject-feedback-form');
  const adminRemarksInput = document.getElementById('admin-remarks-input');
  const btnConfirmReject = document.getElementById('btn-confirm-reject');
  const btnCancelReject = document.getElementById('btn-cancel-reject');

  const primaryActions = document.getElementById('primary-actions');

// A. Show the text box when "Reject" is clicked
  if (btnShowReject && primaryActions && feedbackForm) {
    btnShowReject.addEventListener('click', () => {
      primaryActions.classList.add('hidden'); // Hide the Accept/Reject buttons
      feedbackForm.classList.remove('hidden'); // Show the Text Area
      adminRemarksInput.value = ''; // Clear out any old text
    });
  }

// B. Hide the text box if they click "Cancel"
  if (btnCancelReject && primaryActions && feedbackForm) {
    btnCancelReject.addEventListener('click', () => {
      feedbackForm.classList.add('hidden');
      primaryActions.classList.remove('hidden');
    });
  }

// C. SEND TO DATABASE: Submit the Rejection
  if (btnConfirmReject) {
    btnConfirmReject.addEventListener('click', (e) => {
      e.preventDefault(); // STOP THE BROWSER FROM REFRESHING!

      const remarks = adminRemarksInput.value.trim();
      if (!remarks) {
        showToast("Please type a reason so the Barangay Official knows what to fix!", "error");
        return;
      }

      if (!currentReviewReportId) return;

      btnConfirmReject.innerHTML = "⏳ Rejecting...";
      btnConfirmReject.disabled = true;

      // Send the Status AND the Remarks to Spring Boot
      fetch(`${API_BASE_URL}/api/reports/${currentReviewReportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: "Rejected",
          adminRemarks: remarks
        })
      })
        .then(response => {
          if (!response.ok) throw new Error("Failed to reject report");
          return response.text();
        })
        .then(text => {
          // ✅ Trigger the Toast instead of the alert!
          showToast("Report Rejected! Feedback saved.");

          // Hide modals and reset the UI
          document.getElementById('review-modal').classList.add('hidden');
          feedbackForm.classList.add('hidden');
          primaryActions.classList.remove('hidden');

          // Reload the table
          if (typeof loadAdminReports === 'function') loadAdminReports();
        })
        .catch(error => {
          console.error("Error rejecting report:", error);
          // ❌ Trigger the Error Toast!
          showToast("❌ Failed to connect. Check F12 console.", true);
        })
        .finally(() => {
          btnConfirmReject.innerHTML = "Submit Rejection";
          btnConfirmReject.disabled = false;
        });
    });
  }


  // ==========================================
  // 5. DROPDOWN PRINT MENU LOGIC
  // ==========================================
  const generateMenuBtn = document.getElementById('btn-generate-menu');
  const printDropdown = document.getElementById('print-dropdown');

  if (generateMenuBtn && printDropdown) {
    generateMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      printDropdown.classList.toggle('hidden');
    });

    window.addEventListener('click', () => {
      if (!printDropdown.classList.contains('hidden')) {
        printDropdown.classList.add('hidden');
      }
    });

    printDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // ==========================================
  // 8. ADD/MANAGE BARANGAY/ROAD MODALS
  // ==========================================
  const btnAddBarangay = document.getElementById('btn-add-barangay');
  const addBrgyModal = document.getElementById('add-brgy-modal');
  if (addBrgyModal && btnAddBarangay) {
    const closeBtns = document.querySelectorAll('.close-add-brgy-btn');
    btnAddBarangay.addEventListener('click', () => addBrgyModal.classList.remove('hidden'));
    closeBtns.forEach(btn => btn.addEventListener('click', () => addBrgyModal.classList.add('hidden')));
  }

  const manageBrgyBtns = document.querySelectorAll('.manage-brgy-btn');
  const barangayModal = document.getElementById('barangay-modal');
  if (barangayModal) {
    const closeBtns = document.querySelectorAll('.close-brgy-btn');
    manageBrgyBtns.forEach(btn => btn.addEventListener('click', () => barangayModal.classList.remove('hidden')));
    closeBtns.forEach(btn => btn.addEventListener('click', () => barangayModal.classList.add('hidden')));
  }

  const addRoadBtns = document.querySelectorAll('.add-road-btn');
  const addRoadModal = document.getElementById('add-road-modal');
  if (addRoadModal) {
    const closeBtns = document.querySelectorAll('.close-add-road-btn');
    addRoadBtns.forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault();
      addRoadModal.classList.remove('hidden');
    }));
    closeBtns.forEach(btn => btn.addEventListener('click', () => addRoadModal.classList.add('hidden')));
  }

  // ==========================================
  // 9. MASTER PROFILE LOGIC
  // ==========================================
  const profileBtn = document.querySelector('.header-profile-btn');
  const viewProfile = document.getElementById('view-profile');

  if (profileBtn && viewProfile) {
    profileBtn.addEventListener('click', () => {
      contentSections.forEach(view => view.classList.add('hidden'));
      document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
      viewProfile.classList.remove('hidden');
    });
  }

  const profileMenuLinks = document.querySelectorAll('#profile-nav-menu li:not(.logout-btn)');
  const profileTabs = document.querySelectorAll('.profile-tab');

  if (profileMenuLinks.length > 0) {
    profileMenuLinks.forEach(link => {
      link.addEventListener('click', () => {
        profileMenuLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        profileTabs.forEach(tab => tab.classList.add('hidden'));
        const targetId = link.getAttribute('data-target');
        const targetTab = document.getElementById(targetId);
        if (targetTab) targetTab.classList.remove('hidden');
      });
    });
  }
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // 1. Wipe all sensitive data from the browser memory
      sessionStorage.clear();

      // 2. Shred the history stack and return to login
      window.location.replace('login.html');
    });
  }

  // ==========================================
  // BACK TO DASHBOARD BUTTON
  // ==========================================
  const backToDashBtn = document.getElementById('btn-back-dashboard');
  if (backToDashBtn) {
    backToDashBtn.addEventListener('click', () => {
      // 1. Hide the profile view
      if (viewProfile) viewProfile.classList.add('hidden');

      // 2. Show the main dashboard view (Make sure the ID matches your dashboard!)
      const mainDashboard = document.getElementById('view-dashboard') || document.getElementById('view-admin-dashboard');
      if (mainDashboard) mainDashboard.classList.remove('hidden');

      // 3. Re-highlight the "Dashboard" button in the left sidebar
      document.querySelectorAll('.nav-menu li').forEach(li => {
        const target = li.getAttribute('data-target');
        if (target === 'view-dashboard' || target === 'view-admin-dashboard') {
          li.classList.add('active');
        } else {
          li.classList.remove('active');
        }
      });
    });
  }

  // ==========================================
// 10. OFFICIAL REPORT LOGIC (CEO PRIORITY LIST)
// ==========================================
  const btnPrintPriority = document.getElementById('btn-print-priority');
  const viewReportPriority = document.getElementById('view-report-priority');
  const btnPrintDocument = document.getElementById('btn-print-document');
  const btnCloseReport = document.getElementById('btn-close-report');

// 1. Hook up the Sidebar Button
  if (btnPrintPriority && viewReportPriority) {
    btnPrintPriority.addEventListener('click', () => {
      // Hide all other dashboard sections
      if (typeof contentSections !== 'undefined') {
        contentSections.forEach(sec => sec.classList.add('hidden'));
      }
      document.querySelectorAll('.nav-menu li').forEach(l => l.classList.remove('active'));

      // Show the official document
      viewReportPriority.classList.remove('hidden');

      // 🚀 RUN THE ALGORITHM
      generatePriorityList();
    });
  }

// 2. Hook up the Print & Back Buttons
  if (btnPrintDocument) {
    btnPrintDocument.addEventListener('click', () => window.print());
  }
  if (btnCloseReport) {
    btnCloseReport.addEventListener('click', () => {
      viewReportPriority.classList.add('hidden');
      document.getElementById('view-dashboard').classList.remove('hidden');
    });
  }

// ==========================================
// 🧠 THE STRICT PRIORITY ALGORITHM 🧠
// ==========================================
  function generatePriorityList() {

    // 🚀 THE FIX: Swapped standard fetch for apiFetch to bypass Ngrok CORS
    apiFetch(`/api/reports`)
      .then(reports => {

        // 🛡️ THE GATEKEEPER: Only Validated Reports reach the CEO
        const validatedReports = reports.filter(r => String(r.status || '').toLowerCase() === 'validated');

        // 🧮 CALCULATE SCORES
        validatedReports.forEach(report => {
          const severity = String(report.severity || 'Unassessed').toLowerCase();
          const importance = String(report.roadImportance || '').toLowerCase();

          // Default fallback for AI that hasn't graded the photo yet
          report.tierScore = 0;
          report.tierLabel = 'PENDING AI';
          report.tierColor = '#6c757d'; // Gray

          // STEP 1: THE STRICT DECISION TREE (3 TIERS)
          if (severity === 'high') {
            report.tierScore = 3;
            report.tierLabel = 'HIGH';
            report.tierColor = '#dc3545'; // Red
          } else if (severity === 'medium') {
            if (importance.includes('core')) {
              report.tierScore = 3; // Bumps up to High!
              report.tierLabel = 'HIGH';
              report.tierColor = '#dc3545'; // Red
            } else {
              report.tierScore = 2; // Stays Medium
              report.tierLabel = 'MEDIUM';
              report.tierColor = '#ff8c00'; // Orange
            }
          } else if (severity === 'low') {
            if (importance.includes('core')) {
              report.tierScore = 2; // Bumps up to Medium!
              report.tierLabel = 'MEDIUM';
              report.tierColor = '#ff8c00'; // Orange
            } else {
              report.tierScore = 1; // Stays Low
              report.tierLabel = 'LOW';
              report.tierColor = '#28a745'; // Green
            }
          }

          // STEP 2: THE TIE-BREAKER (Area)
          const dLength = parseFloat(report.damageLength) || 0;
          const dWidth = parseFloat(report.damageWidth) || 0;
          report.areaScore = dLength * dWidth;
        });

        // 🔄 THE DOUBLE SORT (Tier First, then Area)
        validatedReports.sort((a, b) => {
          if (b.tierScore !== a.tierScore) {
            return b.tierScore - a.tierScore;
          }
          // If they have the exact same Tier, sort by Largest Area
          return b.areaScore - a.areaScore;
        });

        // 🖨️ RENDER TO HTML TABLE
        const tbody = document.querySelector('.document-table tbody');
        if (!tbody) return;

        tbody.innerHTML = ''; // Wipe out the hardcoded HTML rows

        if (validatedReports.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No validated reports available for dispatch.</td></tr>`;
          return;
        }

        validatedReports.forEach((report, index) => {
          // Formatting data safely
          const formatId = `#PRJ-${String(report.id).padStart(4, '0')}`;
          const formatName = report.cityRoadName || 'Unnamed Road';
          const formatBrgy = (report.barangay && report.barangay.barangayName) ? report.barangay.barangayName : 'Unknown';
          // Damage Type is used ONLY as a label for the crew, not for math!
          const formatDamage = report.damageType || 'Unspecified';
          const dLength = report.damageLength || 0;
          const dWidth = report.damageWidth || 0;

          const tr = document.createElement('tr');
          tr.innerHTML = `
                    <td style="text-align: center;"><strong>${index + 1}</strong></td>
                    <td>${formatId}</td>
                    <td><strong>${formatName}</strong><br><span style="font-size: 11px; color: #555;">Brgy. ${formatBrgy}</span></td>
                    <td>${formatDamage}</td>
                    <td>${dLength}m x ${dWidth}m</td>
                    <td style="text-align: center; font-weight: bold; color: ${report.tierColor};">${report.tierLabel}</td>
                `;
          tbody.appendChild(tr);
        });

        // Auto-update Document Date to today
        const dateEl = document.querySelector('.official-document p strong');
        if(dateEl) {
          dateEl.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }

      })
      .catch(err => {
        console.error("Error generating priority list:", err);
        showToast("Error loading priority list.", "error");
      });
  }


}); // <--- THIS CLOSES THE MAIN DOMContentLoaded EVENT LISTENER ONCE AND FOR ALL!

// ==========================================
// CEO DATA LOADER (THE MAIN BRAIN)
// ==========================================
window.loadCEODashboardData = function() {
  console.log("🚀 [SAFE FETCH] Grabbing CEO data...");

  apiFetch(`/api/reports`, { cache: 'no-store' })
    .catch(err => {
      console.error("🚨 [CEO API] Failed to fetch:", err);
      return [];
    })
    .then(reports => {
      console.log(`✅ [SAFE FETCH] Loaded ${reports.length} reports.`);

      const allCEOReports = reports.filter(r => {
        const s = String(r.status || '').trim().toLowerCase();
        return s === 'dispatched to ceo' || s === 'in progress' || s === 'completed' || s === 'repaired';
      });

      // ==========================================
      // 🧠 THE ULTIMATE CEO SORTING ALGORITHM
      // ==========================================
      allCEOReports.forEach(report => {
        const severity = String(report.severity || 'Unassessed').toLowerCase();
        const importance = String(report.roadImportance || '').toLowerCase();
        const status = String(report.status || '').trim().toLowerCase();
        const hasRework = (report.adminRemarks && report.adminRemarks.trim() !== '');

        // --- STEP 1: CEO WORKFLOW STATUS (4 Tiers) ---
        if (status === 'in progress' && hasRework) {
          report.statusScore = 4; // URGENT: Bounced back by Admin for Rework! (TOP)
        } else if (status === 'dispatched to ceo') {
          report.statusScore = 3; // NEW: Needs to be scheduled
        } else if (status === 'in progress') {
          report.statusScore = 2; // ACTIVE: Currently being worked on normally
        } else {
          report.statusScore = 1; // COMPLETED: Waiting for Admin QA (BOTTOM)
        }

        // --- STEP 2: YOUR STRICT DECISION TREE (Tier Score) ---
        report.tierScore = 0;
        report.tierLabel = 'PENDING AI';
        report.tierColor = '#6c757d';

        if (severity === 'high') {
          report.tierScore = 3; report.tierLabel = 'HIGH'; report.tierColor = '#dc3545';
        } else if (severity === 'medium') {
          if (importance.includes('core')) {
            report.tierScore = 3; report.tierLabel = 'HIGH'; report.tierColor = '#dc3545';
          } else {
            report.tierScore = 2; report.tierLabel = 'MEDIUM'; report.tierColor = '#ff8c00';
          }
        } else if (severity === 'low') {
          if (importance.includes('core')) {
            report.tierScore = 2; report.tierLabel = 'MEDIUM'; report.tierColor = '#ff8c00';
          } else {
            report.tierScore = 1; report.tierLabel = 'LOW'; report.tierColor = '#28a745';
          }
        }

        // --- STEP 3: YOUR TIE-BREAKER (Area Score) ---
        const dLength = parseFloat(report.damageLength) || 0;
        const dWidth = parseFloat(report.damageWidth) || 0;
        report.areaScore = dLength * dWidth;
      });

      // --- C. RUN THE HYBRID CEO SORT ---
      allCEOReports.sort((a, b) => {

        // RULE 1: COMPLETED ITEMS ALWAYS GO TO THE ABSOLUTE BOTTOM
        const aIsCompleted = a.statusScore === 1;
        const bIsCompleted = b.statusScore === 1;
        if (aIsCompleted && !bIsCompleted) return 1;  // Push A down
        if (!aIsCompleted && bIsCompleted) return -1; // Push B down

        // RULE 2: REWORKS ALWAYS GO TO THE ABSOLUTE TOP
        const aIsRework = a.statusScore === 4;
        const bIsRework = b.statusScore === 4;
        if (aIsRework && !bIsRework) return -1; // Pull A up
        if (!aIsRework && bIsRework) return 1;  // Pull B up

        // RULE 3: For the active backlog (Dispatched vs In Progress), SEVERITY WINS
        if (b.tierScore !== a.tierScore) {
          return b.tierScore - a.tierScore; // High > Medium > Low
        }

        // RULE 4: If Severity is tied, show 'Dispatched' before 'In Progress'
        if (b.statusScore !== a.statusScore) {
          return b.statusScore - a.statusScore;
        }

        // RULE 5: Largest Area Tie-Breaker
        if (b.areaScore !== a.areaScore) {
          return b.areaScore - a.areaScore;
        }

        // RULE 6: Oldest Date Tie-Breaker (Using your real database field!)
        const dateA = new Date(a.date_submitted || a.dateSubmitted || 0);
        const dateB = new Date(b.date_submitted || b.dateSubmitted || 0);
        return dateA - dateB;
      });
      // ==========================================

      const activeReports = allCEOReports.filter(r => {
        const s = String(r.status || '').trim().toLowerCase();
        return s === 'dispatched to ceo' || s === 'in progress';
      });

      const pendingDispatch = activeReports.filter(r => String(r.status || '').trim().toLowerCase() === 'dispatched to ceo');
      const inProgress = activeReports.filter(r => String(r.status || '').trim().toLowerCase() === 'in progress');
      const criticalHazards = activeReports.filter(r => r.tierLabel === 'HIGH');

      const totalEl = document.getElementById('ceo-metric-total');
      const critEl = document.getElementById('ceo-metric-critical');
      const actEl = document.getElementById('ceo-metric-active');
      if (totalEl) totalEl.innerText = pendingDispatch.length;
      if (critEl) critEl.innerText = criticalHazards.length;
      if (actEl) actEl.innerText = inProgress.length;

      // Render tables safely
      renderCEOTable(activeReports, 'ultimate-ceo-dash-table', true);
      renderCEOTable(allCEOReports, 'deploy-master-table', false);
    });
};

// ==========================================
// REUSABLE TABLE GENERATOR (CLEAN VERSION)
// ==========================================
window.renderCEOTable = function(dataArray, tbodyId, isDashboard) {
  const tbody = document.getElementById(tbodyId);

  if (!tbody) return; // Fail silently if table isn't on screen

  // Clear previous entries
  tbody.innerHTML = '';

  if (dataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">No active projects found.</td></tr>`;
    return;
  }

  dataArray.forEach((report) => {
    const formatId = `#PRJ-${String(report.id).padStart(4, '0')}`;
    const formatBrgy = (report.barangay && report.barangay.barangayName) ? report.barangay.barangayName : 'Unknown';
    const formatName = report.cityRoadName || 'Unnamed Road';
    const area = (parseFloat(report.damageLength) || 0) * (parseFloat(report.damageWidth) || 0);
    const formatArea = area > 0 ? `${area.toFixed(1)} sq.m` : 'Unknown';

    const status = String(report.status || '').toLowerCase();
    const hasRework = (report.adminRemarks && report.adminRemarks.trim() !== ''); // Check for Admin QA feedback
    const onClickAction = isDashboard ? `jumpToCEOMasterlistAndManage(${report.id})` : `openCEOManageModal(${report.id})`;

    let statusHtml = `<span style="background:#dcfce3; color:#166534; padding:5px 10px; border-radius:20px; font-size:11px; font-weight:700;">Dispatched</span>`;
    let btnHtml = `<button onclick="${onClickAction}" style="background-color: #1e40af; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; box-shadow: 0 2px 4px rgba(30,64,175,0.2);">Manage</button>`;

    if (status === 'in progress') {
      // 🚀 BONUS: Highlight reworks in yellow so the CEO knows it was bounced back!
      if (hasRework) {
        statusHtml = `<span style="background-color: #fef08a; color: #854d0e; padding:5px 10px; border-radius:20px; font-size:11px; font-weight:700;">⚠️ Rework Required</span>`;
      } else {
        statusHtml = `<span style="background-color: #dbeafe; color: #1e40af; padding:5px 10px; border-radius:20px; font-size:11px; font-weight:700;">In Progress</span>`;
      }
    } else if (status.includes('complet') || status.includes('repair')) {
      statusHtml = `<span style="background-color: #f1f5f9; color: #475569; padding:5px 10px; border-radius:20px; font-size:11px; font-weight:700;">✅ Completed</span>`;
      btnHtml = `<button onclick="${onClickAction}" style="background-color: #16a34a; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; box-shadow: 0 2px 4px rgba(22,163,74,0.2);">View Proof</button>`;
    }

    const tr = document.createElement('tr');
    tr.style.borderBottom = "1px solid #f1f5f9";
    tr.style.transition = "background-color 0.2s";

    tr.onmouseover = () => tr.style.backgroundColor = "#f8fafc";
    tr.onmouseout = () => tr.style.backgroundColor = "transparent";

    tr.innerHTML = `
       <td style="padding: 15px; border-left: 4px solid ${report.tierColor}; white-space: nowrap;"><strong>${formatId}</strong></td>
        <td style="padding: 15px;">${formatBrgy}</td>
        <td style="padding: 15px; font-weight: 600; color: #0f172a;">${formatName}</td>
        <td style="padding: 15px; color: #64748b; white-space: nowrap;">${formatArea}</td>
        <td style="padding: 15px;"><span style="background-color: ${report.tierColor}; color: white; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">${report.tierLabel}</span></td>
        <td style="padding: 15px; text-align: center; display: flex; gap: 10px; justify-content: center; align-items: center;">
            ${statusHtml}
            ${btnHtml}
        </td>
    `;
    tbody.appendChild(tr);
  });
};

// Placeholder for opening the specific report
window.openCEOManageModal = function(reportId) {
  console.log("Opening Manage Modal for Project: " + reportId);
  document.getElementById('manage-modal').classList.remove('hidden');
};

// Shows the text box if the user selects "Other" in the Damage Type dropdown
function toggleOtherDamageType() {
  const select = document.getElementById('damageType');
  const otherGroup = document.getElementById('otherDamageTypeGroup');
  if (select.value === 'Other') {
    otherGroup.classList.remove('hidden');
  } else {
    otherGroup.classList.add('hidden');
  }
}

function toggleEditOtherDamage() {
  const select = document.getElementById('edit-modal-damage-type');
  const otherInput = document.getElementById('edit-modal-damage-other');
  if (select.value === 'Other') {
    otherInput.classList.remove('hidden');
  } else {
    otherInput.classList.add('hidden');
  }
}

// Global variables to store data for the CEO Map Button (which we will build next)
let currentCEOProjectID = null;
let currentCEOLat = 0;
let currentCEOLng = 0;

// ==========================================
// CEO DASHBOARD: OPEN MANAGE MODAL
// ==========================================
window.openCEOManageModal = function(reportId) {
  currentCEOProjectID = reportId;

  // Automatically switch views from Dashboard to the Repair/Masterlist tab!
  const dashboardView = document.getElementById('view-dashboard');
  const repairView = document.getElementById('view-repair');

  if (dashboardView && repairView && !dashboardView.classList.contains('hidden')) {
    dashboardView.classList.add('hidden');
    repairView.classList.remove('hidden');
  }

  // Force the map closed every time we open a new project
  const mapContainer = document.getElementById('ceo-manage-map-container');
  if (mapContainer) mapContainer.style.display = 'none';

  // 1. FIRST: Define and grab the modal
  const modal = document.getElementById('manage-modal');
  if (!modal) return;

  // 2. Unhide the modal
  modal.classList.remove('hidden');

  // 3. Reset the scrollbar!
  const modalBody = modal.querySelector('.modal-body');
  if (modalBody) modalBody.scrollTop = 0;

  // 4. Set temporary loading text
  document.getElementById('ceo-modal-prj-id').innerText = `#PRJ-${String(reportId).padStart(4, '0')} (Loading...)`;

  // 🚀 FETCH THE DATA
  apiFetch(`/api/reports/${reportId}`, { cache: 'no-store' })
    .then(report => {
      // Save coordinates for the "Locate on Map" button
      currentCEOLat = report.latitude;
      currentCEOLng = report.longitude;

      // 1. Core Details
      document.getElementById('ceo-modal-prj-id').innerText = `#PRJ-${String(report.id).padStart(4, '0')}`;
      document.getElementById('ceo-modal-brgy').innerText = report.barangay ? report.barangay.barangayName : 'Unknown';
      document.getElementById('ceo-modal-road-name').innerText = report.cityRoadName || 'Unnamed Road';

      // 2. Full Road Details
      document.getElementById('ceo-modal-road-id').innerText = report.cityRoadId || 'N/A';
      document.getElementById('ceo-modal-importance').innerText = report.roadImportance || 'N/A';
      document.getElementById('ceo-modal-terrain').innerText = report.terrainType || 'N/A';
      document.getElementById('ceo-modal-road-type').innerText = report.roadType || 'N/A';
      document.getElementById('ceo-modal-length').innerText = report.length || 0;
      document.getElementById('ceo-modal-width').innerText = report.width || 0;
      document.getElementById('ceo-modal-culverts').innerText = report.lengthOfCulverts || 0;
      document.getElementById('ceo-modal-bridges').innerText = report.numberOfBridges || 0;

      // 3. Damage Details
      document.getElementById('ceo-modal-damage-type').innerText = report.damageType || 'None';

      const damageLen = parseFloat(report.damageLength) || 0;
      const damageWid = parseFloat(report.damageWidth) || 0;
      const damageArea = damageLen * damageWid;

      document.getElementById('ceo-modal-damage-length').innerText = damageLen;
      document.getElementById('ceo-modal-damage-width').innerText = damageWid;
      document.getElementById('ceo-modal-damage-area').innerText = damageArea > 0 ? `${damageArea.toFixed(1)} sq.m` : '0 sq.m';

      document.getElementById('ceo-modal-gps').innerText = (report.latitude && report.longitude) ? `${report.latitude}°, ${report.longitude}°` : 'No GPS data';
      document.getElementById('ceo-modal-submitter-name').innerText = report.reportedBy || 'Barangay Official';
      document.getElementById('ceo-modal-description').innerText = report.damageDescription || 'No description provided.';

      // 4. Priority Badge
      const severity = String(report.severity || 'UNASSESSED').toUpperCase();
      const priorityBadge = document.getElementById('ceo-modal-priority');
      priorityBadge.innerText = severity;

      if (severity === 'HIGH') {
        priorityBadge.style.cssText = "background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;";
      } else if (severity === 'MEDIUM') {
        priorityBadge.style.cssText = "background-color: #ff8c00; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;";
      } else if (severity === 'LOW') {
        priorityBadge.style.cssText = "background-color: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;";
      } else {
        priorityBadge.style.cssText = "background-color: #6c757d; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;";
      }

      // 5. Current Status Badge
      const status = String(report.status || '');
      const currentStatus = status.toLowerCase();
      const statusBadge = document.getElementById('ceo-modal-current-status');

      statusBadge.innerText = status;
      if (currentStatus === 'in progress') {
        statusBadge.style.cssText = "background-color: #cce5ff; color: #004085; padding: 4px 8px; border-radius: 4px; font-weight: bold;";
      } else {
        statusBadge.style.cssText = "background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-weight: bold;";
      }

      // ==========================================
      // 🚀 NEW: REWORK ALERT LOGIC
      // ==========================================
      const reworkAlert = document.getElementById('ceo-rework-alert');
      const reworkText = document.getElementById('ceo-modal-admin-remarks');

      // If the Admin wrote remarks AND the ticket is "In Progress" (meaning it was bounced back)
      if (report.adminRemarks && report.adminRemarks.trim() !== '' && currentStatus === 'in progress') {
        if (reworkText) reworkText.innerText = report.adminRemarks;
        if (reworkAlert) reworkAlert.style.display = 'block';
      } else {
        // Keep it hidden if there are no remarks, or if it hasn't been bounced back yet
        if (reworkAlert) reworkAlert.style.display = 'none';
      }

      // ==========================================
      // 6. IMAGE LOADING
      // ==========================================
      const placeholderEl = document.getElementById('ceo-modal-image-placeholder-text');
      if (placeholderEl) placeholderEl.style.display = 'none';

      loadSecureImage('ceo-modal-image', report.damageImage);

      // ==========================================
      // 7. BUTTON LOCK & COMPLETED DATA
      // ==========================================
      const btnStartRepair = document.getElementById('ceo-btn-start-repair');
      const completionForm = document.getElementById('ceo-completion-form');
      const completedEvidence = document.getElementById('ceo-completed-evidence-section');
      const proofRemarks = document.getElementById('ceo-modal-proof-remarks');

      if (btnStartRepair) {
        if (currentStatus.includes('complet') || currentStatus.includes('repair')) {
          btnStartRepair.innerHTML = `<span class="icon">✅</span> Already Completed`;
          btnStartRepair.style.backgroundColor = "#6c757d";
          btnStartRepair.style.cursor = "not-allowed";
          btnStartRepair.disabled = true;

          if (completionForm) completionForm.style.display = 'none';
          if (completedEvidence) completedEvidence.style.display = 'block';

          loadSecureImage('ceo-modal-proof-image', report.proofOfRepairImage);
          proofRemarks.innerText = report.repairRemarks || "No official remarks provided.";

        } else if (currentStatus.includes('progress')) {
          btnStartRepair.innerHTML = `<span class="icon">✅</span> Already In Progress`;
          btnStartRepair.style.backgroundColor = "#6c757d";
          btnStartRepair.style.cursor = "not-allowed";
          btnStartRepair.disabled = true;

          if (completionForm) completionForm.style.display = 'block';
          if (completedEvidence) completedEvidence.style.display = 'none';

        } else {
          btnStartRepair.innerHTML = `<span class="icon">👷</span> Mark as In Progress`;
          btnStartRepair.style.backgroundColor = "";
          btnStartRepair.style.cursor = "pointer";
          btnStartRepair.disabled = false;

          if (completionForm) completionForm.style.display = 'none';
          if (completedEvidence) completedEvidence.style.display = 'none';
        }
      }
    })
    .catch(err => {
      console.error("Error populating CEO modal:", err);
      document.getElementById('ceo-modal-prj-id').innerText = "Database Error!";
    });
};
// ==========================================
// CEO ACTION QUEUE: TAB JUMP & MANAGE LOGIC
// ==========================================
window.jumpToCEOMasterlistAndManage = function(reportId) {
  // 1. Find the "Repair Projects" tab button in the sidebar
  // (Assuming your sidebar uses data-target="view-repair" for the CEO)
  const repairTabBtn = document.querySelector('.nav-menu li[data-target="view-repair"]');

  // 2. Programmatically "click" it to switch the screen and highlight the sidebar menu
  if (repairTabBtn) {
    repairTabBtn.click();
  } else {
    // Fallback just in case
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-repair').classList.remove('hidden');
  }

  // 3. Wait 150ms for the screen to switch, then pop open the modal!
  setTimeout(() => {
    if (typeof openCEOManageModal === 'function') {
      openCEOManageModal(reportId);
    } else {
      console.error("openCEOManageModal function not found!");
    }
  }, 150);
};


// ==========================================
// CEO FILE UPLOAD: DRAG, DROP & PREVIEW
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('ceo-dropzone-container');
  const fileInput = document.getElementById('ceo-repair-image-upload');
  const defaultState = document.getElementById('ceo-dropzone-default');
  const previewState = document.getElementById('ceo-dropzone-preview');
  const previewImg = document.getElementById('ceo-preview-img');
  const removeBtn = document.getElementById('ceo-btn-remove-image');
  const fileNameDisplay = document.getElementById('ceo-repair-file-name');

  // Only run this if we are actually on the CEO page
  if (!dropzone || !fileInput) return;

  // 1. Click dropzone to open file dialog (unless clicking the 'X' button)
  dropzone.addEventListener('click', (e) => {
    if (e.target !== removeBtn) {
      fileInput.click();
    }
  });

  // 2. Drag & Drop Visuals (Highlights blue when dragging a file over it)
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#0d6efd'; // Highlight border
    dropzone.style.backgroundColor = '#e0f2fe'; // Light blue background
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#cbd5e1'; // Revert border
    dropzone.style.backgroundColor = '#f8fafc'; // Revert background
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#cbd5e1';
    dropzone.style.backgroundColor = '#f8fafc';

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files; // Assign dragged file to input
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  // 3. Handle File Selection (If they click to browse)
  fileInput.addEventListener('change', function() {
    if (this.files && this.files.length > 0) {
      handleFileUpload(this.files[0]);
    }
  });

  // 4. Magic Function: Read the image, check size, and show the live preview!
  function handleFileUpload(file) {
    // Check if it is actually an image
    if (!file.type.startsWith('image/')) {
      showToast("Please upload a valid image file (JPG, PNG).", "error");
      fileInput.value = ''; // Reset input
      return;
    }

    // 🚀 THE FIX: Check if file is over 5MB (5 * 1024 * 1024 bytes = 5,242,880 bytes)
    if (file.size > 5 * 1024 * 1024) {
      showToast("File is too large! Must be under 5MB.", "error");
      fileInput.value = ''; // Reset input so it doesn't try to upload anyway
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result; // Set the image source to the file data
      defaultState.style.display = 'none'; // Hide the "Click to upload" text
      previewState.style.display = 'block'; // Show the image!
      fileNameDisplay.innerText = file.name;
    };
    reader.readAsDataURL(file);
  }

  // 5. Remove Button Logic (Clicking the red 'X')
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Stop the click from triggering the file dialog again
    fileInput.value = ''; // Empty the invisible file input
    previewImg.src = ''; // Clear the image
    previewState.style.display = 'none'; // Hide the preview container
    defaultState.style.display = 'block'; // Bring back the "Click to upload" text
  });
});

// Global variables for the CEO Map
let ceoManageMap = null;
let ceoManageMarker = null;

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // CEO MAP LOGIC (Locate on Map Button)
  // ==========================================
  const btnLocateMap = document.getElementById('ceo-btn-locate-map');

  if (btnLocateMap) {
    btnLocateMap.addEventListener('click', function(e) {
      e.preventDefault(); // Stop page from jumping
      const mapContainer = document.getElementById('ceo-manage-map-container');

      // Safety check: Did the Barangay Official actually provide GPS coordinates?
      if (!currentCEOLat || !currentCEOLng || (currentCEOLat === 0 && currentCEOLng === 0)) {
        alert("No GPS coordinates were provided for this report.");
        return;
      }

      // Toggle the map open/closed
      if (mapContainer.style.display === 'none') {
        mapContainer.style.display = 'block';

        // Define a custom Red Icon for damages
        const redIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        // If the map hasn't been built yet, build it!
        if (!ceoManageMap) {
          ceoManageMap = L.map('ceo-manage-map').setView([currentCEOLat, currentCEOLng], 17);

          // Switch to Esri World Imagery (Satellite View)
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
          }).addTo(ceoManageMap);

          // Drop the RED pin!
          ceoManageMarker = L.marker([currentCEOLat, currentCEOLng], {icon: redIcon}).addTo(ceoManageMap);
        } else {
          // If the map is already built, just move the camera and update the pin location
          ceoManageMap.setView([currentCEOLat, currentCEOLng], 17);
          ceoManageMarker.setLatLng([currentCEOLat, currentCEOLng]);
        }

        // CRUCIAL LEAFLET TRICK: Leaflet breaks if loaded inside a hidden div.
        // We must tell it to recalculate its size a fraction of a second after we unhide it.
        setTimeout(() => {
          ceoManageMap.invalidateSize();
        }, 200);

      } else {
        // Close the map if they click the button again
        mapContainer.style.display = 'none';
      }
    });
  }
});

// ==========================================
// CEO: MARK PROJECT AS "IN PROGRESS"
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const btnStartRepair = document.getElementById('ceo-btn-start-repair');

  if (btnStartRepair) {
    btnStartRepair.addEventListener('click', function() {
      // Safety check to make sure a project is actually open
      if (!currentCEOProjectID) return;

      // 1. UI Loading State (Prevent spam clicking)
      const originalText = this.innerHTML;
      this.innerHTML = `<span class="icon">⏳</span> Updating...`;
      this.disabled = true;
      this.style.opacity = "0.7";

      // 2. Call the Backend API
      fetch(`${API_BASE_URL}/api/reports/${currentCEOProjectID}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: "In Progress" })
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to update status");

          // 3. Success! Show the professional Toast Notification
          showToast("Crew Dispatched! Admin notified that repairs are in progress.", "success");

          // 4. Instantly update the badge inside the modal so it turns Blue
          const statusBadge = document.getElementById('ceo-modal-current-status');
          if (statusBadge) {
            statusBadge.innerText = "In Progress";
            statusBadge.style.cssText = "background-color: #cce5ff; color: #004085; padding: 4px 8px; border-radius: 4px; font-weight: bold;";
          }

          // 5. Change the button to show it's already done
          this.innerHTML = `<span class="icon">✅</span> Already In Progress`;
          this.style.backgroundColor = "#6c757d"; // Turn it gray
          this.style.cursor = "not-allowed";

          // ==========================================
          // 🚀 6. THE FIX: REVEAL THE UPLOAD FORM INSTANTLY
          // ==========================================
          const completionForm = document.getElementById('ceo-completion-form');
          if (completionForm) {
            completionForm.style.display = 'block';
          }

          // 7. Refresh the CEO Dashboard Table quietly in the background
          if (typeof loadCEODashboardData === "function") {
            loadCEODashboardData();
          }
        })
        .catch(err => {
          console.error("Status Update Error:", err);
          showToast("Failed to update. Check database connection.", "error");

          // If it fails, restore the button so they can try again
          this.innerHTML = originalText;
          this.disabled = false;
          this.style.opacity = "1";
        });
    });
  }
});

// ==========================================
// BACKEND API CONNECTION LOGIC (RoadWise)
// ==========================================
// STEP 1: Validate and show the custom popup
function submitRoadReport() {
  const roadName = document.getElementById("cityRoadName")?.value;
  const widthVal = document.getElementById("width")?.value;
  const lengthVal = document.getElementById("length")?.value;

  // ⬇️ REVERTED: Only strictly require the Road Details ⬇️
  if (!roadName || !widthVal || !lengthVal) {
    showToast("Please fill in all required fields (Road Name, Width, and Length).", "error");
    return;
  }

  // If they selected "Other" but left the text box blank, we should still warn them
  const damageType = document.getElementById("damageType")?.value;
  if (damageType === "Other" && !document.getElementById("otherDamageType")?.value) {
    showToast("Please specify the 'Other' damage type.", "error");
    return;
  }

  const width = parseFloat(widthVal);
  const length = parseFloat(lengthVal);
  const bridges = parseInt(document.getElementById("numberOfBridges")?.value) || 0;
  const culverts = parseFloat(document.getElementById("lengthOfCulverts")?.value) || 0;

  if (width < 0 || length < 0 || bridges < 0 || culverts < 0) {
    showToast("Measurements cannot be negative numbers! Please correct them.", "error");
    return;
  }

  // Show our sleek new modern modal instead of window.confirm!
  document.getElementById('confirm-modal').classList.remove('hidden');
}

// STEP 2: Close the popup if they click Cancel
function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}

// STEP 3: The actual server submission if they click "Yes, Submit"
// STEP 3: The actual server submission if they click "Yes, Submit"
function executeFinalSubmission() {
  closeConfirmModal();

  const submitBtn = document.getElementById("submit-report-btn");
  if (submitBtn) {
    submitBtn.innerHTML = "⏳ Submitting...";
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.7";
  }

  const formData = new FormData();
  const loggedInBarangayId = sessionStorage.getItem("barangayId");
  if (loggedInBarangayId) {
    formData.append("barangayId", loggedInBarangayId);
  }

  // ==============================================================
  // 🛡️ THE BULLETPROOF DATA EXTRACTOR 🛡️
  // This guarantees we get data from disabled or auto-filled fields!
  // ==============================================================
  function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return ""; // Failsafe if ID doesn't exist

    if (el.tagName === "SELECT") {
      if (el.selectedIndex === -1) return "";
      const opt = el.options[el.selectedIndex];
      if (opt.disabled) return ""; // Skip the "Select Road" placeholder
      // Prefer the 'value', but fallback to the raw text if 'value' is empty!
      return (opt.value && opt.value.trim() !== "") ? opt.value : opt.text;
    }
    return el.value || "";
  }

  // 1. Road Details (Now immune to the disabled field bug!)
  formData.append("cityRoadName", getVal("cityRoadName"));
  formData.append("cityRoadId", getVal("cityRoadId"));
  formData.append("roadImportance", getVal("roadImportance"));
  formData.append("roadType", getVal("roadType"));
  formData.append("terrainType", getVal("terrainType"));

  // 2. Measurements
  formData.append("width", parseFloat(getVal("width")) || 0.0);
  formData.append("length", parseFloat(getVal("length")) || 0.0);
  formData.append("numberOfBridges", parseInt(getVal("numberOfBridges")) || 0);
  formData.append("lengthOfCulverts", parseFloat(getVal("lengthOfCulverts")) || 0.0);
  formData.append("damageDescription", getVal("damageDescription"));

  // 3. ⬇️ THE NEW DAMAGE FIELDS ⬇️
  let finalDamageType = getVal("damageType");
  if (!finalDamageType || finalDamageType.includes("Select Damage")) {
    finalDamageType = "None"; // Force "None" if they skip it
  } else if (finalDamageType === "Other") {
    finalDamageType = getVal("otherDamageType") || "Other";
  }

  formData.append("damageType", finalDamageType);
  formData.append("damageLength", parseFloat(getVal("damageLength")) || 0.0);
  formData.append("damageWidth", parseFloat(getVal("damageWidth")) || 0.0);

  // 4. GPS & Analytics
  formData.append("latitude", parseFloat(getVal("latitude")) || 0.0);
  formData.append("longitude", parseFloat(getVal("longitude")) || 0.0);
  formData.append("inventoryYear", new Date().getFullYear());
  formData.append("severity", "Unassessed");
  formData.append("cvDamageClassification", "Pending CV Analysis");
  formData.append("cvConfidenceScore", 0.0);

  // 5. Image Processing
  const imageInput = document.getElementById("damageImageFile");
  if (imageInput && imageInput.files.length > 0) {
    formData.append("imageFile", imageInput.files[0]);
  }

  // 🔍 DEV DEBUGGER: Prints exactly what is going to PostgreSQL into your browser console!
  console.log("--- DATA LEAVING BROWSER ---");
  for (let pair of formData.entries()) {
    console.log(pair[0] + ": " + pair[1]);
  }

  // 6. Send to Spring Boot
  fetch(`${API_BASE_URL}/api/reports`, {
    method: "POST",
    body: formData
  })
    .then(response => {
      if (response.ok) return response.json();
      throw new Error('Network response was not ok.');
    })
    .then(data => {
      showToast("Report securely saved to the database!", "success");
      if (typeof resetAddReportForm === 'function') resetAddReportForm();

      if (typeof loadBarangayReports === 'function') {
        const brgyId = sessionStorage.getItem("barangayId");

        // Destroy old chart to prevent invisible canvas crashes
        const canvasId = 'severityChart';
        if (typeof Chart !== 'undefined') {
          let existingChart = Chart.getChart(canvasId);
          if (existingChart) existingChart.destroy();
        }

        if (brgyId) loadBarangayReports(brgyId);
      }

      if (submitBtn) {
        submitBtn.innerHTML = "Submit Report";
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
      }
    })
    .catch(error => {
      console.error("Error submitting report:", error);
      showToast("Failed to upload report. Check your internet connection.", "error");
      if (submitBtn) {
        submitBtn.innerHTML = "Submit Report";
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
      }
    });
}

// ==========================================
// FORM UTILITY LOGIC
// ==========================================
function resetAddReportForm() {
  // 1. Clear all manual text and number inputs
  document.getElementById("width").value = "";
  document.getElementById("length").value = "";
  document.getElementById("numberOfBridges").value = "";
  document.getElementById("lengthOfCulverts").value = "";
  document.getElementById("damageDescription").value = "";

  // 2. Clear all dropdowns and auto-filled backend fields
  document.getElementById("cityRoadName").value = "";
  document.getElementById("cityRoadId").value = "";
  document.getElementById("roadImportance").value = "";
  document.getElementById("roadType").value = "";
  document.getElementById("terrainType").value = "";

  document.getElementById("damageType").value = "";
  document.getElementById("damageLength").value = "";
  document.getElementById("damageWidth").value = "";

  // 3. Wipe the hidden map math and reset the display text
  document.getElementById("latitude").value = "";
  document.getElementById("longitude").value = "";
  const coordsDisplay = document.getElementById("coords-display");
  if (coordsDisplay) coordsDisplay.textContent = "Not Selected";

  // 4. Completely wipe the image file and hide the preview
  document.getElementById("damageImageFile").value = "";
  const preview = document.getElementById("imagePreview");
  if (preview) {
    preview.style.display = 'none';
    preview.src = "";
  }
  const fileNameDisplay = document.getElementById("fileNameDisplay");
  if (fileNameDisplay) fileNameDisplay.textContent = "";
}

// ==========================================
// LOGIN LOGIC (Connected to Spring Boot)
// ==========================================
function handleLogin() {
  // 1. Grab the HTML elements
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  if (!usernameInput || !passwordInput) {
    console.error("Could not find the username or password inputs.");
    return;
  }

  const username = usernameInput.value;
  const password = passwordInput.value;

  // 2. Security Check: Are the fields empty?
  if (!username || !password) {
    showToast("Please enter both your Official ID and password.", "error");
    return;
  }

  // 3. Button Loading State
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.innerHTML = "Authenticating... ⏳";
    loginBtn.disabled = true;
    loginBtn.style.opacity = "0.7";
  }

  // 4. REAL AUTHENTICATION via Spring Boot
  fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username,
      password: password
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Invalid credentials');
      }
      return response.json();
    })
    .then(data => {
      // SUCCESS! Save the REAL user data
      sessionStorage.setItem("userId", data.userId);
      sessionStorage.setItem("userRole", data.role); // 🚀 NEW: Save their role!

      if (data.barangayId) {
        sessionStorage.setItem("barangayId", data.barangayId);
      }

      showToast("Login Successful!", "success");

      // 5. 🚀 THE FIX: SECURE DYNAMIC ROUTING (Shreds History)
      setTimeout(() => {
        const userRole = String(data.role).toLowerCase();

        if (userRole.includes("admin") || userRole.includes("cpdo")) {
          window.location.replace("admin_dashboard.html");
        }
        else if (userRole.includes("ceo") || userRole.includes("engineer")) {
          window.location.replace("ceo_dashboard.html");
        }
        else {
          window.location.replace("barangay_dashboard.html");
        }
      }, 1000);
    })
    .catch(error => {
      console.error('Error:', error);
      showToast("Invalid username or password.", "error");

      if (loginBtn) {
        loginBtn.innerHTML = "Log in ➔";
        loginBtn.disabled = false;
        loginBtn.style.opacity = "1";
      }
    });
}
// ==========================================
// ADMIN DASHBOARD: LOAD ALL REPORTS (INBOX)
// ==========================================
function loadAdminReports() {
  // 🛡️ SAFETY CHECK: Only run this if we are actually on the Admin Dashboard!
  if (document.getElementById('ceo-metric-total')) {
    return;
  }

  const reportsTableBody = document.querySelector('.data-table tbody');
  if (!reportsTableBody) return;

  apiFetch(`/api/reports`)
    .then(reports => {
      reportsTableBody.innerHTML = '';

      // ==========================================
      // 🚀 SEPARATION OF CONCERNS: Filter out Tracking items!
      // ==========================================
      // We DO NOT want to see Dispatched, In Progress, Completed, or Closed here.
      // Those belong in the Tracking Table!
      const inboxReports = reports.filter(r => {
        const s = String(r.status || '').toLowerCase();
        return !s.includes('dispatch') &&
          !s.includes('progress') &&
          !s.includes('complet') &&
          !s.includes('clos');
      });

      if (inboxReports.length === 0) {
        reportsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No new reports in the inbox.</td></tr>';
        return;
      }

      // ==========================================
      // 🚀 SMART PRIORITY SORTING (INDUSTRY STANDARD)
      // ==========================================
      inboxReports.sort((a, b) => {
        // 1. Assign Priority Weights based on Status Lifecycle
        const getPriority = (status) => {
          const s = String(status || '').toLowerCase();

          if (s.includes('resubmit')) return 1; // 🔥 TIER 1: Resubmissions (Absolute Top)
          if (s.includes('pending')) return 2;  // 🟡 TIER 2: Regular new reports
          if (s.includes('validate')) return 3; // 🟢 TIER 3: Validated (Waiting for dispatch)
          return 4;                             // 🔴 TIER 4: Rejected (Drops to the bottom)
        };

        const priorityA = getPriority(a.status);
        const priorityB = getPriority(b.status);

        // 2. Sort by Priority Group First
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // 3. 🧠 BULLETPROOF DATE TIE-BREAKER
        const dateA = new Date(a.date_submitted || a.dateSubmitted || 0);
        const dateB = new Date(b.date_submitted || b.dateSubmitted || 0);
        return dateB - dateA; // Newest first
      });

      // ==========================================
      // BUILD TABLE ROWS
      // ==========================================
      inboxReports.forEach(report => {
        const formattedId = `#RPT-${String(report.id || 0).padStart(4, '0')}`;
        const roadId = report.cityRoadId || 'N/A';
        const roadName = report.cityRoadName || 'Unknown Road';
        const severity = report.severity || 'Unassessed';
        const dateSubmitted = report.date_submitted || report.dateSubmitted || 'N/A';

        const barangayDisplay = (report.barangay && report.barangay.barangayName)
          ? report.barangay.barangayName
          : 'Unknown Barangay';

        const severityClass = severity.toLowerCase() === 'high' ? 'high' :
          severity.toLowerCase() === 'medium' ? 'medium' :
            severity.toLowerCase() === 'low' ? 'low' : 'secondary';

        const status = report.status || 'Pending';
        const sLower = status.toLowerCase();

        // 🚀 DYNAMIC BADGES BASED ON AUDIT TRAIL LOGIC
        let statusHtml = '';
        let buttonHtml = `<button class="btn-small validate-btn" onclick="reviewReport(${report.id})">Review</button>`;

        if (sLower.includes('resubmit')) {
          statusHtml = `<span class="status-badge" style="background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba;">⚠️ Resubmitted</span>`;
        } else if (sLower.includes('pending')) {
          statusHtml = `<span class="status-badge pending">Pending Validation</span>`;
        } else if (sLower.includes('reject')) {
          statusHtml = `<span class="status-badge" style="background-color: #f8d7da; color: #721c24;">❌ Rejected</span>`;
          buttonHtml = `<button class="btn-small validate-btn" disabled style="background-color: #ccc; cursor: not-allowed;">Archived</button>`;
        } else {
          statusHtml = `<span class="status-badge validated">${status}</span>`;
          buttonHtml = `<button class="btn-small validate-btn" disabled style="background-color: #ccc; cursor: not-allowed;">Done</button>`;
        }

        const row = document.createElement('tr');

        // 🎨 UI POLISH: Dim rejected and validated items so they don't distract the Admin
        if (sLower.includes('reject') || sLower.includes('validate')) {
          row.style.opacity = '0.5';
          row.style.backgroundColor = '#f8f9fa';
        }

        row.innerHTML = `
                    <td>${formattedId}</td>
                    <td>${barangayDisplay}</td>
                    <td><b>${roadId}</b></td>
                    <td>${roadName}</td>
                    <td><span class="badge ${severityClass}">${severity}</span></td>
                    <td>${dateSubmitted}</td>
                    <td>${statusHtml}</td>
                    <td>${buttonHtml}</td>
                `;
        reportsTableBody.appendChild(row);
      });

      // 🚀 FORCE TABLE SCROLL TO TOP ON LOAD
      const tableContainer = document.querySelector('.table-container') || document.querySelector('.table-responsive');
      if (tableContainer) tableContainer.scrollTop = 0;

    })
    .catch(error => {
      console.error("Error loading admin reports:", error);
      if(reportsTableBody) {
        reportsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red; padding: 20px;">Error loading reports from database.</td></tr>';
      }
    });
}
// ==========================================
// ADMIN MODAL MAP VARIABLES
// ==========================================
let currentReviewLat = null;
let currentReviewLng = null;
let adminReviewMap = null;
let adminReviewMarker = null;
// Variable to store the ID of the report currently open in the Review Modal
let currentReviewReportId = null;

// Ensure it runs when the script loads
loadAdminReports();
// ==========================================
// ADMIN DASHBOARD: OPEN REVIEW MODAL
// ==========================================
function reviewReport(reportId) {
  currentReviewReportId = reportId;

  // 1. FIRST: Define and grab the modal
  const modal = document.getElementById('review-modal');
  if (!modal) return;

  // 2. Unhide the modal
  modal.classList.remove('hidden');

  // 3. 🚀 THE BULLETPROOF SCROLL RESET (Fixes the stuck scroll bug 100% of the time)
  setTimeout(() => {
    const modalBody = modal.querySelector('.modal-body');
    const modalContent = modal.querySelector('.modal-content');
    if (modalBody) modalBody.scrollTop = 0;
    if (modalContent) modalContent.scrollTop = 0;
    modal.scrollTop = 0;
  }, 10);

  // ⬇️ FORCE THE MAP CONTAINER CLOSED WHEN OPENING A NEW REPORT ⬇️
  const mapContainer = document.getElementById('admin-review-map-container');
  if (mapContainer) mapContainer.style.display = 'none';

  // Temporary loading text
  document.getElementById('modal-header-id').textContent = `#RPT-${String(reportId).padStart(4, '0')} (Loading...)`;

  // 🚀 FIXED: Now using apiFetch to bypass ngrok!
  apiFetch(`/api/reports/${reportId}`)
    .then(report => {
      // 2. Format basic data
      const formattedId = `#RPT-${String(report.id).padStart(4, '0')}`;
      const severity = report.severity || 'Unassessed';
      const severityClass = severity.toLowerCase() === 'high' ? 'high' :
        severity.toLowerCase() === 'medium' ? 'medium' :
          severity.toLowerCase() === 'low' ? 'low' : 'secondary';

      // ⬇️ SAVE THE COORDINATES FOR THE MAP BUTTON ⬇️
      currentReviewLat = report.latitude;
      currentReviewLng = report.longitude;

      // 3. Inject text into the HTML IDs
      document.getElementById('modal-header-id').textContent = formattedId;
      document.getElementById('modal-report-id').textContent = formattedId;

      const severityBadge = document.getElementById('modal-severity');
      severityBadge.textContent = severity;
      severityBadge.className = `badge ${severityClass}`;

      document.getElementById('modal-date').textContent = report.dateSubmitted || 'N/A';
      document.getElementById('modal-gps').textContent = `${report.latitude || 0}° N, ${report.longitude || 0}° E`;
      document.getElementById('modal-barangay').textContent = (report.barangay && report.barangay.barangayName) ? report.barangay.barangayName : 'Unknown';

      document.getElementById('modal-road-name').textContent = report.cityRoadName || 'N/A';
      document.getElementById('modal-road-id').textContent = report.cityRoadId || 'N/A';
      document.getElementById('modal-importance').textContent = report.roadImportance || 'N/A';
      document.getElementById('modal-terrain').textContent = report.terrainType || 'N/A';
      document.getElementById('modal-road-type').textContent = report.roadType || 'N/A';

      document.getElementById('modal-length').textContent = report.length || 0;
      document.getElementById('modal-width').textContent = report.width || 0;
      document.getElementById('modal-culverts').textContent = report.lengthOfCulverts || 0;
      document.getElementById('modal-bridges').textContent = report.numberOfBridges || 0;
      document.getElementById('modal-damage-type').textContent = report.damageType || 'None';
      document.getElementById('modal-damage-length').textContent = report.damageLength || 0;
      document.getElementById('modal-damage-width').textContent = report.damageWidth || 0;

      document.getElementById('modal-description').textContent = report.damageDescription || 'No description provided.';

      // 4. Handle the Image Upload Display
      // 🚀 FIXED: Securely load image
      const placeholderEl = document.getElementById('modal-damage-image');
      if (placeholderEl) placeholderEl.style.display = 'none'; // Hide until loaded
      loadSecureImage('modal-damage-image', report.damageImage);

    })
    .catch(error => {
      console.error("Error:", error);
      document.getElementById('modal-header-id').textContent = "Database Error!";
    });
}

// ==========================================
// ADMIN DASHBOARD: CLOSE REVIEW MODAL
// ==========================================
window.closeReviewModal = function() {
  const modal = document.getElementById('review-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

// ==========================================
// ADMIN DASHBOARD: LOCATE ON MAP BUTTON
// ==========================================
const btnLocateMap = document.getElementById('btn-admin-locate-map');
if (btnLocateMap) {
  btnLocateMap.addEventListener('click', function() {
    const mapContainer = document.getElementById('admin-review-map-container');

    // Safety check: Did the Barangay Official actually provide GPS coordinates?
    if (!currentReviewLat || !currentReviewLng || (currentReviewLat === 0 && currentReviewLng === 0)) {
      alert("No GPS coordinates were provided for this report.");
      return;
    }

    // Toggle the map open/closed
    if (mapContainer.style.display === 'none') {
      mapContainer.style.display = 'block';


      // Define a custom Red Icon for damages
      const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // If the map hasn't been built yet, build it!
      if (!adminReviewMap) {
        adminReviewMap = L.map('admin-review-map').setView([currentReviewLat, currentReviewLng], 17);
        // Switch to Esri World Imagery (Satellite View)
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(adminReviewMap);

        // Drop the RED pin!
        adminReviewMarker = L.marker([currentReviewLat, currentReviewLng], {icon: redIcon}).addTo(adminReviewMap);
      } else {
        // If the map is already built, move the camera, update the pin location, AND ensure it stays red
        adminReviewMap.setView([currentReviewLat, currentReviewLng], 17);
        adminReviewMarker.setLatLng([currentReviewLat, currentReviewLng]);
        adminReviewMarker.setIcon(redIcon);
      }

      // CRUCIAL LEAFLET TRICK: Leaflet breaks if loaded inside a hidden div.
      // We must tell it to recalculate its size a fraction of a second after we unhide it.
      setTimeout(() => {
        adminReviewMap.invalidateSize();
      }, 200);

    } else {
      // Close the map if they click the button again
      mapContainer.style.display = 'none';
    }
  });
}
// ==========================================
// BARANGAY DASHBOARD: FETCH REAL DATA (SAFE UI)
// ==========================================
let severityChartInstance = null;

// 🧠 NEW: Progress Bar Logic (Fail-Safe Version)
function calculateJurisdictionProgress(barangayId, reports) {
  // 1. Calculate how many UNIQUE roads have been inspected
  const inspectedRoadNames = new Set(reports.map(r => r.cityRoadName).filter(name => name));
  const inspectedCount = inspectedRoadNames.size;

  // 2. Fetch total assigned roads for this specific barangay from the database
  // 🚀 FIXED: Now using apiFetch to bypass ngrok!
  apiFetch(`/api/roads`)
    .then(allRoads => {
      if (!Array.isArray(allRoads)) {
        throw new Error("API did not return a valid array of roads.");
      }

      // Filter roads to only count ones belonging to this official's barangay
      const barangayRoads = allRoads.filter(road => road.barangay && String(road.barangay.id) === String(barangayId));
      const totalRoads = barangayRoads.length;

      // Fallback: If DB has no roads assigned yet, use the inspected count
      const displayTotal = totalRoads > 0 ? totalRoads : Math.max(inspectedCount, 1);

      updateProgressBarUI(inspectedCount, displayTotal);
    })
    .catch(err => {
      console.warn("Notice: Roads API unavailable or empty. Defaulting to dynamic quota.", err);
      const displayTotal = Math.max(inspectedCount, 1);
      updateProgressBarUI(inspectedCount, displayTotal);
    });
}

// 🎨 Helper function to update the HTML cleanly
function updateProgressBarUI(inspectedCount, displayTotal) {
  let percentage = Math.round((inspectedCount / displayTotal) * 100);
  if (percentage > 100) percentage = 100;

  const progressText = document.getElementById('progress-text');
  const progressPercent = document.getElementById('progress-percentage');
  const barFill = document.getElementById('progress-bar-fill');

  if (progressText && progressPercent && barFill) {
    progressText.innerHTML = `<strong>${inspectedCount}</strong> out of <strong>${displayTotal}</strong> assigned roads inspected this month.`;
    progressPercent.innerText = `${percentage}%`;
    barFill.style.width = `${percentage}%`;

    // Turn the bar Green if they reach 100% quota
    if (percentage === 100) {
      barFill.style.background = 'linear-gradient(90deg, #28a745, #34ce57)'; // Green
      progressPercent.style.color = '#28a745';
    } else {
      barFill.style.background = 'linear-gradient(90deg, #007bff, #00d2ff)'; // Blue
      progressPercent.style.color = '#007bff';
    }
  }
}

function loadBarangayReports(barangayId) {
  const listContainer = document.getElementById('barangay-report-list');
  if (!listContainer) return;

  listContainer.innerHTML = "<p style='text-align:center; padding: 20px;'>Loading your reports...</p>";

  // 🚀 Replaced standard fetch with your new wrapper
  apiFetch(`/api/reports/barangay/${barangayId}`)
    .then(reports => {
      // 🚀 TRIGGER THE PROGRESS BAR MATH
      calculateJurisdictionProgress(barangayId, reports);

      if (reports.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center; padding: 20px;'>No reports found for your area.</p>";
        return;
      }

      // ==========================================
      // 🚀 BARANGAY SORTING: "ACTION REQUIRED" FIRST
      // ==========================================
      reports.sort((a, b) => {
        const getPriority = (status) => {
          const s = String(status || '').toLowerCase();

          if (s.includes('reject')) return 1; // 🔴 TIER 1: Needs immediate editing! (Top)
          if (s.includes('pending') || s.includes('resubmit')) return 2; // 🟡 TIER 2: Waiting for Admin
          if (s.includes('validate') || s.includes('dispatch') || s.includes('progress')) return 3; // 🔵 TIER 3: Approved & active
          return 4; // 🟢 TIER 4: Completed/Closed (Bottom)
        };

        const priorityA = getPriority(a.status);
        const priorityB = getPriority(b.status);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Tie-breaker: Newest first
        const dateA = new Date(a.date_submitted || a.dateSubmitted || 0);
        const dateB = new Date(b.date_submitted || b.dateSubmitted || 0);
        return dateB - dateA;
      });

      let pending = 0, validated = 0, rejected = 0;
      let highSev = 0, medSev = 0, lowSev = 0;

      // 🚀 BEST PRACTICE: Build a single HTML string
      let allRowsHtml = "";

      reports.forEach(report => {
        // Safely count statuses even if the backend returns "Pending Validation"
        const sLower = String(report.status || '').toLowerCase();
        if (sLower.includes('pending') || sLower.includes('resubmit')) pending++;
        else if (sLower.includes('validate') || sLower.includes('dispatch') || sLower.includes('progress')) validated++;
        else if (sLower.includes('reject')) rejected++;

        if (report.severity === "High") highSev++;
        else if (report.severity === "Medium") medSev++;
        else if (report.severity === "Low") lowSev++;

        let badgeClass = "bd-badge-pending";
        if (sLower.includes("validate") || sLower.includes("dispatch") || sLower.includes("progress")) badgeClass = "bd-badge-validated";
        if (sLower.includes("reject")) badgeClass = "bd-badge-rejected";

        // Handle Resubmitted UI specific to Barangay
        let displayStatus = report.status;
        if (sLower.includes("resubmit")) {
          badgeClass = "bd-badge-pending"; // keep it looking like pending, but add a warning icon
          displayStatus = "⚠️ Resubmitted";
        }

        let dateStr = new Date(report.date_submitted || report.dateSubmitted).toLocaleDateString();

        let rowHtml = `
                <div class="bd-list-item">
                  <div class="bd-item-image">
    <img id="brgy-preview-img-${report.id}"
         src="https://placehold.co/300x200/png?text=Loading..."
         alt="Report Image"
         onclick="openFullscreenImage(this)"> </div>
                  <div class="bd-item-details">
                    <div>
                      <div class="bd-item-title">${report.cityRoadName || 'Unknown Road'} Inspection</div>
                      <div class="bd-item-meta">
                        <span>📍 Brgy. ID: ${report.barangay ? report.barangay.id : 'N/A'}</span>
                        <span>📅 ${dateStr}</span>
                      </div>
                    </div>
                    ${sLower.includes('reject') && report.adminRemarks ? `
                    <div class="bd-feedback-box"><strong style="color: #dc3545;">Admin Note:</strong> ${report.adminRemarks}</div>
                    ` : `<p style="font-size: 13px; color: #666; margin-top: 5px;">${report.damageDescription || 'No damage reported.'}</p>`}
                  </div>
                 <div class="bd-item-actions">
                  <div class="bd-status-badge ${badgeClass}">${displayStatus}</div>

                  ${sLower.includes('reject') ? `
                    <button class="bd-btn-action" style="background-color: #dc3545;" onclick="openEditModal(${report.id})">Edit & Resubmit</button>
                  ` : `
                    <button class="bd-btn-action" style="background-color: #6c757d;" onclick="openViewModal(${report.id})">View Status</button>
                  `}
                </div>
                </div>`;

        allRowsHtml += rowHtml;
      });

      // 1. Inject all the HTML into the page at once
      listContainer.innerHTML = allRowsHtml;

      // 🚀 2. Load secure images
      reports.forEach(report => {
        loadSecureImage(`brgy-preview-img-${report.id}`, report.damageImage);
      });

      // Update Metrics
      document.getElementById('metric-total').innerText = reports.length;
      document.getElementById('metric-pending').innerText = pending;
      document.getElementById('metric-validated').innerText = validated;
      document.getElementById('metric-rejected').innerText = rejected;

      // Update Chart
      updateSeverityChart([highSev, medSev, lowSev]);
    })
    .catch(error => {
      console.error("Error loading reports:", error);
      listContainer.innerHTML = "<p style='text-align:center; padding: 20px; color: red;'>Failed to load reports. Please try again.</p>";
    });
}

function updateSeverityChart(dataArray) {
  const canvasId = 'severityChart';
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  let existingChart = Chart.getChart(canvasId);
  if (existingChart) existingChart.destroy();

  const totalSeverity = dataArray.reduce((a, b) => a + b, 0);
  const isEmpty = totalSeverity === 0;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: isEmpty ? ['Pending AI Assessment'] : ['High', 'Medium', 'Low'],
      datasets: [{
        data: isEmpty ? [1] : dataArray,
        backgroundColor: isEmpty ? ['#e9ecef'] : ['#dc3545', '#f0ad4e', '#28a745'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { enabled: !isEmpty }
      },
      cutout: '70%'
    }
  });
}
// ==========================================
// SMART DASHBOARD LOADER (AUTO-REFRESHING)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {

  // 1. BARANGAY DASHBOARD LOGIC
  if (document.getElementById('barangay-report-list')) {
    const storedBarangayId = sessionStorage.getItem("barangayId");
    if (!storedBarangayId) {
      alert("Security Check: You must log in first!");
      window.location.href = "login.html";
      return;
    }

    // Initial Load when logging in
    console.log("Welcome! Loading reports for Barangay ID: " + storedBarangayId);
    loadBarangayReports(storedBarangayId);

    // 🚀 THE NAVIGATION FIX (Mutation Observer)
    // Watches the Barangay Dashboard. Every time you click the "Dashboard" sidebar button, it refreshes!
    const brgyDashboardSection = document.getElementById('view-dashboard');
    if (brgyDashboardSection) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            if (!brgyDashboardSection.classList.contains('hidden')) {
              // Destroy old chart before reloading to prevent glitches
              if (severityChartInstance) severityChartInstance.destroy();
              loadBarangayReports(storedBarangayId);
            }
          }
        });
      });
      observer.observe(brgyDashboardSection, { attributes: true });
    }
  }

});

// ==========================================
// BULLETPROOF CLOSE FUNCTION
// ==========================================
function closeBdModals() {
  const viewModal = document.getElementById('bd-view-modal');
  const editModal = document.getElementById('bd-edit-modal');

  if (viewModal !== null) {
    viewModal.classList.remove('active');
  }
  if (editModal !== null) {
    editModal.classList.remove('active');
  }
}

// 1. OPEN VIEW MODAL (DETAILED GRID)
function openViewModal(reportId) {
  apiFetch(`/api/reports/${reportId}`)
    .then(report => {
      // Header
      document.getElementById('view-modal-id-header').innerText = `#RPT-${report.id.toString().padStart(4, '0')}`;

      // Status Badge
      const statusBadge = document.getElementById('view-modal-status');
      statusBadge.innerText = report.status;
      statusBadge.className = "bd-status-badge " +
        (report.status === 'Validated' ? 'bd-badge-validated' :
          (report.status === 'Rejected' ? 'bd-badge-rejected' : 'bd-badge-pending'));

      // Overview Section
      document.getElementById('view-modal-severity').innerText = report.severity || "🤖 Pending AI";
      document.getElementById('view-modal-severity').style.color =
        report.severity === 'High' ? '#dc3545' : (report.severity === 'Medium' ? '#f0ad4e' : '#6c757d');
      document.getElementById('view-modal-date').innerText = new Date(report.dateSubmitted).toLocaleDateString();
      document.getElementById('view-modal-gps').innerText =
        (report.latitude && report.longitude) ? `${report.latitude}, ${report.longitude}` : "Not provided";

      // Road Details Section
      document.getElementById('view-modal-road-name').innerText = report.cityRoadName || "N/A";
      document.getElementById('view-modal-road-id').innerText = report.cityRoadId || "N/A";
      document.getElementById('view-modal-importance').innerText = report.roadImportance || "N/A";
      document.getElementById('view-modal-terrain').innerText = report.terrainType || "N/A";
      document.getElementById('view-modal-road-type').innerText = report.roadType || "N/A";
      document.getElementById('view-modal-length').innerText = report.length || "0";
      document.getElementById('view-modal-width').innerText = report.width || "0";
      document.getElementById('view-modal-culverts').innerText = report.lengthOfCulverts || "0";
      document.getElementById('view-modal-bridges').innerText = report.numberOfBridges || "0";

      document.getElementById('view-modal-damage-type').innerText = report.damageType || "None";
      document.getElementById('view-modal-damage-length').innerText = report.damageLength || "0";
      document.getElementById('view-modal-damage-width').innerText = report.damageWidth || "0";
      // Damage Evidence Section
      document.getElementById('view-modal-desc').innerText = report.damageDescription || "No description provided.";

      // 🚀 FIXED: Securely load image (bypasses Ngrok/CORS)
      loadSecureImage('view-modal-img', report.damageImage);
      // Feedback Section
      const feedbackBox = document.getElementById('view-modal-feedback');
      if (report.adminRemarks) {
        feedbackBox.style.display = "block";
        document.getElementById('view-modal-remarks').innerText = report.adminRemarks;
      } else {
        feedbackBox.style.display = "none";
      }

      // Finally, show the modal!
      const viewModal = document.getElementById('bd-view-modal');
      viewModal.classList.add('active');

      // 🚀 THE FIX: Scroll the View Modal back to the top
      const viewModalBody = viewModal.querySelector('.bd-modal-body');
      if (viewModalBody) {
        viewModalBody.scrollTop = 0;
      }
    })
    .catch(err => {
      console.error(err);
      showToast("Error loading details.", "error");
    });
}

// ==========================================
// 2. OPEN EDIT MODAL (Full Form Replica)
// ==========================================
function openEditModal(reportId) {
  apiFetch(`/api/reports/${reportId}`)
    .then(report => {
      document.getElementById('edit-modal-id-header').innerText = `#RPT-${report.id.toString().padStart(4, '0')}`;
      document.getElementById('edit-report-id').value = report.id;
      document.getElementById('edit-modal-remarks').innerText = report.adminRemarks || "Please review and fix the details below.";

      // 🔒 LOCKED INPUTS (Using .value because they are now <input disabled>)
      document.getElementById('edit-modal-road-name').value = report.cityRoadName || "N/A";
      document.getElementById('edit-modal-road-id').value = report.cityRoadId || "N/A";
      document.getElementById('edit-modal-importance').value = report.roadImportance || "N/A";
      document.getElementById('edit-modal-road-type').value = report.roadType || "N/A";
      document.getElementById('edit-modal-terrain').value = report.terrainType || "N/A";
      document.getElementById('edit-modal-severity').value = report.severity || "🤖 Pending AI Assessment";

      // 📍 GPS Text
      document.getElementById('edit-modal-gps').innerText = (report.latitude && report.longitude) ? `${report.latitude}, ${report.longitude}` : "Not Selected";

      document.getElementById('edit-latitude').value = report.latitude || "";
      document.getElementById('edit-longitude').value = report.longitude || "";
      // ✏️ EDITABLE NUMBER INPUTS
      document.getElementById('edit-modal-length').value = report.length || "";
      document.getElementById('edit-modal-width').value = report.width || "";
      document.getElementById('edit-modal-culverts').value = report.lengthOfCulverts || "";
      document.getElementById('edit-modal-bridges').value = report.numberOfBridges || "";

      document.getElementById('edit-modal-damage-length').value = report.damageLength || "";
      document.getElementById('edit-modal-damage-width').value = report.damageWidth || "";

      // Check if the saved damage type is one of the standard options, otherwise put it in "Other"
      const standardTypes = ["Pothole", "Surface Cracking", "Edge Deformation", "Washout/Sinkhole", "None"];
      const savedType = report.damageType || "None";

      if (standardTypes.includes(savedType)) {
        document.getElementById('edit-modal-damage-type').value = savedType;
        document.getElementById('edit-modal-damage-other').classList.add('hidden');
      } else {
        document.getElementById('edit-modal-damage-type').value = "Other";
        const otherInput = document.getElementById('edit-modal-damage-other');
        otherInput.value = savedType;
        otherInput.classList.remove('hidden');
      }
      // ✏️ EDITABLE DESCRIPTION & IMAGE
      document.getElementById('edit-modal-desc').value = report.damageDescription || "";

      // 🚀 FIXED: Securely load image (bypasses Ngrok/CORS)
      loadSecureImage('edit-modal-current-img', report.damageImage);

      // Clear old file inputs
      document.getElementById('edit-modal-img').value = "";
      document.getElementById('edit-modal-filename').innerText = "";

      // Finally, show the edit modal!
      const editModal = document.getElementById('bd-edit-modal');
      editModal.classList.add('active');

      // 🚀 THE FIX: Scroll the Edit Modal back to the top
      const editModalBody = editModal.querySelector('.bd-modal-body');
      if (editModalBody) {
        editModalBody.scrollTop = 0;
      }
    })
    .catch(err => showToast("Error loading report.", "error"));
}

// ==========================================
// 3. SUBMIT THE FULLY EDITED REPORT
// ==========================================
function submitEditedReport() {
  const reportId = document.getElementById('edit-report-id').value;
  const fileInput = document.getElementById('edit-modal-img');

  if (fileInput.files.length > 0 && fileInput.files[0].size > 5 * 1024 * 1024) {
    showToast("File is too large! Must be under 5MB.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("damageDescription", document.getElementById('edit-modal-desc').value);

  // ⬇️ Attach all the new editable numbers!
  formData.append("length", document.getElementById('edit-modal-length').value);
  formData.append("width", document.getElementById('edit-modal-width').value);
  formData.append("lengthOfCulverts", document.getElementById('edit-modal-culverts').value);
  formData.append("numberOfBridges", document.getElementById('edit-modal-bridges').value);
  formData.append("latitude", document.getElementById('edit-latitude').value);
  formData.append("longitude", document.getElementById('edit-longitude').value);
  if (fileInput.files.length > 0) {
    formData.append("imageFile", fileInput.files[0]);
  }
  let editedDamageType = document.getElementById('edit-modal-damage-type').value;
  if (editedDamageType === "Other") {
    editedDamageType = document.getElementById('edit-modal-damage-other').value || "Other";
  }
  formData.append("damageType", editedDamageType);
  formData.append("damageLength", document.getElementById('edit-modal-damage-length').value || 0);
  formData.append("damageWidth", document.getElementById('edit-modal-damage-width').value || 0);


  fetch(`${API_BASE_URL}/api/reports/update/${reportId}`, {
    method: 'PUT',
    headers: {
      'ngrok-skip-browser-warning': 'true'
    },
    body: formData
  })
    .then(response => {
      if (!response.ok) throw new Error("Update failed");
      showToast("Report successfully updated and resubmitted!", "success");
      closeBdModals();

      const storedBarangayId = sessionStorage.getItem("barangayId");
      if (storedBarangayId) loadBarangayReports(storedBarangayId);
    })
    .catch(error => showToast("Error updating report.", "error"));
}

// ==========================================
// EDIT MODAL: IMAGE PREVIEW LOGIC
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const editImageInput = document.getElementById('edit-modal-img');
  const editImagePreview = document.getElementById('edit-modal-current-img');
  const editFileNameDisplay = document.getElementById('edit-modal-filename');

  if (editImageInput) {
    editImageInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        // Security Check
        const maxSizeInMB = 5;
        if (file.size > maxSizeInMB * 1024 * 1024) {
          showToast(`File is too large! Please choose an image smaller than ${maxSizeInMB}MB.`, "error");
          this.value = "";
          editFileNameDisplay.textContent = "";
          return;
        }

        // Show the file name
        editFileNameDisplay.textContent = "New Selection: " + file.name;

        // Instantly swap the image preview!
        const reader = new FileReader();
        reader.onload = function(e) {
          editImagePreview.src = e.target.result;
        }
        reader.readAsDataURL(file);
      }
    });
  }
});

// ==========================================
// UNIFIED TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  if (!toast || !toastMsg || !toastIcon) {
    console.warn("Warning: Could not find toast HTML elements.");
    return;
  }

  // 1. Set the text and icon
  toastMsg.textContent = message;
  toastIcon.textContent = (type === 'success') ? '✅' : '⚠️';

  // 2. Set the background color
  toast.style.backgroundColor = (type === 'success') ? "#28a745" : "#dc3545";

  // 3. Force it to display and slide in
  toast.style.display = "flex";
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 10);

  // 4. Hide it smoothly after 4 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
  }, 4000);
}
// ==========================================
// 0. FETCH ROADS FOR DROPDOWN
// ==========================================
loadRoadsToDropdown();

function loadRoadsToDropdown() {
  const roadDropdown = document.getElementById("cityRoadName");
  if (!roadDropdown) return;

  // 1. Grab the ID from the browser's memory FIRST!
  const loggedInBarangayId = sessionStorage.getItem("barangayId");

  // 2. Safety check: If they aren't logged in, stop the code.
  if (!loggedInBarangayId) {
    console.error("No Barangay ID found. Cannot load roads.");
    roadDropdown.innerHTML = '<option value="" disabled selected>Please log in first...</option>';
    return;
  }

  // 3. NOW fetch the roads using the ID and our new apiFetch wrapper!
  apiFetch(`/api/roads/barangay/${loggedInBarangayId}`)
    .then(roads => {
      roadDropdown.innerHTML = '<option value="" disabled selected>Select a City Road...</option>';

      // 4. Loop directly through the roads (Spring Boot already filtered them for us!)
      roads.forEach(road => {
        const option = document.createElement("option");
        option.value = road.roadName;
        option.textContent = road.roadName;

        option.dataset.roadId = road.roadId || road.id;
        option.dataset.importance = road.roadImportance;
        option.dataset.type = road.roadType;
        option.dataset.terrain = road.terrainType;

        roadDropdown.appendChild(option);
      });
    })
    .catch(error => console.error("Error loading roads:", error));

  // THE AUTO-FILL LISTENER
  roadDropdown.addEventListener("change", function() {
    const selectedOption = this.options[this.selectedIndex];

    const idBox = document.getElementById("cityRoadId");
    const importanceBox = document.getElementById("roadImportance");
    const typeBox = document.getElementById("roadType");
    const terrainBox = document.getElementById("terrainType");

    if (idBox) idBox.value = selectedOption.dataset.roadId || "";
    if (importanceBox) importanceBox.innerHTML = `<option value="${selectedOption.dataset.importance}">${selectedOption.dataset.importance}</option>`;
    if (typeBox) typeBox.innerHTML = `<option value="${selectedOption.dataset.type}">${selectedOption.dataset.type}</option>`;
    if (terrainBox) terrainBox.innerHTML = `<option value="${selectedOption.dataset.terrain}">${selectedOption.dataset.terrain}</option>`;
  });
}
// ==========================================
// ADMIN DASHBOARD: FETCH REAL DATA (AUTO-REFRESHING)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {

  // 1. Load data on the very first login
  if (document.getElementById('adminComplianceChart')) {
    loadAdminDashboardData();
  }

  // 2. 🚀 THE NAVIGATION FIX (Mutation Observer)
  // This watches your Admin Dashboard HTML section. Whenever it becomes visible
  // (meaning the user clicked "Dashboard" in the sidebar), it automatically fetches fresh data!
  const dashboardSection = document.getElementById('view-admin-dashboard');
  if (dashboardSection) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // If the 'hidden' class is removed, the dashboard is on screen!
          if (!dashboardSection.classList.contains('hidden')) {
            loadAdminDashboardData();
          }
        }
      });
    });
    observer.observe(dashboardSection, { attributes: true });
  }
});

function loadAdminDashboardData() {
  console.log("🚀 [Admin Dashboard] Starting data fetch...");

  Promise.all([
    apiFetch(`/api/reports`, { cache: 'no-store' }).catch(err => {
      console.error("🚨 [Reports API] Failed inside Promise.all:", err);
      return []; // Return empty so charts don't crash
    }),
    apiFetch(`/api/roads`, { cache: 'no-store' }).catch(err => {
      console.error("🚨 [Roads API] Failed inside Promise.all:", err);
      return [];
    })
  ])
    .then(([reports, roads]) => {
      console.log(`✅ [Admin Dashboard] Success! Fetched ${reports.length} reports and ${roads.length} roads.`);

      const pendingReports = reports.filter(r => String(r.status || '').trim().toLowerCase() === 'pending validation');

      console.log(`🔎 [Admin Dashboard] Filter caught ${pendingReports.length} 'Pending Validation' reports.`);

      const validatedReports = reports.filter(r => String(r.status || '').trim().toLowerCase() === 'validated');
      const criticalReports = reports.filter(r => String(r.severity || '').trim().toLowerCase() === 'high' && String(r.status || '').trim().toLowerCase() === 'validated');
      const dispatchedReports = reports.filter(r => String(r.status || '').trim().toLowerCase() === 'dispatched to ceo');

      const uniqueInspectedRoads = new Set(reports.map(r => r.cityRoadName).filter(name => name)).size;
      const totalCityRoads = roads.length > 0 ? roads.length : Math.max(uniqueInspectedRoads, 1);
      let quotaPercentage = Math.round((uniqueInspectedRoads / totalCityRoads) * 100);
      if (quotaPercentage > 100) quotaPercentage = 100;

      // Inject Metrics
      if (document.getElementById('admin-metric-pending')) document.getElementById('admin-metric-pending').innerText = pendingReports.length;
      if (document.getElementById('admin-metric-quota')) document.getElementById('admin-metric-quota').innerText = `${quotaPercentage}%`;
      if (document.getElementById('admin-metric-critical')) document.getElementById('admin-metric-critical').innerText = criticalReports.length;
      if (document.getElementById('admin-metric-validated')) document.getElementById('admin-metric-validated').innerText = validatedReports.length;
      if (document.getElementById('admin-metric-dispatched')) document.getElementById('admin-metric-dispatched').innerText = dispatchedReports.length;

      // ==========================================
      // 🚀 BUILD ACTION QUEUE (FRESH REBUILD)
      // ==========================================
      const queueBody = document.getElementById('fresh-admin-queue-body');

      if (!queueBody) {
        console.error("🚨 [Admin Dashboard] ERROR: Could not find 'fresh-admin-queue-body'!");
      } else {
        console.log("✅ [Admin Dashboard] Found Fresh HTML Table. Building rows...");

        queueBody.innerHTML = ''; // Clear out the 'fetching' text

        // 🚀 FIXED: 'b' minus 'a' forces the newest dates to the very top!
        pendingReports.sort((a, b) => new Date(b.dateSubmitted) - new Date(a.dateSubmitted));
        const top5Pending = pendingReports.slice(0, 5);

        if (top5Pending.length === 0) {
          queueBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #666; padding: 20px;">All caught up! No pending reports.</td></tr>`;
        } else {
          top5Pending.forEach(report => {
            const formatId = `#RPT-${String(report.id).padStart(4, '0')}`;
            const formatBrgy = (report.barangay && report.barangay.barangayName) ? report.barangay.barangayName : 'Unknown';
            const dateStr = new Date(report.dateSubmitted).toLocaleDateString();

            const sev = String(report.severity || 'Unassessed').trim();
            let badgeColor = '#e9ecef', badgeText = '#333';
            if (sev.toLowerCase() === 'high') { badgeColor = '#ffeeba'; badgeText = '#856404'; }
            else if (sev.toLowerCase() === 'medium') { badgeColor = '#ffe8a1'; badgeText = '#856404'; }
            else if (sev.toLowerCase() === 'low') { badgeColor = '#d4edda'; badgeText = '#155724'; }

            // Notice we added inline styles to the <td> elements just to be safe
            queueBody.innerHTML += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px; color: #333; font-size: 14px;"><strong>${formatId}</strong></td>
                            <td style="padding: 12px; color: #333; font-size: 14px;">${report.cityRoadName || 'Unnamed Road'}</td>
                            <td style="padding: 12px; color: #333; font-size: 14px;">${formatBrgy}</td>
                            <td style="padding: 12px;"><span class="ad-badge" style="background:${badgeColor}; color:${badgeText}; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">${sev}</span></td>
                            <td style="padding: 12px; color: #333; font-size: 14px;">${dateStr}</td>
                            <td style="padding: 12px; text-align: center;">
                                <button onclick="jumpToReportsAndReview(${report.id})" style="background-color: #1c10a3; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 12px;">Review</button>
                            </td>
                        </tr>
                    `;
          });
          console.log("✅ [Admin Dashboard] Successfully added rows to the fresh table!");
        }
      }

      renderRealAdminCharts(reports);
    })
    .catch(err => {
      console.error("🚨 Error loading Admin Dashboard data:", err);
    });
}

function renderRealAdminCharts(reports) {
  // --- Chart 1: Severity Breakdown ---
  let high = 0, med = 0, low = 0, clear = 0;
  reports.forEach(r => {
    const sev = (r.severity || '').toLowerCase();
    if (sev === 'high') high++;
    else if (sev === 'medium') med++;
    else if (sev === 'low') low++;
    else clear++;
  });

  const ctxDoughnut = document.getElementById('adminSeverityChart');
  if (ctxDoughnut) {
    // 🚀 THE CHART FIX: Destroy the old chart before drawing a new one!
    let existingDoughnut = Chart.getChart(ctxDoughnut);
    if (existingDoughnut) existingDoughnut.destroy();

    new Chart(ctxDoughnut.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['High', 'Medium', 'Low', 'Pending/Clear'],
        datasets: [{
          data: [high, med, low, clear],
          backgroundColor: ['#dc3545', '#f0ad4e', '#28a745', '#6c757d'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } }, cutout: '65%' }
    });
  }

  // --- Chart 2: Barangay Compliance ---
  const brgyData = {};
  reports.forEach(r => {
    const brgyName = (r.barangay && r.barangay.barangayName) ? r.barangay.barangayName : 'Unknown';
    if (!brgyData[brgyName]) brgyData[brgyName] = new Set();
    if (r.cityRoadName) brgyData[brgyName].add(r.cityRoadName);
  });

  const brgyLabels = [];
  const brgyCounts = [];
  Object.entries(brgyData)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5)
    .forEach(([name, roadSet]) => {
      brgyLabels.push(name);
      brgyCounts.push(roadSet.size);
    });

  const ctxBar = document.getElementById('adminComplianceChart');
  if (ctxBar && brgyLabels.length > 0) {
    // 🚀 THE CHART FIX: Destroy the old chart before drawing a new one!
    let existingBar = Chart.getChart(ctxBar);
    if (existingBar) existingBar.destroy();

    new Chart(ctxBar.getContext('2d'), {
      type: 'bar',
      data: {
        labels: brgyLabels,
        datasets: [{
          label: 'Unique Roads Inspected',
          data: brgyCounts,
          backgroundColor: '#0B2545',
          borderRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }
}

// ==========================================
// ACTION QUEUE: TAB JUMP & REVIEW LOGIC
// ==========================================
function jumpToReportsAndReview(reportId) {
  // 1. Find the "Reports" tab button in your sidebar
  const reportsTabBtn = document.querySelector('.nav-menu li[data-target="view-reports"]');

  // 2. Programmatically "click" it to switch the screen
  if (reportsTabBtn) {
    reportsTabBtn.click();
  }

  // 3. Wait a tiny fraction of a second for the screen to switch, then open the modal!
  setTimeout(() => {
    if (typeof reviewReport === 'function') {
      reviewReport(reportId);
    } else {
      console.error("reviewReport function not found!");
    }
  }, 150);
}

// ==========================================
// 🚀 FINAL APPROVE & DISPATCH TO CEO (UPGRADED)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const btnApproveDispatch = document.getElementById('btn-approve-dispatch');

  // 1. Just open the custom modal when they click the button
  if (btnApproveDispatch) {
    btnApproveDispatch.addEventListener('click', () => {
      const dispatchModal = document.getElementById('dispatch-confirm-modal');
      if (dispatchModal) {
        dispatchModal.classList.remove('hidden');
      }
    });
  }
});

// 2. The actual execution function attached to the Modal's "Yes" button
window.executePriorityDispatch = function(event) {
  if (event) event.preventDefault();

  const dispatchModal = document.getElementById('dispatch-confirm-modal');
  const btnApproveDispatch = document.getElementById('btn-approve-dispatch');

  // Hide the modal
  if (dispatchModal) dispatchModal.classList.add('hidden');

  if (btnApproveDispatch) {
    btnApproveDispatch.innerText = "⏳ Dispatching...";
    btnApproveDispatch.disabled = true;
  }

  // Call the Java Endpoint
  fetch(`${API_BASE_URL}/api/reports/dispatch-masterlist`, {
    method: 'PUT'
  })
    .then(response => {
      if (!response.ok) throw new Error("Failed to dispatch");
      return response.text();
    })
    .then(message => {
      // 🚀 THE BEAUTIFUL TOAST SUCCESS MESSAGE
      showToast(message, "success");

      // Return to the main dashboard
      document.getElementById('view-report-priority').classList.add('hidden');
      document.getElementById('view-admin-dashboard').classList.remove('hidden');

      // Force a data refresh so the 'Validated' count drops to zero
      loadAdminDashboardData();
    })
    .catch(err => {
      console.error(err);
      showToast("Error dispatching Masterlist. Is the server running?", "error");
      if (btnApproveDispatch) {
        btnApproveDispatch.innerText = "🚀 Approve & Dispatch to CEO";
        btnApproveDispatch.disabled = false;
      }
    });
};

// ==========================================
// CEO: BULLETPROOF SUBMIT REPAIR
// ==========================================
window.submitCEOCompletion = function() {
  if (!currentCEOProjectID) return;

  const btnCompleteRepair = document.getElementById('ceo-btn-complete-repair');
  const imageInput = document.getElementById('ceo-repair-image-upload');
  const remarksInput = document.getElementById('ceo-repair-remarks');
  const dropzoneContainer = document.getElementById('ceo-dropzone-container');

  // Validation: Image is REQUIRED
  if (!imageInput.files || imageInput.files.length === 0) {
    showToast("Please upload a Proof of Repair photo!", "error");
    if (dropzoneContainer) {
      dropzoneContainer.style.borderColor = "red";
      setTimeout(() => dropzoneContainer.style.borderColor = "#cbd5e1", 2000);
    }
    return;
  }

  // UI Loading State
  const originalText = btnCompleteRepair.innerHTML;
  btnCompleteRepair.innerHTML = `<span class="icon">⏳</span> Uploading Proof...`;
  btnCompleteRepair.disabled = true;

  // Build the Form Data
  const formData = new FormData();
  formData.append("proofImage", imageInput.files[0]);
  formData.append("repairRemarks", remarksInput.value || "");

  // Send to Backend
  fetch(`${API_BASE_URL}/api/reports/${currentCEOProjectID}/complete`, {
    method: 'POST',
    body: formData
  })
    .then(res => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    })
    .then(data => {
      showToast("Project marked as Completed!", "success");

      // Close modal and refresh data
      document.getElementById('manage-modal').classList.add('hidden');
      if (typeof loadCEODashboardData === "function") {
        loadCEODashboardData();
      }
    })
    .catch(err => {
      console.error("Completion Error:", err);
      showToast("Failed to complete. Check console.", "error");
    })
    .finally(() => {
      // Restore button state
      btnCompleteRepair.innerHTML = originalText;
      btnCompleteRepair.disabled = false;
    });
};
// ==========================================
// ADMIN DASHBOARD: LOAD REPAIR TRACKING
// ==========================================
function loadTrackingData() {
  const trackingTableBody = document.querySelector('#view-tracking .data-table tbody');
  if (!trackingTableBody) return;

  apiFetch(`/api/reports`)
    .then(reports => {
      trackingTableBody.innerHTML = '';

      // 🚀 FIX 1: Allow "closed" projects into the table
      const trackedReports = reports.filter(r => {
        const status = String(r.status || '').toLowerCase().trim();
        return status === 'dispatched to ceo' ||
          status === 'in progress' ||
          status === 'completed' ||
          status === 'closed'; // <-- ADDED
      });

      if (trackedReports.length === 0) {
        trackingTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No active repair projects to track.</td></tr>`;
        return;
      }

      // ==========================================
      // 2. 🧠 SMART TRACKING ALGORITHM (MULTI-TIER SORT)
      // ==========================================

      // Step A: Assign mathematical scores so we can sort them easily
      trackedReports.forEach(report => {
        // 🚀 FIX 2: Give 'Closed' a score of 0 so it drops to the absolute bottom
        // Status Score: Completed (3) > In Progress (2) > Dispatched (1) > Closed (0)
        const status = String(report.status || '').toLowerCase().trim();
        if (status === 'completed') report.statusScore = 3;
        else if (status === 'in progress') report.statusScore = 2;
        else if (status === 'dispatched to ceo') report.statusScore = 1;
        else report.statusScore = 0; // <-- ADDED

        // Priority Score (Matches your official logic)
        const severity = String(report.severity || 'low').toLowerCase();
        const importance = String(report.roadImportance || '').toLowerCase();

        if (severity === 'high' || (severity === 'medium' && importance.includes('core'))) {
          report.priorityScore = 3; // HIGH
        } else if (severity === 'medium' || (severity === 'low' && importance.includes('core'))) {
          report.priorityScore = 2; // MEDIUM
        } else {
          report.priorityScore = 1; // LOW
        }
      });

      // Step B: Run the 3-Rule Sort (BULLETPROOF FIX)
      trackedReports.sort((a, b) => {
        // Rule 1: Actionable Status First (Completed to the top, Closed to bottom)
        if (b.statusScore !== a.statusScore) {
          return b.statusScore - a.statusScore;
        }

        // Rule 2: Highest Priority First (High > Medium > Low)
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }

        // Rule 3: Tie-Breaker (Newest First)
        // Using ID to prevent 'NaN' date errors!
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idB - idA;
      });

      trackedReports.forEach(report => {
        const formatId = `#PRJ-${String(report.id).padStart(4, '0')}`;
        const formatBrgy = (report.barangay && report.barangay.barangayName) ? report.barangay.barangayName : 'Unknown';
        const roadName = report.cityRoadName || 'Unknown Road';
        const currentStatus = String(report.status || '').toLowerCase().trim();

        const severity = String(report.severity || 'low').toLowerCase();
        const importance = String(report.roadImportance || '').toLowerCase();

        let badgeHtml = `<span class="badge low">LOW</span>`;
        let borderStyle = '4px solid var(--accent-blue)';

        if (severity === 'high' || (severity === 'medium' && importance.includes('core'))) {
          badgeHtml = `<span class="badge high">HIGH</span>`;
          borderStyle = '4px solid #dc3545';
        } else if (severity === 'medium' || (severity === 'low' && importance.includes('core'))) {
          badgeHtml = `<span class="badge medium">MEDIUM</span>`;
          borderStyle = '4px solid #ffc107';
        }

        let statusHtml = '';
        // 🚀 FIX 3: Add UI styling for 'Closed' projects
        if (currentStatus === 'completed') {
          statusHtml = `<span class="status-badge validated" style="background-color: #d4edda; color: #155724;">Completed (Pending QA)</span>`;
          borderStyle = '4px solid #28a745';
        } else if (currentStatus === 'in progress') {
          statusHtml = `<span class="status-badge" style="background-color: #cce5ff; color: #004085;">In Progress</span>`;
        } else if (currentStatus === 'closed') {
          statusHtml = `<span class="status-badge" style="background-color: #e2e3e5; color: #6c757d;">✅ Officially Closed</span>`;
          borderStyle = '4px solid #6c757d'; // Gray border
        } else {
          statusHtml = `<span class="status-badge pending" style="background-color: #e2e3e5; color: #383d41;">Dispatched to CEO</span>`;
        }

        const row = document.createElement('tr');
        row.style.borderLeft = borderStyle;
        if (currentStatus === 'completed') row.style.backgroundColor = '#fafafa';

        // 🎨 BONUS: Dim the entire row if it is closed so it looks archived!
        if (currentStatus === 'closed') {
          row.style.opacity = '0.6';
          row.style.backgroundColor = '#f8f9fa';
        }

        row.innerHTML = `
          <td><strong>${formatId}</strong></td>
          <td>${formatBrgy}</td>
          <td>${roadName}</td>
          <td>${badgeHtml}</td>
          <td>${statusHtml}</td>
          <td><button class="btn-small track-btn" onclick="openTrackingModal(${report.id})">Track</button></td>
        `;
        trackingTableBody.appendChild(row);
      });
    })
    .catch(error => {
      console.error("Error loading tracking data:", error);
      trackingTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Failed to load tracking data.</td></tr>`;
    });
}

// ==========================================
// 7. NEW TRACKING MODAL LOGIC
// ==========================================
let currentTrackingReportId = null;

function openTrackingModal(reportId) {
  currentTrackingReportId = reportId;

  const trackingModal = document.getElementById('tracking-modal');
  if (!trackingModal) return;

  // Reset the UI (In case they closed it while typing rework feedback earlier)
  const primaryActions = document.getElementById('tracking-primary-actions');
  const reworkForm = document.getElementById('tracking-rework-form');
  const reworkInput = document.getElementById('rework-remarks-input');

  if (primaryActions) primaryActions.classList.remove('hidden');
  if (reworkForm) reworkForm.classList.add('hidden');
  if (reworkInput) reworkInput.value = '';

  // Show the modal
  trackingModal.classList.remove('hidden');

  // Force the modal to scroll to the very top instantly
  setTimeout(() => {
    const modalBody = trackingModal.querySelector('.modal-body');
    const modalContent = trackingModal.querySelector('.modal-content');
    if (modalBody) modalBody.scrollTop = 0;
    if (modalContent) modalContent.scrollTop = 0;
    trackingModal.scrollTop = 0;
  }, 10);

  // Fetch the data from the database
  apiFetch(`/api/reports/${reportId}`)
    .then(report => {
      const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      setText('track-modal-id', `#PRJ-${String(report.id).padStart(4, '0')}`);
      setText('track-modal-brgy', report.barangay?.barangayName || 'Unknown');
      setText('track-modal-road', report.cityRoadName || 'Unknown Road');
      setText('track-modal-road-id', report.cityRoadId || 'N/A');
      setText('track-modal-importance', report.roadImportance || 'N/A');
      setText('track-modal-terrain', report.terrainType || 'N/A');
      setText('track-modal-road-type', report.roadType || 'N/A');
      setText('track-modal-length', report.damageLength || '0');
      setText('track-modal-width', report.damageWidth || '0');
      setText('track-modal-gps', `${report.latitude || '0'}° N, ${report.longitude || '0'}° E`);
      setText('track-modal-desc', report.damageDescription || 'No description provided.');

      const submitterText = report.reportedBy ? report.reportedBy : `Barangay Official (${report.barangay?.barangayName || 'Unknown'})`;
      setText('track-modal-submitter', submitterText);

      const sevBox = document.getElementById('track-modal-severity');
      if (sevBox) {
        const sev = String(report.severity || 'low').toLowerCase();
        if (sev === 'high') sevBox.innerHTML = `<span class="badge high">HIGH</span>`;
        else if (sev === 'medium') sevBox.innerHTML = `<span class="badge medium">MEDIUM</span>`;
        else sevBox.innerHTML = `<span class="badge low">LOW</span>`;
      }

      // Load original damage image
      if (typeof window.loadSecureImage === 'function') {
        window.loadSecureImage('track-modal-image', report.damageImage);
      }

      const statusBox = document.getElementById('track-modal-status');
      const statusText = document.getElementById('track-modal-status-text');
      const approveBtn = document.getElementById('btn-approve-project');
      const reworkBtn = document.getElementById('btn-rework-project');

      // 🚀 NEW VARS FOR RESOLUTION EVIDENCE
      const proofPlaceholder = document.getElementById('track-modal-proof-placeholder');
      const resolutionData = document.getElementById('track-modal-resolution-data');
      const proofRemarks = document.getElementById('track-modal-proof-remarks');

      const status = String(report.status || '').toLowerCase();

      if (status === 'completed') {
        // --- UI TEXT UPDATES ---
        if (statusBox) {
          statusBox.textContent = 'Repaired (Pending Approval)';
          statusBox.style.backgroundColor = '#d4edda';
          statusBox.style.color = '#155724';
        }
        if (statusText) statusText.textContent = 'CEO has finished the repair. Awaiting Admin QA.';

        // --- BUTTON UNLOCKS ---
        if (approveBtn) {
          approveBtn.disabled = false;
          approveBtn.style.backgroundColor = '#28a745';
          approveBtn.style.cursor = 'pointer';
        }
        if (reworkBtn) reworkBtn.classList.remove('hidden');

        // 🚀 SHOW PROOF PHOTO & HIDE PLACEHOLDER
        if (proofPlaceholder) proofPlaceholder.style.display = 'none';
        if (resolutionData) resolutionData.style.display = 'block';

        if (proofRemarks) proofRemarks.textContent = report.repairRemarks || "No official remarks provided.";
        if (typeof window.loadSecureImage === 'function') {
          window.loadSecureImage('track-modal-proof-image', report.proofOfRepairImage);
        }

      } else {
        // --- UI TEXT UPDATES ---
        if (statusBox) {
          statusBox.textContent = report.status || 'Dispatched';
          statusBox.style.backgroundColor = '#e2e3e5';
          statusBox.style.color = '#383d41';
        }
        if (statusText) statusText.textContent = 'Engineering crew is actively handling this project.';

        // --- BUTTON LOCKS ---
        if (approveBtn) {
          approveBtn.disabled = true;
          approveBtn.style.backgroundColor = '#ccc';
          approveBtn.style.cursor = 'not-allowed';
        }
        if (reworkBtn) reworkBtn.classList.add('hidden');

        // 🚀 SHOW PLACEHOLDER & HIDE PROOF PHOTO
        if (proofPlaceholder) proofPlaceholder.style.display = 'block';
        if (resolutionData) resolutionData.style.display = 'none';
      }
    })
    .catch(err => {
      console.error("Error loading tracking details:", err);
      showToast("Error loading project details.", "error");
    });
}

// ==========================================
// 8. TRACKING MODAL BUTTON ACTIONS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const trackingModal = document.getElementById('tracking-modal');
  const btnApprove = document.getElementById('btn-approve-project');
  const btnRework = document.getElementById('btn-rework-project');
  const primaryActions = document.getElementById('tracking-primary-actions');
  const reworkForm = document.getElementById('tracking-rework-form');
  const btnCancelRework = document.getElementById('btn-cancel-rework');
  const btnConfirmRework = document.getElementById('btn-confirm-rework');
  const reworkInput = document.getElementById('rework-remarks-input');

  // --- 1. FIX THE "X" CLOSE BUTTON ---
  if (trackingModal) {
    trackingModal.addEventListener('click', (e) => {
      if (e.target.closest('.close-tracking-btn')) {
        trackingModal.classList.add('hidden');
      }
    });
  }

  // --- 2. APPROVE BUTTON LOGIC ---
  if (btnApprove) {
    btnApprove.addEventListener('click', (e) => {
      e.preventDefault();
      if (!currentTrackingReportId) return;

      btnApprove.innerHTML = "⏳ Approving...";
      btnApprove.disabled = true;

      fetch(`${API_BASE_URL}/api/reports/${currentTrackingReportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "Closed" })
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to close project");
          return res.text();
        })
        .then(() => {
          showToast("Project officially approved and closed!", "success");
          trackingModal.classList.add('hidden');
          if (typeof loadTrackingData === 'function') loadTrackingData();
        })
        .catch(err => {
          console.error(err);
          showToast("Error closing project.", "error");
        })
        .finally(() => {
          btnApprove.innerHTML = `<span class="icon">✅</span> Approve & Close Project`;
          btnApprove.disabled = false;
        });
    });
  }

  // --- 3. REWORK UI TRANSITIONS ---
  if (btnRework && primaryActions && reworkForm) {
    btnRework.addEventListener('click', (e) => {
      e.preventDefault();
      primaryActions.classList.add('hidden');
      reworkForm.classList.remove('hidden');
      if(reworkInput) reworkInput.focus();
    });

    btnCancelRework.addEventListener('click', (e) => {
      e.preventDefault();
      reworkForm.classList.add('hidden');
      primaryActions.classList.remove('hidden');
      if(reworkInput) reworkInput.value = '';
    });
  }

  // --- 4. SUBMIT REWORK TO DATABASE ---
  if (btnConfirmRework) {
    btnConfirmRework.addEventListener('click', (e) => {
      e.preventDefault();
      if (!currentTrackingReportId) return;

      const remarks = reworkInput ? reworkInput.value.trim() : '';
      if (!remarks) {
        showToast("Please provide a reason so the crew knows what to fix.", "error");
        return;
      }

      btnConfirmRework.innerHTML = "⏳ Sending...";
      btnConfirmRework.disabled = true;

      fetch(`${API_BASE_URL}/api/reports/${currentTrackingReportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: "In Progress",
          adminRemarks: remarks
        })
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to rework project");
          return res.text();
        })
        .then(() => {
          showToast("Project bounced back to CEO with your feedback!", "warning");
          trackingModal.classList.add('hidden');
          if (typeof loadTrackingData === 'function') loadTrackingData();
        })
        .catch(err => {
          console.error(err);
          showToast("Error requesting rework.", "error");
        })
        .finally(() => {
          btnConfirmRework.innerHTML = "Submit to CEO";
          btnConfirmRework.disabled = false;
        });
    });
  }
});

// ==========================================
// 🗺️ ADMIN GLOBAL MAP: MULTIPLE MARKERS
// ==========================================
let adminGlobalMap = null;
let globalMarkerLayer = null;

// 1. Define Color-Coded Pins
const pinRed = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const pinOrange = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const pinGreen = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const pinGrey = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

window.loadAdminGlobalMap = function() {
  const mapContainer = document.getElementById('admin-global-map');
  if (!mapContainer) return;

  // 🚀 1. Define the strict boundaries of San Jose Del Monte City
  // Top Left (North West) to Bottom Right (South East)
  const sjdmBounds = L.latLngBounds(
    L.latLng(14.9000, 120.9500), // North West corner
    L.latLng(14.7500, 121.1500)  // South East corner
  );

  // 2. Build the map if it hasn't been built yet
  if (!adminGlobalMap) {
    adminGlobalMap = L.map('admin-global-map', {
      center: [14.8139, 121.0453], // Center of SJDM
      zoom: 13,
      minZoom: 12, // Prevents zooming out too far
      maxBounds: sjdmBounds, // 🚀 Locks the camera to SJDM!
      maxBoundsViscosity: 1.0 // Adds a "bouncy wall" effect if they try to drag away
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(adminGlobalMap);

    // 🚀 Overlay the labels (Barangay names, roads, etc.) on top of the satellite imagery
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(adminGlobalMap);

    globalMarkerLayer = L.layerGroup().addTo(adminGlobalMap);
  } else {
    // If the map already exists, reset the camera back to the center!
    adminGlobalMap.setView([14.8139, 121.0453], 13);
  }

  // Force map to calculate its size so it doesn't show grey boxes
  setTimeout(() => { adminGlobalMap.invalidateSize(); }, 300);

  // 3. Fetch all reports and drop the pins!
  apiFetch(`/api/reports`, { cache: 'no-store' })
    .then(reports => {
      globalMarkerLayer.clearLayers();

      // Filter out the fixed roads so the map only shows active hazards!
      const activeHazards = reports.filter(r => {
        const s = String(r.status || '').toLowerCase();
        return !s.includes('complet') && !s.includes('clos') && !s.includes('reject');
      });

      activeHazards.forEach(report => {
        const lat = parseFloat(report.latitude);
        const lng = parseFloat(report.longitude);

        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

        const severity = String(report.severity || 'Unassessed').toLowerCase();
        let selectedIcon = pinGrey;

        if (severity === 'high') selectedIcon = pinRed;
        else if (severity === 'medium') selectedIcon = pinOrange;
        else if (severity === 'low') selectedIcon = pinGreen;

        // Build the interactive pop-up window
        const popupHtml = `
                    <div style="font-family: sans-serif; min-width: 220px; text-align: center;">
                        <h4 style="margin: 0 0 5px 0; color: #1e40af; font-size: 16px;">#RPT-${String(report.id).padStart(4, '0')}</h4>
                        <p style="margin: 0 0 5px 0; font-size: 13px;"><b>Road:</b> ${report.cityRoadName || 'Unknown'}</p>
                        <p style="margin: 0 0 5px 0; font-size: 13px;"><b>Status:</b> ${report.status || 'Pending'}</p>
                        <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 10px; background-color: ${selectedIcon === pinRed ? '#dc3545' : selectedIcon === pinOrange ? '#ff8c00' : selectedIcon === pinGreen ? '#28a745' : '#6c757d'}; color: white;">
                            SEVERITY: ${severity.toUpperCase()}
                        </span>

                        <button class="btn-small validate-btn" style="width: 100%; margin-top: 5px;" onclick="reviewReport(${report.id})">
                            Review Full Report
                        </button>
                    </div>
                `;

        L.marker([lat, lng], { icon: selectedIcon })
          .bindPopup(popupHtml)
          .addTo(globalMarkerLayer);
      });
    })
    .catch(err => console.error("Error loading map data:", err));
};

// ==========================================
// 🚀 THE MAP WATCHDOG (Connects to your sidebar button)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const adminMapSection = document.getElementById('view-map');
  if (adminMapSection) {
    const mapObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // If the 'hidden' class is removed (meaning the user clicked the sidebar button)
        if (mutation.attributeName === 'class' && !adminMapSection.classList.contains('hidden')) {
          if (typeof loadAdminGlobalMap === 'function') loadAdminGlobalMap();
        }
      });
    });
    mapObserver.observe(adminMapSection, { attributes: true });
  }
});


// ==========================================
// 🗺️ CEO GLOBAL MAP: DISPATCHED PROJECTS
// ==========================================
let ceoGlobalMap = null;
let ceoGlobalMarkerLayer = null;

window.loadCEOGlobalMap = function() {
  const mapContainer = document.getElementById('ceo-global-map');
  if (!mapContainer) return;

  // 🚀 1. Define the strict boundaries of San Jose Del Monte City
  const sjdmBounds = L.latLngBounds(
    L.latLng(14.9000, 120.9500), // North West corner
    L.latLng(14.7500, 121.1500)  // South East corner
  );

  // 2. Build the map or reset the camera if it already exists
  if (!ceoGlobalMap) {
    ceoGlobalMap = L.map('ceo-global-map', {
      center: [14.8139, 121.0453], // Center of SJDM
      zoom: 13,
      minZoom: 12, // 🚀 Prevents zooming out too far
      maxBounds: sjdmBounds, // 🚀 Locks the camera to SJDM
      maxBoundsViscosity: 1.0 // Adds the "bouncy wall" effect
    });

    // Base Satellite Layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(ceoGlobalMap);

    // 🚀 Overlay the labels (Barangay names, roads, etc.)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(ceoGlobalMap);

    ceoGlobalMarkerLayer = L.layerGroup().addTo(ceoGlobalMap);
  } else {
    // Reset camera if they revisit the tab
    ceoGlobalMap.setView([14.8139, 121.0453], 13);
  }

  // Force map to calculate its size so it doesn't break
  setTimeout(() => { ceoGlobalMap.invalidateSize(); }, 300);

  // 3. Fetch all reports and filter for the CEO
  apiFetch(`/api/reports`, { cache: 'no-store' })
    .then(reports => {
      ceoGlobalMarkerLayer.clearLayers();

      // 🛡️ THE GATEKEEPER: Only show ACTIVE CEO Projects!
      const activeCEOProjects = reports.filter(r => {
        const s = String(r.status || '').toLowerCase();
        return s === 'dispatched to ceo' || s === 'in progress';
      });

      activeCEOProjects.forEach(report => {
        const lat = parseFloat(report.latitude);
        const lng = parseFloat(report.longitude);

        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

        const pinRed = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
        const pinOrange = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
        const pinGreen = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
        const pinGrey = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

        const severity = String(report.severity || 'Unassessed').toLowerCase();
        let selectedIcon = pinGrey;

        if (severity === 'high') selectedIcon = pinRed;
        else if (severity === 'medium') selectedIcon = pinOrange;
        else if (severity === 'low') selectedIcon = pinGreen;

        // 🎨 CEO-Specific Pop-up Window
        const popupHtml = `
                    <div style="font-family: sans-serif; min-width: 220px; text-align: center;">
                        <h4 style="margin: 0 0 5px 0; color: #1e40af; font-size: 16px;">#PRJ-${String(report.id).padStart(4, '0')}</h4>
                        <p style="margin: 0 0 5px 0; font-size: 13px;"><b>Road:</b> ${report.cityRoadName || 'Unknown'}</p>
                        <p style="margin: 0 0 5px 0; font-size: 13px;"><b>Status:</b> ${report.status || 'Pending'}</p>
                        <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 10px; background-color: ${selectedIcon === pinRed ? '#dc3545' : selectedIcon === pinOrange ? '#ff8c00' : selectedIcon === pinGreen ? '#28a745' : '#6c757d'}; color: white;">
                            SEVERITY: ${severity.toUpperCase()}
                        </span>

                        <button class="btn-small validate-btn" style="width: 100%; margin-top: 5px; background-color: #1e40af; border-color: #1e40af;" onclick="openCEOManageModal(${report.id})">
                            Manage Project
                        </button>
                    </div>
                `;

        L.marker([lat, lng], { icon: selectedIcon })
          .bindPopup(popupHtml)
          .addTo(ceoGlobalMarkerLayer);
      });
    })
    .catch(err => console.error("Error loading CEO map data:", err));
};

// ==========================================
// 🚀 THE CEO MAP WATCHDOG
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const ceoMapSection = document.getElementById('view-ceo-map');
  if (ceoMapSection) {
    const ceoMapObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Trigger map refresh when the user clicks the Map tab
        if (mutation.attributeName === 'class' && !ceoMapSection.classList.contains('hidden')) {
          if (typeof loadCEOGlobalMap === 'function') loadCEOGlobalMap();
        }
      });
    });
    ceoMapObserver.observe(ceoMapSection, { attributes: true });
  }
});


// ==========================================
// 🗺️ BARANGAY LOCAL MAP: TERRITORY FILTERED
// ==========================================
let barangayLocalMap = null;
let barangayMarkerLayer = null;

window.loadBarangayLocalMap = function() {
  const mapContainer = document.getElementById('barangay-local-map');
  if (!mapContainer) return;

  // 🔒 SECURITY CHECK: Get their specific Barangay ID
  const loggedInBarangayId = sessionStorage.getItem("barangayId");
  if (!loggedInBarangayId) {
    console.error("Cannot load map: No Barangay ID found in session.");
    return;
  }

  const sjdmBounds = L.latLngBounds(
    L.latLng(14.9000, 120.9500),
    L.latLng(14.7500, 121.1500)
  );

  if (!barangayLocalMap) {
    barangayLocalMap = L.map('barangay-local-map', {
      center: [14.8139, 121.0453],
      zoom: 14, // 🚀 Zoomed in a bit closer since they are looking at one barangay
      minZoom: 12,
      maxBounds: sjdmBounds,
      maxBoundsViscosity: 1.0
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(barangayLocalMap);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(barangayLocalMap);

    barangayMarkerLayer = L.layerGroup().addTo(barangayLocalMap);
  } else {
    barangayLocalMap.setView([14.8139, 121.0453], 14);
  }

  setTimeout(() => { barangayLocalMap.invalidateSize(); }, 300);

  // 🚀 THE FIX: Fetch ONLY reports belonging to this specific Barangay!
  apiFetch(`/api/reports/barangay/${loggedInBarangayId}`, { cache: 'no-store' })
    .then(reports => {
      barangayMarkerLayer.clearLayers();

      // Filter out finished projects to keep the map focused on active hazards
      const activeLocalHazards = reports.filter(r => {
        const s = String(r.status || '').toLowerCase();
        return !s.includes('complet') && !s.includes('clos');
      });

      activeLocalHazards.forEach(report => {
        const lat = parseFloat(report.latitude);
        const lng = parseFloat(report.longitude);

        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

        const pinRed = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
        const pinOrange = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
        const pinGreen = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
        const pinGrey = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

        const severity = String(report.severity || 'Unassessed').toLowerCase();
        const status = String(report.status || '').toLowerCase();
        let selectedIcon = pinGrey;

        if (severity === 'high') selectedIcon = pinRed;
        else if (severity === 'medium') selectedIcon = pinOrange;
        else if (severity === 'low') selectedIcon = pinGreen;

        // 🎨 SMART BUTTON LOGIC: Changes depending on report status
        let buttonHtml = `<button class="btn-small validate-btn" style="width: 100%; margin-top: 5px; background-color: #6c757d; border-color: #6c757d;" onclick="openViewModal(${report.id})">View Status</button>`;

        if (status.includes('reject')) {
          buttonHtml = `<button class="btn-small validate-btn" style="width: 100%; margin-top: 5px; background-color: #dc3545; border-color: #dc3545;" onclick="openEditModal(${report.id})">Edit & Resubmit</button>`;
        }

        const popupHtml = `
                    <div style="font-family: sans-serif; min-width: 220px; text-align: center;">
                        <h4 style="margin: 0 0 5px 0; color: #1e40af; font-size: 16px;">#RPT-${String(report.id).padStart(4, '0')}</h4>
                        <p style="margin: 0 0 5px 0; font-size: 13px;"><b>Road:</b> ${report.cityRoadName || 'Unknown'}</p>
                        <p style="margin: 0 0 5px 0; font-size: 13px;"><b>Status:</b> ${report.status || 'Pending'}</p>
                        <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 10px; background-color: ${selectedIcon === pinRed ? '#dc3545' : selectedIcon === pinOrange ? '#ff8c00' : selectedIcon === pinGreen ? '#28a745' : '#6c757d'}; color: white;">
                            SEVERITY: ${severity.toUpperCase()}
                        </span>
                        ${buttonHtml}
                    </div>
                `;

        L.marker([lat, lng], { icon: selectedIcon })
          .bindPopup(popupHtml)
          .addTo(barangayMarkerLayer);
      });
    })
    .catch(err => console.error("Error loading local map data:", err));
};

// ==========================================
// 🚀 THE BARANGAY MAP WATCHDOG
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const brgyMapSection = document.getElementById('view-barangay-map');
  if (brgyMapSection) {
    const brgyMapObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Trigger map refresh when the user clicks the Map tab
        if (mutation.attributeName === 'class' && !brgyMapSection.classList.contains('hidden')) {
          if (typeof loadBarangayLocalMap === 'function') loadBarangayLocalMap();
        }
      });
    });
    brgyMapObserver.observe(brgyMapSection, { attributes: true });
  }
});
