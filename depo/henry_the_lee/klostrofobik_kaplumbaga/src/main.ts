import "../style.css";
import "../../../redd/mukemmel_bosluk/style.css";
import "../ui-overrides.css";
import "../../../shared/styles/experience-shell.css";
import { bootstrapApp } from "./app/bootstrap";

const root = document.querySelector<HTMLDivElement>("#app");

if (root) {
  bootstrapApp(root);
}
