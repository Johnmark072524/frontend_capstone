// ==========================================
// GLOBAL MAP VARIABLES
// ==========================================
let map;
let mapMarker;
let selectedLat = 14.8139;
let selectedLng = 121.0453;
let redIcon;

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 🛡️ THE LEAFLET SAFETY CHECK 🛡️
  // ==========================================
  if (typeof L !== 'undefined') {

    redIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const btnDefineMap = document.getElementById('btn-define-map');
    const mapModal = document.getElementById('map-modal');
    const btnCloseMap = document.getElementById('close-map-btn');
    const btnSaveCoords = document.getElementById('btn-save-coords');

    // ------------------------------------------
    // A. "DEFINE ON MAP" FOR ADD REPORT FORM
    // ------------------------------------------
    if (btnDefineMap && mapModal) {
      btnDefineMap.addEventListener('click', () => {
        mapModal.classList.remove('hidden');

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

        setTimeout(() => { map.invalidateSize(); }, 200);
      });

      if (btnCloseMap) {
        btnCloseMap.addEventListener('click', () => mapModal.classList.add('hidden'));
      }

      if (btnSaveCoords) {
        btnSaveCoords.addEventListener('click', () => {
          if(!mapMarker) {
            alert("Please click on the map to drop a pin first!");
            return;
          }
          document.getElementById('latitude').value = selectedLat;
          document.getElementById('longitude').value = selectedLng;
          document.getElementById('coords-display').textContent = `Locked: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;
          mapModal.classList.add('hidden');
        });
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

        mapModal.classList.remove('hidden');

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

        if (!isNaN(currentLat) && !isNaN(currentLng)) {
          selectedLat = currentLat;
          selectedLng = currentLng;
          map.setView([selectedLat, selectedLng], 18);
          if (mapMarker) map.removeLayer(mapMarker);
          mapMarker = L.marker([selectedLat, selectedLng], {icon: redIcon}).addTo(map);
        }

        const btnSaveCoords = document.getElementById('btn-save-coords');
        const newSaveBtn = btnSaveCoords.cloneNode(true);
        btnSaveCoords.parentNode.replaceChild(newSaveBtn, btnSaveCoords);

        newSaveBtn.addEventListener('click', () => {
          if(!mapMarker) {
            alert("Please click on the map to drop a pin first!");
            return;
          }
          document.getElementById('edit-latitude').value = selectedLat;
          document.getElementById('edit-longitude').value = selectedLng;
          document.getElementById('edit-modal-gps').textContent = `${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;
          mapModal.classList.add('hidden');
          showToast("Location updated successfully!", "success");
        });

        setTimeout(() => { map.invalidateSize(); }, 200);
      });
    }

  } // <--- NOTICE THIS BRACE? I MOVED IT DOWN HERE! Everything related to maps is safely inside it now.

  // ==========================================
  // IMAGE UPLOAD & PREVIEW LOGIC
  // ==========================================

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
  // 4. CEO DASHBOARD LOGIC (Manage Repairs)
  // ==========================================
  const manageButtons = document.querySelectorAll('.manage-btn');
  const manageModal = document.getElementById('manage-modal');

  if (manageModal) {
    const closeManageBtn = document.querySelector('.close-manage-btn');
    const cancelRepairBtn = document.getElementById('btn-cancel-repair');
    const completeRepairBtn = document.getElementById('btn-complete-repair');

    manageButtons.forEach(button => {
      button.addEventListener('click', () => {
        manageModal.classList.remove('hidden');
      });
    });

    if (closeManageBtn) closeManageBtn.addEventListener('click', () => manageModal.classList.add('hidden'));
    if (cancelRepairBtn) cancelRepairBtn.addEventListener('click', () => manageModal.classList.add('hidden'));

    if (completeRepairBtn) {
      completeRepairBtn.addEventListener('click', () => {
        alert("Success! Photographic proof uploaded and project marked as COMPLETED.");
        manageModal.classList.add('hidden');
      });
    }
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
  // 10. OFFICIAL REPORT LOGIC
  // ==========================================
  const btnPrintPriority = document.getElementById('btn-print-priority');
  const viewReportPriority = document.getElementById('view-report-priority');

  if (btnPrintPriority && viewReportPriority) {
    btnPrintPriority.addEventListener('click', () => {
      contentSections.forEach(sec => sec.classList.add('hidden'));
      document.querySelectorAll('.nav-menu li').forEach(l => l.classList.remove('active'));
      viewReportPriority.classList.remove('hidden');
    });
  }


}); // <--- THIS CLOSES THE MAIN DOMContentLoaded EVENT LISTENER ONCE AND FOR ALL!


// ==========================================
// BACKEND API CONNECTION LOGIC (RoadWise)
// ==========================================

// STEP 1: Validate and show the custom popup
function submitRoadReport() {
  const roadName = document.getElementById("cityRoadName")?.value;
  const widthVal = document.getElementById("width")?.value;
  const lengthVal = document.getElementById("length")?.value;

  if (!roadName || !widthVal || !lengthVal) {
    showToast("Please fill in all required fields (Road Name, Width, and Length).", "error");
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
  // Hide the modal
  closeConfirmModal();

  // The Loading State
  const submitBtn = document.getElementById("submit-report-btn");
  if (submitBtn) {
    submitBtn.innerHTML = "⏳ Submitting...";
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.7";
    submitBtn.style.cursor = "not-allowed";
  }

  // Package the Form Data
  const formData = new FormData();

  // Grab the Barangay ID from the user's login session!
  const loggedInBarangayId = sessionStorage.getItem("barangayId");
  if (loggedInBarangayId) {
    // It MUST be exactly "barangayId" to match Java!
    formData.append("barangayId", loggedInBarangayId);
  }

  // --- AI INTEGRATION PREP ---
  // We force this to "Unassessed" so the Admin Dashboard knows the AI hasn't graded it yet!
  formData.append("severity", "Unassessed");

  // Your existing fields
  formData.append("cityRoadName", document.getElementById("cityRoadName")?.value || "");
  formData.append("cityRoadId", document.getElementById("cityRoadId")?.value || "");
  formData.append("roadImportance", document.getElementById("roadImportance")?.value || "");
  formData.append("roadType", document.getElementById("roadType")?.value || "");
  formData.append("terrainType", document.getElementById("terrainType")?.value || "");

  formData.append("width", parseFloat(document.getElementById("width")?.value) || 0.0);
  formData.append("length", parseFloat(document.getElementById("length")?.value) || 0.0);
  formData.append("numberOfBridges", parseInt(document.getElementById("numberOfBridges")?.value) || 0);
  formData.append("lengthOfCulverts", parseFloat(document.getElementById("lengthOfCulverts")?.value) || 0.0);
  formData.append("damageDescription", document.getElementById("damageDescription")?.value || "");

  formData.append("latitude", parseFloat(document.getElementById("latitude")?.value) || 0.0);
  formData.append("longitude", parseFloat(document.getElementById("longitude")?.value) || 0.0);
  formData.append("inventoryYear", new Date().getFullYear());

  // Notice we leave CV Analysis alone since the AI hasn't processed it yet!
  formData.append("cvDamageClassification", "Pending CV Analysis");
  formData.append("cvConfidenceScore", 0.0);

  const imageInput = document.getElementById("damageImageFile");
  if (imageInput && imageInput.files.length > 0) {
    formData.append("imageFile", imageInput.files[0]);
  }

  // --- NEW: Use the dynamic API_BASE_URL from config.js! ---
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

      // I assume you have this function defined elsewhere to clear the form
      if (typeof resetAddReportForm === 'function') resetAddReportForm();

      if (submitBtn) {
        submitBtn.innerHTML = "Submit Report";
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }
    })
    .catch(error => {
      console.error("Error submitting report:", error);
      showToast("Failed to upload report. Is the server running?", "error");

      if (submitBtn) {
        submitBtn.innerHTML = "Submit Report";
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
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
      // SUCCESS! Save the REAL user data based on your custom Java response
      sessionStorage.setItem("userId", data.userId);

      // *** THIS IS THE CRUCIAL LINE THAT MAKES YOUR DROPDOWN WORK! ***
      if (data.barangayId) {
        sessionStorage.setItem("barangayId", data.barangayId);
      }

      showToast("Login Successful!", "success");

      // Wait 1 second so they can see the success toast, then redirect
      setTimeout(() => {
        window.location.href = "barangay_dashboard.html";
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
  // Note: We are targeting your specific '.data-table tbody' now!
  const reportsTableBody = document.querySelector('.data-table tbody');

  if (!reportsTableBody) return;

  fetch(`${API_BASE_URL}/api/reports`)
    .then(response => {
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    })
    .then(reports => {
      // Clear out any hardcoded HTML rows or loading text
      reportsTableBody.innerHTML = '';

      if (reports.length === 0) {
        reportsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No road reports have been submitted yet.</td></tr>';
        return;
      }

      // Loop through every report in the database
      reports.forEach(report => {
        const formattedId = `#RPT-${String(report.id || 0).padStart(4, '0')}`;

        // Now it perfectly matches your Java model fields!
        const roadId = report.cityRoadId || 'N/A';
        const roadName = report.cityRoadName || 'Unknown Road';
        const severity = report.severity || 'Unassessed';
        const dateSubmitted = report.dateSubmitted || 'N/A';

        // Safely fetch the exact variable name your backend uses!
        const barangayDisplay = (report.barangay && report.barangay.barangayName)
          ? report.barangay.barangayName
          : 'Unknown Barangay';

        const severityClass = severity.toLowerCase() === 'high' ? 'high' :
          severity.toLowerCase() === 'medium' ? 'medium' :
            severity.toLowerCase() === 'low' ? 'low' : 'secondary';

        // Safely grab the status
        const status = report.status || 'Pending';

        // FIX: Make sure it checks for BOTH "Pending" and "Pending Validation"
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
      reportsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red; padding: 20px;">Error loading reports from database.</td></tr>';
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
  // 1. Fetch the exact report from the backend database
  fetch(`${API_BASE_URL}/api/reports/${reportId}`)
    .then(response => {
      if (!response.ok) throw new Error("Failed to fetch report details");
      return response.json();
    })
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

function loadBarangayReports(barangayId) {
  const listContainer = document.getElementById('barangay-report-list');
  if (!listContainer) return;

  listContainer.innerHTML = "<p style='text-align:center; padding: 20px;'>Loading your reports...</p>";

  fetch(`${API_BASE_URL}/api/reports/barangay/${barangayId}`)
    .then(response => {
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    })
    .then(reports => {
      listContainer.innerHTML = "";
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
                      <div class="bd-item-title">${report.cityRoadName || 'Unknown Road'} Damage</div>
                      <div class="bd-item-meta">
                        <span>📍 Brgy. ID: ${report.barangay ? report.barangay.id : 'N/A'}</span>
                        <span>📅 ${dateStr}</span>
                      </div>
                    </div>
                    ${report.status === 'Rejected' && report.adminRemarks ? `
                    <div class="bd-feedback-box"><strong style="color: #dc3545;">Admin Note:</strong> ${report.adminRemarks}</div>
                    ` : `<p style="font-size: 13px; color: #666; margin-top: 5px;">${report.damageDescription || 'No description provided.'}</p>`}
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
    .catch(error => {
      console.error(error);
      listContainer.innerHTML = "<p style='color:red;'>Failed to load reports.</p>";
    });
}

function updateSeverityChart(dataArray) {
  const canvasId = 'severityChart';
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  let existingChart = Chart.getChart(canvasId);
  if (existingChart) existingChart.destroy();

  // ⬇️ NEW: Check if all severities are 0
  const totalSeverity = dataArray.reduce((a, b) => a + b, 0);
  const isEmpty = totalSeverity === 0;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      // If empty, show "Pending", otherwise show "High/Medium/Low"
      labels: isEmpty ? ['Pending AI Assessment'] : ['High', 'Medium', 'Low'],
      datasets: [{
        // If empty, give it a placeholder value of 1 so it draws a full circle
        data: isEmpty ? [1] : dataArray,
        // If empty, color it grey. Otherwise use Red/Orange/Green
        backgroundColor: isEmpty ? ['#e9ecef'] : ['#dc3545', '#f0ad4e', '#28a745'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        // Disable the hover popup if there's no data
        tooltip: { enabled: !isEmpty }
      },
      cutout: '70%'
    }
  });
}

// ==========================================
// SMART DASHBOARD LOADER (Matches your Login)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {

  // Check if we are on the Barangay Dashboard page
  if (document.getElementById('barangay-report-list')) {

    // 1. Check the session memory for the exact variable your login saved
    const storedBarangayId = sessionStorage.getItem("barangayId");

    // 2. If it's missing, kick them back to login!
    if (!storedBarangayId) {
      alert("Security Check: You must log in first!");
      window.location.href = "login.html";
      return;
    }

    // 3. If found, load their exact reports!
    console.log("Welcome! Loading reports for Barangay ID: " + storedBarangayId);
    loadBarangayReports(storedBarangayId);
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

  // 3. NOW fetch the roads using the ID and our dynamic config variable!
  fetch(`${API_BASE_URL}/api/roads/barangay/${loggedInBarangayId}`)
    .then(response => {
      if (!response.ok) throw new Error("Failed to fetch roads");
      return response.json();
    })
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
