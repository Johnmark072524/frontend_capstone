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
// GLOBAL MAP VARIABLES (Must remain empty at first!)
// ==========================================
let map;
let mapMarker;
let selectedLat = 14.8139; // Default center of San Jose del Monte
let selectedLng = 121.0453; // Default center of San Jose del Monte
let redIcon; // Just declare it, don't build it yet!

document.addEventListener('DOMContentLoaded', () => {

  if (document.getElementById('ceo-repair-queue-body')) {
    loadCEODashboardData();
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
  // 1. SIDEBAR NAVIGATION LOGIC
  // ==========================================
  const navLinks = document.querySelectorAll('.nav-menu li[data-target]');
  const contentSections = document.querySelectorAll('.content-section');

  navLinks.forEach(link => {
    link.addEventListener('click', function(event) {
      event.preventDefault();

      navLinks.forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');

      contentSections.forEach(section => section.classList.add('hidden'));

      const targetId = this.getAttribute('data-target');
      if (targetId) {
        document.getElementById(targetId).classList.remove('hidden');
      }
    });
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
  // 6. TRACKING VIEW PRINT MENU LOGIC
  // ==========================================
  const trackGenerateBtn = document.getElementById('btn-track-generate');
  const trackPrintDropdown = document.getElementById('track-print-dropdown');

  if (trackGenerateBtn && trackPrintDropdown) {
    trackGenerateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      trackPrintDropdown.classList.toggle('hidden');
    });

    window.addEventListener('click', () => {
      if (!trackPrintDropdown.classList.contains('hidden')) {
        trackPrintDropdown.classList.add('hidden');
      }
    });

    trackPrintDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // ==========================================
  // 7. TRACKING MODAL LOGIC
  // ==========================================
  const trackButtons = document.querySelectorAll('.track-btn');
  const trackingModal = document.getElementById('tracking-modal');

  if (trackingModal) {
    const closeTrackingBtns = document.querySelectorAll('.close-tracking-btn');

    trackButtons.forEach(button => {
      button.addEventListener('click', () => {
        trackingModal.classList.remove('hidden');
      });
    });

    closeTrackingBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        trackingModal.classList.add('hidden');
      });
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
      window.location.href = 'login.html';
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
    fetch(`${API_BASE_URL}/api/reports`)
      .then(response => response.json())
      .then(reports => {

        // 🛡️ THE GATEKEEPER: Only Validated Reports reach the CEO
        const validatedReports = reports.filter(r => r.status === 'Validated');

        // 🧮 CALCULATE SCORES
        validatedReports.forEach(report => {
          const severity = (report.severity || 'Unassessed').toLowerCase();
          const importance = (report.roadImportance || '').toLowerCase();

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
// CEO DATA LOADER (FEEDS BOTH TABLES)
// ==========================================
window.loadCEODashboardData = function() {
  fetch(`${API_BASE_URL}/api/reports`, { cache: 'no-store' })
    .then(res => res.ok ? res.json() : [])
    .then(reports => {

      // 1. FILTER FOR ALL CEO DATA (Active + Completed)
      const allCEOReports = reports.filter(r => {
        const s = String(r.status || '').trim().toLowerCase();
        return s === 'dispatched to ceo' || s === 'in progress' || s === 'completed' || s === 'repaired';
      });

      // 2. THE STRICT PRIORITY ALGORITHM
      allCEOReports.forEach(report => {
        const severity = (report.severity || 'Unassessed').toLowerCase();
        const importance = (report.roadImportance || '').toLowerCase();

        report.tierScore = 0;
        report.tierLabel = 'PENDING AI';
        report.tierColor = '#6c757d';

        if (severity === 'high') {
          report.tierScore = 3;
          report.tierLabel = 'HIGH';
          report.tierColor = '#dc3545';
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

      // 3. SORT BY PRIORITY THEN AREA
      allCEOReports.sort((a, b) => {
        if (b.tierScore !== a.tierScore) return b.tierScore - a.tierScore;
        return b.areaScore - a.areaScore;
      });

      // 4. SPLIT THE DATA (Active vs All)
      const activeReports = allCEOReports.filter(r => {
        const s = String(r.status || '').trim().toLowerCase();
        return s === 'dispatched to ceo' || s === 'in progress';
      });

      // 5. METRICS (Count only the Active ones for the Dashboard Top Boxes)
      const pendingDispatch = activeReports.filter(r => String(r.status || '').trim().toLowerCase() === 'dispatched to ceo');
      const inProgress = activeReports.filter(r => String(r.status || '').trim().toLowerCase() === 'in progress');
      const criticalHazards = activeReports.filter(r => r.tierLabel === 'HIGH');

      const totalEl = document.getElementById('ceo-metric-total');
      const critEl = document.getElementById('ceo-metric-critical');
      const actEl = document.getElementById('ceo-metric-active');
      if (totalEl) totalEl.innerText = pendingDispatch.length;
      if (critEl) critEl.innerText = criticalHazards.length;
      if (actEl) actEl.innerText = inProgress.length;

      // 6. 🚀 RENDER BOTH TABLES SEPARATELY!
      renderCEOTable(activeReports, 'ceo-repair-queue-body', true);
      renderCEOTable(allCEOReports, 'ceo-masterlist-queue-body', false);

    })
    .catch(err => {
      console.error("Error loading CEO Dashboard:", err);
    });
};

// ==========================================
// REUSABLE TABLE GENERATOR
// ==========================================
function renderCEOTable(dataArray, tbodyId, isDashboard) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = '';

  if (dataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No projects found in this queue.</td></tr>`;
    return;
  }

  dataArray.forEach((report) => {
    const formatId = `#PRJ-${String(report.id).padStart(4, '0')}`;
    const formatBrgy = (report.barangay && report.barangay.barangayName) ? report.barangay.barangayName : 'Unknown';
    const formatName = report.cityRoadName || 'Unnamed Road';
    const area = (parseFloat(report.damageLength) || 0) * (parseFloat(report.damageWidth) || 0);
    const formatArea = area > 0 ? `${area.toFixed(1)} sq.m` : 'Unknown';

    const status = String(report.status || '').toLowerCase();

    // 🚀 SMART ONCLICK: Jump if on Dashboard, just Open if already on Masterlist
    const onClickAction = isDashboard ? `jumpToCEOMasterlistAndManage(${report.id})` : `openCEOManageModal(${report.id})`;

    // Status Badge Logic
    let statusHtml = `<span class="status-badge pending" style="background:#d4edda; color:#155724; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">Dispatched</span>`;

    // 🟦 CLEANED UP MANAGE BUTTON (Uses CSS Class for text/padding/border, inline just for the background/shadow)
    let btnHtml = `<button class="btn-small manage-btn" onclick="${onClickAction}" style="background-color: var(--accent-blue); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Manage</button>`;

    if (status === 'in progress') {
      statusHtml = `<span class="status-badge" style="background-color: #cce5ff; color: #004085; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">In Progress</span>`;
    }
    // If completed, make the badge Green and the button say "View Proof"
    else if (status.includes('complet') || status.includes('repair')) {
      statusHtml = `<span class="status-badge" style="background-color: #d4edda; color: #155724; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">✅ Completed</span>`;

      // 🟩 CLEANED UP VIEW PROOF BUTTON
      btnHtml = `<button class="btn-small manage-btn" onclick="${onClickAction}" style="background-color: #28a745; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">View Proof</button>`;
    }

    const tr = document.createElement('tr');
    tr.style.borderLeft = `4px solid ${report.tierColor}`;

    tr.innerHTML = `
        <td><strong>${formatId}</strong></td>
        <td>${formatBrgy}</td>
        <td><strong>${formatName}</strong></td>
        <td style="color: #555; font-weight: 500;">${formatArea}</td>
        <td><span class="badge" style="background-color: ${report.tierColor}; color: white; padding: 5px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">${report.tierLabel}</span></td>
        <td style="display: flex; gap: 10px; align-items: center;">
            ${statusHtml}
            ${btnHtml}
        </td>
    `;
    tbody.appendChild(tr);
  });
}
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

  const modal = document.getElementById('manage-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  document.getElementById('ceo-modal-prj-id').innerText = `#PRJ-${String(reportId).padStart(4, '0')} (Loading...)`;

  fetch(`${API_BASE_URL}/api/reports/${reportId}`, { cache: 'no-store' })
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch report details");
      return res.json();
    })
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
      const statusBadge = document.getElementById('ceo-modal-current-status');
      statusBadge.innerText = status;
      if (status.toLowerCase() === 'in progress') {
        statusBadge.style.cssText = "background-color: #cce5ff; color: #004085; padding: 4px 8px; border-radius: 4px; font-weight: bold;";
      } else {
        statusBadge.style.cssText = "background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-weight: bold;";
      }

      // 6. Image Loading using report.damageImage
      const imgEl = document.getElementById('ceo-modal-image');
      const placeholderEl = document.getElementById('ceo-modal-image-placeholder-text');

      if (report.damageImage && report.damageImage !== 'no_image.jpg') {
        imgEl.src = `${API_BASE_URL}/uploads/${report.damageImage}`;
        imgEl.style.display = 'block';
        placeholderEl.style.display = 'none';
      } else {
        imgEl.style.display = 'none';
        placeholderEl.style.display = 'block';
        placeholderEl.innerHTML = '<span class="icon" style="font-size: 30px;">📷</span><p style="margin-top: 10px; color: #888;">No original photo provided</p>';
      }

      // ==========================================
      // 🚀 7. THE FIX: BUTTON LOCK & COMPLETED DATA
      // ==========================================
      const btnStartRepair = document.getElementById('ceo-btn-start-repair');
      const completionForm = document.getElementById('ceo-completion-form');
      const completedEvidence = document.getElementById('ceo-completed-evidence-section'); // New Read-Only Box

      const proofImg = document.getElementById('ceo-modal-proof-image');
      const proofRemarks = document.getElementById('ceo-modal-proof-remarks');

      if (btnStartRepair) {
        const currentStatus = status.toLowerCase();

        // STATE 1: ALREADY COMPLETED
        if (currentStatus.includes('complet') || currentStatus.includes('repair')) {
          btnStartRepair.innerHTML = `<span class="icon">✅</span> Already Completed`;
          btnStartRepair.style.backgroundColor = "#6c757d";
          btnStartRepair.style.cursor = "not-allowed";
          btnStartRepair.disabled = true;

          if (completionForm) completionForm.style.display = 'none'; // Hide upload form
          if (completedEvidence) completedEvidence.style.display = 'block'; // Show Read-Only Data!

          // Load the Proof Photo and Remarks from the database
          if (report.proofOfRepairImage) {
            proofImg.src = `${API_BASE_URL}/uploads/${report.proofOfRepairImage}`;
            proofImg.style.display = 'inline-block';
          } else {
            proofImg.style.display = 'none';
          }
          proofRemarks.innerText = report.repairRemarks || "No official remarks provided.";

          // STATE 2: IN PROGRESS
        } else if (currentStatus.includes('progress')) {
          btnStartRepair.innerHTML = `<span class="icon">✅</span> Already In Progress`;
          btnStartRepair.style.backgroundColor = "#6c757d";
          btnStartRepair.style.cursor = "not-allowed";
          btnStartRepair.disabled = true;

          if (completionForm) completionForm.style.display = 'block'; // Show Upload Form
          if (completedEvidence) completedEvidence.style.display = 'none'; // Hide Read-Only

          // STATE 3: BRAND NEW DISPATCH
        } else {
          btnStartRepair.innerHTML = `<span class="icon">👷</span> Mark as In Progress`;
          btnStartRepair.style.backgroundColor = "";
          btnStartRepair.style.cursor = "pointer";
          btnStartRepair.disabled = false;

          // Hide BOTH forms until they click "In Progress"
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

      // 5. 🚀 THE FIX: DYNAMIC ROUTING BASED ON ROLE
      setTimeout(() => {
        // Convert role to lowercase so we don't worry about exact capitalization
        const userRole = String(data.role).toLowerCase();

        if (userRole.includes("admin") || userRole.includes("cpdo")) {
          // Route CPDO Admin
          window.location.href = "admin_dashboard.html";
        }
        else if (userRole.includes("ceo") || userRole.includes("engineer")) {
          // Route City Engineering Office
          window.location.href = "ceo_dashboard.html";
        }
        else {
          // Default to Barangay Dashboard
          window.location.href = "barangay_dashboard.html";
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
// ADMIN DASHBOARD: LOAD ALL REPORTS
// ==========================================
function loadAdminReports() {
  // 🛡️ SAFETY CHECK: Only run this if we are actually on the Admin Dashboard!
  // If the CEO metric card exists on this page, abort this admin function immediately.
  if (document.getElementById('ceo-metric-total')) {
    return;
  }

  // Target the Admin table specifically
  const reportsTableBody = document.querySelector('.data-table tbody');

  if (!reportsTableBody) return;

  // 🚀 FIXED: Using the new apiFetch wrapper to bypass Ngrok
  apiFetch(`/api/reports`)
    .then(reports => {
      // Clear out any hardcoded HTML rows or loading text
      reportsTableBody.innerHTML = '';

      if (reports.length === 0) {
        reportsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No road reports have been submitted yet.</td></tr>';
        return;
      }

      // Loop through every report in the database
      reports.forEach(report => {
        const formattedId = `#RPT-${String(report.id || 0).padStart(4, '0')}`;

        const roadId = report.cityRoadId || 'N/A';
        const roadName = report.cityRoadName || 'Unknown Road';
        const severity = report.severity || 'Unassessed';
        const dateSubmitted = report.dateSubmitted || 'N/A';

        const barangayDisplay = (report.barangay && report.barangay.barangayName)
          ? report.barangay.barangayName
          : 'Unknown Barangay';

        const severityClass = severity.toLowerCase() === 'high' ? 'high' :
          severity.toLowerCase() === 'medium' ? 'medium' :
            severity.toLowerCase() === 'low' ? 'low' : 'secondary';

        const status = report.status || 'Pending';

        let statusHtml = (status === 'Pending' || status === 'Pending Validation')
          ? `<span class="status-badge pending">Pending Validation</span>`
          : `<span class="status-badge validated">${status}</span>`;

        let buttonHtml = (status === 'Pending' || status === 'Pending Validation')
          ? `<button class="btn-small validate-btn" onclick="reviewReport(${report.id})">Review</button>`
          : `<button class="btn-small validate-btn" disabled style="background-color: #ccc; cursor: not-allowed;">Done</button>`;

        const row = document.createElement('tr');
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
    })
    .catch(error => {
      console.error("Error loading admin reports:", error);
      reportsTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red; padding: 20px;">Error loading reports from database.</td></tr>';
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

  // 🚀 FIXED: Now using apiFetch to bypass ngrok!
  apiFetch(`/api/reports/${reportId}`)
    .then(report => {
      // 2. Format basic data
      const formattedId = `#RPT-${String(report.id).padStart(4, '0')}`;
      const severity = report.severity || 'Unassessed';
      const severityClass = severity.toLowerCase() === 'high' ? 'high' :
        severity.toLowerCase() === 'medium' ? 'medium' :
          severity.toLowerCase() === 'low' ? 'low' : 'secondary';

      // ⬇️ NEW: SAVE THE COORDINATES FOR THE MAP BUTTON ⬇️
      currentReviewLat = report.latitude;
      currentReviewLng = report.longitude;

      // ⬇️ NEW: FORCE THE MAP CONTAINER CLOSED WHEN OPENING A NEW REPORT ⬇️
      document.getElementById('admin-review-map-container').style.display = 'none';

      // 3. Inject text into the HTML IDs we just created
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
      const imageEl = document.getElementById('modal-damage-image');
      if (report.damageImage && report.damageImage !== 'no_image.jpg') {
        // Point it to your Spring Boot uploads folder
        imageEl.src = `${API_BASE_URL}/uploads/${report.damageImage}`;
        imageEl.style.display = 'block';
      } else {
        imageEl.style.display = 'none'; // Hide if no image
      }

      // 5. Open the modal!
      document.getElementById('review-modal').classList.remove('hidden');
    })
    .catch(error => {
      console.error("Error:", error);
      alert("Error loading report data.");
    });
}

// Function to cleanly close the modal
function closeReviewModal() {
  document.getElementById('review-modal').classList.add('hidden');
}

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
      listContainer.innerHTML = "";

      // 🚀 TRIGGER THE PROGRESS BAR MATH
      calculateJurisdictionProgress(barangayId, reports);

      if (reports.length === 0) {
        listContainer.innerHTML = "<p style='text-align:center; padding: 20px;'>No reports found for your area.</p>";
        return;
      }

      let pending = 0, validated = 0, rejected = 0;
      let highSev = 0, medSev = 0, lowSev = 0;

      reports.forEach(report => {
        if (report.status === "Pending") pending++;
        else if (report.status === "Validated") validated++;
        else if (report.status === "Rejected") rejected++;

        if (report.severity === "High") highSev++;
        else if (report.severity === "Medium") medSev++;
        else if (report.severity === "Low") lowSev++;

        let badgeClass = "bd-badge-pending";
        if (report.status === "Validated") badgeClass = "bd-badge-validated";
        if (report.status === "Rejected") badgeClass = "bd-badge-rejected";

        let dateStr = new Date(report.dateSubmitted).toLocaleDateString();

        let imgSrc = "https://placehold.co/300x200/png?text=No+Image";
        if (report.damageImage && report.damageImage !== "no_image.jpg") {
          imgSrc = report.damageImage.startsWith("http") ? report.damageImage : `${API_BASE_URL}/uploads/${report.damageImage}`;
        }

        let rowHtml = `
                <div class="bd-list-item">
                  <div class="bd-item-image"><img src="${imgSrc}" alt="Report Image"></div>
                  <div class="bd-item-details">
                    <div>
                      <div class="bd-item-title">${report.cityRoadName || 'Unknown Road'} Inspection</div>
                      <div class="bd-item-meta">
                        <span>📍 Brgy. ID: ${report.barangay ? report.barangay.id : 'N/A'}</span>
                        <span>📅 ${dateStr}</span>
                      </div>
                    </div>
                    ${report.status === 'Rejected' && report.adminRemarks ? `
                    <div class="bd-feedback-box"><strong style="color: #dc3545;">Admin Note:</strong> ${report.adminRemarks}</div>
                    ` : `<p style="font-size: 13px; color: #666; margin-top: 5px;">${report.damageDescription || 'No damage reported.'}</p>`}
                  </div>
                 <div class="bd-item-actions">
                  <div class="bd-status-badge ${badgeClass}">${report.status}</div>

                  ${report.status === 'Rejected' ? `
                    <button class="bd-btn-action" onclick="openEditModal(${report.id})">Edit & Resubmit</button>
                  ` : `
                    <button class="bd-btn-action" style="background-color: #6c757d;" onclick="openViewModal(${report.id})">View Status</button>
                  `}
                </div>
                </div>`;
        listContainer.innerHTML += rowHtml;
      });

      // Update Metrics
      document.getElementById('metric-total').innerText = reports.length;
      document.getElementById('metric-pending').innerText = pending;
      document.getElementById('metric-validated').innerText = validated;
      document.getElementById('metric-rejected').innerText = rejected;

      // Update Chart
      updateSeverityChart([highSev, medSev, lowSev]);
    })
    // 👇 The properly formatted catch block 👇
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
// MODAL CONTROLS (View & Edit)
// ==========================================
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
  fetch(`${API_BASE_URL}/api/reports/${reportId}`)
    .then(res => res.json())
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

      let imgSrc = "https://placehold.co/500x300/png?text=No+Image+Provided";
      if (report.damageImage && report.damageImage !== "no_image.jpg") {
        imgSrc = report.damageImage.startsWith("http") ? report.damageImage : `${API_BASE_URL}/uploads/${report.damageImage}`;
      }
      document.getElementById('view-modal-img').src = imgSrc;

      // Feedback Section
      const feedbackBox = document.getElementById('view-modal-feedback');
      if (report.adminRemarks) {
        feedbackBox.style.display = "block";
        document.getElementById('view-modal-remarks').innerText = report.adminRemarks;
      } else {
        feedbackBox.style.display = "none";
      }

      // Finally, show the modal!
      document.getElementById('bd-view-modal').classList.add('active');
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
  fetch(`${API_BASE_URL}/api/reports/${reportId}`)
    .then(res => res.json())
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
      let imgSrc = "https://placehold.co/300x200/png?text=No+Image";
      if (report.damageImage && report.damageImage !== "no_image.jpg") {
        imgSrc = report.damageImage.startsWith("http") ? report.damageImage : `${API_BASE_URL}/uploads/${report.damageImage}`;
      }
      document.getElementById('edit-modal-current-img').src = imgSrc;

      // Clear old file inputs
      document.getElementById('edit-modal-img').value = "";
      document.getElementById('edit-modal-filename').innerText = "";

      document.getElementById('bd-edit-modal').classList.add('active');
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

        pendingReports.sort((a, b) => new Date(a.dateSubmitted) - new Date(b.dateSubmitted));
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
