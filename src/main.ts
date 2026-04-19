import { renderHub } from "./hub/hub";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  renderHub(root);
}
