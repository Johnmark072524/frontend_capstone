// js/config.js

let API_BASE_URL = "http://localhost:8080"; // Default for your laptop

// If the browser address bar doesn't say 'localhost', switch to the live server!
if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {

  // 🚀 THIS IS THE LINE YOU CHANGE! Paste your specific Ngrok link here:
  API_BASE_URL = "https://vitamins-april-unify.ngrok-free.dev";
}
