import { createRoot } from "react-dom/client";
import { App } from "./App.js";

const root = document.getElementById("root");
if (root === null) {
	throw new Error("#root is missing in index.html");
}
createRoot(root).render(<App />);
