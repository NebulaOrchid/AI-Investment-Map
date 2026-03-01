import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AIPortfolio from "../ai-portfolio-heatmap";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AIPortfolio />
  </StrictMode>
);
