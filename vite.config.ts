import { defineConfig } from "vite";
import sqlocal from "sqlocal/vite";

export default defineConfig({
    base: "/esque-note/",
    plugins: [sqlocal()]
});