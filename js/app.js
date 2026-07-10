document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // IMAGE UPLOAD & PREVIEW LOGIC
  // ==========================================
  const imageInput = document.getElementById('damageImageFile');
  const imagePreview = document.getElementById('imagePreview');
  const fileNameDisplay = document.getElementById('fileNameDisplay');

  if (imageInput) {
    imageInput.addEventListener('change', function() {
      // 1. Grab the file the user just selected
      const file = this.files[0];

      if (file) {
        // 2. Show the name of the file on the screen
        fileNameDisplay.textContent = file.name;

        // 3. Use FileReader to instantly preview the image!
        const reader = new FileReader();
        reader.onload = function(e) {
          imagePreview.src = e.target.result;
          imagePreview.style.display = 'block'; // Make it visible
        }
        reader.readAsDataURL(file);
      } else {
        // If they cancel, hide the preview again
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

    fetch("http://localhost:8080/api/roads")
      .then(response => {
        if (!response.ok) throw new Error("Failed to fetch roads");
        return response.json();
      })
      .then(roads => {
        roadDropdown.innerHTML = '<option value="" disabled selected>Select a City Road...</option>';

        // 1. Grab the exact ID saved by your login.html page!
        const currentBarangayId = parseInt(sessionStorage.getItem("barangayId")) || 24;

        roads.forEach(road => {

          // 2. Filter the database roads to only show the ones belonging to the logged-in user
          if (road.barangay && road.barangay.id === currentBarangayId) {

            const option = document.createElement("option");
            option.value = road.roadName;
            option.textContent = road.roadName;

            option.dataset.roadId = road.roadId;
            option.dataset.importance = road.roadImportance;
            option.dataset.type = road.roadType;
            option.dataset.terrain = road.terrainType;

            roadDropdown.appendChild(option);
          }
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
// 11. BACKEND API CONNECTION LOGIC (RoadWise)
// ==========================================

function submitRoadReport() {
  // 1. Create a FormData object (The standard way the internet sends heavy files)
  const formData = new FormData();

  // 2. Append all the text boxes (Spring Boot will automatically map these to your RoadReport model!)
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

  // Default values required by your backend
  formData.append("latitude", parseFloat(document.getElementById("latitude")?.value) || 0.0);
  formData.append("longitude", parseFloat(document.getElementById("longitude")?.value) || 0.0);
  formData.append("inventoryYear", new Date().getFullYear());
  formData.append("cvDamageClassification", "Pending CV Analysis");
  formData.append("cvConfidenceScore", 0.0);

  // 3. Grab the physical image file and put it in the box!
  const imageInput = document.getElementById("damageImageFile");
  if (imageInput && imageInput.files.length > 0) {
    formData.append("imageFile", imageInput.files[0]);
  }

  // 4. Send it to Spring Boot!
  // (Notice we REMOVED the 'Content-Type' header. The browser is smart and automatically
  // sets it to 'multipart/form-data' when we pass it a FormData object).
  fetch("http://localhost:8080/api/reports", {
    method: "POST",
    body: formData
  })
    .then(response => {
      if (response.ok) return response.json();
      throw new Error('Network response was not ok.');
    })
    .then(data => {
      alert("Success! Road report and Image have been securely saved to the server.");
      console.log("Database Response:", data);

      // Clear the form after a success
      document.getElementById("damageDescription").value = "";
      document.getElementById("width").value = "";

      // Clear the Image Preview
      const preview = document.getElementById("imagePreview");
      if(preview) {
        preview.style.display = 'none';
        preview.src = "";
      }
      const fileNameDisplay = document.getElementById("fileNameDisplay");
      if(fileNameDisplay) fileNameDisplay.textContent = "";
    })
    .catch(error => {
      console.error("Error submitting report:", error);
      alert("Failed to upload report. Please ensure the backend is running.");
    });
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
