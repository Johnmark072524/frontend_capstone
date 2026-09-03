// js/config.js
let API_BASE_URL = "http://localhost:8080";

if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
  API_BASE_URL = "https://backend-hmxf.onrender.com";
}

const API_HEADERS = {
  'Content-Type': 'application/json'
};
