document.addEventListener('DOMContentLoaded', () => {

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
// This is properly outside the block above, so your HTML can find it!

function submitRoadReport() {
  const reportData = {
    cityRoadName: document.getElementById("cityRoadName")?.value || "",
    cityRoadId: document.getElementById("cityRoadId")?.value || "",
    roadImportance: document.getElementById("roadImportance")?.value || "",
    roadType: document.getElementById("roadType")?.value || "",
    terrainType: document.getElementById("terrainType")?.value || "",
    width: parseFloat(document.getElementById("width")?.value) || 0.0,
    length: parseFloat(document.getElementById("length")?.value) || 0.0,
    numberOfBridges: parseInt(document.getElementById("numberOfBridges")?.value) || 0,
    lengthOfCulverts: parseFloat(document.getElementById("lengthOfCulverts")?.value) || 0.0,
    damageDescription: document.getElementById("damageDescription")?.value || "",

    damageImage: "pending_upload.jpg",
    latitude: 14.9,
    longitude: 121.0,
    inventoryYear: new Date().getFullYear(),

    cvDamageClassification: "Pending CV Analysis",
    cvConfidenceScore: 0.0,

    status: "Pending"
  };

  fetch("http://localhost:8080/api/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reportData)
  })
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Network response was not ok.');
    })
    .then(data => {
      alert("Success! Road report has been securely saved to the database.");
      console.log("Database Response:", data);

      document.getElementById("damageDescription").value = "";
      document.getElementById("width").value = "";
    })
    .catch(error => {
      console.error("Error submitting report:", error);
      alert("Failed to connect to the server. Please ensure the backend is running.");
    });
}
