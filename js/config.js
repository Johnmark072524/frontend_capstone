// js/config.js
let API_BASE_URL = "http://localhost:8080";
let isLocalhost = true;

if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
  API_BASE_URL = "https://vitamins-april-unify.ngrok-free.dev";
  isLocalhost = false;
}

const API_HEADERS = {
  'Content-Type': 'application/json',
  ...(!isLocalhost && { 'ngrok-skip-browser-warning': '69420' })
};
