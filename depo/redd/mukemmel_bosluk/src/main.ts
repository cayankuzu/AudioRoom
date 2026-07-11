import "../style.css";
import "../../../shared/styles/experience-shell.css";
import { bootstrapApp } from "./app/bootstrap";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  bootstrapApp(root);
}
