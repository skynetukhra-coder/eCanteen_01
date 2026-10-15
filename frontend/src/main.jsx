// Override localStorage.clear to preserve Remember Me state
const originalClear = localStorage.clear.bind(localStorage);
localStorage.clear = () => {
  const rememberMe = localStorage.getItem("rememberMe");
  const rememberedUsername = localStorage.getItem("rememberedUsername");
  const rememberedPassword = localStorage.getItem("rememberedPassword");
  
  originalClear();
  
  if (rememberMe) localStorage.setItem("rememberMe", rememberMe);
  if (rememberedUsername) localStorage.setItem("rememberedUsername", rememberedUsername);
  if (rememberedPassword) localStorage.setItem("rememberedPassword", rememberedPassword);
};

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

window.API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : window.location.origin;

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);