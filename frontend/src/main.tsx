import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initYandexMetrika } from "@/services/yandex-metrika";

initYandexMetrika();
createRoot(document.getElementById("root")!).render(<App />);
