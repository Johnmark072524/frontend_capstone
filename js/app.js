document.addEventListener('DOMContentLoaded', () => {

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
  // 2. MODAL LOGIC (Review Reports)
  // ==========================================
  const reviewButtons = document.querySelectorAll('.validate-btn');
  const modal = document.getElementById('review-modal');
  const closeBtn = document.querySelector('.close-modal-btn');

  const rejectBtn = document.getElementById('btn-show-reject');
  const primaryActions = document.getElementById('primary-actions');
  const feedbackForm = document.getElementById('reject-feedback-form');
  const confirmRejectBtn = document.getElementById('btn-confirm-reject');
  const cancelRejectBtn = document.getElementById('btn-cancel-reject');

  reviewButtons.forEach(button => {
    button.addEventListener('click', () => {
      if(!button.hasAttribute('disabled')) {
        if (modal) modal.classList.remove('hidden');
        if (primaryActions) primaryActions.classList.remove('hidden');
        if (feedbackForm) feedbackForm.classList.add('hidden');
      }
    });
  });

  const adminLocateMapBtn = document.getElementById('btn-admin-locate-map');
  if (adminLocateMapBtn) {
    adminLocateMapBtn.addEventListener('click', () => {
      // Ready for backend integration
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // ==========================================
  // 3. REJECTION FEEDBACK LOGIC
  // ==========================================

  if (rejectBtn && primaryActions && feedbackForm) {
    rejectBtn.addEventListener('click', () => {
      primaryActions.classList.add('hidden');
      feedbackForm.classList.remove('hidden');
    });
  }

  if (cancelRejectBtn && primaryActions && feedbackForm) {
    cancelRejectBtn.addEventListener('click', () => {
      feedbackForm.classList.add('hidden');
      primaryActions.classList.remove('hidden');
    });
  }

  if (confirmRejectBtn && modal) {
    confirmRejectBtn.addEventListener('click', () => {
      alert("Rejection feedback has been sent to the Barangay Official.");
      modal.classList.add('hidden');
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
// TOAST NOTIFICATION LOGIC
// ==========================================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast-container');
  const toastIcon = document.getElementById('toast-icon');
  const toastMessage = document.getElementById('toast-message');

  if (!toast) return;

  // 1. Set the text
  toastMessage.textContent = message;

  // 2. Set the color and icon based on success or error
  if (type === 'success') {
    toast.className = 'toast-success toast-visible';
    toastIcon.textContent = '✅';
  } else {
    toast.className = 'toast-error toast-visible';
    toastIcon.textContent = '❌';
  }

  // 3. Automatically hide it after 3.5 seconds
  setTimeout(() => {
    toast.classList.remove('toast-visible');
  }, 3500);
}


// ==========================================
// LEAFLET SATELLITE MAP LOGIC
// ==========================================
let map;
let mapMarker;
let selectedLat = 14.8139; // Default center of San Jose del Monte
let selectedLng = 121.0453; // Default center of San Jose del Monte

const btnDefineMap = document.getElementById('btn-define-map');
const mapModal = document.getElementById('map-modal');
const btnCloseMap = document.getElementById('close-map-btn');
const btnSaveCoords = document.getElementById('btn-save-coords');

if (btnDefineMap && mapModal) {
  btnDefineMap.addEventListener('click', () => {
    // 1. Open the modal
    mapModal.classList.remove('hidden');

    // 2. Load the map if it hasn't been loaded yet
    if (!map) {
      // Center exactly on San Jose del Monte with zoom level 14
      map = L.map('roadwiseMap').setView([14.8139, 121.0453], 14);

      // Add Esri Satellite Imagery
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(map);

      // Add Street Names overlay on top of the satellite image (Hybrid view!)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Labels &copy; Esri'
      }).addTo(map);

      // 3. Listen for clicks to drop the pin!
      map.on('click', function(e) {
        selectedLat = e.latlng.lat;
        selectedLng = e.latlng.lng;

        // Remove old marker if it exists, add new one
        if (mapMarker) {
          map.removeLayer(mapMarker);
        }
        mapMarker = L.marker([selectedLat, selectedLng]).addTo(map);
      });
    }

    // Fix for Leaflet maps loading inside hidden divs
    setTimeout(() => { map.invalidateSize(); }, 200);
  });

  // Close buttons logic
  btnCloseMap.addEventListener('click', () => mapModal.classList.add('hidden'));

  // Save button logic
  btnSaveCoords.addEventListener('click', () => {
    if(!mapMarker) {
      alert("Please click on the map to drop a pin first!");
      return;
    }
    // Paste values into hidden boxes
    document.getElementById('latitude').value = selectedLat;
    document.getElementById('longitude').value = selectedLng;
    // Show success text to user
    document.getElementById('coords-display').textContent = `Locked: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;
    // Close map
    mapModal.classList.add('hidden');
  });
}

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

  // --- NEW: Grab the manual Severity dropdown value ---
  formData.append("severity", document.getElementById("severity")?.value || "Low");

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

        const status = report.status || 'Pending';
        let statusHtml = status === 'Pending'
          ? `<span class="status-badge pending">Pending Validation</span>`
          : `<span class="status-badge validated">${status}</span>`;

        let buttonHtml = status === 'Pending'
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

// Ensure it runs when the script loads
loadAdminReports();
