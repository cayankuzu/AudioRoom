import "./hub/hub.css";
import { bootHub } from "./hub/app";

bootHub(document.getElementById("app") ?? document.body);
