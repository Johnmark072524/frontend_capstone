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

// ==========================================
// 🚀 ENTERPRISE WEBSOCKETS (LIVE DASHBOARD)
// ==========================================
let stompClient = null;

function connectLiveDashboards() {
  // Connect to the Java backend endpoint using your global API_BASE_URL (Great for Ngrok!)
  const socket = new SockJS(`${API_BASE_URL}/ws-live`);
  stompClient = Stomp.over(socket);

  // Disable excessive debug logs in the console to keep it clean
  stompClient.debug = null;

  stompClient.connect({}, function (frame) {
    console.log('🟢 WebSockets Connected: Live Mode Active!');

    // Tune in to the /topic/updates radio frequency
    stompClient.subscribe('/topic/updates', function (message) {

      // When we hear the pulse from the Java backend:
      if (message.body === "REFRESH_DASHBOARDS") {
        console.log("⚡ Live pulse received! Waiting 300ms for DB to finalize...");

        // 🚀 THE FIX: Give the database 0.3 seconds to officially commit the save!
        setTimeout(() => {
          // 🔔 1. REFRESH THE NOTIFICATIONS
          if (typeof window.loadNotifications === "function") window.loadNotifications();

          // 📊 2. REFRESH THE BARANGAY DASHBOARD
          const brgyId = sessionStorage.getItem("barangayId");
          if (brgyId && typeof window.loadBarangayReports === "function") {
            window.loadBarangayReports(brgyId);
          }

          // 📊 3. REFRESH THE ADMIN DASHBOARD
          if (typeof window.loadAdminDashboardData === "function") window.loadAdminDashboardData();
          if (typeof window.loadAdminReports === "function") window.loadAdminReports();
          if (typeof window.loadTrackingData === "function") window.loadTrackingData();
          if (typeof window.loadUserManagementTable === "function") window.loadUserManagementTable();
          if (typeof window.loadBarangayManagement === "function") window.loadBarangayManagement();

          // 📊 4. REFRESH THE CEO DASHBOARD
          if (typeof window.loadCEODashboardData === "function") window.loadCEODashboardData();
        }, 300); // <-- 300 milliseconds delay
      }
    });

  }, function (error) {
    // If the server turns off, try to reconnect every 5 seconds silently
    setTimeout(connectLiveDashboards, 5000);
  });
}

// Start the WebSocket connection the second the page loads
document.addEventListener("DOMContentLoaded", () => {
  connectLiveDashboards();
});
// ==========================================


// ==========================================
// 🔍 BARANGAY REPORTS: SEARCH & DROPDOWN FILTER
// ==========================================
window.filterBarangayReports = function() {
  const searchInput = document.getElementById('report-search-bar');
  const statusFilter = document.getElementById('report-status-filter');
  const listItems = document.querySelectorAll('#barangay-report-list .bd-list-item');

  if (!searchInput || !statusFilter) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const filterValue = statusFilter.value.toLowerCase();

  listItems.forEach(item => {
    // 1. Grab all text inside the report card for the search text
    const itemText = item.textContent.toLowerCase();

    // 2. Grab specifically the status badge for the dropdown filter
    const statusBadge = item.querySelector('.bd-status-badge');
    const statusText = statusBadge ? statusBadge.textContent.toLowerCase() : '';

    // Condition A: Does the text match the search bar?
    const matchesSearch = itemText.includes(searchTerm);

    // Condition B: Does the status match the dropdown?
    let matchesStatus = false;
    if (filterValue === 'all') {
      matchesStatus = true; // "All Status" shows everything
    } else if (filterValue === 'pending' && (statusText.includes('pending') || statusText.includes('resubmit'))) {
      matchesStatus = true; // Groups Pending and Resubmitted
    } else if (filterValue === 'validated' && (statusText.includes('validate') || statusText.includes('dispatch') || statusText.includes('progress') || statusText.includes('complet'))) {
      matchesStatus = true; // Groups all positive/approved statuses
    } else if (filterValue === 'rejected' && statusText.includes('reject')) {
      matchesStatus = true;
    }

    // 🚀 Show the card ONLY if both conditions are met!
    if (matchesSearch && matchesStatus) {
      item.style.display = 'flex'; // Restore original flexbox display
    } else {
      item.style.display = 'none'; // Hide it
    }
  });
};

// ==========================================
// 🔍 CEO REPORTS: SEARCH & PRIORITY FILTER
// ==========================================
window.filterCEOReports = function() {
  const searchInput = document.getElementById('ceoSearch');
  const priorityFilter = document.getElementById('ceo-priority-filter');

  // Target the specific CEO Deploy Masterlist table rows
  const tableRows = document.querySelectorAll('#deploy-master-table tr');

  if (!searchInput || !priorityFilter) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const filterValue = priorityFilter.value.toLowerCase();

  tableRows.forEach(row => {
    // Skip empty state rows
    if (row.cells.length < 2) return;

    const rowText = row.textContent.toLowerCase();

    // Check Search Bar
    const matchesSearch = rowText.includes(searchTerm);

    // Check Priority Dropdown
    let matchesPriority = false;
    if (filterValue === 'all') {
      matchesPriority = true;
    } else if (rowText.includes(filterValue)) { // Matches "High", "Medium", or "Low"
      matchesPriority = true;
    }

    // Show row only if BOTH match
    if (matchesSearch && matchesPriority) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
};

// ==========================================
// 🔍 ADMIN REPORTS: SEARCH & DROPDOWN FILTER
// ==========================================
window.filterAdminReports = function() {
  const searchInput = document.getElementById('adminSearch');
  const statusFilter = document.getElementById('admin-status-filter');

  // 🚀 THE FIX: This magically finds ANY table rows inside the View Reports tab!
  const tableRows = document.querySelectorAll('#view-reports table tbody tr');

  if (!searchInput || !statusFilter) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const filterValue = statusFilter.value.toLowerCase();

  tableRows.forEach(row => {
    // Skip empty state rows (like "Loading..." or "No data")
    if (row.cells.length < 2) return;

    // Grab all text in the row for the search text
    const rowText = row.textContent.toLowerCase();

    // Condition A: Does the text match the search bar?
    const matchesSearch = rowText.includes(searchTerm);

    // Condition B: Does the status match the dropdown?
    let matchesStatus = false;
    if (filterValue === 'all') {
      matchesStatus = true;
    } else if (rowText.includes(filterValue)) {
      matchesStatus = true;
    }

    // 🚀 Show the row ONLY if both conditions are met!
    if (matchesSearch && matchesStatus) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
};

// ==========================================
// 🔍 REPAIR TRACKING: SEARCH & DROPDOWN FILTER
// ==========================================
window.filterTrackingReports = function() {
  const searchInput = document.getElementById('trackSearch');
  const statusFilter = document.getElementById('track-status-filter');

  // Magically finds ANY table rows inside the Tracking tab
  const tableRows = document.querySelectorAll('#view-tracking table tbody tr');

  if (!searchInput || !statusFilter) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const filterValue = statusFilter.value.toLowerCase();

  tableRows.forEach(row => {
    // Skip empty state rows
    if (row.cells.length < 2) return;

    const rowText = row.textContent.toLowerCase();

    // Check Search Bar
    const matchesSearch = rowText.includes(searchTerm);

    // Check Dropdown Filter
    let matchesStatus = false;
    if (filterValue === 'all') {
      matchesStatus = true;
    } else if (rowText.includes(filterValue)) {
      matchesStatus = true;
    }

    // Show row only if BOTH match
    if (matchesSearch && matchesStatus) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
};

// ==========================================
// 🔍 REUSABLE GLOBAL TABLE SEARCH ENGINE
// ==========================================
/**
 * Searches any table by matching input value against table row text.
 * @param {string} inputId - ID of the input field
 * @param {string} tbodyId - ID of the table body (tbody)
 */
window.executeGlobalSearch = function(inputId, tbodyId) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return;

  const searchTerm = inputEl.value.toLowerCase().trim();
  const tableRows = document.querySelectorAll(`#${tbodyId} tr`);

  tableRows.forEach(row => {
    // Skip empty state or loading state rows (usually single-cell rows)
    if (row.cells.length < 2) return;

    // Grab all text within the row for smart full-row matching
    const rowText = row.textContent.toLowerCase();

    if (rowText.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
};

// ==========================================
// 🚀 ATTACH SEARCH LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // Load notifications immediately when the dashboard boots up
  if (typeof loadNotifications === 'function') loadNotifications();

  // 1. 🚀 BARANGAY DASHBOARD: Search Bar & Dropdown Listeners
  const brgySearchInput = document.getElementById('report-search-bar');
  const brgyStatusFilter = document.getElementById('report-status-filter');

  if (brgySearchInput) {
    brgySearchInput.addEventListener('input', window.filterBarangayReports);
  }
  if (brgyStatusFilter) {
    brgyStatusFilter.addEventListener('change', window.filterBarangayReports);
  }

  // 2. Global Table Search: Barangay Management (Admin)
  const adminBrgyInput = document.getElementById('search-barangay-input');
  if (adminBrgyInput) {
    adminBrgyInput.addEventListener('input', () => {
      executeGlobalSearch('search-barangay-input', 'barangay-table-body');
    });
  }

  // 3. Global Table Search: User Management (Admin)
  const userInput = document.getElementById('search-user-input');
  if (userInput) {
    userInput.addEventListener('input', () => {
      executeGlobalSearch('search-user-input', 'user-management-tbody');
    });
  }

  // 4. 🚀 NEW: Admin Reports Table Search & Filter Listeners
  const adminSearchInput = document.getElementById('adminSearch');
  const adminStatusFilter = document.getElementById('admin-status-filter');

  if (adminSearchInput) {
    adminSearchInput.addEventListener('input', window.filterAdminReports);
  }
  if (adminStatusFilter) {
    adminStatusFilter.addEventListener('change', window.filterAdminReports);
  }

  // 5. 🚀 NEW: Repair Tracking Table Search & Filter Listeners
  const trackSearchInput = document.getElementById('trackSearch');
  const trackStatusFilter = document.getElementById('track-status-filter');

  if (trackSearchInput) {
    trackSearchInput.addEventListener('input', window.filterTrackingReports);
  }
  if (trackStatusFilter) {
    trackStatusFilter.addEventListener('change', window.filterTrackingReports);
  }

  // 6. 🚀 NEW: CEO Repair Queue Search & Filter Listeners
  const ceoSearchInput = document.getElementById('ceoSearch');
  const ceoPriorityFilter = document.getElementById('ceo-priority-filter');

  if (ceoSearchInput) {
    ceoSearchInput.addEventListener('input', window.filterCEOReports);
  }
  if (ceoPriorityFilter) {
    ceoPriorityFilter.addEventListener('change', window.filterCEOReports);
  }

});

// A reusable function for all your API calls
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // 🚀 THE FIX: Force the browser to ALWAYS fetch live data, never use cached/old data
  options.cache = 'no-store';

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
// 🔍 BULLETPROOF FULLSCREEN IMAGE LIGHTBOX
// ==========================================

// Helper to ensure the modal element exists in the DOM
function ensureFullscreenModalExists() {
  let modal = document.getElementById("fullscreen-image-modal");
  if (!modal) {
    const modalHtml = `
      <div id="fullscreen-image-modal" style="display: none; position: fixed; inset: 0; z-index: 999999; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(6px); justify-content: center; align-items: center; cursor: zoom-out;">
        <span class="close-fullscreen-btn" onclick="closeFullscreenImage()" style="position: absolute; top: 20px; right: 30px; font-size: 36px; color: #ffffff; cursor: pointer; line-height: 1; z-index: 1000000; font-weight: bold;">&times;</span>
        <img id="fullscreen-modal-img" src="" alt="Full Size" style="max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 8px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); cursor: default;" onclick="event.stopPropagation();">
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById("fullscreen-image-modal");

    // Close when clicking the dark background overlay
    modal.addEventListener('click', () => closeFullscreenImage());
  }
  return modal;
}

// Global Open Function
window.openFullscreenImage = function(imgElement) {
  if (!imgElement) return;

  const imgSrc = typeof imgElement === 'string' ? imgElement : imgElement.src;

  // Ignore clicks on empty src, error placeholders, or default svg/png placeholders
  if (!imgSrc ||
    imgSrc === '' ||
    imgSrc.includes('placehold.co') ||
    imgSrc.includes('data:image/svg+xml') ||
    imgSrc.endsWith('undefined') ||
    imgSrc.endsWith('null')) {
    console.warn("Fullscreen viewer skipped: Invalid or placeholder image source.", imgSrc);
    return;
  }

  // Guarantee modal exists
  const modal = ensureFullscreenModalExists();
  const modalImg = document.getElementById("fullscreen-modal-img");

  if (modal && modalImg) {
    modalImg.src = imgSrc;
    modal.classList.remove('hidden');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '999999', 'important');
  }
};

// Global Close Function
window.closeFullscreenImage = function() {
  const modal = document.getElementById("fullscreen-image-modal");
  if (modal) {
    modal.classList.add('hidden');
    modal.style.setProperty('display', 'none', 'important');
    const modalImg = document.getElementById("fullscreen-modal-img");
    if (modalImg) modalImg.src = "";
  }
};

// Close on Escape Key Press
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeFullscreenImage();
  }
});

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
  window.switchView = function(targetId) {
    if (!targetId) return;

    // 💾 Save tab to memory so a browser refresh NEVER forgets it!
    sessionStorage.setItem('roadwise_active_tab', targetId);

    // 1. Force close modals
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.add('hidden');
    });

    // 2. Update UI Classes
    navLinks.forEach(nav => nav.classList.remove('active'));
    contentSections.forEach(section => {
      section.classList.add('hidden');
      section.style.display = ''; // Safely clear inline styles so Profile button works!
    });

    const activeLink = document.querySelector(`.nav-menu li[data-target="${targetId}"]`);
    if (activeLink) activeLink.classList.add('active');

    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      targetSection.style.display = ''; // Safely clear inline styles

      // ==========================================
      // 🚀 CLEAR ALL SEARCH BARS AND RESET TABLES
      // ==========================================
      document.querySelectorAll('.search-bar input').forEach(input => {
        input.value = '';
      });
      document.querySelectorAll('table tbody tr').forEach(row => {
        row.style.display = '';
      });

      // ==========================================
      // 🚀 THE BRUTE-FORCE SCROLL RESET
      // ==========================================
      window.scrollTo(0, 0);
      targetSection.scrollTop = 0;
      targetSection.querySelectorAll('div').forEach(div => {
        div.scrollTop = 0;
      });
    }

    // ==========================================
    // 🚀 SMART DATA LOADING ON REFRESH
    // ==========================================
    const currentPath = window.location.pathname.toLowerCase();
    const isCEO = currentPath.includes("ceo");
    const isAdmin = currentPath.includes("admin");

    if (isCEO && (targetId === 'view-dashboard' || targetId === 'view-repair')) {
      if (typeof window.loadCEODashboardData === 'function') window.loadCEODashboardData();
    } else if (targetId === 'view-barangay-management') {
      if (typeof window.loadBarangayManagement === 'function') window.loadBarangayManagement();
    } else if (targetId === 'view-user-management') {
      if (typeof window.loadBarangayDropdownForAdmin === 'function') window.loadBarangayDropdownForAdmin();
      if (typeof window.loadUserManagementTable === 'function') window.loadUserManagementTable();
    } else if (targetId === 'view-reports') {
      if (typeof window.loadAdminReports === 'function') window.loadAdminReports();
    } else if (targetId === 'view-tracking') {
      if (typeof window.loadTrackingData === 'function') window.loadTrackingData();
    } else if (isAdmin && (targetId === 'view-admin-dashboard' || targetId === 'view-dashboard')) {
      if (typeof window.loadAdminDashboardData === 'function') window.loadAdminDashboardData();
    } else if (targetId === 'view-profile') {
      // 🚀 REFRESH FIX: Load Profile Data if user hits F5 on the Profile Page!
      if (typeof window.populateProfileData === 'function') window.populateProfileData();

      // Reset the profile inner tabs to default
      document.querySelectorAll('#profile-nav-menu li:not(.logout-btn)').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.add('hidden'));

      const defaultLink = document.querySelector('#profile-nav-menu li[data-target="tab-identity"]');
      const defaultTab = document.getElementById('tab-identity');
      if (defaultLink) defaultLink.classList.add('active');
      if (defaultTab) defaultTab.classList.remove('hidden');
    } else if (targetId === 'view-report-priority') {
      if (typeof window.generatePriorityList === 'function') window.generatePriorityList();
    }
    // 🚀 SETTINGS TRIGGER
    else if (targetId === 'view-settings') {
      if (typeof window.loadActiveCycleOverview === 'function') window.loadActiveCycleOverview();
    }
    // 🚀 NEW: ACTIVITY LOG AUDIT TRAIL TRIGGER
    else if (targetId === 'view-activity-log') {
      if (typeof window.loadActivityLogs === 'function') window.loadActivityLogs();
    }
      // ==========================================
      // 🚀 THE MAP FIX: TELL MAPS TO LOAD ON REFRESH
    // ==========================================
    else if (targetId === 'view-map') {
      if (typeof window.loadAdminGlobalMap === 'function') window.loadAdminGlobalMap();
    } else if (targetId === 'view-ceo-map') {
      if (typeof window.loadCEOGlobalMap === 'function') window.loadCEOGlobalMap();
    } else if (targetId === 'view-barangay-map') {
      if (typeof window.loadBarangayLocalMap === 'function') window.loadBarangayLocalMap();
    }
  };

// 👆 Handle Sidebar Clicks
  navLinks.forEach(link => {
    link.addEventListener('click', function(event) {
      event.preventDefault();
      const targetId = this.getAttribute('data-target');

      if (targetId) {
        // Write it down in the browser's memory
        history.pushState({ target: targetId }, "", "#" + targetId);
        switchView(targetId);
      }
    });
  });

// ⏪ THE BACK BUTTON WATCHER
  window.addEventListener('popstate', function(event) {
    if (event.state && event.state.target) {
      switchView(event.state.target);
    } else {
      // Default to dashboard if they go all the way back
      const currentPath = window.location.pathname.toLowerCase();
      const defaultHash = currentPath.includes("admin") ? 'view-admin-dashboard' : 'view-dashboard';
      switchView(defaultHash);
    }
  });

// 🟢 INITIAL LOAD: Auto-Run to prevent timing bugs!
  (function initializeView() {
    let hash = window.location.hash.replace('#', '').trim();
    let savedTab = sessionStorage.getItem('roadwise_active_tab');

    // Priority Check: 1. URL Hash, 2. Saved Tab in Memory
    let finalTarget = hash || savedTab;

    // 🛑 SAFETY CHECK: Does the target actually exist in the HTML?
    if (!finalTarget || !document.getElementById(finalTarget)) {
      // If it's missing or invalid, forcefully find the correct dashboard ID
      if (document.getElementById('view-admin-dashboard')) {
        finalTarget = 'view-admin-dashboard';
      } else if (document.getElementById('view-dashboard')) {
        finalTarget = 'view-dashboard';
      } else {
        console.error("CRITICAL: No dashboard container found in HTML!");
        return;
      }
    }

    // Update URL and execute view safely
    history.replaceState({ target: finalTarget }, "", "#" + finalTarget);
    switchView(finalTarget);
  })();

// =======================================================
// ⚙️ ADMIN SETTINGS & CYCLE TRACKER LOGIC
// =======================================================

// Helper: Extract Year
  function getReportYearSettings(r) {
    if (!r) return "";
    const yearVal = r.inventory_year || r.inventoryYear;
    if (yearVal && String(yearVal).trim() !== "" && String(yearVal).toLowerCase() !== "null") {
      return String(yearVal).trim();
    }
    const rawDate = r.dateSubmitted || r.date_submitted || r.createdAt || r.created_at || r.dateReported || r.date;
    if (rawDate) {
      if (Array.isArray(rawDate) && rawDate.length >= 1) return String(rawDate[0]);
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) return String(parsed.getFullYear());
    }
    return "";
  }

// Main Function: Load Dynamic Counts from Database
  window.loadActiveCycleOverview = function() {
    const currentYear = String(new Date().getFullYear());
    const yearEl = document.getElementById("settings-active-year");
    if (yearEl) yearEl.textContent = `${currentYear} Cycle`;

    // Fetch actual Total City Roads AND all Reports concurrently
    Promise.all([
      apiFetch("/api/city-roads").catch(() => []),
      apiFetch("/api/reports").catch(() => [])
    ])
      .then(([cityRoads, reports]) => {
        // A. Get Actual Total Road Count from DB (Fallback to 378 if API fails)
        const totalRoads = (Array.isArray(cityRoads) && cityRoads.length > 0) ? cityRoads.length : 378;

        // B. Filter Reports for the Current Year ONLY
        const currentYearReports = (Array.isArray(reports) ? reports : []).filter(r => {
          return getReportYearSettings(r) === currentYear;
        });

        // C. Deduplicate: Count how many UNIQUE roads have been inspected this year
        const uniqueRoadsInspected = new Set();
        currentYearReports.forEach(r => {
          const roadKey = String(r.cityRoadId || r.cityRoadName || r.id).trim().toLowerCase();
          if (roadKey) uniqueRoadsInspected.add(roadKey);
        });

        const inspectedCount = uniqueRoadsInspected.size;

        // D. Calculate Percentage safely
        let percentage = 0;
        if (totalRoads > 0) {
          percentage = Math.round((inspectedCount / totalRoads) * 100);
        }
        if (percentage > 100) percentage = 100;

        // E. Update the UI DOM Elements
        const countEl = document.getElementById("settings-inspected-count");
        const totalEl = document.getElementById("settings-total-roads");
        const barEl = document.getElementById("settings-progress-bar");
        const percentEl = document.getElementById("settings-progress-percent");
        const badgeEl = document.getElementById("cycle-status-badge");

        if (countEl) countEl.textContent = inspectedCount;
        if (totalEl) totalEl.textContent = totalRoads;
        if (percentEl) percentEl.textContent = `${percentage}%`;

        if (barEl) {
          barEl.style.width = `${percentage}%`;

          // Visual feedback based on completion
          if (percentage >= 100) {
            barEl.style.background = "#16a34a"; // Green
            if (percentEl) percentEl.style.color = "#16a34a";
            if (badgeEl) {
              badgeEl.textContent = "COMPLETED (READY TO ARCHIVE)";
              badgeEl.style.background = "#fee2e2";
              badgeEl.style.color = "#dc2626";
              badgeEl.style.borderColor = "#fecaca";
            }
          } else {
            barEl.style.background = "#2563eb"; // Blue
            if (percentEl) percentEl.style.color = "#2563eb";
            if (badgeEl) {
              badgeEl.textContent = "ACTIVE (OPEN FOR INSPECTION)";
              badgeEl.style.background = "#dcfce7";
              badgeEl.style.color = "#16a34a";
              badgeEl.style.borderColor = "#bbf7d0";
            }
          }
        }
      })
      .catch(err => console.error("Failed to load cycle overview data:", err));
  };

// =======================================================
// 🚨 DANGER ZONE: ANNUAL CYCLE ROLLOVER LOGIC
// =======================================================

// 1. Open the Verification Modal
  window.openRolloverModal = function() {
    const modal = document.getElementById("modal-rollover-confirm");
    const input = document.getElementById("input-rollover-confirm");
    const btn = document.getElementById("btn-execute-rollover");

    if (modal) {
      modal.style.display = "flex";
      modal.classList.remove("hidden");
    }

    if (input && btn) {
      input.value = ""; // Reset input
      input.focus();
      btn.style.opacity = "0.5";
      btn.style.pointerEvents = "none";
      btn.style.cursor = "not-allowed";

      // 2. Real-time typing validation
      input.oninput = function() {
        if (this.value.trim().toUpperCase() === "ARCHIVE CYCLE") {
          btn.style.opacity = "1";
          btn.style.pointerEvents = "auto";
          btn.style.cursor = "pointer";
        } else {
          btn.style.opacity = "0.5";
          btn.style.pointerEvents = "none";
          btn.style.cursor = "not-allowed";
        }
      };
    }
  };

// 3. Close the Modal
  window.closeRolloverModal = function() {
    const modal = document.getElementById("modal-rollover-confirm");
    if (modal) {
      modal.style.display = "none";
      modal.classList.add("hidden");
    }
  };

// 4. Fire the Request to the Backend
  window.executeAnnualRollover = function() {
    const btn = document.getElementById("btn-execute-rollover");
    if (btn) {
      btn.innerHTML = "Processing... ⏳";
      btn.style.pointerEvents = "none";
      btn.style.opacity = "0.7";
    }

    apiFetch("/api/reports/rollover-annual-cycle", {
      method: "POST"
    })
      .then(res => {
        if (typeof showToast === "function") {
          showToast(`Rollover Complete: Archived ${res.archivedCount || 0} reports. Emails sent.`, "success");
        } else {
          alert(`Rollover Complete: Archived ${res.archivedCount || 0} reports.`);
        }

        window.closeRolloverModal();
        if (typeof window.loadActiveCycleOverview === "function") {
          window.loadActiveCycleOverview();
        }
      })
      .catch(err => {
        console.error("Rollover failed:", err);
        if (typeof showToast === "function") {
          showToast("Error processing annual rollover.", "error");
        } else {
          alert("Error processing annual rollover.");
        }
      })
      .finally(() => {
        if (btn) {
          btn.innerHTML = "Execute Rollover";
        }
      });
  };

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


  // =======================================================
// 🖨️ GLOBAL GENERATE REPORT CONTROLLER (FAIL-PROOF)
// =======================================================

// 1. Toggle Dropdown Menu Open/Close
  window.toggleGenerateReportDropdown = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("print-dropdown");
    if (!dropdown) return;

    if (dropdown.classList.contains("hidden")) {
      dropdown.classList.remove("hidden");
      dropdown.style.display = "block";
    } else {
      dropdown.classList.add("hidden");
      dropdown.style.display = "none";
    }
  };

// 2. Global Outside-Click Listener to Close Dropdown
  document.addEventListener("click", function(e) {
    const dropdown = document.getElementById("print-dropdown");
    const btn = document.getElementById("btn-generate-menu");
    if (dropdown && !dropdown.classList.contains("hidden")) {
      if (btn && !btn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add("hidden");
        dropdown.style.display = "none";
      }
    }
  });

// 3. Option 1: Open Annual City Road Inventory View
  window.openAdminRoadInventory = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("print-dropdown");
    if (dropdown) {
      dropdown.classList.add("hidden");
      dropdown.style.display = "none";
    }

    // Hide all sections
    document.querySelectorAll(".content-section").forEach(sec => {
      sec.classList.add("hidden");
      sec.style.display = "none";
    });
    document.querySelectorAll(".nav-menu li").forEach(l => l.classList.remove("active"));

    // Show Inventory View
    const invSection = document.getElementById("view-road-inventory");
    if (invSection) {
      invSection.classList.remove("hidden");
      invSection.style.display = "block";
    }

    // Load Inventory Data
    if (typeof window.loadAdminInventoryYears === "function") window.loadAdminInventoryYears();
    if (typeof window.loadAdminRoadInventory === "function") window.loadAdminRoadInventory();
  };

// 4. Option 2: Open Priority Repair List View
  window.openPriorityReportList = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("print-dropdown");
    if (dropdown) {
      dropdown.classList.add("hidden");
      dropdown.style.display = "none";
    }

    // Hide all sections
    document.querySelectorAll(".content-section").forEach(sec => {
      sec.classList.add("hidden");
      sec.style.display = "none";
    });
    document.querySelectorAll(".nav-menu li").forEach(l => l.classList.remove("active"));

    // Show Priority View
    const prioritySection = document.getElementById("view-report-priority");
    if (prioritySection) {
      prioritySection.classList.remove("hidden");
      prioritySection.style.display = "block";
    }

    // Generate Priority List
    if (typeof generatePriorityList === "function") generatePriorityList();
  };

  // ==========================================
// 8. BARANGAY MANAGEMENT: LOAD MAIN TABLE & MODALS
// ==========================================
  function loadBarangayManagement() {
    const tableBody = document.getElementById('barangay-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 15px;">Loading Barangays... <span class="icon">⏳</span></td></tr>';

    // 🚀 Phase 2 Backend Endpoint (We will build this in Java next)
    apiFetch('/api/barangays/dashboard-summary')
      .then(data => {
        tableBody.innerHTML = '';

        if (!data || data.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 15px;">No barangays found in the system.</td></tr>';
          return;
        }

        data.forEach(brgy => {
          // 🚀 Smart Badge Logic
          let badgeHtml = `<span class="badge" style="background-color: #e9ecef; color: #6c757d;">0 Active</span>`;
          if (brgy.activeReportCount >= 5) {
            badgeHtml = `<span class="badge high">${brgy.activeReportCount} Active</span>`; // Red
          } else if (brgy.activeReportCount > 0) {
            badgeHtml = `<span class="badge medium">${brgy.activeReportCount} Active</span>`; // Orange
          }

          const row = document.createElement('tr');
          row.innerHTML = `
          <td><strong>${brgy.name}</strong></td>
          <td>${brgy.contactName || 'Unassigned'}</td>
          <td>${brgy.roadCount || 0} Roads</td>
          <td>${badgeHtml}</td>
          <td>
            <button class="btn-small manage-brgy-btn"
              onclick="openManageBarangayModal(${brgy.id}, '${brgy.name}', '${brgy.contactName || 'Unassigned'}', '${brgy.contactNumber || ''}', '${brgy.email || ''}', '${brgy.district || ''}')">
              Manage Barangay
            </button>
          </td>
        `;
          tableBody.appendChild(row);
        });
      })
      .catch(err => {
        console.error('Error loading barangays:', err);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red; padding: 15px;">Failed to load database.</td></tr>';
      });
  }


// ==========================================
// 9. MASTER PROFILE LOGIC (HEADER, SIDEBAR & PHOTO)
// ==========================================
  window.populateProfileData = function() {
    try {
      const getSafeStr = (key, fallback) => {
        const val = sessionStorage.getItem(key);
        return (val && val !== 'null' && val.trim() !== '') ? val : fallback;
      };

      const firstName = getSafeStr('firstName', 'Unknown');
      const middleName = getSafeStr('middleName', '');
      const lastName = getSafeStr('lastName', 'User');
      const email = getSafeStr('email', 'Not Provided');
      const phone = getSafeStr('phoneNumber', 'Not Provided');
      const birthday = getSafeStr('birthday', '');
      const gender = getSafeStr('gender', 'Not Specified');
      const username = getSafeStr('username', 'N/A');
      const role = getSafeStr('userRole', 'BARANGAY');
      const barangayName = getSafeStr('barangayName', 'Not Assigned');
      const profilePic = getSafeStr('profilePicture', '');

      // Name & Age Builder
      let fullName = middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
      let displayAge = "N/A";
      let displayBirthday = "Not Provided";

      if (birthday) {
        displayBirthday = birthday;
        const birthDate = new Date(birthday);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let ageCalc = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            ageCalc--;
          }
          displayAge = `${ageCalc} years old`;
        }
      }

      // Role Formatter
      let displayRole = "Barangay Official";
      const userRoleLower = String(role).toLowerCase();
      if (userRoleLower.includes('admin') || userRoleLower.includes('cpdo')) {
        displayRole = "CPDO Admin";
      } else if (userRoleLower.includes('ceo') || userRoleLower.includes('engineer')) {
        displayRole = "City Engineer";
      }

      const setElText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      // Text Injections
      setElText('sidebar-display-name', fullName);
      setElText('sidebar-display-role', displayRole);
      setElText('side-profile-name', fullName);
      setElText('side-profile-role', displayRole);
      setElText('side-profile-brgy', barangayName);
      setElText('header-display-name', fullName);
      setElText('header-display-role', displayRole);

      setElText('profile-full-name', fullName);
      setElText('profile-email', email);
      setElText('profile-phone', phone);
      setElText('profile-birthday', displayBirthday);
      setElText('profile-age', displayAge);
      setElText('profile-gender', gender);
      setElText('profile-username', username);
      setElText('profile-role', displayRole);

      const profileBarangayEl = document.getElementById('profile-barangay');
      if (profileBarangayEl) {
        if (userRoleLower.includes('admin') || userRoleLower.includes('cpdo')) {
          profileBarangayEl.textContent = 'City Planning and Development Office';
        } else if (userRoleLower.includes('ceo') || userRoleLower.includes('engineer')) {
          profileBarangayEl.textContent = 'City Engineering Office';
        } else {
          profileBarangayEl.textContent = barangayName;
        }
      }

      // 🖼️ RENDER PROFILE PICTURE IN HEADER & PROFILE TAB
      const headerImg = document.getElementById('header-profile-img');
      const headerFallback = document.getElementById('header-profile-fallback');
      const mainAvatar = document.getElementById('main-profile-avatar');

      const isValidImage = profilePic &&
        profilePic !== 'no_image.jpg' &&
        profilePic.toLowerCase() !== 'null' &&
        profilePic.toLowerCase() !== 'undefined';

      if (isValidImage) {
        if (headerImg) {
          window.loadSecureImage('header-profile-img', profilePic);
          headerImg.style.display = 'block';
        }
        if (headerFallback) headerFallback.style.display = 'none';

        if (mainAvatar) {
          mainAvatar.innerHTML = `<img id="sidebar-avatar-img" src="" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
          window.loadSecureImage('sidebar-avatar-img', profilePic);
        }
      } else {
        if (headerImg) headerImg.style.display = 'none';
        if (headerFallback) headerFallback.style.display = 'inline';

        if (mainAvatar) {
          const defaultIcon = userRoleLower.includes('admin') ? '🏢' : (userRoleLower.includes('ceo') ? '⚙️' : '🏛️');
          mainAvatar.innerHTML = defaultIcon;
        }
      }

    } catch (error) {
      console.error("🚨 Profile Population Error:", error);
    }
  };

// ==========================================
// 🚀 AUTO-LOAD PROFILE HEADER GLOBALLY
// ==========================================
// Run this instantly when the dashboard opens, before anyone clicks anything!
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.populateProfileData === 'function') {
      window.populateProfileData();
    }
  });

// 🚀 FALLBACK: FORCE THE SCRIPT TO RUN (Bypasses missing DOMContentLoaded triggers)
  setTimeout(() => {
    if (typeof window.populateProfileData === 'function') {
      window.populateProfileData();
    }
  }, 300);

// --- PROFILE BUTTON TRIGGERS (WITH STATE RESET FIX) ---
  const profileBtn = document.querySelector('.header-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // 🚀 THE FIX: Use the global router so the browser remembers we are here!
      history.pushState({ target: 'view-profile' }, "", "#view-profile");
      switchView('view-profile');
    });
  }

// --- PROFILE TAB NAVIGATION ---
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

// --- SECURE LOGOUT LOGIC (WITH CONFIRMATION MODAL) ---
  const logoutBtn = document.querySelector('.logout-btn');
  const logoutConfirmModal = document.getElementById('logout-confirm-modal');
  const btnConfirmLogout = document.getElementById('btn-confirm-logout');

  if (logoutBtn && logoutConfirmModal) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutConfirmModal.classList.remove('hidden');
    });
  }

  if (btnConfirmLogout) {
    btnConfirmLogout.addEventListener('click', () => {
      sessionStorage.clear();
      window.location.replace('login.html');
    });
  }

// --- BACK TO DASHBOARD BUTTON ---
  const backToDashBtn = document.getElementById('btn-back-dashboard');
  if (backToDashBtn) {
    backToDashBtn.addEventListener('click', () => {
      const currentPath = window.location.pathname.toLowerCase();
      const dashId = currentPath.includes("admin") ? 'view-admin-dashboard' : 'view-dashboard';

      // 🚀 THE FIX: Route safely back to the dashboard!
      history.pushState({ target: dashId }, "", "#" + dashId);
      switchView(dashId);
    });
  }


// ==========================================
// 10. OFFICIAL REPORT LOGIC (CEO PRIORITY LIST)
// ==========================================
  const btnPrintDocument = document.getElementById('btn-print-document');
  const btnCloseReport = document.getElementById('btn-close-report');
  const viewReportPriority = document.getElementById('view-report-priority');

// 1. Print Official Document (Suppresses browser header & footer stamps)
  if (btnPrintDocument) {
    btnPrintDocument.addEventListener('click', () => {
      const originalTitle = document.title;
      document.title = " ";
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    });
  }

// 2. Back to Reports / Dashboard
  if (btnCloseReport) {
    btnCloseReport.addEventListener('click', () => {
      // 1. Hide the Priority Report View
      if (viewReportPriority) {
        viewReportPriority.classList.add('hidden');
        viewReportPriority.style.display = 'none';
      }

      // 2. Return directly to the Reports Inbox if available
      const viewReports = document.getElementById('view-reports');
      if (viewReports) {
        viewReports.classList.remove('hidden');
        viewReports.style.display = 'block';
        return;
      }

      // 3. Fallback: Trigger the main dashboard
      const mainDashboardView =
        document.getElementById('view-dashboard') ||
        document.getElementById('view-overview') ||
        document.querySelector('.content-section:not(#view-report-priority):not(#view-settings)');

      if (mainDashboardView) {
        mainDashboardView.classList.remove('hidden');
        mainDashboardView.style.display = '';
      }
    });
  }

// ==========================================
// 🧠 THE STRICT PRIORITY ALGORITHM
// ==========================================
  function generatePriorityList() {
    // 🚀 1. SET DATE & ADMIN NAME INSTANTLY (Synchronous - No Waiting)
    const dateEl = document.getElementById('priority-doc-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    const adminName = ((sessionStorage.getItem("firstName") || "") + " " + (sessionStorage.getItem("lastName") || "")).trim();
    const adminNameEl = document.getElementById('priority-admin-name');
    if (adminNameEl) {
      adminNameEl.textContent = adminName || "CPDO Administrator";
    }

    // 🚀 2. FETCH & POPULATE REPORTS TABLE
    apiFetch(`/api/reports`)
      .then(reports => {
        const validatedReports = (Array.isArray(reports) ? reports : []).filter(
          r => String(r.status || '').toLowerCase() === 'validated'
        );

        // Calculate Priority Scores
        validatedReports.forEach(report => {
          const severity = String(report.severity || 'Unassessed').toLowerCase();
          const importance = String(report.roadImportance || '').toLowerCase();

          report.tierScore = 0;
          report.tierLabel = 'PENDING AI';
          report.tierColor = '#6c757d';

          if (severity === 'high') {
            report.tierScore = 3;
            report.tierLabel = 'HIGH';
            report.tierColor = '#dc3545';
          } else if (severity === 'medium') {
            if (importance.includes('core')) {
              report.tierScore = 3;
              report.tierLabel = 'HIGH';
              report.tierColor = '#dc3545';
            } else {
              report.tierScore = 2;
              report.tierLabel = 'MEDIUM';
              report.tierColor = '#ff8c00';
            }
          } else if (severity === 'low') {
            if (importance.includes('core')) {
              report.tierScore = 2;
              report.tierLabel = 'MEDIUM';
              report.tierColor = '#ff8c00';
            } else {
              report.tierScore = 1;
              report.tierLabel = 'LOW';
              report.tierColor = '#28a745';
            }
          }

          const dLength = parseFloat(report.damageLength) || 0;
          const dWidth = parseFloat(report.damageWidth) || 0;
          report.areaScore = dLength * dWidth;
        });

        // Sort: Highest Priority Tier first, then Largest Area
        validatedReports.sort((a, b) => {
          if (b.tierScore !== a.tierScore) {
            return b.tierScore - a.tierScore;
          }
          return b.areaScore - a.areaScore;
        });

        // Render to HTML Table
        const tbody = document.querySelector('.document-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (validatedReports.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">No validated reports available for dispatch.</td></tr>`;
          return;
        }

        validatedReports.forEach((report, index) => {
          const formatId = `#PRJ-${String(report.id).padStart(4, '0')}`;
          const formatName = report.cityRoadName || 'Unnamed Road';
          const formatBrgy = (report.barangay && report.barangay.barangayName) ? report.barangay.barangayName : 'Unknown';
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
      })
      .catch(err => {
        console.error("Error generating priority list:", err);
        if (typeof showToast === 'function') showToast("Error loading priority list.", "error");
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
        // 🚀 THE FIX: Swapped the scores so In Progress (3) beats Dispatched (2)!
        if (status === 'in progress' && hasRework) {
          report.statusScore = 4; // URGENT: Bounced back by Admin for Rework! (TOP)
        } else if (status === 'in progress') {
          report.statusScore = 3; // ACTIVE: Currently being worked on normally (High Priority)
        } else if (status === 'dispatched to ceo') {
          report.statusScore = 2; // NEW: Needs to be scheduled (Medium Priority)
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
    // 🚀 DYNAMIC COLSPAN: 7 columns for Masterlist, 6 columns for Dashboard
    const colCount = isDashboard ? "6" : "7";
    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align: center; padding: 30px; color: #94a3b8;">No active projects found.</td></tr>`;
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

    // ==========================================
    // 🚀 NEW: DYNAMIC BATCH CHECKBOX LOGIC
    // ==========================================
    let checkboxHtml = '';

    // Only process checkboxes if this is the Masterlist (NOT the dashboard table)
    if (!isDashboard) {
      // Only generate a clickable checkbox if the status is exactly "dispatched to ceo"
      if (status === 'dispatched to ceo') {
        checkboxHtml = `<td style="text-align: center; padding: 15px;">
                                <input type="checkbox" class="defer-checkbox" value="${report.id}" onchange="toggleBatchActionBar()" style="cursor: pointer; width: 16px; height: 16px;">
                            </td>`;
      } else {
        // If it's already "In Progress" or "Completed", leave an empty cell to keep the columns aligned
        checkboxHtml = `<td style="padding: 15px;"></td>`;
      }
    }

    const tr = document.createElement('tr');
    tr.style.borderBottom = "1px solid #f1f5f9";
    tr.style.transition = "background-color 0.2s";

    tr.onmouseover = () => tr.style.backgroundColor = "#f8fafc";
    tr.onmouseout = () => tr.style.backgroundColor = "transparent";

    tr.innerHTML = `
        ${checkboxHtml} <!-- 🚀 Injects the checkbox column (or leaves it blank for dashboard) -->
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
  if (!isDashboard && typeof window.filterCEOReports === 'function') {
    window.filterCEOReports();
  }

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

  // ==========================================
  // 🧹 5. THE FIX: WIPE OLD DATA & PREVIEWS (MATCHING EXACT HTML IDs)
  // ==========================================
  // 1. Clear previous server images
  const dmgImg = document.getElementById('ceo-modal-image');
  if (dmgImg) dmgImg.src = '';

  const proofImg = document.getElementById('ceo-modal-proof-image');
  if (proofImg) proofImg.src = '';

  // 2. Clear the actual File Input and Remarks so they are empty
  const proofInput = document.getElementById('ceo-repair-image-upload');
  if (proofInput) proofInput.value = '';

  const remarksInput = document.getElementById('ceo-repair-remarks');
  if (remarksInput) remarksInput.value = '';

  // 3. 🚀 WIPE THE VISUAL PREVIEW UI AND RESTORE DEFAULT CAMERA ICON

  // A. Clear the green filename text
  const fileNameDisplay = document.getElementById('ceo-repair-file-name');
  if (fileNameDisplay) fileNameDisplay.innerText = '';

  // B. Clear the actual image preview tag
  const previewImgTag = document.getElementById('ceo-preview-img');
  if (previewImgTag) previewImgTag.src = '';

  // C. Hide the wrapper that holds the Image AND the Red "X" button
  const previewContainer = document.getElementById('ceo-dropzone-preview');
  if (previewContainer) previewContainer.style.display = 'none';

  // D. SHOW the default "Click to upload or drag photo here" box again
  const defaultDropzone = document.getElementById('ceo-dropzone-default');
  if (defaultDropzone) defaultDropzone.style.display = 'block';
  // ==========================================

  // 🚀 FETCH THE DATA
  apiFetch(`/api/reports/${reportId}`, { cache: 'no-store' })
    .then(report => {
      // ... (Keep the rest of your .then() logic exactly as it is) ...
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
      let ceoSubmitterText = `Barangay Official (${report.barangay?.barangayName || 'Unknown'})`;
      if (report.user && report.user.firstName && report.user.lastName) {
        ceoSubmitterText = `${report.user.firstName} ${report.user.lastName} (${report.barangay?.barangayName || 'Unknown'})`;
      } else if (report.reportedBy) {
        ceoSubmitterText = report.reportedBy;
      }
      const ceoSubmitterEl = document.getElementById('ceo-modal-submitter-name');
      if (ceoSubmitterEl) ceoSubmitterEl.innerText = ceoSubmitterText;
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

  // 🚀 THE FIX: Send the specific User ID so the server knows EXACTLY who submitted it!
  const loggedInUserId = sessionStorage.getItem("userId");
  if (loggedInUserId) {
    formData.append("userId", loggedInUserId);
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
// STEP 1: INITIATE LOGIN & REQUEST MFA CODE
// ==========================================
function handleLogin() {
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value;
  const password = passwordInput.value;

  if (!username || !password) {
    showToast("Please enter both your Official ID and password.", "error");
    return;
  }

  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.innerHTML = "Authenticating... ⏳";
    loginBtn.disabled = true;
    loginBtn.style.opacity = "0.7";
  }

  fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username, password: password })
  })
    .then(async response => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid credentials');
      }
      return response.json();
    })
    .then(data => {
      // 🚀 MFA TRIGGER: If backend says MFA is required, slide to Step 2
      if (data.mfaRequired) {
        // Temporarily store the ID so we can verify it in Step 2
        sessionStorage.setItem("tempUserId", data.userId);

        // Hide login, show MFA
        document.getElementById("login-step-1").style.display = "none";
        document.getElementById("login-step-2").style.display = "block";

        showToast(data.message, "success");

        // Reset the login button for next time
        if (loginBtn) {
          loginBtn.innerHTML = "Log in ➔";
          loginBtn.disabled = false;
          loginBtn.style.opacity = "1";
        }
      }
    })
    .catch(error => {
      // 🚀 SMART CHECK: User-friendly Network Error
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        showToast("System is currently offline or unreachable. Please try again later.", "error");
      } else {
        showToast(error.message, "error");
      }

      if (loginBtn) {
        loginBtn.innerHTML = "Log in ➔";
        loginBtn.disabled = false;
        loginBtn.style.opacity = "1";
      }
    });
}

// ==========================================
// STEP 2: VERIFY 6-DIGIT CODE & GRANT ACCESS
// ==========================================
function handleVerifyMfa() {
  const otpInput = document.getElementById("mfa-code").value.trim();
  const tempUserId = sessionStorage.getItem("tempUserId");

  if (!otpInput || otpInput.length !== 6) {
    showToast("Please enter a valid 6-digit code.", "error");
    return;
  }

  const verifyBtn = document.getElementById("verify-btn");
  if (verifyBtn) {
    verifyBtn.innerHTML = "Verifying... ⏳";
    verifyBtn.disabled = true;
    verifyBtn.style.opacity = "0.7";
  }

  fetch(`${API_BASE_URL}/api/auth/verify-mfa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: tempUserId, otp: otpInput })
  })
    .then(async response => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid verification code');
      }
      return response.json();
    })
    .then(data => {
      // 🚀 SUCCESS! Cleanup temp data and save real session data
      sessionStorage.removeItem("tempUserId");

      sessionStorage.setItem("userId", data.userId);
      sessionStorage.setItem("username", data.username || "N/A");
      sessionStorage.setItem("userRole", data.role);
      sessionStorage.setItem("firstName", data.firstName || "");
      sessionStorage.setItem("middleName", data.middleName || "");
      sessionStorage.setItem("lastName", data.lastName || "");
      sessionStorage.setItem("email", data.email || "");
      sessionStorage.setItem("phoneNumber", data.phoneNumber || "");
      sessionStorage.setItem("birthday", data.birthday || "");
      sessionStorage.setItem("gender", data.gender || "");
      sessionStorage.setItem("profilePicture", data.profilePicture || "no_image.jpg");

      if (data.barangayId) {
        sessionStorage.setItem("barangayId", data.barangayId);
      }
      sessionStorage.setItem("barangayName", data.barangayName || "City Hall Central");

      // ==========================================
      // 🚀 NEW: REMEMBER ME LOGIC
      // ==========================================
      const rememberCheckbox = document.getElementById("remember-me");
      const usernameInput = document.getElementById("username").value.trim();

      if (rememberCheckbox && rememberCheckbox.checked) {
        // Save the username to permanent browser storage
        localStorage.setItem("roadwise_remembered_username", usernameInput);
      } else {
        // Clear it if they unchecked the box
        localStorage.removeItem("roadwise_remembered_username");
      }
      // ==========================================

      showToast("Access Granted!", "success");

      // Secure Dynamic Routing
      setTimeout(() => {
        const userRole = String(data.role).toLowerCase();
        if (userRole.includes("admin") || userRole.includes("cpdo")) {
          window.location.replace("admin_dashboard.html");
        } else if (userRole.includes("ceo") || userRole.includes("engineer")) {
          window.location.replace("ceo_dashboard.html");
        } else {
          window.location.replace("barangay_dashboard.html");
        }
      }, 1000);
    })
    .catch(error => {
      // 🚀 SMART CHECK: User-friendly Network Error
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        showToast("System is currently offline or unreachable. Please try again later.", "error");
      } else {
        showToast(error.message, "error");
      }

      if (verifyBtn) {
        verifyBtn.innerHTML = "Verify Code ➔";
        verifyBtn.disabled = false;
        verifyBtn.style.opacity = "1";
      }
    });
}


// ==========================================
// FORGOT PASSWORD: SHOW SCREEN
// ==========================================
function showForgotPassword() {
  document.getElementById("login-step-1").style.display = "none";
  document.getElementById("login-step-2").style.display = "none";
  document.getElementById("forgot-step-1").style.display = "block";
}

// ==========================================
// FORGOT PASSWORD: SEND OTP TO EMAIL
// ==========================================
function handleForgotPasswordRequest() {
  const email = document.getElementById("reset-email").value.trim();

  if (!email) {
    showToast("Please enter your registered email address.", "error");
    return;
  }

  const btn = document.getElementById("request-reset-btn");
  btn.innerHTML = "Sending... ⏳";
  btn.disabled = true;

  fetch(`${API_BASE_URL}/api/auth/forgot-password/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  })
    .then(async response => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to request reset.');
      }
      return response.json();
    })
    .then(data => {
      sessionStorage.setItem("resetUserId", data.userId);
      showToast(data.message, "success");

      document.getElementById("forgot-step-1").style.display = "none";
      document.getElementById("forgot-step-2").style.display = "block";

      btn.innerHTML = "Send Code ➔";
      btn.disabled = false;
    })
    .catch(error => {
      // 🚀 SMART CHECK: User-friendly Network Error
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        showToast("System is currently offline or unreachable. Please try again later.", "error");
      } else {
        showToast(error.message, "error");
      }

      btn.innerHTML = "Send Code ➔";
      btn.disabled = false;
    });
}

// ==========================================
// FORGOT PASSWORD: VERIFY OTP & SAVE PASSWORD
// ==========================================
function handlePasswordReset() {
  const otp = document.getElementById("reset-code").value.trim();
  const newPassword = document.getElementById("new-password").value.trim();
  const confirmPassword = document.getElementById("confirm-new-password").value.trim();
  const userId = sessionStorage.getItem("resetUserId");

  if (!otp || otp.length !== 6) {
    showToast("Please enter the 6-digit code.", "error");
    return;
  }

  if (!newPassword || !confirmPassword) {
    showToast("Please enter and confirm your new password.", "error");
    return;
  }

  // 🚀 NEW: STRICT ENTERPRISE PASSWORD REGEX
  const strictPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  if (!strictPasswordRegex.test(newPassword)) {
    showToast("Password must be 8+ characters, with 1 uppercase letter, 1 number, and 1 special character.", "error");
    return;
  }

  // PASSWORD MATCH VALIDATION
  if (newPassword !== confirmPassword) {
    showToast("Passwords do not match!", "error");
    return;
  }

  const btn = document.getElementById("submit-reset-btn");
  btn.innerHTML = "Resetting... ⏳";
  btn.disabled = true;

  fetch(`${API_BASE_URL}/api/auth/forgot-password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId, otp: otp, newPassword: newPassword })
  })
    .then(async response => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reset password.');
      }
      return response.json();
    })
    .then(data => {
      showToast(data.message, "success");
      backToLogin();
      btn.innerHTML = "Confirm & Reset ➔";
      btn.disabled = false;
    })
    .catch(error => {
      // 🚀 SMART CHECK: User-friendly Network Error
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        showToast("System is currently offline or unreachable. Please try again later.", "error");
      } else {
        showToast(error.message, "error");
      }

      btn.innerHTML = "Confirm & Reset ➔";
      btn.disabled = false;
    });
}

// ==========================================
// UI HELPER: GO BACK TO LOGIN SCREEN
// ==========================================
function backToLogin() {
  // Hide all secondary steps
  document.getElementById("login-step-2").style.display = "none";
  document.getElementById("forgot-step-1").style.display = "none";
  document.getElementById("forgot-step-2").style.display = "none";

  // Show primary login
  document.getElementById("login-step-1").style.display = "block";

  // Wipe inputs clean for security
  if (document.getElementById("mfa-code")) document.getElementById("mfa-code").value = "";
  if (document.getElementById("reset-email")) document.getElementById("reset-email").value = "";
  if (document.getElementById("reset-code")) document.getElementById("reset-code").value = "";
  if (document.getElementById("new-password")) document.getElementById("new-password").value = "";
  if (document.getElementById("confirm-new-password")) document.getElementById("confirm-new-password").value = "";

  // Wipe temporary memory
  sessionStorage.removeItem("tempUserId");
  sessionStorage.removeItem("resetUserId");
}

// =======================================================
// 🧠 REMEMBER ME: AUTO-FILL ON PAGE LOAD
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
  const savedUsername = localStorage.getItem("roadwise_remembered_username");
  const usernameInput = document.getElementById("username");
  const rememberCheckbox = document.getElementById("remember-me");

  if (savedUsername && usernameInput && rememberCheckbox) {
    usernameInput.value = savedUsername;
    rememberCheckbox.checked = true; // Keep the box checked if we remembered them
  }
});

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
      // 🚀 SEPARATION OF CONCERNS: Filter out Tracking & Archive items!
      // ==========================================
      // We DO NOT want to see Dispatched, In Progress, Completed, Closed, or Archived here.
      const inboxReports = reports.filter(r => {
        const s = String(r.status || '').toLowerCase();
        return !s.includes('dispatch') &&
          !s.includes('progress') &&
          !s.includes('complet') &&
          !s.includes('clos') &&
          !s.includes('archiv'); // 🚀 THE FIX: Hide Archived reports from the Inbox!
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

      // ==========================================
      // 🚀 THE FIX: INSTANTLY RE-APPLY THE FILTER!
      // ==========================================
      if (typeof window.filterAdminReports === 'function') {
        window.filterAdminReports();
      }

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

      // ========================================================
      // 🚀 THE FIX: Inject the Real Submitter Name here!
      // ========================================================
      let submitterText = `Barangay Official (${report.barangay?.barangayName || 'Unknown'})`;
      if (report.user && report.user.firstName && report.user.lastName) {
        submitterText = `${report.user.firstName} ${report.user.lastName} (${report.barangay?.barangayName || 'Unknown'})`;
      } else if (report.reportedBy) {
        submitterText = report.reportedBy;
      }

      // Make sure 'modal-report-by' is the ID in your admin_dashboard.html!
      const reportByEl = document.getElementById('modal-report-by');
      if (reportByEl) reportByEl.textContent = submitterText;
      // ========================================================

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

      // 🚀 THE FIX: Re-apply the search/filter just in case data was reloaded!
      if (typeof window.filterBarangayReports === 'function') window.filterBarangayReports();

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

      const trackedReports = reports.filter(r => {
        const status = String(r.status || '').toLowerCase().trim();
        return status === 'dispatched to ceo' ||
          status === 'in progress' ||
          status === 'completed' ||
          status === 'pending budget' ||
          status === 'closed' ||
          status === 'archived';
      });

      if (trackedReports.length === 0) {
        // 🚀 FIX: Updated colspan to 7 to account for the new Checkbox column
        trackingTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">No active repair projects to track.</td></tr>`;
        return;
      }

      trackedReports.forEach(report => {
        const status = String(report.status || '').toLowerCase().trim();
        if (status === 'completed') report.statusScore = 4;
        else if (status === 'in progress') report.statusScore = 3;
        else if (status === 'dispatched to ceo') report.statusScore = 2;
        else if (status === 'pending budget') report.statusScore = 1;
        else report.statusScore = 0;

        const severity = String(report.severity || 'low').toLowerCase();
        const importance = String(report.roadImportance || '').toLowerCase();

        if (severity === 'high' || (severity === 'medium' && importance.includes('core'))) {
          report.priorityScore = 3;
        } else if (severity === 'medium' || (severity === 'low' && importance.includes('core'))) {
          report.priorityScore = 2;
        } else {
          report.priorityScore = 1;
        }
      });

      trackedReports.sort((a, b) => {
        if (b.statusScore !== a.statusScore) return b.statusScore - a.statusScore;
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
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
        // 🚀 NEW: Checkbox HTML logic
        let checkboxHtml = '';

        if (currentStatus === 'completed') {
          statusHtml = `<span class="status-badge validated" style="background-color: #d4edda; color: #155724;">Completed (Pending QA)</span>`;
          borderStyle = '4px solid #28a745';
        } else if (currentStatus === 'in progress') {
          statusHtml = `<span class="status-badge" style="background-color: #cce5ff; color: #004085;">In Progress</span>`;
        } else if (currentStatus === 'pending budget') {
          statusHtml = `<span class="status-badge" style="background-color: #fef08a; color: #854d0e;">⚠️ Pending Budget</span>`;
          borderStyle = '4px solid #eab308';
          // 🚀 ONLY inject the checkbox if it is Pending Budget!
          checkboxHtml = `<input type="checkbox" class="archive-checkbox" value="${report.id}" onclick="updateBatchArchiveUI()" style="cursor: pointer; transform: scale(1.2);">`;
        } else if (currentStatus === 'closed') {
          statusHtml = `<span class="status-badge" style="background-color: #e2e3e5; color: #6c757d;">✅ Officially Closed</span>`;
          borderStyle = '4px solid #6c757d';
        } else if (currentStatus === 'archived') {
          statusHtml = `<span class="status-badge" style="background-color: #cbd5e1; color: #475569;">📁 Archived (Deferred)</span>`;
          borderStyle = '4px solid #475569';
        } else {
          statusHtml = `<span class="status-badge pending" style="background-color: #e2e3e5; color: #383d41;">Dispatched to CEO</span>`;
        }

        const row = document.createElement('tr');
        row.style.borderLeft = borderStyle;
        if (currentStatus === 'completed') row.style.backgroundColor = '#fafafa';

        if (currentStatus === 'closed' || currentStatus === 'archived') {
          row.style.opacity = '0.6';
          row.style.backgroundColor = '#f8f9fa';
        }

        row.innerHTML = `
          <td style="text-align: center;">${checkboxHtml}</td>
          <td><strong>${formatId}</strong></td>
          <td>${formatBrgy}</td>
          <td>${roadName}</td>
          <td>${badgeHtml}</td>
          <td>${statusHtml}</td>
          <td><button class="btn-small track-btn" onclick="openTrackingModal(${report.id})">Track</button></td>
        `;
        trackingTableBody.appendChild(row);
      });
      if (typeof window.filterTrackingReports === 'function') {
        window.filterTrackingReports();
      }

    })
    .catch(error => {
      console.error("Error loading tracking data:", error);
      trackingTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Failed to load tracking data.</td></tr>`;
    });
}

// ==========================================
// 🚀 NEW: BATCH ARCHIVE HELPER FUNCTIONS
// ==========================================

// 1. Select / Deselect All logic
window.toggleArchiveSelectAll = function(sourceCheckbox) {
  const checkboxes = document.querySelectorAll('.archive-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = sourceCheckbox.checked;
  });
  updateBatchArchiveUI();
};

// 2. Count checked boxes and show/hide the action bar
window.updateBatchArchiveUI = function() {
  const checkedBoxes = document.querySelectorAll('.archive-checkbox:checked');
  const count = checkedBoxes.length;

  const actionBar = document.getElementById('batch-archive-container');
  const countText = document.getElementById('archive-selected-count');

  if (count > 0) {
    actionBar.style.display = 'flex';
    countText.innerText = count;
  } else {
    actionBar.style.display = 'none';
    const selectAllCb = document.getElementById('archive-select-all');
    if (selectAllCb) selectAllCb.checked = false;
  }
};

// Global variable to temporarily hold the IDs while the modal is open
let pendingArchiveIds = [];

// 3. Triggered when clicking "Archive Selected" in the grey action bar
window.submitBatchArchive = function() {
  const checkedBoxes = document.querySelectorAll('.archive-checkbox:checked');
  if (checkedBoxes.length === 0) return;

  // Gather all the selected IDs
  pendingArchiveIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

  // Update the text in the modal to show the exact count
  document.getElementById('batch-archive-confirm-text').innerText =
    `Are you sure you want to securely archive these ${pendingArchiveIds.length} deferred projects?`;

  // Show our beautiful custom modal!
  document.getElementById('batch-archive-confirm-modal').classList.remove('hidden');
};

// 4. Triggered when clicking "Yes, Archive" inside the modal
window.executeBatchArchive = function() {
  // Hide the modal instantly
  document.getElementById('batch-archive-confirm-modal').classList.add('hidden');

  apiFetch('/api/reports/batch/archive', {
    method: 'POST',
    body: JSON.stringify({ reportIds: pendingArchiveIds })
  })
    .then(response => {
      // 🚀 FIX: Pass exactly 2 parameters to match your showToast function
      const successMsg = response.message || `Archived ${pendingArchiveIds.length} projects successfully.`;

      if (window.showToast) {
        window.showToast(successMsg, "success"); // <-- Now correctly formatted!
      } else {
        alert(successMsg);
      }

      // Hide the action bar and uncheck "Select All"
      document.getElementById('batch-archive-container').style.display = 'none';
      const selectAllCb = document.getElementById('archive-select-all');
      if (selectAllCb) selectAllCb.checked = false;

      // Reload the table instantly and clear the pending array
      loadTrackingData();
      pendingArchiveIds = [];
    })
    .catch(err => {
      console.error("Batch archive error:", err);
      if (window.showToast) {
        window.showToast("Failed to archive projects.", "error"); // <-- Fixed parameter order here too!
      } else {
        alert("Failed to archive projects.");
      }
      pendingArchiveIds = []; // clear it out on error too
    });
};
// ==========================================
// 7. NEW TRACKING MODAL LOGIC
// ==========================================
let currentTrackingReportId = null;

function openTrackingModal(reportId) {
  currentTrackingReportId = reportId;

  const trackingModal = document.getElementById('tracking-modal');
  if (!trackingModal) return;

  const primaryActions = document.getElementById('tracking-primary-actions');
  const reworkForm = document.getElementById('tracking-rework-form');
  const reworkInput = document.getElementById('rework-remarks-input');

  if (primaryActions) primaryActions.classList.remove('hidden');
  if (reworkForm) reworkForm.classList.add('hidden');
  if (reworkInput) reworkInput.value = '';

  trackingModal.classList.remove('hidden');

  setTimeout(() => {
    const modalBody = trackingModal.querySelector('.modal-body');
    const modalContent = trackingModal.querySelector('.modal-content');
    if (modalBody) modalBody.scrollTop = 0;
    if (modalContent) modalContent.scrollTop = 0;
    trackingModal.scrollTop = 0;
  }, 10);

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

      let submitterText = `Barangay Official (${report.barangay?.barangayName || 'Unknown'})`;

      if (report.user && report.user.firstName && report.user.lastName) {
        submitterText = `${report.user.firstName} ${report.user.lastName} (${report.barangay?.barangayName || 'Unknown'})`;
      } else if (report.reportedBy) {
        submitterText = report.reportedBy;
      }

      setText('track-modal-submitter', submitterText);

      const sevBox = document.getElementById('track-modal-severity');
      if (sevBox) {
        const sev = String(report.severity || 'low').toLowerCase();
        if (sev === 'high') sevBox.innerHTML = `<span class="badge high">HIGH</span>`;
        else if (sev === 'medium') sevBox.innerHTML = `<span class="badge medium">MEDIUM</span>`;
        else sevBox.innerHTML = `<span class="badge low">LOW</span>`;
      }

      if (typeof window.loadSecureImage === 'function') {
        window.loadSecureImage('track-modal-image', report.damageImage);
      }

      const statusBox = document.getElementById('track-modal-status');
      const statusText = document.getElementById('track-modal-status-text');
      const approveBtn = document.getElementById('btn-approve-project');
      const reworkBtn = document.getElementById('btn-rework-project');

      const proofPlaceholder = document.getElementById('track-modal-proof-placeholder');
      const resolutionData = document.getElementById('track-modal-resolution-data');
      const proofRemarks = document.getElementById('track-modal-proof-remarks');

      const status = String(report.status || '').toLowerCase();

      // ==========================================
      // 🚀 STATUS-BASED UI LOGIC
      // ==========================================
      if (status === 'completed') {
        if (statusBox) {
          statusBox.textContent = 'Repaired (Pending Approval)';
          statusBox.style.backgroundColor = '#d4edda';
          statusBox.style.color = '#155724';
        }
        if (statusText) statusText.textContent = 'CEO has finished the repair. Awaiting Admin QA.';

        if (approveBtn) {
          approveBtn.disabled = false;
          approveBtn.style.backgroundColor = '#28a745';
          approveBtn.style.cursor = 'pointer';
          approveBtn.innerHTML = `<span class="icon">✅</span> Approve & Close Project`; // 🚀 RESET TEXT
        }
        if (reworkBtn) reworkBtn.classList.remove('hidden');

        if (proofPlaceholder) proofPlaceholder.style.display = 'none';
        if (resolutionData) resolutionData.style.display = 'block';

        if (proofRemarks) proofRemarks.textContent = report.repairRemarks || "No official remarks provided.";
        if (typeof window.loadSecureImage === 'function') {
          window.loadSecureImage('track-modal-proof-image', report.proofOfRepairImage);
        }

      } else if (status === 'pending budget') {
        if (statusBox) {
          statusBox.textContent = 'Deferred (Pending Budget)';
          statusBox.style.backgroundColor = '#fef08a';
          statusBox.style.color = '#854d0e';
        }

        if (statusText) statusText.textContent = `CEO Remarks: "${report.repairRemarks || "Deferred due to budget constraints."}"`;

        // 🚀 THE FIX: Unlock the button so CPDO Admin can archive it!
        if (approveBtn) {
          approveBtn.disabled = false;
          approveBtn.style.backgroundColor = '#475569'; // Slate Gray for archiving
          approveBtn.style.cursor = 'pointer';
          approveBtn.innerHTML = `<span class="icon">📁</span> Acknowledge & Archive`; // 🚀 DYNAMIC TEXT
        }
        if (reworkBtn) reworkBtn.classList.add('hidden');

        if (proofPlaceholder) proofPlaceholder.style.display = 'block';
        if (resolutionData) resolutionData.style.display = 'none';

      } else {
        if (statusBox) {
          statusBox.textContent = report.status || 'Dispatched';
          statusBox.style.backgroundColor = '#e2e3e5';
          statusBox.style.color = '#383d41';
        }
        if (statusText) statusText.textContent = 'Engineering crew is actively handling this project.';

        if (approveBtn) {
          approveBtn.disabled = true;
          approveBtn.style.backgroundColor = '#ccc';
          approveBtn.style.cursor = 'not-allowed';
          approveBtn.innerHTML = `<span class="icon">✅</span> Approve & Close Project`; // 🚀 RESET TEXT
        }
        if (reworkBtn) reworkBtn.classList.add('hidden');

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

      // 🚀 THE MAGIC: Detect if we are Archiving or Closing based on the button text
      const isArchiving = btnApprove.innerText.includes('Archive');
      const targetStatus = isArchiving ? "Archived" : "Closed";
      const loadingText = isArchiving ? "⏳ Archiving..." : "⏳ Approving...";
      const successMsg = isArchiving ? "Project safely archived!" : "Project officially approved and closed!";

      // Save the original text so we can revert it if an error happens
      const originalText = btnApprove.innerHTML;

      btnApprove.innerHTML = loadingText;
      btnApprove.disabled = true;

      fetch(`${API_BASE_URL}/api/reports/${currentTrackingReportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }) // 🚀 Send "Archived" OR "Closed"
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to update project status");
          return res.text();
        })
        .then(() => {
          showToast(successMsg, "success");
          trackingModal.classList.add('hidden');
          if (typeof loadTrackingData === 'function') loadTrackingData();
        })
        .catch(err => {
          console.error(err);
          showToast(`Error ${isArchiving ? 'archiving' : 'closing'} project.`, "error");
        })
        .finally(() => {
          btnApprove.innerHTML = originalText;
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

window.loadAdminGlobalMap = function() {
  const mapContainer = document.getElementById('admin-global-map');
  if (!mapContainer) return;

  // 🚀 THE FIX: The pins are now safely INSIDE the function!
  const pinRed = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
  const pinOrange = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
  const pinGreen = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
  const pinGrey = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

  // 🚀 1. Define the strict boundaries of San Jose Del Monte City
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

    // Overlay the labels (Barangay names, roads, etc.) on top of the satellite imagery
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
        // 🚀 THE FIX: Hide Completed, Closed, Rejected, AND Archived!
        return !s.includes('complet') && !s.includes('clos') && !s.includes('reject') && !s.includes('archiv');
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
        // 🚀 THE FIX: Hide Completed, Closed, AND Archived!
        return !s.includes('complet') && !s.includes('clos') && !s.includes('archiv');
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

// ==========================================
// 10. EDIT PROFILE MODAL LOGIC (FIXED)
// ==========================================

const btnEditProfile = document.getElementById('btn-edit-profile');
const editProfileModal = document.getElementById('edit-profile-modal');
const formEditProfile = document.getElementById('form-edit-profile');
const phoneInput = document.getElementById('edit-prof-phone');

// 1. Strict Phone Validation
if (phoneInput) {
  phoneInput.addEventListener('input', function (e) {
    this.value = this.value.replace(/[^0-9]/g, '');
    if (this.value.length > 11) {
      this.value = this.value.slice(0, 11);
    }
  });
}

// 2. Helper Function: Safely Close and Clear the Modal
function closeAndClearEditModal() {
  if (editProfileModal) {
    editProfileModal.classList.add('hidden');
  }
  if (formEditProfile) {
    formEditProfile.reset(); // 🚀 THE FIX: Wipes all fields completely clean!
  }
}

// 3. Open Modal and Pre-fill Fresh Data
if (btnEditProfile && editProfileModal) {
  btnEditProfile.removeAttribute('onclick');

  btnEditProfile.addEventListener('click', () => {
    // Clear any old garbage first
    if (formEditProfile) formEditProfile.reset();

    editProfileModal.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // 🚀 THE FIX: Ensures modal is at the top of the screen

    // Pre-fill Locked Records
    document.getElementById('edit-prof-first').value = sessionStorage.getItem('firstName') || '';
    document.getElementById('edit-prof-middle').value = sessionStorage.getItem('middleName') || '';
    document.getElementById('edit-prof-last').value = sessionStorage.getItem('lastName') || '';
    document.getElementById('edit-prof-role').value = sessionStorage.getItem('role') || '';
    document.getElementById('edit-prof-brgy').value = sessionStorage.getItem('barangayName') || '';

    // Pre-fill Editable Details
    document.getElementById('edit-prof-phone').value = sessionStorage.getItem('phoneNumber') || '';
    document.getElementById('edit-prof-email').value = sessionStorage.getItem('email') || '';
    document.getElementById('edit-prof-birthday').value = sessionStorage.getItem('birthday') || '';

    const genderVal = sessionStorage.getItem('gender');
    if (genderVal) document.getElementById('edit-prof-gender').value = genderVal;
  });
}

// 4. Wire the Cancel / Close buttons to use the new clear function
const closeEditBtns = document.querySelectorAll('#edit-profile-modal .close-modal-btn, #edit-profile-modal button[type="button"]');
closeEditBtns.forEach(btn => {
  btn.addEventListener('click', closeAndClearEditModal);
});

// 5. Handle the Save Button
if (formEditProfile) {
  formEditProfile.addEventListener('submit', (e) => {
    e.preventDefault();

    const userId = sessionStorage.getItem('userId');
    if (!userId) {
      showToast("Session expired. Please log in again.", "error");
      return;
    }

    const phoneVal = phoneInput ? phoneInput.value : '';
    if (phoneVal && phoneVal.length < 11) {
      showToast("Phone number must be exactly 11 digits.", "error");
      return;
    }

    const updatedData = {
      phoneNumber: phoneVal,
      email: document.getElementById('edit-prof-email').value,
      birthday: document.getElementById('edit-prof-birthday').value,
      gender: document.getElementById('edit-prof-gender').value
    };

    const submitBtn = formEditProfile.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = "Saving... ⏳";
    submitBtn.disabled = true;

    fetch(`${API_BASE_URL}/api/users/${userId}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    })
      .then(response => {
        if (!response.ok) throw new Error("Failed to update profile");

        // Update browser memory
        sessionStorage.setItem('phoneNumber', updatedData.phoneNumber);
        sessionStorage.setItem('email', updatedData.email);
        sessionStorage.setItem('birthday', updatedData.birthday);
        sessionStorage.setItem('gender', updatedData.gender);

        // 🚀 THE FIX: Instantly Force Update the UI Elements (Bypasses the ReferenceError)
        const pPhone = document.getElementById('profile-phone');
        if (pPhone) pPhone.textContent = updatedData.phoneNumber;

        const pEmail = document.getElementById('profile-email');
        if (pEmail) pEmail.textContent = updatedData.email;

        const pGender = document.getElementById('profile-gender');
        if (pGender) pGender.textContent = updatedData.gender;

        const pBirthday = document.getElementById('profile-birthday');
        if (pBirthday) pBirthday.textContent = updatedData.birthday;

        // Recalculate Age instantly
        if (updatedData.birthday) {
          const birthDate = new Date(updatedData.birthday);
          const today = new Date();
          let ageCalc = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) ageCalc--;

          const pAge = document.getElementById('profile-age');
          if (pAge) pAge.textContent = `${ageCalc} years old`;
        }

        closeAndClearEditModal();
        showToast("Profile updated successfully!", "success");
      })
      .catch(error => {
        console.error('Error:', error);
        showToast("Failed to save profile changes.", "error");
      })
      .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      });
  });
}

// ==========================================
// 11. PROFILE PICTURE LOGIC
// ==========================================
const profilePicUpload = document.getElementById('profile-pic-upload');
const mainAvatar = document.getElementById('main-profile-avatar');

// 1. Helper to visually update the Avatar circle dynamically
window.updateAvatarDisplay = function(imageName) {
  if (!mainAvatar) return;

  // Ensure we apply the correct fallback gradient based on role
  const applyFallbackTheme = () => {
    mainAvatar.innerHTML = '🏛️';
    const role = String(sessionStorage.getItem('userRole')).toLowerCase();

    if (role.includes('admin') || role.includes('cpdo')) {
      mainAvatar.style.backgroundImage = 'linear-gradient(135deg, #1e40af, #3b82f6)'; // Admin Blue
    } else if (role.includes('ceo') || role.includes('engineer')) {
      mainAvatar.style.backgroundImage = 'linear-gradient(135deg, #ea580c, #f97316)'; // CEO Orange
    } else {
      mainAvatar.style.backgroundImage = 'linear-gradient(135deg, #15803d, #22c55e)'; // Barangay Green
    }
  };

  // 🚀 THE FIX 1: Strict check for bad database data ("null", "undefined", or empty)
  if (!imageName ||
    imageName === 'no_image.jpg' ||
    String(imageName).trim().toLowerCase() === 'null' ||
    String(imageName).trim().toLowerCase() === 'undefined' ||
    String(imageName).trim() === '') {
    applyFallbackTheme();
    return;
  }

  const url = String(imageName).startsWith("http") ? imageName : `${API_BASE_URL}/uploads/${imageName}`;

  // 🚀 THE FIX 2: Check if the file ACTUALLY exists on the server
  fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    .then(res => {
      if (!res.ok) throw new Error("Image not found on server");
      return res.blob();
    })
    .then(blob => {
      const objectURL = URL.createObjectURL(blob);
      mainAvatar.innerHTML = ''; // Hide the emoji
      mainAvatar.style.backgroundImage = `url(${objectURL})`;
      mainAvatar.style.backgroundSize = 'cover';
      mainAvatar.style.backgroundPosition = 'center';
    })
    .catch(err => {
      console.error("Failed to load avatar, falling back to default:", err);
      applyFallbackTheme(); // Revert to colored circle if the file is missing
    });
}

// 2. The Upload Logic (Triggered when they pick a photo)
if (profilePicUpload) {
  profilePicUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Strict 5MB file size limit to protect your server
    if (file.size > 5 * 1024 * 1024) {
      showToast("Please choose an image smaller than 5MB", "error");
      this.value = '';
      return;
    }

    const userId = sessionStorage.getItem('userId');
    if (!userId) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    showToast("Uploading new profile picture... ⏳", "info");

    // Send to the new Spring Boot endpoint
    fetch(`${API_BASE_URL}/api/users/${userId}/profile-picture`, {
      method: 'POST',
      body: formData
    })
      .then(response => {
        if (!response.ok) throw new Error("Upload failed");
        return response.json();
      })
      .then(data => {
        showToast("Profile picture updated successfully!", "success");
        // Save the new filename to browser memory and instantly update the UI
        sessionStorage.setItem('profilePicture', data.profilePicture);
        updateAvatarDisplay(data.profilePicture);
      })
      .catch(error => {
        console.error('Error:', error);
        showToast("Failed to upload picture.", "error");
      });
  });
}

// 3. The View Button Logic (Wire this to the 'View' button in your HTML)
window.openProfilePicViewer = function() {
  const imageName = sessionStorage.getItem('profilePicture');

  // 🚀 THE FIX 3: Stop the modal from opening if data is bad!
  if (!imageName ||
    imageName === 'no_image.jpg' ||
    String(imageName).trim().toLowerCase() === 'null' ||
    String(imageName).trim().toLowerCase() === 'undefined' ||
    String(imageName).trim() === '') {
    showToast("No custom profile picture uploaded.", "info");
    return;
  }

  const modal = document.getElementById('view-profile-pic-modal');
  const fullImg = document.getElementById('full-size-profile-pic');

  if (!modal || !fullImg) return;

  const url = String(imageName).startsWith("http") ? imageName : `${API_BASE_URL}/uploads/${imageName}`;

  // 🚀 THE FIX 4: Only open the modal if the fetch is 100% successful
  fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    .then(res => {
      if (!res.ok) throw new Error("Image file missing from server");
      return res.blob();
    })
    .then(blob => {
      fullImg.src = URL.createObjectURL(blob);
      modal.classList.remove('hidden');
    })
    .catch(err => {
      console.error("Failed to load full size profile picture:", err);
      showToast("Image file is missing or corrupted on the server.", "error");

      // Wipe the bad ghost data so it defaults back to the colored circle
      sessionStorage.setItem('profilePicture', 'no_image.jpg');
      updateAvatarDisplay('no_image.jpg');
    });
}

// Ensure the "View" button calls the function
const viewPicBtn = document.querySelector('button[onclick*="View Picture"]');
if (viewPicBtn) {
  viewPicBtn.setAttribute('onclick', 'openProfilePicViewer()');
}

// Ensure the avatar updates every time the profile modal is opened
updateAvatarDisplay(sessionStorage.getItem('profilePicture'));


// ==========================================
// 12. SECURITY & PASSWORD LOGIC (ENHANCED)
// ==========================================

// 🚀 Helper: Interactive Password Field Eye Toggle
window.togglePasswordVisibility = function(inputId, iconElement) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    iconElement.textContent = "🙈"; // Change icon to blind monkey / hidden state
  } else {
    input.type = "password";
    iconElement.textContent = "👁️"; // Back to eye
  }
};

const formChangePassword = document.getElementById('form-change-password');

if (formChangePassword) {
  formChangePassword.addEventListener('submit', (e) => {
    e.preventDefault();

    const currentPass = document.getElementById('sec-current-pass').value;
    const newPass = document.getElementById('sec-new-pass').value;
    const confirmPass = document.getElementById('sec-confirm-pass').value;
    const submitBtn = document.getElementById('btn-submit-password');

    // 1. Check if passwords match
    if (newPass !== confirmPass) {
      showToast("New passwords do not match!", "error");
      return;
    }

    // 2. Strict Enterprise Complexity Regex:
    // Min 8 chars, 1 Uppercase, 1 Number, 1 Special Character (@$!%*?&#)
    const strictPasswordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

    if (!strictPasswordRegex.test(newPass)) {
      showToast("Password must be 8+ characters, with 1 uppercase letter, 1 number, and 1 special character (@$!%*?&#).", "error");
      return;
    }

    const userId = sessionStorage.getItem('userId');
    if (!userId) {
      showToast("Session expired. Please log in again.", "error");
      return;
    }

    // Button Loading State
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = "Verifying & Saving... ⏳";
    submitBtn.disabled = true;

    // 3. Send Request to Spring Boot Backend
    fetch(`${API_BASE_URL}/api/users/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: currentPass,
        newPassword: newPass
      })
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to update password.");
        }
        return data;
      })
      .then(data => {
        showToast("Password successfully updated! 🔒", "success");
        formChangePassword.reset(); // Reset form fields

        // Revert all password input types back to hidden 'password'
        ['sec-current-pass', 'sec-new-pass', 'sec-confirm-pass'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.type = 'password';
        });
        // Revert icons back to eye
        document.querySelectorAll('#form-change-password span').forEach(span => {
          span.textContent = '👁️';
        });
      })
      .catch(error => {
        console.error('Error:', error);
        showToast(error.message, "error");
      })
      .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      });
  });
}


// ==========================================
// 👥 USER MANAGEMENT DATA FETCHER
// ==========================================
window.loadUserManagementTable = function() {
  const tbody = document.getElementById('user-management-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #64748b;">Loading officials from database...</td></tr>';

  apiFetch(`/api/users/officials`)
    .then(users => {
      if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #64748b;">No Barangay Officials found. Provision a new account above!</td></tr>';
        return;
      }

      let html = '';
      users.forEach(user => {
        // Safely grab the barangay name if it exists
        const brgyName = user.barangay ? (user.barangay.barangayName || `Barangay ID: ${user.barangay.id}`) : '<span style="color:red;">Pending Assignment</span>';

        // 🚀 Handle all 3 Account Statuses perfectly!
        let statusBadge = '';
        if (user.status === 'Deactivated') {
          statusBadge = '<span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">🔴 Deactivated</span>';
        } else if (user.status === 'Suspended') {
          statusBadge = '<span style="background: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">🟠 Suspended</span>';
        } else {
          // Defaults to Active if blank or active
          statusBadge = '<span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">🟢 Active</span>';
        }

        html += `
                    <tr style="border-bottom: 1px solid #e2e8f0; transition: 0.2s;">

                        <!-- 🚀 FIX: ADDED STRONG TAG AND DARKER FONT FOR CONSISTENCY -->
                        <td style="padding: 15px 20px; font-size: 14px; color: #333;">
                            <strong>${user.firstName || 'N/A'} ${user.lastName || 'N/A'}</strong>
                        </td>

                        <!-- 🚀 FIX: NORMALIZED FONT COLOR FOR READABILITY -->
                        <td style="padding: 15px 20px; font-size: 14px; color: #495057;">
                            ${user.username || 'N/A'}
                        </td>

                        <td style="padding: 15px 20px; font-size: 14px; color: #495057;">
                            <span style="color: #6c757d; margin-right: 5px;">🏛️</span> ${brgyName}
                        </td>

                        <td style="padding: 15px 20px; text-align: center;">
                            ${statusBadge}
                        </td>

                        <!-- 🚀 FIX: STANDARDIZED ACTION BUTTON DESIGN -->
                        <td style="padding: 15px 20px; text-align: right;">
                           <button class="btn-small manage-user-btn" onclick="openManageOfficialModal(${user.id})"
                                   style="background-color: #1a0ca3; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">
                             ⚙️ Manage
                           </button>
                        </td>
                    </tr>
                `;
      });
      tbody.innerHTML = html;
    })
    .catch(err => {
      console.error("Error loading officials:", err);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #dc2626;">Failed to load officials from server.</td></tr>';
    });
};

// Listen for clicks on the sidebar to load the table dynamically!
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll('.nav-menu li');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target === 'view-user-management') {
        loadUserManagementTable();
      }
    });
  });
});

// ==========================================
// 🏢 LOAD BARANGAYS FOR USER MANAGEMENT
// ==========================================
window.loadBarangayDropdownForAdmin = function() {
  const brgySelect = document.getElementById('add-user-barangay');
  if (!brgySelect) return;

  apiFetch(`/api/barangays`)
    .then(barangays => {
      let optionsHtml = '<option value="" disabled selected>Select Barangay Jurisdiction...</option>';

      // Sort barangays alphabetically
      barangays.sort((a, b) => a.barangayName.localeCompare(b.barangayName));

      barangays.forEach(brgy => {
        optionsHtml += `<option value="${brgy.id}">${brgy.barangayName}</option>`;
      });

      brgySelect.innerHTML = optionsHtml;
    })
    .catch(err => {
      console.error("Error loading barangays:", err);
      brgySelect.innerHTML = '<option value="" disabled>Error loading barangays</option>';
    });
};

// Make sure it loads when the Admin clicks the User Management tab!
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll('.nav-menu li');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target === 'view-user-management') {
        loadBarangayDropdownForAdmin(); // 🚀 Fetch the dropdown data!
      }
    });
  });
});
// ==========================================
// 👥 USER MANAGEMENT LOGIC (Add & Save Official)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const btnOpenAddUser = document.getElementById('btn-open-add-user');
  const addUserModal = document.getElementById('add-user-modal');
  const formAddUser = document.getElementById('form-add-user');

  // 1. OPEN MODAL & AUTO-GENERATE USERNAME
  if (btnOpenAddUser && addUserModal) {
    btnOpenAddUser.addEventListener('click', () => {
      addUserModal.classList.remove('hidden');

      const firstInput = document.getElementById('add-user-first');
      const lastInput = document.getElementById('add-user-last');
      const userOutput = document.getElementById('add-user-username');

      const updateUsername = () => {
        const first = firstInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const last = lastInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (first || last) {
          userOutput.value = `${first}.${last}`;
        } else {
          userOutput.value = '';
        }
      };

      firstInput.addEventListener('input', updateUsername);
      lastInput.addEventListener('input', updateUsername);
    });
  }

  // 2. SUBMIT NEW OFFICIAL TO DATABASE
  if (formAddUser) {
    formAddUser.addEventListener('submit', (e) => {
      e.preventDefault(); // Stop the page from reloading

      const submitBtn = formAddUser.querySelector('button[type="submit"]');
      submitBtn.innerHTML = "⏳ Saving...";
      submitBtn.disabled = true;

      // Package the data from the form
      const payload = {
        firstName: document.getElementById('add-user-first').value.trim(),
        middleName: document.getElementById('add-user-middle').value.trim(), // 🚀 NEW
        lastName: document.getElementById('add-user-last').value.trim(),
        email: document.getElementById('add-user-email').value.trim(),       // 🚀 NEW
        username: document.getElementById('add-user-username').value.trim(),
        password: document.getElementById('add-user-password').value,
        role: "BARANGAY",
        status: "Active",
        barangayId: document.getElementById('add-user-barangay').value
      };

      // Send to Spring Boot Backend
      apiFetch(`/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(response => {
          if (typeof showToast === 'function') showToast("Official account successfully provisioned!", "success");
          addUserModal.classList.add('hidden');
          formAddUser.reset();

          // Refresh the table so the Admin instantly sees the new user!
          if (typeof loadUserManagementTable === 'function') {
            loadUserManagementTable();
          }
        })
        .catch(error => {
          console.error("Error creating user:", error);
          if (typeof showToast === 'function') showToast("Failed to create account. Username might already exist.", "error");
        })
        .finally(() => {
          submitBtn.innerHTML = "💾 Provision Account";
          submitBtn.disabled = false;
        });
    });
  }
});

// ==========================================
// ⚙️ MANAGE OFFICIAL LOGIC (Edit, Suspend, Reset)
// ==========================================

// 1. OPEN MODAL & FETCH DATA
window.openManageOfficialModal = function(userId) {
  const modal = document.getElementById('manage-user-modal');
  if (!modal) return;

  document.getElementById('manage-user-id').value = userId;

  // First, load the barangays into the dropdown
  apiFetch(`/api/barangays`).then(barangays => {
    let optionsHtml = '<option value="" disabled>Select Barangay...</option>';
    barangays.sort((a, b) => a.barangayName.localeCompare(b.barangayName)).forEach(b => {
      optionsHtml += `<option value="${b.id}">${b.barangayName}</option>`;
    });
    document.getElementById('manage-user-barangay').innerHTML = optionsHtml;

    // Next, fetch the specific user's current data
    return apiFetch(`/api/users/${userId}`);
  })
    .then(user => {
      document.getElementById('manage-user-first').value = user.firstName || '';
      document.getElementById('manage-user-middle').value = user.middleName || '';
      document.getElementById('manage-user-last').value = user.lastName || '';
      document.getElementById('manage-user-email').value = user.email || '';
      document.getElementById('manage-user-status').value = user.status || 'Active';

      if (user.barangay) {
        document.getElementById('manage-user-barangay').value = user.barangay.id;
      }

      modal.classList.remove('hidden');
    })
    .catch(err => {
      console.error("Error loading user details:", err);
      if (typeof showToast === 'function') showToast("Failed to load official's data.", "error");
    });
};

// 2. SUBMIT PROFILE/STATUS CHANGES
document.addEventListener("DOMContentLoaded", () => {
  const formManageUser = document.getElementById('form-manage-user');

  if (formManageUser) {
    formManageUser.addEventListener('submit', (e) => {
      e.preventDefault();

      const submitBtn = formManageUser.querySelector('button[type="submit"]');
      submitBtn.innerHTML = "⏳ Saving Changes...";
      submitBtn.disabled = true;

      const userId = document.getElementById('manage-user-id').value;
      const payload = {
        firstName: document.getElementById('manage-user-first').value.trim(),
        middleName: document.getElementById('manage-user-middle').value.trim(),
        lastName: document.getElementById('manage-user-last').value.trim(),
        email: document.getElementById('manage-user-email').value.trim(),
        barangayId: document.getElementById('manage-user-barangay').value,
        status: document.getElementById('manage-user-status').value
      };

      apiFetch(`/api/users/${userId}/manage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(response => {
          if (typeof showToast === 'function') showToast("Official's record successfully updated!", "success");
          document.getElementById('manage-user-modal').classList.add('hidden');
          if (typeof loadUserManagementTable === 'function') loadUserManagementTable();
        })
        .catch(err => {
          console.error("Error updating user:", err);
          if (typeof showToast === 'function') showToast("Failed to update record.", "error");
        })
        .finally(() => {
          submitBtn.innerHTML = "💾 Save Profile Changes";
          submitBtn.disabled = false;
        });
    });
  }

  // 3. 🚨 EMERGENCY PASSWORD RESET (Custom Modal & Toast UI)
  const btnEmergencyReset = document.getElementById('btn-emergency-reset');
  const resetConfirmModal = document.getElementById('reset-confirm-modal');
  const btnConfirmReset = document.getElementById('btn-confirm-reset');

  if (btnEmergencyReset && resetConfirmModal) {
    // Open the custom warning modal instead of the 1990s confirm() popup
    btnEmergencyReset.addEventListener('click', () => {
      resetConfirmModal.classList.remove('hidden');
    });
  }

  if (btnConfirmReset) {
    // Execute the database reset ONLY when they click "Yes" inside the custom modal
    btnConfirmReset.addEventListener('click', () => {
      const userId = document.getElementById('manage-user-id').value;

      btnConfirmReset.innerHTML = "⏳ Resetting...";
      btnConfirmReset.disabled = true;

      apiFetch(`/api/users/${userId}/emergency-reset`, {
        method: 'PUT'
      })
        .then(response => {
          resetConfirmModal.classList.add('hidden'); // Hide the modal smoothly
          if (typeof showToast === 'function') showToast("Password successfully reset to default!", "success");
        })
        .catch(err => {
          console.error("Error resetting password:", err);
          resetConfirmModal.classList.add('hidden');
          if (typeof showToast === 'function') showToast("Failed to reset password.", "error");
        })
        .finally(() => {
          btnConfirmReset.innerHTML = "Yes, Reset Password";
          btnConfirmReset.disabled = false;
        });
    });
  }
});



// ==========================================
// 8. BARANGAY MANAGEMENT: LOAD MAIN TABLE
// ==========================================
window.loadBarangayManagement = function() {

  const tableBody = document.getElementById('barangay-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 15px;">Loading Barangays... <span class="icon">⏳</span></td></tr>';

  apiFetch('/api/barangays/dashboard-summary')
    .then(data => {
      tableBody.innerHTML = '';

      if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 15px;">No barangays found in the system.</td></tr>';
        return;
      }

      data.forEach((brgy, index) => {
        let badgeHtml = `<span class="badge" style="background-color: #e9ecef; color: #6c757d;">0 Active</span>`;
        if (brgy.activeReportCount >= 5) {
          badgeHtml = `<span class="badge high">${brgy.activeReportCount} Active</span>`;
        } else if (brgy.activeReportCount > 0) {
          badgeHtml = `<span class="badge medium">${brgy.activeReportCount} Active</span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="text-align: center; font-weight: bold; color: #6c757d;">${index + 1}</td>
          <td><strong>${brgy.name}</strong></td>
          <td>${brgy.contactName || 'Unassigned'}</td>
          <td>${brgy.roadCount || 0} Roads</td>
          <td>${badgeHtml}</td>
          <td>
            <!-- 🚀 CLEANED: Now we only pass the ID. The modal fetches the rest! -->
            <button class="btn-small manage-brgy-btn" onclick="openManageBarangayModal(${brgy.id})">
              Manage Barangay
            </button>
          </td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch(err => {
      console.error('Error loading barangays:', err);
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red; padding: 15px;">Failed to load database.</td></tr>';
    });
};

// ==========================================
// BARANGAY MANAGEMENT: OPEN MODAL & FETCH DATA
// ==========================================
let currentManageBarangayId = null;

window.openManageBarangayModal = function(id) {
  currentManageBarangayId = id;
  const modal = document.getElementById('barangay-modal');
  if (!modal) return;

  // Crash-proof helper
  const safeSetText = (elementId, text) => {
    const el = document.getElementById(elementId);
    if (el) el.innerText = text;
  };

  // Set temporary loading text
  safeSetText('manage-brgy-name', "Loading...");
  safeSetText('manage-brgy-kapitan', "Loading...");
  safeSetText('manage-brgy-contact', "Loading...");
  safeSetText('manage-brgy-email', "Loading...");

  const roadsBody = document.getElementById('manage-brgy-roads-body');
  if (roadsBody) {
    roadsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 15px;">Loading roads... ⏳</td></tr>';
  }

  // Show modal instantly
  modal.classList.remove('hidden');

  // 🚀 FETCH 1: THE BARANGAY INFO FIRST
  apiFetch(`/api/barangays/${id}`)
    .then(brgy => {
      // 🚀 THE PROBE: This will print the exact database response to your F12 Console!
      console.log("RAW BARANGAY DATA FROM DB:", brgy);

      safeSetText('manage-brgy-name', brgy.barangayName || "Unknown");
      safeSetText('manage-brgy-kapitan', brgy.brgyCaptain || 'Unassigned');
      safeSetText('manage-brgy-contact', brgy.contactNumber || 'N/A');
      safeSetText('manage-brgy-email', brgy.emailAddress || 'N/A');
    })
    .catch(err => {
      console.error("Error fetching barangay info:", err);
      safeSetText('manage-brgy-name', "Error Fetching Data");
      safeSetText('manage-brgy-kapitan', "Error");
    });

  // 🚀 FETCH 2: THE CITY ROADS
  apiFetch(`/api/roads/barangay/${id}`)
    .then(roads => {
      if (!roadsBody) return;
      roadsBody.innerHTML = '';

      if (roads.length === 0) {
        roadsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 15px; color: #6c757d;">No city roads registered to this jurisdiction yet.</td></tr>';
        return;
      }

      roads.forEach(road => {
        const row = document.createElement('tr');
        row.innerHTML = `
  <td style="padding: 10px; font-size: 12px;">${road.roadId || 'N/A'}</td>
  <td style="padding: 10px; font-size: 12px;"><strong>${road.roadName || 'Unnamed Road'}</strong></td>
  <td style="padding: 10px; font-size: 12px;">${road.roadImportance || 'Unknown'}</td>
  <td style="padding: 10px; text-align: right;">

    <!-- 🚀 THE ENHANCED EDIT BUTTON -->
    <button class="btn-edit-road" onclick="openEditRoadModal(${road.id})"
            style="background-color: #f8fafc; color: #3b82f6; border: 1px solid #bfdbfe; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      <span style="font-size: 14px;">✏️</span> Edit
    </button>

  </td>
`;
        roadsBody.appendChild(row);
      });
    })
    .catch(err => {
      console.error("Error loading roads:", err);
      if (roadsBody) {
        roadsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red; padding: 15px;">Failed to load roads.</td></tr>';
      }
    });
};

// ==========================================
// BARANGAY MANAGEMENT: EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // 🚀 THE FIX: Tell the table to load its data automatically when the page opens!
  if (document.getElementById('barangay-table-body')) {
    loadBarangayManagement();
  }

  // Open Add Barangay Modal
  const btnAddBarangay = document.getElementById('btn-add-barangay');
  const addBrgyModal = document.getElementById('add-brgy-modal');
  if (addBrgyModal && btnAddBarangay) {
    const closeBtns = addBrgyModal.querySelectorAll('.close-add-brgy-btn');
    btnAddBarangay.addEventListener('click', () => addBrgyModal.classList.remove('hidden'));
    closeBtns.forEach(btn => btn.addEventListener('click', () => addBrgyModal.classList.add('hidden')));
  }

  // Close Manage Barangay Modal
  const barangayModal = document.getElementById('barangay-modal');
  if (barangayModal) {
    const closeBtns = barangayModal.querySelectorAll('.close-brgy-btn');
    closeBtns.forEach(btn => btn.addEventListener('click', () => barangayModal.classList.add('hidden')));
  }

  // Open "Add Road" Modal from inside Manage Modal
  const btnOpenAddRoad = document.getElementById('btn-open-add-road');
  const addRoadModal = document.getElementById('add-road-modal');
  if (btnOpenAddRoad && addRoadModal) {
    btnOpenAddRoad.addEventListener('click', (e) => {
      e.preventDefault();
      addRoadModal.classList.remove('hidden');
    });

    const closeAddRoadBtns = addRoadModal.querySelectorAll('.close-add-road-btn');
    closeAddRoadBtns.forEach(btn => btn.addEventListener('click', () => addRoadModal.classList.add('hidden')));
  }
});


// ==========================================
// BARANGAY MANAGEMENT: ADD NEW BARANGAY
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const formAddBarangay = document.getElementById('form-add-barangay');

  if (formAddBarangay) {
    formAddBarangay.addEventListener('submit', function(e) {
      e.preventDefault();

      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = "⏳ Saving...";
      submitBtn.disabled = true;

      // Build the JSON payload matching your Barangay.java model
      const payload = {
        barangayName: document.getElementById('add-brgy-name').value.trim()
      };

      // Send to the Java backend
      fetch(`${API_BASE_URL}/api/barangays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(async res => {
          // 🚀 NEW: If the backend throws our 400 Bad Request error, catch the text!
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || "Failed to save Barangay");
          }
          return res.json();
        })
        .then(() => {
          showToast("Barangay successfully registered!", "success");

          // Hide modal and clear form
          document.getElementById('add-brgy-modal').classList.add('hidden');
          formAddBarangay.reset();

          // 🚀 INSTANT REFRESH: Reload the main table so the new Barangay appears!
          if (typeof loadBarangayManagement === 'function') {
            loadBarangayManagement();
          }
        })
        .catch(err => {
          console.error(err);
          // 🚀 NEW: Show the EXACT error message from Java in the Toast!
          showToast(err.message, "error");
        })
        .finally(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        });
    });
  }
});

// ==========================================
// BARANGAY MANAGEMENT: ADD CITY ROAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const formAddCityRoad = document.getElementById('form-add-city-road');

  if (formAddCityRoad) {
    formAddCityRoad.addEventListener('submit', function (e) {
      e.preventDefault();

      // Ensure we have an active Barangay ID from the Manage Modal
      if (!currentManageBarangayId) {
        showToast("Error: No Barangay selected.", "error");
        return;
      }

      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = "⏳ Saving...";
      submitBtn.disabled = true;

      // 🚀 We DO NOT send the Road ID. The Backend handles it!
      const payload = {
        roadName: document.getElementById('add-road-name').value.trim(),
        roadImportance: document.getElementById('add-road-importance').value,
        roadType: document.getElementById('add-road-type').value,
        terrainType: document.getElementById('add-road-terrain').value,
        barangay: { id: currentManageBarangayId }
      };

      fetch(`${API_BASE_URL}/api/roads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(async res => {
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || "Failed to save city road.");
          }
          return res.json();
        })
        .then(() => {
          showToast("City Road successfully registered!", "success");

          // Hide modal and reset form
          document.getElementById('add-road-modal').classList.add('hidden');
          formAddCityRoad.reset();

          // 🚀 Refresh the open Barangay Modal to show the new road!
          openManageBarangayModal(currentManageBarangayId);
        })
        .catch(err => {
          console.error(err);
          showToast(err.message, "error");
        })
        .finally(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        });
    });
  }
});


// ==========================================
// ✏️ EDIT CITY ROAD LOGIC
// ==========================================

// 1. FUNCTION TO OPEN AND POPULATE THE MODAL
window.openEditRoadModal = function(roadId) {
  // Fetch the specific road details from your Java backend
  apiFetch(`/api/roads/${roadId}`)
    .then(road => {
      // Secretly store the database ID so we know which road to update
      document.getElementById('edit-db-id').value = road.id;

      // Populate the visible fields
      document.getElementById('edit-road-sequence-id').value = road.roadId || 'N/A';
      document.getElementById('edit-road-name').value = road.roadName;
      document.getElementById('edit-road-importance').value = road.roadImportance;
      document.getElementById('edit-road-type').value = road.roadType;
      document.getElementById('edit-road-terrain').value = road.terrainType;

      // ==========================================
      // 🚀 THE FIX: TELEPORT AND FORCE Z-INDEX
      // ==========================================
      const modal = document.getElementById('edit-road-modal');

      // 1. Rip it out and paste it at the root of the document body
      document.body.appendChild(modal);

      // 2. Force it to be the absolute highest layer mathematically possible
      modal.style.zIndex = "99999";

      // 3. Show it!
      modal.classList.remove('hidden');
    })
    .catch(err => {
      console.error("Failed to fetch road details", err);
      showToast("Error: Failed to load road details.", "error");
    });
};

document.addEventListener('DOMContentLoaded', () => {

  // 2. CLOSE MODAL BUTTONS
  document.querySelectorAll('.close-edit-road-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('edit-road-modal').classList.add('hidden');
    });
  });

  // 3. SUBMIT UPDATED DATA
  const formEditRoad = document.getElementById('form-edit-city-road');
  if (formEditRoad) {
    formEditRoad.addEventListener('submit', function(e) {
      e.preventDefault();

      const dbId = document.getElementById('edit-db-id').value;

      // Note: We do NOT send the road sequence ID! It is locked.
      const payload = {
        roadName: document.getElementById('edit-road-name').value.trim(),
        roadImportance: document.getElementById('edit-road-importance').value,
        roadType: document.getElementById('edit-road-type').value,
        terrainType: document.getElementById('edit-road-terrain').value,
        barangay: { id: currentManageBarangayId } // Attaches it to the current Barangay
      };

      const submitBtn = this.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = "⏳ Saving...";
      submitBtn.disabled = true;

      // Send the PUT request to update the road
      fetch(`${API_BASE_URL}/api/roads/${dbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(async res => {
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || "Failed to update city road.");
          }
          return res.json();
        })
        .then(() => {
          showToast("City Road successfully updated!", "success");

          // Hide modal and reset form
          document.getElementById('edit-road-modal').classList.add('hidden');
          formEditRoad.reset();

          // 🚀 Refresh the Manage Barangay table instantly to show the changes!
          if (typeof openManageBarangayModal === 'function') {
            openManageBarangayModal(currentManageBarangayId);
          }
        })
        .catch(err => {
          console.error(err);
          showToast(err.message, "error");
        })
        .finally(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        });
    });
  }
});


// ==========================================
// ✏️ RENAME BARANGAY LOGIC
// ==========================================

window.openRenameBarangayModal = function() {
  // Grab the current name from the header and put it in the input box
  const currentName = document.getElementById('manage-brgy-name').textContent;
  document.getElementById('rename-brgy-input').value = currentName;

  // Teleport trick to avoid CSS traps
  const modal = document.getElementById('rename-brgy-modal');
  document.body.appendChild(modal);
  modal.classList.remove('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
  const formRename = document.getElementById('form-rename-barangay');

  if (formRename) {
    formRename.addEventListener('submit', function(e) {
      e.preventDefault();

      const newName = document.getElementById('rename-brgy-input').value.trim();
      const submitBtn = this.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;

      submitBtn.innerHTML = "⏳ Saving...";
      submitBtn.disabled = true;

      const payload = { barangayName: newName };

      // currentManageBarangayId is the global variable tracking which Manage modal is open
      fetch(`${API_BASE_URL}/api/barangays/${currentManageBarangayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(async res => {
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || "Failed to rename Barangay.");
          }
          return res.json();
        })
        .then(() => {
          showToast("Barangay successfully renamed!", "success");

          // 1. Close the tiny rename modal
          document.getElementById('rename-brgy-modal').classList.add('hidden');

          // 2. Instantly update the text on the Manage Modal header
          document.getElementById('manage-brgy-name').textContent = newName;

          // 3. Refresh the main background table so it reflects there too
          if (typeof window.loadBarangayManagement === 'function') {
            window.loadBarangayManagement();
          }
        })
        .catch(err => {
          console.error(err);
          showToast(err.message, "error");
        })
        .finally(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        });
    });
  }
});

// ==========================================
// 🔔 NOTIFICATION BELL UI LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const bellBtn = document.getElementById('btn-notification');
  const dropdown = document.getElementById('notification-dropdown');

  if (bellBtn && dropdown) {
    // 1. Toggle dropdown when clicking the bell
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevents the document click listener below from instantly closing it
      dropdown.classList.toggle('hidden');

      // 🚀 THE SCROLL BUG FIX: Force scroll to top when opened
      if (!dropdown.classList.contains('hidden')) {
        const listContainer = document.getElementById('notification-list');
        if (listContainer) {
          listContainer.scrollTop = 0;
        }
      }
    });

    // 2. Close dropdown if the user clicks anywhere else on the screen
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }
});

// ==========================================
// 🔔 PHASE 3: NOTIFICATION LOGIC (MODAL POPUP)
// ==========================================

// 🚀 DYNAMIC USER ID: Fetch the actual logged-in user's ID from session storage
const currentUserId = sessionStorage.getItem("userId");

// Stop the notification script if no one is logged in yet (e.g., on the login screen)
if (!currentUserId) {
  console.warn("No user is currently logged in. Notifications will not load.");
}

// 1. HELPER: Format dates to "Time Ago"
function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hours ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

// 2. HELPER: Fetch Unread Badge Count
window.fetchUnreadBadgeCount = function() {
  if (!currentUserId) return;
  apiFetch(`/api/notifications/user/${currentUserId}/unread-count`)
    .then(count => {
      const badge = document.getElementById('notification-badge');
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 99 ? '99+' : count;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    })
    .catch(err => console.error("Failed to load badge count:", err));
};

// 3. CORE FUNCTION: Load Compact Dropdown Notifications
window.loadNotifications = function() {
  if (!currentUserId) return;
  fetchUnreadBadgeCount();

  apiFetch(`/api/notifications/user/${currentUserId}`)
    .then(notifications => {
      const listContainer = document.getElementById('notification-list');
      if (!listContainer) return;

      if (!notifications || notifications.length === 0) {
        listContainer.innerHTML = '<div style="padding: 30px 20px; text-align: center; color: #94a3b8; font-size: 13px;">You have no notifications.</div>';
        return;
      }

      let html = '';
      const topNotifications = notifications.slice(0, 10);

      topNotifications.forEach(notif => {
        const bgClass = notif.read ? '#ffffff' : '#eff6ff';
        const weightClass = notif.read ? '600' : '700';
        const dotHtml = notif.read ? '' : '<span class="notif-dot" style="height: 8px; width: 8px; background: #3b82f6; border-radius: 50%; display: inline-block; margin-top: 4px; box-shadow: 0 0 5px rgba(59,130,246,0.5);"></span>';

        // Escaping text so quotes don't break the HTML attributes
        const safeTitle = notif.title ? notif.title.replace(/"/g, '&quot;') : 'Notification';
        const safeMessage = notif.message ? notif.message.replace(/"/g, '&quot;') : '';
        const timeStr = timeAgo(notif.createdAt);

        html += `
          <div data-read="${notif.read}"
               data-title="${safeTitle}"
               data-message="${safeMessage}"
               data-time="${timeStr}"
               onclick="openSingleNotification(${notif.id}, this)"
               style="padding: 14px 18px; border-bottom: 1px solid #f1f5f9; cursor: pointer; background: ${bgClass}; transition: background 0.2s;">

              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                  <div class="notif-title" style="font-size: 13.5px; color: #1e293b; font-weight: ${weightClass};">${notif.title}</div>
                  ${dotHtml}
              </div>
              <div class="notif-message" style="font-size: 12.5px; color: #475569; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${notif.message}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-weight: 500;">${timeStr}</div>
          </div>
        `;
      });
      listContainer.innerHTML = html;
    })
    .catch(err => console.error("Failed to load notifications:", err));
};

// 4. 🚀 THE NEW LOGIC: OPEN POPUP MODAL & MARK READ
window.openSingleNotification = function(notifId, element) {
  // A. Get the data stored safely inside the clicked element
  const title = element.getAttribute('data-title');
  const message = element.getAttribute('data-message');
  const time = element.getAttribute('data-time');

  // B. Populate the modal with the specific notification data
  document.getElementById('single-notif-title').innerText = title;
  document.getElementById('single-notif-message').innerText = message;
  document.getElementById('single-notif-time').innerText = time;

  // C. Open the detail modal and hide the dropdown bell
  document.getElementById('single-notif-modal').classList.remove('hidden');
  const dropdown = document.getElementById('notification-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  // D. If it's already read, we are done!
  if (element.getAttribute('data-read') === 'true') return;

  // E. Instantly update UI locally to "Read" state
  element.setAttribute('data-read', 'true');
  element.style.backgroundColor = '#ffffff';

  const dot = element.querySelector('.notif-dot');
  if (dot) dot.style.display = 'none';

  const titleEl = element.querySelector('.notif-title');
  if (titleEl) titleEl.style.fontWeight = '600';

  // F. Send the read request to the backend silently
  fetch(`${API_BASE_URL}/api/notifications/${notifId}/read`, { method: 'PUT' })
    .then(() => fetchUnreadBadgeCount())
    .catch(err => console.error("Error marking as read:", err));
};

// 5. ACTION: Mark ALL notifications as read
window.markAllAsRead = function() {
  if (!currentUserId) return;

  const markAllBtn = document.getElementById('btn-mark-all-read');
  if (markAllBtn) markAllBtn.innerText = "Marking...";

  fetch(`${API_BASE_URL}/api/notifications/user/${currentUserId}/read-all`, { method: 'PUT' })
    .then(res => {
      if (res.ok) loadNotifications();
    })
    .catch(err => console.error("Error marking all as read:", err))
    .finally(() => {
      if (markAllBtn) markAllBtn.innerText = "Mark all as read";
    });
};

// 6. ACTION: View All Activity Modal
window.viewAllActivity = function() {
  const dropdown = document.getElementById('notification-dropdown');
  if (dropdown) dropdown.classList.add('hidden');

  const allModal = document.getElementById('all-notifications-modal');
  if (allModal) {
    allModal.classList.remove('hidden');

    const modalList = document.getElementById('all-notifications-list');
    modalList.innerHTML = '<div style="padding: 30px; text-align: center; color: #64748b;">Loading history...</div>';

    apiFetch(`/api/notifications/user/${currentUserId}`)
      .then(notifications => {
        if (!notifications || notifications.length === 0) {
          modalList.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: #94a3b8;">No notification history found.</div>';
          return;
        }

        let html = '';
        notifications.forEach(notif => {
          const bgClass = notif.read ? '#ffffff' : '#eff6ff';
          const weightClass = notif.read ? '600' : '700';
          const dotHtml = notif.read ? '' : '<span class="notif-dot" style="height: 8px; width: 8px; background: #3b82f6; border-radius: 50%; display: inline-block; margin-top: 4px;"></span>';

          const safeTitle = notif.title ? notif.title.replace(/"/g, '&quot;') : 'Notification';
          const safeMessage = notif.message ? notif.message.replace(/"/g, '&quot;') : '';
          const timeStr = timeAgo(notif.createdAt);

          html += `
            <div data-read="${notif.read}"
                 data-title="${safeTitle}"
                 data-message="${safeMessage}"
                 data-time="${timeStr}"
                 onclick="openSingleNotification(${notif.id}, this)"
                 style="padding: 16px 24px; border-bottom: 1px solid #f1f5f9; cursor: pointer; background: ${bgClass}; transition: 0.2s;">

                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div class="notif-title" style="font-size: 14px; color: #1e293b; font-weight: ${weightClass};">${notif.title}</div>
                    ${dotHtml}
                </div>
                <div class="notif-message" style="font-size: 13px; color: #475569; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${notif.message}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 8px; font-weight: 500;">${timeStr}</div>
            </div>
          `;
        });
        modalList.innerHTML = html;
      })
      .catch(err => {
        modalList.innerHTML = '<div style="padding: 20px; text-align: center; color: red;">Failed to load history.</div>';
      });
  }
};

// ==========================================
// 🏗️ CEO ACTION: UNIFIED DEFER SYSTEM
// ==========================================

// Global variable to track if we are deferring a single project from the Review modal
window.deferringSingleId = null;

// 1. OPEN FROM INDIVIDUAL REVIEW MODAL (The Single Button)
window.markAsPendingBudget = function() {
  // 🚀 FIXED: Reads the variable exactly as you declared it
  if (typeof currentCEOProjectID === 'undefined' || !currentCEOProjectID) {
    if (typeof showToast === 'function') showToast("Error: Could not identify the report.", "error");
    return;
  }

  // Tell the system we are deferring THIS specific ID, not the checkboxes
  window.deferringSingleId = currentCEOProjectID;

  // Hide the review modal so they don't awkwardly overlap
  document.getElementById('manage-modal').classList.add('hidden');

  // 🚀 DYNAMICALLY CHANGE UI FOR A SINGLE PROJECT
  const titleEl = document.getElementById('defer-modal-title');
  const warningEl = document.getElementById('defer-modal-warning');
  const confirmBtn = document.getElementById('btn-confirm-batch-defer');

  if (titleEl) titleEl.innerText = `Defer Project #PRJ-${currentCEOProjectID}`;
  if (warningEl) warningEl.innerHTML = `You are about to defer this specific repair project to <span class="badge" style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px;">Pending Budget</span>.`;
  if (confirmBtn) confirmBtn.innerText = "Confirm Deferral";

  // Show the beautiful reason modal
  document.getElementById('batch-defer-reason').value = '';
  document.getElementById('batch-defer-modal').classList.remove('hidden');
};

// 2. OPEN FROM BATCH ACTION BAR (The Checkboxes)
window.openBatchDeferModal = function() {
  // Clear out the single ID tracker so the system knows to look at checkboxes instead
  window.deferringSingleId = null;

  // 🚀 DYNAMICALLY CHANGE UI FOR BATCH PROJECTS
  const titleEl = document.getElementById('defer-modal-title');
  const warningEl = document.getElementById('defer-modal-warning');
  const confirmBtn = document.getElementById('btn-confirm-batch-defer');

  if (titleEl) titleEl.innerText = "Batch Defer Projects";
  if (warningEl) warningEl.innerHTML = `This action will instantly sweep up and defer <strong>ALL</strong> selected reports in your queue to <span class="badge" style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px;">Pending Budget</span>.`;
  if (confirmBtn) confirmBtn.innerText = "Confirm Batch Deferral";

  document.getElementById('batch-defer-reason').value = '';
  document.getElementById('batch-defer-modal').classList.remove('hidden');
};

// 3. VALIDATE REASON & SHOW CONFIRMATION WARNING
window.submitBatchDefer = function() {
  const reasonInput = document.getElementById('batch-defer-reason');
  const reason = reasonInput.value;

  if (!reason || reason.trim() === '') {
    if (typeof showToast === 'function') showToast("Please provide a reason for the deferral.", "error");
    reasonInput.style.borderColor = "red";
    setTimeout(() => reasonInput.style.borderColor = "#cbd5e1", 2000);
    return;
  }

  const confirmText = document.getElementById('confirm-modal-text');
  const confirmBtn = document.getElementById('btn-final-confirm');

  let count = 0;

  if (window.deferringSingleId) {
    count = 1; // We are deferring just 1 from the Manage modal
    // 🚀 DYNAMIC TEXT FOR SINGLE DEFERRAL
    if (confirmText) confirmText.innerHTML = `You are about to defer <strong style="color: #dc3545; font-size: 16px;">this specific project</strong>. <br>This will immediately notify the CPDO and the Barangay Officials.`;
    if (confirmBtn) confirmBtn.innerText = "Yes, Defer Project";
  } else {
    const checkedBoxes = document.querySelectorAll('.defer-checkbox:checked');
    if (checkedBoxes.length === 0) {
      if (typeof showToast === 'function') showToast("No reports selected.", "error");
      return;
    }
    count = checkedBoxes.length;
    // 🚀 DYNAMIC TEXT FOR BATCH DEFERRAL
    if (confirmText) confirmText.innerHTML = `You are about to defer <strong style="color: #dc3545; font-size: 16px;">${count}</strong> selected reports. <br>This will immediately notify the CPDO and the Barangay Officials.`;
    if (confirmBtn) confirmBtn.innerText = "Yes, Defer Projects";
  }

  document.getElementById('confirm-action-modal').classList.remove('hidden');
};

// 4. EXECUTE THE API CALL
window.executeBatchDeferral = function() {
  const reason = document.getElementById('batch-defer-reason').value;
  let selectedIds = [];

  // Grab the ID(s) depending on which way the CEO started the process
  if (window.deferringSingleId) {
    selectedIds.push(window.deferringSingleId);
  } else {
    const checkedBoxes = document.querySelectorAll('.defer-checkbox:checked');
    selectedIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
  }

  const btn = document.getElementById('btn-final-confirm');
  const originalText = btn.innerText;
  btn.innerText = "Processing...";
  btn.disabled = true;

  // Send the array of IDs (whether it has 1 ID or 50 IDs) to the batch endpoint
  fetch(`${API_BASE_URL}/api/reports/batch/defer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repairRemarks: reason,
      reportIds: selectedIds
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        if (typeof showToast === 'function') showToast(data.error, "error");
      } else {
        if (typeof showToast === 'function') showToast(data.message, "success");

        // Hide all modals
        document.getElementById('confirm-action-modal').classList.add('hidden');
        document.getElementById('batch-defer-modal').classList.add('hidden');

        // Hide the action bar and uncheck the "Select All" box
        document.getElementById('batch-action-bar').style.display = 'none';
        const selectAllCb = document.getElementById('select-all-checkbox');
        if(selectAllCb) selectAllCb.checked = false;

        // Reset the single ID tracker
        window.deferringSingleId = null;

        // Refresh table
        if (typeof loadCEODashboardData === "function") loadCEODashboardData();
      }
    })
    .catch(err => {
      console.error("Defer Error:", err);
      if (typeof showToast === 'function') showToast("A network error occurred.", "error");
    })
    .finally(() => {
      btn.innerText = originalText;
      btn.disabled = false;
    });
};

// ==========================================
// 🏗️ UI LISTENER: TOGGLE ACTION BAR ON CHECK
// ==========================================
window.toggleBatchActionBar = function() {
  const checkedBoxes = document.querySelectorAll('.defer-checkbox:checked');
  const actionBar = document.getElementById('batch-action-bar');
  const countText = document.getElementById('selected-count');

  if (checkedBoxes.length > 0) {
    actionBar.style.display = 'flex';
    if (countText) countText.innerText = checkedBoxes.length;
  } else {
    actionBar.style.display = 'none';
  }
};

window.toggleAllCheckboxes = function(masterCheckbox) {
  const checkboxes = document.querySelectorAll('.defer-checkbox');
  checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
  toggleBatchActionBar();
};
// ==========================================
// 🧹 AUTO-RESET SEARCH BARS ON NAVIGATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {

  // Grab every button in your sidebar navigation menu
  const navButtons = document.querySelectorAll('.nav-menu li');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {

      // 1. Reset Admin Reports Search & Filter
      const adminSearch = document.getElementById('adminSearch');
      const adminFilter = document.getElementById('admin-status-filter');
      if (adminSearch) adminSearch.value = '';
      if (adminFilter) adminFilter.value = 'All';
      if (typeof window.filterAdminReports === 'function') window.filterAdminReports();

      // 2. Reset Barangay Dashboard Search & Filter
      const brgySearch = document.getElementById('report-search-bar');
      const brgyFilter = document.getElementById('report-status-filter');
      if (brgySearch) brgySearch.value = '';
      if (brgyFilter) brgyFilter.value = 'All';
      if (typeof window.filterBarangayReports === 'function') window.filterBarangayReports();

      // 3. Reset Global Admin Settings Tables (User & Barangay Management)
      const adminBrgySearch = document.getElementById('search-barangay-input');
      const adminUserSearch = document.getElementById('search-user-input');

      if (adminBrgySearch) {
        adminBrgySearch.value = '';
        if (typeof window.executeGlobalSearch === 'function') {
          window.executeGlobalSearch('search-barangay-input', 'barangay-table-body');
        }
      }

      if (adminUserSearch) {
        adminUserSearch.value = '';
        if (typeof window.executeGlobalSearch === 'function') {
          window.executeGlobalSearch('search-user-input', 'user-management-tbody');
        }
      }

      // 4. Reset Repair Tracking Search & Filter
      const trackSearch = document.getElementById('trackSearch');
      const trackFilter = document.getElementById('track-status-filter');
      if (trackSearch) trackSearch.value = '';
      if (trackFilter) trackFilter.value = 'All';
      if (typeof window.filterTrackingReports === 'function') window.filterTrackingReports();


      // 5. Reset CEO Repair Queue Search & Filter
      const ceoSearch = document.getElementById('ceoSearch');
      const ceoFilter = document.getElementById('ceo-priority-filter');
      if (ceoSearch) ceoSearch.value = '';
      if (ceoFilter) ceoFilter.value = 'All';
      if (typeof window.filterCEOReports === 'function') window.filterCEOReports();


    });
  });
});

// ==========================================
// 🕒 REAL-TIME SYSTEM CLOCK
// ==========================================
window.startLiveClock = function() {
  const clockElement = document.getElementById('live-clock-display');
  if (!clockElement) return;

  function updateClock() {
    const now = new Date();

    // 1. Format the Date (e.g., "Monday, August 17, 2026")
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', dateOptions);

    // 2. Format the Time (e.g., "10:09:57 AM")
    const timeOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
    const timeString = now.toLocaleTimeString('en-US', timeOptions);

    // 3. Inject it into the HTML with themed colors
    clockElement.innerHTML = `
      <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${timeString}</span>
      <span style="color: #cbd5e1; margin: 0 6px;">|</span>
      <span style="font-size: 12px; color: #64748b; font-weight: 500;">${dateString}</span>
    `;
  }

  // Run it once immediately so there is no 1-second delay on load
  updateClock();

  // Keep it ticking every second!
  setInterval(updateClock, 1000);
};

// Start the clock as soon as the page loads
document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.startLiveClock === 'function') {
    window.startLiveClock();
  }
});

// ==========================================
// 📊 ANNUAL REPORT & PREVIEW SYSTEM (CHRONOLOGICAL & DETAILED)
// ==========================================

let currentPreviewReports = [];

// ==========================================
// 🕒 0. ROBUST DATE FORMATTER HELPER
// ==========================================
function formatReportDate(r) {
  if (!r) return "N/A";

  // Prioritizes dateSubmitted from your Java entity
  const rawDate = r.dateSubmitted || r.date_submitted || r.createdAt || r.created_at || r.dateReported || r.date;
  if (!rawDate) return "N/A";

  // Handles Jackson array format: [2026, 8, 21]
  if (Array.isArray(rawDate) && rawDate.length >= 3) {
    const year = rawDate[0];
    const month = String(rawDate[1]).padStart(2, '0');
    const day = String(rawDate[2]).padStart(2, '0');
    return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Handles ISO date strings: "2026-08-21"
  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return String(rawDate);
}

// ==========================================
// 📅 1. DYNAMIC INVENTORY YEARS LOADER
// ==========================================
window.loadDynamicInventoryYears = function() {
  const yearSelect = document.getElementById("export-inventory-year");
  if (!yearSelect) return;

  const barangayId = sessionStorage.getItem("barangayId");
  const userRole = (sessionStorage.getItem("userRole") || "").toUpperCase();

  let endpoint = "/api/reports";
  if (userRole.includes("BARANGAY") && barangayId && barangayId !== "null") {
    endpoint = `/api/reports/barangay/${barangayId}`;
  }

  fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "ngrok-skip-browser-warning": "true" }
  })
    .then(res => res.json())
    .then(reports => {
      if (!Array.isArray(reports)) return;

      const uniqueYears = [...new Set(
        reports
          .map(r => r.inventoryYear)
          .filter(y => y && String(y).trim() !== "" && String(y).toLowerCase() !== "null" && String(y).toLowerCase() !== "undefined")
      )].sort((a, b) => Number(a) - Number(b)); // Chronological year order (Earliest to Latest)

      yearSelect.innerHTML = `<option value="ALL">All Recorded Years</option>`;

      uniqueYears.forEach(year => {
        const opt = document.createElement("option");
        opt.value = year;
        opt.textContent = `${year} Inventory Cycle`;
        yearSelect.appendChild(opt);
      });
    })
    .catch(err => console.error("Failed to load inventory years:", err));
};

// ==========================================
// 👁️ 2. OPEN & POPULATE PREVIEW (FIRST TO LATEST)
// ==========================================
window.openAnnualReportPreview = function() {
  const yearSelect = document.getElementById("export-inventory-year");
  const selectedYear = yearSelect ? yearSelect.value : "ALL";
  const barangayId = sessionStorage.getItem("barangayId");
  const userRole = (sessionStorage.getItem("userRole") || "").toUpperCase();
  const userName = (sessionStorage.getItem("firstName") || "") + " " + (sessionStorage.getItem("lastName") || "Official");

  let endpoint = "/api/reports";
  if (userRole.includes("BARANGAY") && barangayId && barangayId !== "null") {
    endpoint = `/api/reports/barangay/${barangayId}`;
  }

  fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "ngrok-skip-browser-warning": "true" }
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch reports.");
      return res.json();
    })
    .then(reports => {
      if (!Array.isArray(reports) || reports.length === 0) {
        if (typeof showToast === 'function') showToast("No reports found to generate preview.", "info");
        return;
      }

      // Filter by inventory year
      let filtered = selectedYear === "ALL"
        ? reports
        : reports.filter(r => String(r.inventoryYear) === String(selectedYear));

      if (filtered.length === 0) {
        if (typeof showToast === 'function') showToast(`No reports found for year ${selectedYear}.`, "info");
        return;
      }

      // 🚀 CHRONOLOGICAL SORTING: First to Latest (Ascending Project ID)
      filtered.sort((a, b) => Number(a.id) - Number(b.id));
      currentPreviewReports = filtered;

      // Metadata Population
      const brgyName = sessionStorage.getItem("barangayName") || "City-Wide Scope";
      document.getElementById("preview-report-subtitle").textContent = `Inventory Cycle: ${selectedYear === "ALL" ? "All Recorded Years" : selectedYear}`;
      document.getElementById("preview-generated-by").textContent = userName;
      document.getElementById("preview-scope").textContent = userRole.includes("BARANGAY") ? brgyName : "All Barangays (City-Wide)";
      document.getElementById("preview-date").textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      document.getElementById("preview-total-count").textContent = currentPreviewReports.length;

      // ✍️ Clean Signature (Name on top, Role below, no parentheses)
      const signNameElem = document.getElementById("preview-sign-name");
      const signRoleElem = document.getElementById("preview-sign-role");
      if (signNameElem) signNameElem.textContent = userName;
      if (signRoleElem) signRoleElem.textContent = userRole.includes("BARANGAY") ? "Barangay Official" : "CPDO Official";

      // Detailed Table Population
      const tbody = document.getElementById("preview-report-table-body");
      tbody.innerHTML = currentPreviewReports.map((r, index) => {
        const bName = r.barangay ? (r.barangay.name || r.barangay.barangayName) : (r.barangayName || "N/A");
        const dateStr = formatReportDate(r); // 🚀 Clean date resolution
        const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";

        // Technical Road Details
        const roadType = r.roadType || r.roadImportance || "Standard";
        const terrain = r.terrainType ? ` • ${r.terrainType}` : "";
        const dimensions = `L: ${r.length != null ? r.length + 'm' : 'N/A'} | W: ${r.width != null ? r.width + 'm' : 'N/A'}`;
        const culvertBridge = `Culv: ${r.lengthOfCulverts != null ? r.lengthOfCulverts + 'm' : '0m'}<br>Bridges: ${r.numberOfBridges != null ? r.numberOfBridges : '0'}`;
        const damageDetails = `<strong>${r.damageType || 'General'}</strong>${r.damageLength ? ` (${r.damageLength}m × ${r.damageWidth || 0}m)` : ''}`;

        return `
          <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1; font-weight: 700;">PRJ-${r.id}</td>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">${bName}</td>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">
              <strong>${r.cityRoadName || 'N/A'}</strong><br>
              <span style="font-size: 10px; color: #64748b;">${roadType}${terrain}</span>
            </td>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 10px;">${dimensions}</td>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 10px;">${culvertBridge}</td>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">${damageDetails}</td>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700; color: ${r.severity === 'High' ? '#dc2626' : (r.severity === 'Medium' ? '#d97706' : '#16a34a')};">${r.severity || 'N/A'}</td>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px;">${r.status || 'Pending'}</td>
            <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; font-size: 10px; font-weight: 600;">${dateStr}</td>
          </tr>
        `;
      }).join("");

      const modal = document.getElementById("annual-report-preview-modal");
      modal.classList.remove("hidden");
      modal.style.display = "flex";
    })
    .catch(err => {
      console.error(err);
      if (typeof showToast === 'function') showToast("Failed to load report preview.", "error");
    });
};

// ==========================================
// 🖨️ 3. CLEAN PRINT TRIGGER (SUPPRESS TITLE HEADER)
// ==========================================
window.printReportDocument = function() {
  const originalTitle = document.title;

  // Temporarily clear title to remove the browser header during print
  document.title = " ";
  window.print();

  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
};

// ==========================================
// 📥 4. CSV DOWNLOAD (WITH FULL ROAD SPECS & CLEAN DATES)
// ==========================================
window.downloadPreviewedCSV = function() {
  if (!currentPreviewReports || currentPreviewReports.length === 0) return;

  const selectedYear = document.getElementById("export-inventory-year")?.value || "ALL";
  const headers = [
    "Project ID",
    "Inventory Year",
    "Barangay",
    "City Road Name",
    "Road Type",
    "Terrain Type",
    "Length (m)",
    "Width (m)",
    "Length of Culverts (m)",
    "Number of Bridges",
    "Damage Type",
    "Damage Length (m)",
    "Damage Width (m)",
    "Severity",
    "Status",
    "Reported By",
    "Date Reported"
  ];

  const rows = currentPreviewReports.map(r => {
    const brgyName = r.barangay ? (r.barangay.name || r.barangay.barangayName) : (r.barangayName || "N/A");
    const dateStr = formatReportDate(r);

    return [
      `"PRJ-${r.id}"`,
      `"${r.inventoryYear || 'N/A'}"`,
      `"${brgyName}"`,
      `"${(r.cityRoadName || 'N/A').replace(/"/g, '""')}"`,
      `"${r.roadType || r.roadImportance || 'N/A'}"`,
      `"${r.terrainType || 'N/A'}"`,
      `"${r.length != null ? r.length : ''}"`,
      `"${r.width != null ? r.width : ''}"`,
      `"${r.lengthOfCulverts != null ? r.lengthOfCulverts : '0'}"`,
      `"${r.numberOfBridges != null ? r.numberOfBridges : '0'}"`,
      `"${(r.damageType || 'N/A').replace(/"/g, '""')}"`,
      `"${r.damageLength != null ? r.damageLength : ''}"`,
      `"${r.damageWidth != null ? r.damageWidth : ''}"`,
      `"${r.severity || 'N/A'}"`,
      `"${r.status || 'N/A'}"`,
      `"${(r.reportedBy || 'Official').replace(/"/g, '""')}"`,
      `"${dateStr}"`
    ].join(",");
  });

  const csvString = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `RoadWise_Audit_Report_${selectedYear}_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};

// ==========================================
// ❌ 5. CLOSE MODAL
// ==========================================
window.closeReportPreviewModal = function() {
  const modal = document.getElementById("annual-report-preview-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
};

// ==========================================
// 🚀 6. INITIALIZE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.loadDynamicInventoryYears === "function") {
    window.loadDynamicInventoryYears();
  }
});

// =======================================================
// 📑 ADMIN CITY ROAD INVENTORY CONTROLLER (ACTIVE VIEW)
// =======================================================

let adminCachedInventory = [];
window.activeInventoryYear = new Date().getFullYear(); // Fallback to current calendar year

// Helper: Convert length values to kilometers
function parseToKilometers(val) {
  if (val == null || isNaN(val) || val === "") return 0;
  const num = parseFloat(val);
  return num > 20 ? (num / 1000) : num;
}

// Helper: Format terrain names cleanly
function formatTerrainType(terrain) {
  if (!terrain || String(terrain).trim() === "") return "FLAT";
  const t = String(terrain).toUpperCase().trim();
  if (t.includes("MOUNTAIN")) return "MOUNTAINOUS";
  if (t.includes("ROLL")) return "ROLLING";
  return t;
}

// Helper: Extract Inventory Year
function getReportYear(r) {
  if (!r) return "";
  const yearVal = r.inventory_year || r.inventoryYear;
  if (yearVal && String(yearVal).trim() !== "" && String(yearVal).toLowerCase() !== "null" && String(yearVal).toLowerCase() !== "undefined") {
    return String(yearVal).trim();
  }
  const rawDate = r.dateSubmitted || r.date_submitted || r.createdAt || r.created_at || r.dateReported || r.date;
  if (rawDate) {
    if (Array.isArray(rawDate) && rawDate.length >= 1) return String(rawDate[0]);
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) return String(parsed.getFullYear());
  }
  return "";
}

// Helper: Format Date for Display
function formatInventoryDate(r) {
  if (!r) return "N/A";
  const rawDate = r.dateSubmitted || r.date_submitted || r.createdAt || r.created_at || r.dateReported || r.date;
  if (!rawDate) return "N/A";

  if (Array.isArray(rawDate) && rawDate.length >= 3) {
    const year = rawDate[0];
    const month = String(rawDate[1]).padStart(2, '0');
    const day = String(rawDate[2]).padStart(2, '0');
    return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return String(rawDate);
}

// =======================================================
// 📊 LOAD, AUTO-FILTER TO ACTIVE YEAR, & RENDER
// =======================================================
window.loadAdminRoadInventory = function() {
  const tbody = document.getElementById("admin-inventory-table-body");
  const tfoot = document.getElementById("admin-inventory-table-foot");

  // Populate Document Meta Labels
  const dateLabel = document.getElementById("admin-inventory-date-label");
  if (dateLabel) dateLabel.textContent = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const adminFullName = ((sessionStorage.getItem("firstName") || "") + " " + (sessionStorage.getItem("lastName") || "")).trim();
  const prepByEl = document.getElementById("admin-inventory-prepared-by");
  if (prepByEl) prepByEl.textContent = adminFullName || "CPDO Administrator";

  apiFetch("/api/reports")
    .then(reports => {
      if (!Array.isArray(reports) || reports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 25px; color: #64748b;">No road records found in database.</td></tr>`;
        if (tfoot) tfoot.innerHTML = "";
        return;
      }

      // 🚀 AUTO-DETECT ACTIVE YEAR (The most recent year in the database)
      const uniqueYears = [...new Set(reports.map(r => getReportYear(r)).filter(y => y !== ""))].sort((a, b) => Number(b) - Number(a));
      window.activeInventoryYear = uniqueYears.length > 0 ? uniqueYears[0] : new Date().getFullYear();

      // Update UI to reflect the locked Active Year
      const yearLabel = document.getElementById("admin-inventory-year-label");
      if (yearLabel) yearLabel.textContent = `${window.activeInventoryYear} CYCLE`;

      const badgeLabel = document.getElementById("active-inventory-badge");
      if (badgeLabel) badgeLabel.textContent = `ACTIVE CYCLE: ${window.activeInventoryYear}`;

      // 1. Strictly filter by the Active Year
      let list = reports.filter(r => getReportYear(r) === String(window.activeInventoryYear));

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 25px; color: #64748b;">No active records found for the ${window.activeInventoryYear} cycle.</td></tr>`;
        if (tfoot) tfoot.innerHTML = "";
        return;
      }

      // 2. 🚫 DEDUPLICATION: Keep unique roads (retaining newest inspection)
      const uniqueRoadsMap = new Map();
      list.forEach(r => {
        const roadKey = String(r.cityRoadId || r.cityRoadName || r.id).trim().toLowerCase();
        if (!uniqueRoadsMap.has(roadKey)) {
          uniqueRoadsMap.set(roadKey, r);
        } else {
          const existing = uniqueRoadsMap.get(roadKey);
          const currentDate = new Date(r.dateSubmitted || r.createdAt || 0);
          const existingDate = new Date(existing.dateSubmitted || existing.createdAt || 0);
          if (currentDate > existingDate) uniqueRoadsMap.set(roadKey, r);
        }
      });
      let deduplicatedList = Array.from(uniqueRoadsMap.values());

      // 3. 🔢 SORT ASCENDING BY ROAD ID
      deduplicatedList.sort((a, b) => {
        const idA = String(a.cityRoadId || a.id || '').replace(/\D/g, '');
        const idB = String(b.cityRoadId || b.id || '').replace(/\D/g, '');
        if (idA && idB && !isNaN(Number(idA)) && !isNaN(Number(idB))) return Number(idA) - Number(idB);
        return String(a.cityRoadId || a.id).localeCompare(String(b.cityRoadId || b.id), undefined, { numeric: true, sensitivity: 'base' });
      });

      adminCachedInventory = deduplicatedList;

      // Surface & Dimension Totals
      let sumLength = 0, sumAsphalt = 0, sumGravel = 0, sumEarth = 0;
      let sumConcrete = 0, sumMixed = 0, sumCulverts = 0, sumBridges = 0;

      // Render Table Rows
      tbody.innerHTML = deduplicatedList.map((r, index) => {
        const roadId = r.cityRoadId || `3142000000${String(r.id).padStart(2, '0')}`;
        const roadName = r.cityRoadName || "Unnamed Road";
        const dateInspected = formatInventoryDate(r);
        const totalKm = parseToKilometers(r.length);
        const roadWidth = r.width != null && !isNaN(r.width) && String(r.width).trim() !== "" ? Number(r.width).toFixed(2) : "N/A";
        const roadType = (r.roadType || "").toLowerCase();

        const asphaltVal = roadType.includes("asphalt") ? totalKm : 0;
        const gravelVal = roadType.includes("gravel") ? totalKm : 0;
        const earthVal = roadType.includes("earth") ? totalKm : 0;
        const concreteVal = (roadType.includes("concrete") || roadType.includes("paved") || roadType === "") ? totalKm : 0;
        const mixedVal = roadType.includes("mixed") ? totalKm : 0;
        const culvertVal = r.lengthOfCulverts != null ? (parseFloat(r.lengthOfCulverts) || 0) : 0;
        const bridgesVal = r.numberOfBridges != null ? (parseInt(r.numberOfBridges, 10) || 0) : 0;

        sumLength += totalKm; sumAsphalt += asphaltVal; sumGravel += gravelVal; sumEarth += earthVal;
        sumConcrete += concreteVal; sumMixed += mixedVal; sumCulverts += culvertVal; sumBridges += bridgesVal;

        const importance = r.roadImportance ? (r.roadImportance.toLowerCase().includes("non") ? "Non-Core" : "Core") : "Core";
        const terrain = formatTerrainType(r.terrainType);
        const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";

        return `
          <tr style="background: ${rowBg}; border-bottom: 1px solid #cbd5e1; color: #0f172a;">
            <td style="padding: 7px 6px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700; text-align: center;">${roadId}</td>
            <td style="padding: 7px 6px; border: 1px solid #cbd5e1; font-weight: 600;">${roadName}</td>
            <td style="padding: 7px 4px; border: 1px solid #cbd5e1; text-align: center;">City</td>
            <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700;">${totalKm.toFixed(3)}</td>
            <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">${roadWidth}</td>
            <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${asphaltVal > 0 ? asphaltVal.toFixed(3) : '0'}</td>
            <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${gravelVal > 0 ? gravelVal.toFixed(3) : '0'}</td>
            <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${earthVal > 0 ? earthVal.toFixed(3) : '0'}</td>
            <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${concreteVal > 0 ? concreteVal.toFixed(3) : '0'}</td>
            <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${mixedVal > 0 ? mixedVal.toFixed(3) : '0'}</td>
            <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center;">${importance}</td>
            <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center;">${terrain}</td>
            <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: right;">${culvertVal > 0 ? culvertVal.toFixed(2) : '0'}</td>
            <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center;">${bridgesVal}</td>
            <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: 600;">${dateInspected}</td>
          </tr>
        `;
      }).join("");

      // Summary totals footer row
      if (tfoot) {
        tfoot.innerHTML = `
          <tr style="background: #e2e8f0; color: #0f172a; font-size: 11px;">
            <td colspan="3" style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: right; font-weight: 800;">TOTALS:</td>
            <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: right; font-weight: 800;">${sumLength.toFixed(3)}</td>
            <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; color: #64748b; font-size: 10px;">-</td>
            <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sumAsphalt.toFixed(3)}</td>
            <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sumGravel.toFixed(3)}</td>
            <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sumEarth.toFixed(3)}</td>
            <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sumConcrete.toFixed(3)}</td>
            <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sumMixed.toFixed(3)}</td>
            <td colspan="2" style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; font-size: 10px; color: #475569;">${deduplicatedList.length} Unique Roads</td>
            <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: right; font-weight: 800;">${sumCulverts.toFixed(2)}</td>
            <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sumBridges}</td>
            <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; color: #64748b; font-size: 10px;">-</td>
          </tr>
        `;
      }
    })
    .catch(err => {
      console.error("Error loading active inventory:", err);
      tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 25px; color: #ef4444;">Failed to fetch active inventory data.</td></tr>`;
    });
};

// =======================================================
// 📥 3. EXPORT CSV (ACTIVE VIEW)
// =======================================================
window.downloadAdminInventoryCSV = function() {
  if (!adminCachedInventory || adminCachedInventory.length === 0) {
    if (typeof showToast === "function") showToast("No inventory records to export.", "info");
    return;
  }

  const headers = ["Road ID", "Road Name", "Class", "Length (km)", "Width (m)", "Asphalt (km)", "Gravel (km)", "Earth (km)", "Concrete (km)", "Mixed (km)", "Road Importance", "Terrain Type", "Length of Culverts (m)", "Number of Bridges", "Date Inspected"];

  const rows = adminCachedInventory.map(r => {
    const roadId = r.cityRoadId || `3142000000${String(r.id).padStart(2, '0')}`;
    const totalKm = parseToKilometers(r.length);
    const roadType = (r.roadType || "").toLowerCase();

    return [
      `"${roadId}"`, `"${(r.cityRoadName || "Unnamed").replace(/"/g, '""')}"`, `"City"`, `"${totalKm.toFixed(3)}"`,
      `"${r.width != null ? Number(r.width).toFixed(2) : ""}"`,
      `"${roadType.includes("asphalt") ? totalKm.toFixed(3) : "0"}"`,
      `"${roadType.includes("gravel") ? totalKm.toFixed(3) : "0"}"`,
      `"${roadType.includes("earth") ? totalKm.toFixed(3) : "0"}"`,
      `"${(roadType.includes("concrete") || roadType.includes("paved") || roadType === "") ? totalKm.toFixed(3) : "0"}"`,
      `"${roadType.includes("mixed") ? totalKm.toFixed(3) : "0"}"`,
      `"${r.roadImportance?.includes("non") ? "Non-Core" : "Core"}"`,
      `"${formatTerrainType(r.terrainType)}"`,
      `"${r.lengthOfCulverts != null ? Number(r.lengthOfCulverts).toFixed(2) : "0"}"`,
      `"${r.numberOfBridges != null ? r.numberOfBridges : "0"}"`,
      `"${formatInventoryDate(r)}"`
    ].join(",");
  });

  const blob = new Blob(["\uFEFF" + [headers.join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `CSJDM_Active_Road_Inventory_${window.activeInventoryYear}_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// =======================================================
// 🖨️ 4. PRINT REPORTS TAB INVENTORY (ACTIVE VIEW)
// =======================================================
window.printAdminRoadInventory = function() {
  const originalTitle = document.title;
  document.title = `CSJDM_Active_Road_Inventory_${window.activeInventoryYear}`;

  const printStyle = document.createElement('style');
  printStyle.id = "temp-active-inventory-print-style";
  printStyle.innerHTML = `
    @media print {
      .sidebar, .top-header, .no-print, .bd-controls { display: none !important; }
      .main-content, .content-area { margin: 0 !important; padding: 0 !important; width: 100% !important; }
      #admin-inventory-sheet { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
    }
  `;
  document.head.appendChild(printStyle);
  window.print();

  setTimeout(() => {
    const styleToRemove = document.getElementById('temp-active-inventory-print-style');
    if (styleToRemove) document.head.removeChild(styleToRemove);
    document.title = originalTitle;
  }, 1000);
};

// ==========================================
// ⬅️ BACK TO REPORTS BUTTON CONTROLLER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const btnCloseInventory = document.getElementById("btn-close-inventory");
  const viewRoadInventory = document.getElementById("view-road-inventory");
  const viewReports = document.getElementById("view-reports");

  if (btnCloseInventory) {
    btnCloseInventory.addEventListener("click", () => {
      if (viewRoadInventory) { viewRoadInventory.classList.add("hidden"); viewRoadInventory.style.display = "none"; }
      if (viewReports) { viewReports.classList.remove("hidden"); viewReports.style.display = "block"; }
    });
  }
});

// =======================================================
// ⚙️ ADMIN SETTINGS & CYCLE TRACKER LOGIC
// =======================================================

// Helper: Extract Year
function getReportYearSettings(r) {
  if (!r) return "";
  const yearVal = r.inventory_year || r.inventoryYear;
  if (yearVal && String(yearVal).trim() !== "" && String(yearVal).toLowerCase() !== "null") {
    return String(yearVal).trim();
  }
  const rawDate = r.dateSubmitted || r.date_submitted || r.createdAt || r.created_at || r.dateReported || r.date;
  if (rawDate) {
    if (Array.isArray(rawDate) && rawDate.length >= 1) return String(rawDate[0]);
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) return String(parsed.getFullYear());
  }
  return "";
}

// Main Function: Load Dynamic Counts from Database
window.loadActiveCycleOverview = function() {
  const currentYear = String(new Date().getFullYear());
  const yearEl = document.getElementById("settings-active-year");
  if (yearEl) yearEl.textContent = `${currentYear} Cycle`;

  // ==========================================
  // 🚀 THE FIX: Check Maintenance Status on Load!
  // ==========================================
  if (typeof window.loadMaintenanceStatus === "function") {
    window.loadMaintenanceStatus();
  }

  // Fetch actual Total City Roads AND all Reports concurrently
  Promise.all([
    apiFetch("/api/city-roads").catch(() => []),
    apiFetch("/api/reports").catch(() => [])
  ])
    .then(([cityRoads, reports]) => {
      // A. Get Actual Total Road Count from DB (Fallback to 378 if API fails)
      const totalRoads = (Array.isArray(cityRoads) && cityRoads.length > 0) ? cityRoads.length : 378;

      // B. Filter Reports for the Current Year ONLY
      const currentYearReports = (Array.isArray(reports) ? reports : []).filter(r => {
        return getReportYearSettings(r) === currentYear;
      });

      // C. Deduplicate: Count how many UNIQUE roads have been inspected this year
      const uniqueRoadsInspected = new Set();
      currentYearReports.forEach(r => {
        const roadKey = String(r.cityRoadId || r.cityRoadName || r.id).trim().toLowerCase();
        if (roadKey) uniqueRoadsInspected.add(roadKey);
      });

      const inspectedCount = uniqueRoadsInspected.size;

      // D. Calculate Percentage safely
      let percentage = 0;
      if (totalRoads > 0) {
        percentage = Math.round((inspectedCount / totalRoads) * 100);
      }
      if (percentage > 100) percentage = 100;

      // E. Update the UI DOM Elements
      const countEl = document.getElementById("settings-inspected-count");
      const totalEl = document.getElementById("settings-total-roads");
      const barEl = document.getElementById("settings-progress-bar");
      const percentEl = document.getElementById("settings-progress-percent");
      const badgeEl = document.getElementById("cycle-status-badge");

      if (countEl) countEl.textContent = inspectedCount;
      if (totalEl) totalEl.textContent = totalRoads;
      if (percentEl) percentEl.textContent = `${percentage}%`;

      if (barEl) {
        barEl.style.width = `${percentage}%`;

        // Visual feedback based on completion
        if (percentage >= 100) {
          barEl.style.background = "#16a34a"; // Green
          percentEl.style.color = "#16a34a";
          if (badgeEl) {
            badgeEl.textContent = "COMPLETED (READY TO ARCHIVE)";
            badgeEl.style.background = "#fee2e2";
            badgeEl.style.color = "#dc2626";
            badgeEl.style.borderColor = "#fecaca";
          }
        } else {
          barEl.style.background = "#2563eb"; // Blue
          percentEl.style.color = "#2563eb";
          if (badgeEl) {
            badgeEl.textContent = "ACTIVE (OPEN FOR INSPECTION)";
            badgeEl.style.background = "#dcfce7";
            badgeEl.style.color = "#16a34a";
            badgeEl.style.borderColor = "#bbf7d0";
          }
        }
      }
    })
    .catch(err => console.error("Failed to load cycle overview data:", err));
};

// =======================================================
// 🚨 DANGER ZONE: ANNUAL CYCLE ROLLOVER LOGIC
// =======================================================

// 1. Open the Verification Modal
window.openRolloverModal = function() {
  const modal = document.getElementById("modal-rollover-confirm");
  const input = document.getElementById("input-rollover-confirm");
  const btn = document.getElementById("btn-execute-rollover");

  if (modal) {
    modal.style.display = "flex";
    modal.classList.remove("hidden");
  }

  if (input && btn) {
    input.value = ""; // Reset input
    input.focus();
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
    btn.style.cursor = "not-allowed";

    // 2. Real-time typing validation
    input.oninput = function() {
      if (this.value.trim().toUpperCase() === "ARCHIVE CYCLE") {
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
        btn.style.cursor = "pointer";
      } else {
        btn.style.opacity = "0.5";
        btn.style.pointerEvents = "none";
        btn.style.cursor = "not-allowed";
      }
    };
  }
};

// 3. Close the Modal
window.closeRolloverModal = function() {
  const modal = document.getElementById("modal-rollover-confirm");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add("hidden");
  }
};

// 4. Fire the Request to the Backend
window.executeAnnualRollover = function() {
  const btn = document.getElementById("btn-execute-rollover");
  if (btn) {
    btn.innerHTML = "Processing... ⏳";
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0.7";
  }

  // Calls your existing endpoint
  apiFetch("/api/reports/rollover-annual-cycle", {
    method: "POST"
  })
    .then(res => {
      // Show success notification
      if (typeof showToast === "function") {
        showToast(`Rollover Complete: Archived ${res.archivedCount || 0} reports. Emails sent.`, "success");
      } else {
        alert(`Rollover Complete: Archived ${res.archivedCount || 0} reports.`);
      }

      // Close Modal and Refresh Cycle Stats
      window.closeRolloverModal();
      if (typeof window.loadActiveCycleOverview === "function") {
        window.loadActiveCycleOverview();
      }
    })
    .catch(err => {
      console.error("Rollover failed:", err);
      if (typeof showToast === "function") {
        showToast("Error processing annual rollover.", "error");
      } else {
        alert("Error processing annual rollover.");
      }
    })
    .finally(() => {
      if (btn) {
        btn.innerHTML = "Execute Rollover"; // Reset button text
      }
    });
};

// =======================================================
// 🔒 SYSTEM MAINTENANCE LOGIC
// =======================================================

// 5. Load Maintenance Status on Dashboard Load
window.loadMaintenanceStatus = function() {
  apiFetch("/api/settings")
    .then(settings => {
      const toggle = document.getElementById("toggle-maintenance");
      const slider = document.getElementById("maintenance-slider");
      const knob = document.getElementById("maintenance-knob");

      if (toggle && settings) {
        toggle.checked = settings.maintenanceMode;
        if (settings.maintenanceMode) {
          slider.style.backgroundColor = "#dc2626"; // Red when locked
          knob.style.transform = "translateX(24px)";
        } else {
          slider.style.backgroundColor = "#cbd5e1"; // Gray when unlocked
          knob.style.transform = "translateX(0)";
        }
      }
    }).catch(err => console.error("Failed to load settings", err));
};

// 6. Toggle Maintenance Mode
window.toggleMaintenanceMode = function(isLocked) {
  apiFetch(`/api/settings/toggle-maintenance?status=${isLocked}`, { method: "POST" })
    .then(settings => {
      const slider = document.getElementById("maintenance-slider");
      const knob = document.getElementById("maintenance-knob");

      if (settings.maintenanceMode) {
        slider.style.backgroundColor = "#dc2626";
        knob.style.transform = "translateX(24px)";
        if (typeof showToast === "function") showToast("System Locked. Non-admins cannot log in.", "warning");
      } else {
        slider.style.backgroundColor = "#cbd5e1";
        knob.style.transform = "translateX(0)";
        if (typeof showToast === "function") showToast("System Unlocked. Normal logins restored.", "success");
      }
    })
    .catch(err => {
      console.error(err);
      if (typeof showToast === "function") {
        showToast("Failed to toggle maintenance mode.", "error");
      } else {
        alert("Failed to toggle maintenance mode.");
      }
      // Revert the toggle visually if it failed
      document.getElementById("toggle-maintenance").checked = !isLocked;
    });
};

// ==========================================
// 📅 1. DYNAMIC INVENTORY YEARS LOADER (SMART FILTERED)
// ==========================================
window.loadDynamicInventoryYears = function() {
  const yearSelect = document.getElementById("export-inventory-year");
  if (!yearSelect) return;

  const barangayId = sessionStorage.getItem("barangayId");
  const userRole = (sessionStorage.getItem("userRole") || "").toUpperCase();

  let endpoint = "/api/reports";
  if (userRole.includes("BARANGAY") && barangayId && barangayId !== "null") {
    endpoint = `/api/reports/barangay/${barangayId}`;
  }

  fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "ngrok-skip-browser-warning": "true" }
  })
    .then(res => res.json())
    .then(reports => {
      if (!Array.isArray(reports)) return;

      // 🚀 CEO SMART FILTER: Only check years where the CEO actually has projects
      let validReports = reports;
      if (userRole.includes("CEO") || userRole.includes("ENGINEER")) {
        validReports = reports.filter(r => {
          const stat = (r.status || "").toLowerCase();
          return stat.includes("dispatched") || stat.includes("in progress") || stat.includes("completed") || stat.includes("pending budget") || stat.includes("defer");
        });
      }

      const uniqueYears = [...new Set(
        validReports
          .map(r => r.inventoryYear)
          .filter(y => y && String(y).trim() !== "" && String(y).toLowerCase() !== "null" && String(y).toLowerCase() !== "undefined")
      )].sort((a, b) => Number(a) - Number(b));

      yearSelect.innerHTML = `<option value="ALL">All Recorded Years</option>`;

      uniqueYears.forEach(year => {
        const opt = document.createElement("option");
        opt.value = year;
        opt.textContent = `${year} Inventory Cycle`;
        yearSelect.appendChild(opt);
      });
    })
    .catch(err => console.error("Failed to load inventory years:", err));
};

// ==========================================
// 👁️ 2. OPEN & POPULATE PREVIEW (BULLETPROOF FIX + CATEGORY SPLIT)
// ==========================================
window.openAnnualReportPreview = function() {
  const yearSelect = document.getElementById("export-inventory-year");
  const selectedYear = yearSelect ? yearSelect.value : "ALL";

  // 🚀 NEW: Get Selected Report Category
  const categorySelect = document.getElementById("export-report-category");
  const selectedCategory = categorySelect ? categorySelect.value : "ALL";

  const barangayId = sessionStorage.getItem("barangayId");
  const userRole = (sessionStorage.getItem("userRole") || "").toUpperCase();
  const userName = (sessionStorage.getItem("firstName") || "") + " " + (sessionStorage.getItem("lastName") || "Official");

  let endpoint = "/api/reports";
  if (userRole.includes("BARANGAY") && barangayId && barangayId !== "null") {
    endpoint = `/api/reports/barangay/${barangayId}`;
  }

  fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "ngrok-skip-browser-warning": "true" }
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch reports.");
      return res.json();
    })
    .then(reports => {
      if (!Array.isArray(reports) || reports.length === 0) {
        if (typeof showToast === 'function') showToast("No reports found to generate preview.", "info");
        return;
      }

      // 1. Filter by Year
      let filtered = selectedYear === "ALL"
        ? reports
        : reports.filter(r => String(r.inventoryYear) === String(selectedYear));

      // 🚀 2. CEO SMART FILTER & CATEGORY SPLIT
      if (userRole.includes("CEO") || userRole.includes("ENGINEER")) {
        filtered = filtered.filter(r => {
          const stat = (r.status || "").toLowerCase();

          if (selectedCategory === "ACTIVE") {
            // Only show unfinished business
            return stat.includes("dispatched") || stat.includes("in progress") || stat.includes("pending budget") || stat.includes("defer");
          } else if (selectedCategory === "ACCOMPLISHMENT") {
            // Only show completed/archived jobs
            return stat.includes("completed") || stat.includes("archived");
          } else {
            // "ALL" - Show everything they own
            return stat.includes("dispatched") || stat.includes("in progress") || stat.includes("completed") || stat.includes("pending budget") || stat.includes("defer") || stat.includes("archived");
          }
        });
      }

      if (filtered.length === 0) {
        if (typeof showToast === 'function') showToast(`No records found for ${selectedYear} in this category.`, "warning");
        return;
      }

      // 🚀 3. CEO SMART SORTING (Hierarchy)
      const statusWeight = {
        "in progress": 1,
        "dispatched": 2,
        "pending budget": 3,
        "defer": 3,
        "completed": 4,
        "archived": 5
      };

      filtered.sort((a, b) => {
        const statA = (a.status || "").toLowerCase();
        const statB = (b.status || "").toLowerCase();

        // Find the weight (default to 99 if unknown status)
        const weightA = statusWeight[statA] || 99;
        const weightB = statusWeight[statB] || 99;

        // Primary Sort: By Status Weight
        if (weightA !== weightB) {
          return weightA - weightB;
        }

        // Secondary Sort: If same status, sort by Project ID
        return Number(a.id) - Number(b.id);
      });

      currentPreviewReports = filtered; // Set global array for CSV download

      // =====================================
      // 🚀 BULLETPROOF DOM UPDATES
      // =====================================
      const brgyName = sessionStorage.getItem("barangayName") || "City-Wide Scope";

      // 🚀 DYNAMIC TITLE CHANGE
      const elTitle = document.querySelector("#printable-report-area h2");
      if (elTitle) {
        if (selectedCategory === "ACTIVE") {
          elTitle.textContent = "ACTIVE ENGINEERING PROJECTS & BACKLOG";
        } else if (selectedCategory === "ACCOMPLISHMENT") {
          elTitle.textContent = "ANNUAL ENGINEERING ACCOMPLISHMENT REPORT";
        } else {
          elTitle.textContent = "ENGINEERING PROJECT & REPAIR INVENTORY REPORT";
        }
      }

      const elSubtitle = document.getElementById("preview-report-subtitle");
      if (elSubtitle) elSubtitle.textContent = `Inventory Cycle: ${selectedYear === "ALL" ? "All Recorded Years" : selectedYear}`;

      const elGenerated = document.getElementById("preview-generated-by");
      if (elGenerated) elGenerated.textContent = userName;

      // Update Scope Text dynamically based on Role
      let scopeText = "All Barangays (City-Wide)";
      if (userRole.includes("BARANGAY")) scopeText = brgyName;
      if (userRole.includes("CEO") || userRole.includes("ENGINEER")) scopeText = "City Engineering Office (CEO)";

      const elScope = document.getElementById("preview-scope");
      if (elScope) elScope.textContent = scopeText;

      const elDate = document.getElementById("preview-date");
      if (elDate) elDate.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const elCount = document.getElementById("preview-total-count");
      if (elCount) elCount.textContent = currentPreviewReports.length;

      // Signature Logic
      const signNameElem = document.getElementById("preview-sign-name");
      const signRoleElem = document.getElementById("preview-sign-role");
      if (signNameElem) signNameElem.textContent = userName;
      if (signRoleElem) {
        if (userRole.includes("BARANGAY")) signRoleElem.textContent = "Barangay Official";
        else if (userRole.includes("CEO") || userRole.includes("ENGINEER")) signRoleElem.textContent = "City Engineer";
        else signRoleElem.textContent = "CPDO Official";
      }

      // Detailed Table Population
      const tbody = document.getElementById("preview-report-table-body");
      if (tbody) {
        tbody.innerHTML = currentPreviewReports.map((r, index) => {
          const bName = r.barangay ? (r.barangay.name || r.barangay.barangayName) : (r.barangayName || "N/A");

          // Safe date check
          let dateStr = new Date(r.createdAt || new Date()).toLocaleDateString();
          if (typeof formatReportDate === 'function') {
            try { dateStr = formatReportDate(r); } catch(e) {}
          }

          const rowBg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
          const roadType = r.roadType || r.roadImportance || "Standard";
          const terrain = r.terrainType ? ` • ${r.terrainType}` : "";
          const dimensions = `L: ${r.length != null ? r.length + 'm' : 'N/A'} | W: ${r.width != null ? r.width + 'm' : 'N/A'}`;
          const culvertBridge = `Culv: ${r.lengthOfCulverts != null ? r.lengthOfCulverts + 'm' : '0m'}<br>Bridges: ${r.numberOfBridges != null ? r.numberOfBridges : '0'}`;
          const damageDetails = `<strong>${r.damageType || 'General'}</strong>${r.damageLength ? ` (${r.damageLength}m × ${r.damageWidth || 0}m)` : ''}`;

          return `
            <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
              <td style="padding: 8px 6px; border: 1px solid #cbd5e1; font-weight: 700;">PRJ-${r.id}</td>
              <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">${bName}</td>
              <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">
                <strong>${r.cityRoadName || 'N/A'}</strong><br>
                <span style="font-size: 10px; color: #64748b;">${roadType}${terrain}</span>
              </td>
              <td style="padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 10px;">${dimensions}</td>
              <td style="padding: 8px 6px; border: 1px solid #cbd5e1; font-size: 10px;">${culvertBridge}</td>
              <td style="padding: 8px 6px; border: 1px solid #cbd5e1;">${damageDetails}</td>
              <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700; color: ${r.severity === 'High' ? '#dc2626' : (r.severity === 'Medium' ? '#d97706' : '#16a34a')};">${r.severity || 'N/A'}</td>
              <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px; font-weight: bold;">${r.status || 'Pending'}</td>
              <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; font-size: 10px; font-weight: 600;">${dateStr}</td>
            </tr>
          `;
        }).join("");
      }

      const modal = document.getElementById("annual-report-preview-modal");
      if(modal) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
      } else {
        console.error("Modal ID 'annual-report-preview-modal' not found in HTML!");
      }
    })
    .catch(err => {
      console.error(err);
      if (typeof showToast === 'function') showToast("Failed to load report preview.", "error");
    });
};

// Ensure it loads dynamically when the page opens!
document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.loadDynamicInventoryYears === "function") {
    window.loadDynamicInventoryYears();
  }
});

// =======================================================
// 🗄️ ADMIN ARCHIVE & REPORTS CONTROLLER (100% COMPLETE)
// =======================================================

let cacheArchiveInventory = [];
let cacheArchivePriority = [];
let allArchiveDatabaseReports = [];
let archiveDetailMap = null;
let archiveDetailMarker = null;
let currentArchiveLat = 0;
let currentArchiveLng = 0;

// =======================================================
// 📅 1. INITIALIZE DROPDOWNS & TABLE ON TAB LOAD
// =======================================================
window.initArchiveTab = function() {
  apiFetch("/api/reports")
    .then(reports => {
      if (!Array.isArray(reports)) return;

      const uniqueYears = [...new Set(
        reports.map(r => getReportYear(r)).filter(y => y !== "")
      )].sort((a, b) => Number(b) - Number(a));

      const optionsHTML = `<option value="ALL">All Recorded Years</option>` +
        uniqueYears.map(year => `<option value="${year}">${year} Cycle</option>`).join("");

      // Top Cards Dropdowns
      const invSelect = document.getElementById("archive-inventory-year");
      const prioSelect = document.getElementById("archive-priority-year");
      if (invSelect) invSelect.innerHTML = optionsHTML;
      if (prioSelect) prioSelect.innerHTML = optionsHTML;

      // Bottom Historical Database Table & Filter Dropdown
      const tableYearSelect = document.getElementById("archive-filter-year");
      if (tableYearSelect) tableYearSelect.innerHTML = optionsHTML;

      loadArchiveDatabaseTable(reports);
    })
    .catch(err => console.error("Failed to load archive dropdown years:", err));
};

// =======================================================
// 🗃️ 2. LOAD CONCLUDED RECORDS INTO DATABASE TABLE
// =======================================================
window.loadArchiveDatabaseTable = function(reports) {
  // Isolate concluded/finalized records only
  allArchiveDatabaseReports = (Array.isArray(reports) ? reports : []).filter(r => {
    const stat = String(r.status || '').toLowerCase();
    return stat === 'completed' || stat === 'closed' || stat === 'resolved' || stat === 'archived';
  });

  renderArchiveTableRows(allArchiveDatabaseReports);
};

// =======================================================
// 🔍 3. SEARCH & FILTER ARCHIVE DATABASE TABLE
// =======================================================
window.filterArchiveDatabaseTable = function() {
  const searchTerm = (document.getElementById("archive-search-input")?.value || "").toLowerCase().trim();
  const selectedYear = document.getElementById("archive-filter-year")?.value || "ALL";
  const selectedStatus = (document.getElementById("archive-filter-status")?.value || "ALL").toUpperCase();

  const filtered = allArchiveDatabaseReports.filter(r => {
    const year = getReportYear(r);
    const rawStat = String(r.status || "").toUpperCase();
    const id = `PRJ-${String(r.id || "")}`.toLowerCase();
    const roadName = String(r.cityRoadName || "").toLowerCase();
    const brgyName = String(r.barangay?.barangayName || r.barangayName || "").toLowerCase();

    // 1. Year Match
    const matchesYear = (selectedYear === "ALL") || (year === selectedYear);

    // 2. Status Match
    let matchesStatus = true;
    if (selectedStatus === "COMPLETED") {
      matchesStatus = (rawStat === "COMPLETED" || rawStat === "CLOSED" || rawStat === "RESOLVED");
    } else if (selectedStatus === "ARCHIVED") {
      matchesStatus = (rawStat === "ARCHIVED");
    }

    // 3. Search Term Match
    const matchesSearch = !searchTerm || id.includes(searchTerm) || roadName.includes(searchTerm) || brgyName.includes(searchTerm);

    return matchesYear && matchesStatus && matchesSearch;
  });

  renderArchiveTableRows(filtered);
};

// =======================================================
// 🎨 4. RENDER ARCHIVE TABLE ROWS (WITH 9TH ACTION COLUMN)
// =======================================================
function renderArchiveTableRows(records) {
  const tbody = document.getElementById("archive-database-tbody");
  const countEl = document.getElementById("archive-database-count");
  if (!tbody) return;

  if (countEl) {
    countEl.textContent = `Showing ${records.length} archived ${records.length === 1 ? 'record' : 'records'}`;
  }

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: #64748b; font-style: italic;">No archived records found matching your filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map((r, index) => {
    const formatId = `#PRJ-${String(r.id).padStart(4, '0')}`;
    const formatName = r.cityRoadName || 'Unnamed Road';
    const formatBrgy = (r.barangay && r.barangay.barangayName) ? r.barangay.barangayName : (r.barangayName || 'Unknown');
    const formatDamage = r.damageType || 'General Repair';
    const year = getReportYear(r) || 'N/A';
    const rawStatus = (r.status || 'Archived').toUpperCase();
    const dateLogged = typeof formatInventoryDate === 'function' ? formatInventoryDate(r) : 'N/A';

    let badgeBg = '#f8fafc';
    let badgeColor = '#475569';
    let badgeBorder = '#cbd5e1';
    let displayLabel = 'ARCHIVED';

    if (rawStatus === 'COMPLETED' || rawStatus === 'CLOSED' || rawStatus === 'RESOLVED') {
      badgeBg = '#f0fdf4'; badgeColor = '#16a34a'; badgeBorder = '#bbf7d0'; displayLabel = 'COMPLETED';
    }

    const severityColor = r.severity === 'High' ? '#dc2626' : (r.severity === 'Medium' ? '#d97706' : '#16a34a');

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 700;">${formatId}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">${formatName}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; color: #475569;">${formatBrgy}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1;">${formatDamage}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700; color: ${severityColor};">${r.severity || 'N/A'}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: center; font-weight: 600;">${year}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: center;">
          <span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; display: inline-block;">
            ${displayLabel}
          </span>
        </td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; color: #64748b;">${dateLogged}</td>
       <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">
          <button onclick="event.stopPropagation(); openArchiveDetailModal(${r.id})" style="padding: 6px 12px; background: #0f172a; color: #ffffff; border: none; border-radius: 4px; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; gap: 4px;">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
// =======================================================
// 📋 OPEN INDIVIDUAL PROJECT ARCHIVE DETAIL MODAL
// =======================================================
window.openArchiveDetailModal = function(reportId) {
  if (!reportId) return;

  const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";

  // Force close any lingering fullscreen image viewer modals
  document.querySelectorAll('.fullscreen-modal, #image-modal, #fullscreen-image-modal, #image-viewer-modal').forEach(m => {
    m.classList.add('hidden');
    m.style.display = 'none';
  });

  const modal = document.getElementById('archive-detail-modal');
  if (!modal) return;

  // Reset map container
  const mapContainer = document.getElementById('archive-detail-map-container');
  if (mapContainer) mapContainer.style.display = 'none';
  currentArchiveLat = 0;
  currentArchiveLng = 0;

  // Reset image previews
  const dmgImg = document.getElementById('archive-modal-damage-image');
  if (dmgImg) dmgImg.src = NO_IMAGE_PLACEHOLDER;
  const proofImg = document.getElementById('archive-modal-proof-image');
  if (proofImg) proofImg.src = '';
  const proofContainer = document.getElementById('archive-modal-proof-container');
  if (proofContainer) proofContainer.style.display = 'none';

  // 🚀 DYNAMIC ADMIN NAME INJECTION FOR PRINT SIGNATORY
  const adminFirst = sessionStorage.getItem("firstName") || "";
  const adminLast = sessionStorage.getItem("lastName") || "";
  const adminFullName = (adminFirst + " " + adminLast).trim();
  const signerEl = document.getElementById("archive-modal-signer-name");
  if (signerEl) {
    signerEl.innerText = adminFullName || "CPDO ADMINISTRATOR";
  }

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  const scrollableBody = document.getElementById('archive-printable-audit-sheet');
  if (scrollableBody) scrollableBody.scrollTop = 0;

  document.getElementById('archive-modal-prj-id').innerText = `#PRJ-${String(reportId).padStart(4, '0')} (Loading...)`;

  apiFetch(`/api/reports/${reportId}`, { cache: 'no-store' })
    .then(report => {
      if (!report) throw new Error('Report data is empty');

      currentArchiveLat = parseFloat(report.latitude) || 0;
      currentArchiveLng = parseFloat(report.longitude) || 0;

      // Header Banner
      document.getElementById('archive-modal-prj-id').innerText = `#PRJ-${String(report.id).padStart(4, '0')}`;

      const year = typeof getReportYear === 'function' ? getReportYear(report) : (report.inventoryYear || 'N/A');
      document.getElementById('archive-modal-year').innerText = year || 'N/A';

      const dateLogged = typeof formatInventoryDate === 'function'
        ? formatInventoryDate(report)
        : (report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A');
      document.getElementById('archive-modal-date').innerText = dateLogged;

      // Status Badge
      const rawStat = String(report.status || 'Archived').toUpperCase();
      const statusBadge = document.getElementById('archive-modal-status-badge');
      if (statusBadge) {
        if (rawStat.includes('COMPLET') || rawStat.includes('CLOSE') || rawStat.includes('RESOLV')) {
          statusBadge.innerText = 'COMPLETED';
          statusBadge.style.cssText = 'padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; display: inline-block;';
        } else {
          statusBadge.innerText = 'ARCHIVED';
          statusBadge.style.cssText = 'padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; display: inline-block;';
        }
      }

      // 1. Road Specs
      document.getElementById('archive-modal-road-name').innerText = report.cityRoadName || 'Unnamed Road';
      document.getElementById('archive-modal-brgy').innerText = (report.barangay && report.barangay.barangayName) ? report.barangay.barangayName : (report.barangayName || 'Unknown');
      document.getElementById('archive-modal-road-id').innerText = report.cityRoadId || `31420000${String(report.id).padStart(2, '0')}`;
      document.getElementById('archive-modal-importance').innerText = String(report.roadImportance || '').toLowerCase().includes('non') ? 'Non-Core' : 'Core';

      const terrain = typeof formatTerrainType === 'function' ? formatTerrainType(report.terrainType) : (report.terrainType || 'FLAT');
      document.getElementById('archive-modal-terrain').innerText = terrain;
      document.getElementById('archive-modal-road-type').innerText = report.roadType || 'Concrete';

      const rLen = parseFloat(report.length) || 0;
      const rWid = parseFloat(report.width) || 0;
      document.getElementById('archive-modal-road-dims').innerText = `${rLen}m × ${rWid}m`;

      const culverts = report.lengthOfCulverts != null && !isNaN(report.lengthOfCulverts) ? Number(report.lengthOfCulverts).toFixed(2) : '0.00';
      document.getElementById('archive-modal-culverts').innerText = `${culverts} m`;
      document.getElementById('archive-modal-bridges').innerText = report.numberOfBridges != null ? report.numberOfBridges : 0;

      // 2. Damage Assessment
      document.getElementById('archive-modal-damage-type').innerText = report.damageType || 'General Wear';

      const dLen = parseFloat(report.damageLength) || 0;
      const dWid = parseFloat(report.damageWidth) || 0;
      const dArea = dLen * dWid;
      document.getElementById('archive-modal-damage-area').innerText = `${dLen}m × ${dWid}m (${dArea > 0 ? dArea.toFixed(1) : '0.0'} sq.m)`;

      const severity = String(report.severity || 'UNASSESSED').toUpperCase();
      const priorityBadge = document.getElementById('archive-modal-priority-badge');
      if (priorityBadge) {
        priorityBadge.innerText = severity;
        if (severity === 'HIGH') {
          priorityBadge.style.cssText = 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: 800; padding: 1px 5px; border-radius: 4px; display: inline-block;';
        } else if (severity === 'MEDIUM') {
          priorityBadge.style.cssText = 'background: #fffbeb; color: #d97706; border: 1px solid #fde68a; font-weight: 800; padding: 1px 5px; border-radius: 4px; display: inline-block;';
        } else if (severity === 'LOW') {
          priorityBadge.style.cssText = 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; font-weight: 800; padding: 1px 5px; border-radius: 4px; display: inline-block;';
        } else {
          priorityBadge.style.cssText = 'background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; font-weight: 800; padding: 1px 5px; border-radius: 4px; display: inline-block;';
        }
      }

      document.getElementById('archive-modal-gps').innerText = (currentArchiveLat !== 0 && currentArchiveLng !== 0)
        ? `${currentArchiveLat.toFixed(6)}°, ${currentArchiveLng.toFixed(6)}°`
        : 'No GPS Data';

      let submitter = 'Barangay Official';
      if (report.user && report.user.firstName && report.user.lastName) {
        submitter = `${report.user.firstName} ${report.user.lastName}`;
      } else if (report.reportedBy) {
        submitter = report.reportedBy;
      }
      document.getElementById('archive-modal-submitter').innerText = submitter;
      document.getElementById('archive-modal-description').innerText = report.damageDescription || 'No description provided.';

      // 3. Photographic Evidence
      if (report.damageImage && report.damageImage !== 'no_image.jpg' && report.damageImage.trim() !== '') {
        if (typeof loadSecureImage === 'function') {
          loadSecureImage('archive-modal-damage-image', report.damageImage);
        } else {
          const dmgEl = document.getElementById('archive-modal-damage-image');
          if (dmgEl) dmgEl.src = `/api/reports/image/${encodeURIComponent(report.damageImage)}`;
        }
      } else {
        const dmgEl = document.getElementById('archive-modal-damage-image');
        if (dmgEl) dmgEl.src = NO_IMAGE_PLACEHOLDER;
      }

      if (report.proofOfRepairImage && report.proofOfRepairImage !== 'no_image.jpg' && report.proofOfRepairImage.trim() !== '') {
        if (proofContainer) proofContainer.style.display = 'block';
        if (typeof loadSecureImage === 'function') {
          loadSecureImage('archive-modal-proof-image', report.proofOfRepairImage);
        } else {
          const proofEl = document.getElementById('archive-modal-proof-image');
          if (proofEl) proofEl.src = `/api/reports/image/${encodeURIComponent(report.proofOfRepairImage)}`;
        }
      } else {
        if (proofContainer) proofContainer.style.display = 'none';
      }

      // 4. Remarks
      document.getElementById('archive-modal-admin-remarks').innerText = report.adminRemarks || 'None logged';
      document.getElementById('archive-modal-repair-remarks').innerText = report.repairRemarks || 'None logged';
    })
    .catch(err => {
      console.error('Error fetching archive report detail:', err);
      if (typeof showToast === 'function') showToast('Failed to load project audit details.', 'error');
    });
};

// =======================================================
// 🗺️ 6. ARCHIVE MODAL SATELLITE MAP TOGGLE
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
  const btnLocate = document.getElementById('archive-btn-locate-map');
  if (btnLocate) {
    btnLocate.addEventListener('click', () => {
      const container = document.getElementById('archive-detail-map-container');
      if (!container) return;

      // 🛡️ Safe check with custom Toast notification
      if (!currentArchiveLat || !currentArchiveLng || (currentArchiveLat === 0 && currentArchiveLng === 0)) {
        if (typeof showToast === 'function') {
          showToast("No GPS coordinates recorded for this project.", "warning");
        }
        return;
      }

      if (container.style.display === 'none') {
        container.style.display = 'block';

        const redIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        if (!archiveDetailMap) {
          archiveDetailMap = L.map('archive-detail-map').setView([currentArchiveLat, currentArchiveLng], 17);
          L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
          }).addTo(archiveDetailMap);

          archiveDetailMarker = L.marker([currentArchiveLat, currentArchiveLng], { icon: redIcon }).addTo(archiveDetailMap);
        } else {
          archiveDetailMap.setView([currentArchiveLat, currentArchiveLng], 17);
          archiveDetailMarker.setLatLng([currentArchiveLat, currentArchiveLng]);
        }

        setTimeout(() => {
          archiveDetailMap.invalidateSize();
        }, 200);
      } else {
        container.style.display = 'none';
      }
    });
  }
});

// =======================================================
// 🖨️ 7. PRINT SINGLE AUDIT SHEET CONTROLLER
// =======================================================
window.printSingleArchiveIncident = function() {
  const prjId = document.getElementById('archive-modal-prj-id')?.innerText.replace(/\D/g, '') || '0000';
  const originalTitle = document.title;
  document.title = `Project_Audit_Sheet_PRJ-${prjId}`;

  window.print();

  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
};

// =======================================================
// 📂 8. EXPORT DROPDOWN MENU CONTROLLER
// =======================================================
window.toggleExportMenu = function(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;

  if (menu.classList.contains('hidden')) {
    document.querySelectorAll('.export-menu').forEach(m => m.classList.add('hidden'));
    menu.classList.remove('hidden');
  } else {
    menu.classList.add('hidden');
  }
};

// =======================================================
// 👁️ 9. OPEN MASTERLIST PREVIEW MODALS
// =======================================================
window.generateAdminReport = function(type) {
  const adminName = ((sessionStorage.getItem("firstName") || "") + " " + (sessionStorage.getItem("lastName") || "")).trim() || "CPDO Administrator";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  if (type === 'INVENTORY') {
    const year = document.getElementById('archive-inventory-year')?.value || "ALL";
    const modal = document.getElementById('archive-inventory-preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
    document.getElementById('archive-preview-inventory-year').innerText = year === "ALL" ? "ALL RECORDED YEARS" : `${year} CYCLE`;
    document.getElementById('archive-preview-inventory-date').innerText = today;
    document.getElementById('archive-preview-inventory-admin').innerText = adminName;
    renderArchivePreviewInventory(year);
  }
  else if (type === 'PRIORITY') {
    const year = document.getElementById('archive-priority-year')?.value || "ALL";
    const modal = document.getElementById('archive-priority-preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
    document.getElementById('archive-preview-priority-year').innerText = year === "ALL" ? "ALL RECORDED YEARS" : `${year} CYCLE`;
    document.getElementById('archive-preview-priority-date').innerText = today;
    document.getElementById('archive-preview-priority-admin').innerText = adminName;
    renderArchivePreviewPriority(year);
  }
};

// =======================================================
// 📊 10. RENDER ANNUAL ROAD INVENTORY MODAL TABLE
// =======================================================
window.renderArchivePreviewInventory = function(selectedYear) {
  const tbody = document.getElementById('archive-preview-inventory-tbody');
  const tfoot = document.getElementById('archive-preview-inventory-tfoot');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 25px; color: #64748b;">Loading City Road Inventory records...</td></tr>`;

  apiFetch("/api/reports").then(reports => {
    let list = selectedYear === "ALL" ? reports : reports.filter(r => getReportYear(r) === String(selectedYear));

    const uniqueMap = new Map();
    list.forEach(r => {
      const key = String(r.cityRoadId || r.cityRoadName || r.id).trim().toLowerCase();
      if (!uniqueMap.has(key)) uniqueMap.set(key, r);
      else if (new Date(r.createdAt || 0) > new Date(uniqueMap.get(key).createdAt || 0)) uniqueMap.set(key, r);
    });
    let deduped = Array.from(uniqueMap.values());
    deduped.sort((a, b) => Number(String(a.cityRoadId || a.id).replace(/\D/g, '')) - Number(String(b.cityRoadId || b.id).replace(/\D/g, '')));

    cacheArchiveInventory = deduped;

    if (deduped.length === 0) {
      tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 25px;">No records found for ${selectedYear}.</td></tr>`;
      if (tfoot) tfoot.innerHTML = "";
      return;
    }

    let sums = { len: 0, asp: 0, grv: 0, ert: 0, con: 0, mix: 0, cul: 0, brg: 0 };

    tbody.innerHTML = deduped.map((r, i) => {
      const id = r.cityRoadId || `31420000${String(r.id).padStart(2, '0')}`;
      const name = r.cityRoadName || "Unnamed";
      const km = parseToKilometers(r.length);
      const typ = (r.roadType || "").toLowerCase();
      const w = r.width != null && !isNaN(r.width) && String(r.width).trim() !== "" ? Number(r.width).toFixed(2) : "N/A";

      const asp = typ.includes("asphalt") ? km : 0;
      const grv = typ.includes("gravel") ? km : 0;
      const ert = typ.includes("earth") ? km : 0;
      const con = (typ.includes("concrete") || typ.includes("paved") || typ === "") ? km : 0;
      const mix = typ.includes("mixed") ? km : 0;
      const cul = parseFloat(r.lengthOfCulverts) || 0;
      const brg = parseInt(r.numberOfBridges) || 0;

      sums.len += km; sums.asp += asp; sums.grv += grv; sums.ert += ert; sums.con += con; sums.mix += mix; sums.cul += cul; sums.brg += brg;

      return `
        <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'}; border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 700;">${id}</td>
          <td style="padding: 7px 6px; border: 1px solid #cbd5e1; font-weight: bold;">${name}</td>
          <td style="padding: 7px 4px; border: 1px solid #cbd5e1; text-align: center;">City</td>
          <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700;">${km.toFixed(3)}</td>
          <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: right;">${w}</td>
          <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${asp > 0 ? asp.toFixed(3) : '0'}</td>
          <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${grv > 0 ? grv.toFixed(3) : '0'}</td>
          <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${ert > 0 ? ert.toFixed(3) : '0'}</td>
          <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${con > 0 ? con.toFixed(3) : '0'}</td>
          <td style="padding: 7px 5px; border: 1px solid #cbd5e1; text-align: center;">${mix > 0 ? mix.toFixed(3) : '0'}</td>
          <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center;">${r.roadImportance?.includes("non") ? "Non-Core" : "Core"}</td>
          <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center;">${typeof formatTerrainType === 'function' ? formatTerrainType(r.terrainType) : (r.terrainType || 'FLAT')}</td>
          <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: right;">${cul.toFixed(2)}</td>
          <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center;">${brg}</td>
          <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: 600;">${typeof formatInventoryDate === 'function' ? formatInventoryDate(r) : 'N/A'}</td>
        </tr>`;
    }).join("");

    if (tfoot) {
      tfoot.innerHTML = `
        <tr style="background: #e2e8f0; color: #0f172a; font-size: 11px;">
          <td colspan="3" style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: right; font-weight: 800;">TOTALS:</td>
          <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: right; font-weight: 800;">${sums.len.toFixed(3)}</td>
          <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; color: #64748b;">-</td>
          <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sums.asp.toFixed(3)}</td>
          <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sums.grv.toFixed(3)}</td>
          <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sums.ert.toFixed(3)}</td>
          <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sums.con.toFixed(3)}</td>
          <td style="padding: 8px 5px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sums.mix.toFixed(3)}</td>
          <td colspan="2" style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; font-size: 10px; color: #475569;">${deduped.length} Unique Roads</td>
          <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: right; font-weight: 800;">${sums.cul.toFixed(2)}</td>
          <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 800;">${sums.brg}</td>
          <td style="padding: 8px 6px; border: 1px solid #94a3b8; text-align: center; color: #64748b;">-</td>
        </tr>`;
    }
  });
};

// =======================================================
// 🚨 11. CARD 2: RENDER PRIORITY LIST MODAL TABLE
// =======================================================
window.renderArchivePreviewPriority = function(selectedYear) {
  const tbody = document.getElementById('archive-preview-priority-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b;">Loading Priority List records...</td></tr>`;

  apiFetch('/api/reports')
    .then(reports => {
      let backlog = (Array.isArray(reports) ? reports : []).filter(r => {
        const stat = String(r.status || '').toLowerCase();
        return stat === 'validated' || stat === 'pending budget' || stat === 'dispatched' || stat === 'defer';
      });

      if (selectedYear !== 'ALL') {
        backlog = backlog.filter(r => getReportYear(r) === String(selectedYear));
      }

      if (backlog.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b;">No backlog records found for ${selectedYear === 'ALL' ? 'all recorded years' : selectedYear + ' cycle'}.</td></tr>`;
        cacheArchivePriority = [];
        return;
      }

      backlog.forEach(report => {
        const severity = String(report.severity || 'Unassessed').toLowerCase();
        const importance = String(report.roadImportance || '').toLowerCase();

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

        const dLength = parseFloat(report.damageLength) || 0;
        const dWidth = parseFloat(report.damageWidth) || 0;
        report.areaScore = dLength * dWidth;
      });

      backlog.sort((a, b) => {
        if (b.tierScore !== a.tierScore) return b.tierScore - a.tierScore;
        if (b.areaScore !== a.areaScore) return b.areaScore - a.areaScore;
        return Number(a.id) - Number(b.id);
      });

      cacheArchivePriority = backlog;

      tbody.innerHTML = backlog.map((report, index) => {
        const formatId = `#PRJ-${String(report.id).padStart(4, '0')}`;
        const formatName = report.cityRoadName || 'Unnamed Road';
        const formatBrgy = (report.barangay && report.barangay.barangayName) ? report.barangay.barangayName : (report.barangayName || 'Unknown');
        const formatDamage = report.damageType || 'Unspecified';
        const dLength = report.damageLength || 0;
        const dWidth = report.damageWidth || 0;

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; background: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: center;"><strong>${index + 1}</strong></td>
            <td style="padding: 10px 8px; border: 1px solid #cbd5e1; font-weight: 700;">${formatId}</td>
            <td style="padding: 10px 8px; border: 1px solid #cbd5e1;">
              <strong>${formatName}</strong><br>
              <span style="font-size: 11px; color: #64748b;">Brgy. ${formatBrgy}</span>
            </td>
            <td style="padding: 10px 8px; border: 1px solid #cbd5e1;">${formatDamage}</td>
            <td style="padding: 10px 8px; border: 1px solid #cbd5e1; font-size: 11px;">${dLength}m × ${dWidth}m</td>
            <td style="padding: 10px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800; color: ${report.tierColor};">${report.tierLabel}</td>
          </tr>
        `;
      }).join('');
    })
    .catch(err => {
      console.error('Error rendering archive priority list:', err);
      if (typeof showToast === 'function') showToast('Error loading priority list records.', 'error');
    });
};

// =======================================================
// 📥 12. CSV TRIGGER & DOWNLOAD CONTROLLER (CARD 1 & CARD 2)
// =======================================================
window.triggerArchiveCSV = function(type) {
  if (typeof showToast === "function") showToast("Preparing your spreadsheet...", "success");

  if (type === 'INVENTORY') {
    const year = document.getElementById('archive-inventory-year')?.value || "ALL";
    renderArchivePreviewInventory(year);
    setTimeout(() => { downloadArchiveCSV('INVENTORY', year); }, 600);
  } else if (type === 'PRIORITY') {
    const year = document.getElementById('archive-priority-year')?.value || "ALL";
    renderArchivePreviewPriority(year);
    setTimeout(() => { downloadArchiveCSV('PRIORITY', year); }, 600);
  }
};

window.downloadArchiveCSV = function(type, year) {
  let headers, rows, filename;

  if (type === 'INVENTORY') {
    if (!cacheArchiveInventory || cacheArchiveInventory.length === 0) {
      if (typeof showToast === "function") showToast("No inventory records to export.", "error");
      return;
    }
    headers = [
      "Road ID", "Road Name", "Class", "Length (km)", "Width (m)",
      "Asphalt (km)", "Gravel (km)", "Earth (km)", "Concrete (km)", "Mixed (km)",
      "Road Importance", "Terrain Type", "Length of Culverts (m)", "Number of Bridges", "Date Inspected"
    ];
    rows = cacheArchiveInventory.map(r => {
      const roadId = r.cityRoadId || `31420000${String(r.id).padStart(2, '0')}`;
      const totalKm = parseToKilometers(r.length);
      const roadType = (r.roadType || "").toLowerCase();
      const roadWidth = r.width != null && !isNaN(r.width) && String(r.width).trim() !== "" ? Number(r.width).toFixed(2) : "";

      return [
        `"${roadId}"`, `"${(r.cityRoadName || "Unnamed").replace(/"/g, '""')}"`, `"City"`, `"${totalKm.toFixed(3)}"`,
        `"${roadWidth}"`,
        `"${roadType.includes("asphalt") ? totalKm.toFixed(3) : "0"}"`,
        `"${roadType.includes("gravel") ? totalKm.toFixed(3) : "0"}"`,
        `"${roadType.includes("earth") ? totalKm.toFixed(3) : "0"}"`,
        `"${(roadType.includes("concrete") || roadType.includes("paved") || roadType === "") ? totalKm.toFixed(3) : "0"}"`,
        `"${roadType.includes("mixed") ? totalKm.toFixed(3) : "0"}"`,
        `"${r.roadImportance?.includes("non") ? "Non-Core" : "Core"}"`,
        `"${typeof formatTerrainType === 'function' ? formatTerrainType(r.terrainType) : (r.terrainType || 'FLAT')}"`,
        `"${r.lengthOfCulverts != null ? Number(r.lengthOfCulverts).toFixed(2) : "0"}"`,
        `"${r.numberOfBridges != null ? r.numberOfBridges : "0"}"`,
        `"${typeof formatInventoryDate === 'function' ? formatInventoryDate(r) : 'N/A'}"`
      ].join(",");
    });
    filename = `CSJDM_Archive_Inventory_${year}_${Date.now()}.csv`;
  }
  else if (type === 'PRIORITY') {
    if (!cacheArchivePriority || cacheArchivePriority.length === 0) {
      if (typeof showToast === "function") showToast("No priority records to export.", "error");
      return;
    }
    headers = ["Rank", "Project ID", "Road Name", "Barangay", "Damage Type", "Est. Area (sq.m)", "Priority Tier"];
    rows = cacheArchivePriority.map((r, i) => [
      `"${i + 1}"`,
      `"PRJ-${String(r.id).padStart(4, '0')}"`,
      `"${(r.cityRoadName || "Unnamed Road").replace(/"/g, '""')}"`,
      `"${(r.barangay?.barangayName || r.barangayName || "Unknown").replace(/"/g, '""')}"`,
      `"${r.damageType || "Unspecified"}"`,
      `"${(parseFloat(r.damageLength) || 0) * (parseFloat(r.damageWidth) || 0)}"`,
      `"${r.tierLabel || "LOW"}"`
    ].join(","));
    filename = `CSJDM_Archive_Priority_Backlog_${year}_${Date.now()}.csv`;
  }

  const csvString = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// =======================================================
// 🖨️ 13. PDF PRINT MASTERLISTS CONTROLLER
// =======================================================
window.printArchiveDocument = function(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  const originalTitle = document.title;
  const isInventory = modalId.includes('inventory');
  const yearEl = document.getElementById(isInventory ? 'archive-inventory-year' : 'archive-priority-year');
  const year = yearEl?.value || "ALL";

  document.title = isInventory
    ? `CSJDM_Archive_Road_Inventory_${year}`
    : `CSJDM_Archive_Priority_Masterlist_${year}`;

  window.print();

  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
};

// =======================================================
// 🚀 14. AUTO-INITIALIZE ON TAB LOAD OR CLICK
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (typeof window.initArchiveTab === "function") window.initArchiveTab();
  }, 500);
});

document.addEventListener("click", (e) => {
  if (e.target.closest("li[data-target='view-archive']")) {
    if (typeof window.initArchiveTab === "function") window.initArchiveTab();
  }
});

// =======================================================
// ⏱️ SYSTEM AUDIT & ACTIVITY LOG ENGINE
// =======================================================

let rawActivityLogs = [];
let filteredActivityLogs = [];

// 1. Fetch & Initialize Activity Logs
window.loadActivityLogs = async function() {
  const tbody = document.getElementById("activity-log-tbody");
  const countEl = document.getElementById("activity-log-count");

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 35px; color: #64748b; font-style: italic;">
          Loading system activity audit trail...
        </td>
      </tr>`;
  }

  try {
    const res = await apiFetch('/api/activity-logs', { cache: 'no-store' });
    if (!res || !Array.isArray(res)) throw new Error("Invalid response format");

    rawActivityLogs = res;
    filteredActivityLogs = [...rawActivityLogs];
    renderActivityLogsTable(filteredActivityLogs);
  } catch (err) {
    console.error("Failed to load activity logs:", err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 30px; color: #ef4444; font-weight: 600;">
            ⚠️ Failed to load activity logs. Please check server connection.
          </td>
        </tr>`;
    }
    if (countEl) countEl.innerText = "Showing 0 log entries";
  }
};

// 2. Render Table Rows
function renderActivityLogsTable(logs) {
  const tbody = document.getElementById("activity-log-tbody");
  const countEl = document.getElementById("activity-log-count");
  if (!tbody) return;

  if (countEl) {
    countEl.innerText = `Showing ${logs.length} of ${rawActivityLogs.length} log entries`;
  }

  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 35px; color: #64748b; font-style: italic;">
          No audit logs match the selected filter criteria.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => {
    const dateFormatted = formatAuditTimestamp(log.timestamp);
    const categoryBadge = getCategoryBadge(log.category);
    const statusBadge = getStatusBadge(log.status);

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
        <td style="padding: 10px 12px; font-family: monospace; font-size: 11px; text-align: center; color: #475569;">
          ${dateFormatted}
        </td>
        <td style="padding: 10px 12px;">
          <strong style="color: #0f172a; display: block; font-size: 12px;">${escapeHtml(log.actorName || 'System')}</strong>
          <span style="font-size: 10.5px; color: #64748b;">${escapeHtml(log.actorRole || 'SYSTEM')} • ${escapeHtml(log.actorOffice || 'Central')}</span>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          ${categoryBadge}
        </td>
        <td style="padding: 10px 12px; text-align: center; font-family: monospace; font-weight: 700; color: #2563eb;">
          ${escapeHtml(log.targetEntity || 'N/A')}
        </td>
        <td style="padding: 10px 12px; color: #334155; line-height: 1.4;">
          <strong style="font-size: 11px; color: #0f172a; display: block;">${escapeHtml(log.action || 'ACTION')}</strong>
          <span style="font-size: 11.5px; color: #475569;">${escapeHtml(log.description || '-')}</span>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          ${statusBadge}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <button type="button" onclick="inspectActivityLog(${log.id})" style="padding: 4px 8px; background: #f1f5f9; color: #2563eb; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;" title="Inspect Details">
            🔍 View
          </button>
        </td>
      </tr>`;
  }).join('');
}

// 3. Multi-Filter Logic
window.filterActivityLogsTable = function() {
  const query = (document.getElementById("activity-search-input")?.value || "").toLowerCase().trim();
  const cat = document.getElementById("activity-filter-category")?.value || "ALL";
  const role = document.getElementById("activity-filter-role")?.value || "ALL";
  const timeframe = document.getElementById("activity-filter-time")?.value || "ALL";

  const now = new Date();

  filteredActivityLogs = rawActivityLogs.filter(log => {
    // Search Query Match
    const matchQuery = !query ||
      (log.actorName && log.actorName.toLowerCase().includes(query)) ||
      (log.targetEntity && log.targetEntity.toLowerCase().includes(query)) ||
      (log.action && log.action.toLowerCase().includes(query)) ||
      (log.description && log.description.toLowerCase().includes(query)) ||
      (log.actorRole && log.actorRole.toLowerCase().includes(query));

    // Category Match
    const matchCat = (cat === "ALL") || (log.category && log.category.toUpperCase() === cat);

    // Role Match
    const matchRole = (role === "ALL") ||
      (role === "ADMIN" && String(log.actorRole).toUpperCase().includes("ADMIN")) ||
      (role === "CEO" && (String(log.actorRole).toUpperCase().includes("ENGINEER") || String(log.actorRole).toUpperCase().includes("CEO"))) ||
      (role === "BARANGAY" && String(log.actorRole).toUpperCase().includes("BARANGAY")) ||
      (role === "SYSTEM" && String(log.actorRole).toUpperCase().includes("SYSTEM"));

    // Timeframe Match
    let matchTime = true;
    if (timeframe !== "ALL" && log.timestamp) {
      const logDate = new Date(log.timestamp);
      const diffHours = (now - logDate) / (1000 * 60 * 60);

      if (timeframe === "TODAY") matchTime = diffHours <= 24;
      else if (timeframe === "7DAYS") matchTime = diffHours <= (24 * 7);
      else if (timeframe === "30DAYS") matchTime = diffHours <= (24 * 30);
    }

    return matchQuery && matchCat && matchRole && matchTime;
  });

  renderActivityLogsTable(filteredActivityLogs);
};

// 4. Audit Event Inspector Modal
window.inspectActivityLog = function(logId) {
  const log = rawActivityLogs.find(l => l.id === logId);
  if (!log) return;

  const modal = document.getElementById("activity-detail-modal");
  if (!modal) return;

  document.getElementById("audit-modal-log-id").innerText = `#LOG-${String(log.id).padStart(4, '0')}`;
  document.getElementById("audit-modal-timestamp").innerText = formatAuditTimestamp(log.timestamp);

  const statusBadge = document.getElementById("audit-modal-status-badge");
  if (statusBadge) {
    statusBadge.innerText = (log.status || "SUCCESS").toUpperCase();
    if (log.status === "FAILED") {
      statusBadge.style.cssText = "padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;";
    } else if (log.status === "WARNING") {
      statusBadge.style.cssText = "padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; background: #fffbeb; color: #d97706; border: 1px solid #fde68a;";
    } else {
      statusBadge.style.cssText = "padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;";
    }
  }

  // Actor Details
  document.getElementById("audit-modal-actor-name").innerText = log.actorName || "System Automation";
  document.getElementById("audit-modal-actor-role").innerText = log.actorRole || "SYSTEM";
  document.getElementById("audit-modal-actor-office").innerText = log.actorOffice || "Central";
  document.getElementById("audit-modal-actor-id").innerText = log.actorId ? `#USR-${log.actorId}` : "SYSTEM";

  // Event Details
  document.getElementById("audit-modal-category").innerText = log.category || "SYSTEM";
  document.getElementById("audit-modal-target").innerText = log.targetEntity || "N/A";
  document.getElementById("audit-modal-action").innerText = log.action || "GENERAL_ACTION";
  document.getElementById("audit-modal-description").innerText = log.description || "No description logged.";

  // Telemetry Details
  document.getElementById("audit-modal-ip").innerText = log.ipAddress || "127.0.0.1";
  document.getElementById("audit-modal-method").innerText = log.httpMethod || "GET";
  document.getElementById("audit-modal-useragent").innerText = log.userAgent || "Unknown Client / Direct API";

  modal.classList.remove("hidden");
  modal.style.display = "flex";
};

// 5. Dropdown Menu Toggle
window.toggleActivityExportDropdown = function(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById("activity-export-dropdown");
  if (!dropdown) return;

  const isHidden = dropdown.style.display === "none" || dropdown.classList.contains("hidden");
  dropdown.style.display = isHidden ? "block" : "none";
  dropdown.classList.toggle("hidden", !isHidden);
};

// Close dropdown on outside click
document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("activity-export-dropdown");
  const btn = document.getElementById("btn-activity-export-menu");
  if (dropdown && !dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
    dropdown.style.display = "none";
    dropdown.classList.add("hidden");
  }
});

// 6. Export to CSV (With Automatic Audit Trail Logging)
window.exportActivityLogCSV = async function() {
  const dropdown = document.getElementById("activity-export-dropdown");
  if (dropdown) { dropdown.style.display = "none"; dropdown.classList.add("hidden"); }

  if (!filteredActivityLogs || filteredActivityLogs.length === 0) {
    if (typeof showToast === "function") showToast("No activity log records to export.", "warning");
    return;
  }

  // Record audit trail event on backend
  const currentUserId = sessionStorage.getItem("userId");
  try {
    await apiFetch('/api/activity-logs/log-action', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUserId,
        category: 'EXPORT',
        action: 'EXPORT_AUDIT_LOG_CSV',
        targetEntity: 'ACTIVITY_LOGS',
        description: `Exported ${filteredActivityLogs.length} audit trail records to CSV.`
      })
    });
  } catch (e) {
    console.warn("Could not log export action:", e);
  }

  // Generate CSV Content
  const headers = ["Log ID", "Timestamp (PHT)", "Actor Name", "Actor Role", "Actor Office", "Category", "Action", "Target Entity", "Description", "Status", "IP Address"];
  const rows = filteredActivityLogs.map(l => [
    `#LOG-${String(l.id).padStart(4, '0')}`,
    `"${formatAuditTimestamp(l.timestamp)}"`,
    `"${(l.actorName || '').replace(/"/g, '""')}"`,
    `"${(l.actorRole || '').replace(/"/g, '""')}"`,
    `"${(l.actorOffice || '').replace(/"/g, '""')}"`,
    `"${l.category || ''}"`,
    `"${l.action || ''}"`,
    `"${l.targetEntity || ''}"`,
    `"${(l.description || '').replace(/"/g, '""')}"`,
    `"${l.status || 'SUCCESS'}"`,
    `"${l.ipAddress || ''}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `RoadWise_System_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof showToast === "function") showToast(`Exported ${filteredActivityLogs.length} log records to CSV!`, "success");
};

// 7. Printable PDF Report Preview & Action
window.openActivityLogPrintModal = function() {
  const dropdown = document.getElementById("activity-export-dropdown");
  if (dropdown) { dropdown.style.display = "none"; dropdown.classList.add("hidden"); }

  const modal = document.getElementById("activity-log-print-modal");
  const tbody = document.getElementById("activity-print-tbody");
  if (!modal || !tbody) return;

  // Metadata injection
  const dateEl = document.getElementById("activity-print-generated-date");
  if (dateEl) dateEl.innerText = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const catFilter = document.getElementById("activity-filter-category")?.value || "ALL";
  const catEl = document.getElementById("activity-print-category");
  if (catEl) catEl.innerText = catFilter === "ALL" ? "ALL CATEGORIES" : catFilter;

  const timeFilter = document.getElementById("activity-filter-time")?.value || "ALL";
  const timeEl = document.getElementById("activity-print-timeframe");
  if (timeEl) timeEl.innerText = timeFilter === "ALL" ? "All Records" : (timeFilter === "TODAY" ? "Today" : `Last ${timeFilter.replace('DAYS', ' Days')}`);

  // Dynamic Administrator Signer
  const adminFirst = sessionStorage.getItem("firstName") || "";
  const adminMiddle = sessionStorage.getItem("middleName") || "";
  const adminLast = sessionStorage.getItem("lastName") || "";
  const signerEl = document.getElementById("activity-print-signer-name");
  if (signerEl) {
    if (typeof formatFullName === 'function') {
      signerEl.innerText = formatFullName(adminFirst, adminMiddle, adminLast).toUpperCase() || "CPDO ADMINISTRATOR";
    } else {
      signerEl.innerText = `${adminFirst} ${adminLast}`.trim().toUpperCase() || "CPDO ADMINISTRATOR";
    }
  }

  // Populate Printable Rows
  if (filteredActivityLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b;">No log records matching filter selection.</td></tr>`;
  } else {
    tbody.innerHTML = filteredActivityLogs.map(l => `
      <tr style="border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 6px 8px; text-align: center; font-family: monospace; font-size: 9.5px; border: 1px solid #cbd5e1;">${formatAuditTimestamp(l.timestamp)}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">
          <strong>${escapeHtml(l.actorName || 'System')}</strong><br>
          <span style="font-size: 9px; color: #64748b;">${escapeHtml(l.actorRole || 'SYSTEM')}</span>
        </td>
        <td style="padding: 6px 8px; text-align: center; font-weight: 700; border: 1px solid #cbd5e1;">${escapeHtml(l.category || '-')}</td>
        <td style="padding: 6px 8px; text-align: center; font-family: monospace; border: 1px solid #cbd5e1;">${escapeHtml(l.targetEntity || '-')}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">
          <strong>${escapeHtml(l.action || '-')}</strong>: ${escapeHtml(l.description || '-')}
        </td>
        <td style="padding: 6px 8px; text-align: center; font-weight: 700; border: 1px solid #cbd5e1;">${escapeHtml(l.status || 'SUCCESS')}</td>
      </tr>
    `).join('');
  }

  modal.classList.remove("hidden");
  modal.style.display = "flex";
};

window.printActivityLogSheet = async function() {
  const currentUserId = sessionStorage.getItem("userId");
  try {
    await apiFetch('/api/activity-logs/log-action', {
      method: 'POST',
      body: JSON.stringify({
        userId: currentUserId,
        category: 'EXPORT',
        action: 'PRINT_AUDIT_LOG_PDF',
        targetEntity: 'ACTIVITY_LOGS',
        description: `Generated printable PDF audit report (${filteredActivityLogs.length} records).`
      })
    });
  } catch (e) {
    console.warn("Could not log print action:", e);
  }

  window.print();
};

// --- Formatters & UI Badges ---
function formatAuditTimestamp(ts) {
  if (!ts) return "N/A";
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getCategoryBadge(cat) {
  const c = String(cat || 'SYSTEM').toUpperCase();
  if (c === 'PROJECT') return `<span style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;">PROJECT</span>`;
  if (c === 'QA') return `<span style="background: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;">QA & REVIEW</span>`;
  if (c === 'EXPORT') return `<span style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;">EXPORT</span>`;
  if (c === 'AUTH') return `<span style="background: #faf5ff; color: #9333ea; border: 1px solid #e9d5ff; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;">SECURITY</span>`;
  if (c === 'USER') return `<span style="background: #fff7ed; color: #ea580c; border: 1px solid #ffedd5; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;">USER MGMT</span>`;
  return `<span style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;">SYSTEM</span>`;
}

function getStatusBadge(status) {
  const s = String(status || 'SUCCESS').toUpperCase();
  if (s === 'FAILED') return `<span style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10px;">FAILED</span>`;
  if (s === 'WARNING') return `<span style="background: #fffbeb; color: #d97706; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10px;">WARNING</span>`;
  return `<span style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10px;">SUCCESS</span>`;
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
