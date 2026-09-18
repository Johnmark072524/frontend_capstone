const SJDM_BARANGAY_BOUNDS = {
  "Kaypian": {
    center: [14.8252, 121.0450],
    bounds: [
      [14.8120, 121.0320], // Southwest [lat, lng]
      [14.8380, 121.0580]  // Northeast [lat, lng]
    ],
    minZoom: 15
  },
  "Graceville": {
    center: [14.8120, 121.0180],
    bounds: [
      [14.8010, 121.0080],
      [14.8230, 121.0280]
    ],
    minZoom: 15
  },
  "Muzon Proper": {
    center: [14.8060, 121.0020],
    bounds: [
      [14.7950, 120.9900],
      [14.8170, 121.0140]
    ],
    minZoom: 15
  },
  "Tungkong Mangga": {
    center: [14.7980, 121.0590],
    bounds: [
      [14.7850, 121.0450],
      [14.8110, 121.0730]
    ],
    minZoom: 15
  }
  // Remaining barangays will be added here using the same format
};

// Fallback for "Pending Assignment", Admins, or Unassigned Users
const SJDM_CITY_FALLBACK = {
  center: [14.8139, 121.0453],
  bounds: [
    [14.7400, 120.9500], // Full SJDM South-West
    [14.9200, 121.1500]  // Full SJDM North-East
  ],
  minZoom: 13
};
