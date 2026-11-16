import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
export const executablePath =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync) ||
  chromium.executablePath();
export const browser = () =>
  chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
