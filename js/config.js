// js/config.js

let API_BASE_URL = "http://localhost:8080"; // Default for your laptop

// If the browser address bar doesn't say 'localhost', switch to the live server!
if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
  // This will be your real Spring Boot backend URL once deployed (e.g., Render, Railway)
  API_BASE_URL = "https://my-roadwise-backend.com";
}
