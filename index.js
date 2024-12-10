const express = require("express");
const { chromium } = require("playwright");
const { expect } = require("playwright/test");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Helper function to log in and check workshops
async function checkWorkshops() {
  const browser = await chromium.launch({ headless: true }); // Set false for debugging
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Get workshop links from environment variable
    const workshopLinks = process.env.WORKSHOP_LINKS?.split(",") || [];

    if (workshopLinks.length === 0) {
      console.log("No workshop links provided.");
      return;
    }

    console.log("Starting the login process...");
    // Navigate to the login page
    await page.goto(
      "https://oesterreich.unternehmensgruendungsprogramm.at/login"
    );
    // Perform login
    await page.getByLabel("E-Mail").fill(process.env.USERNAME);
    await page.getByLabel("Passwort").fill(process.env.PASSWORD);
    await page.getByRole("button", { name: "Anmelden" }).click();

    const welcomeText = page.getByText("Herzlich Willkommen, Dilshan Kelsen!");
    await expect(welcomeText).toBeAttached();
    console.log("Login successful!");

    // Iterate through each workshop
    for (const workshopLink of workshopLinks) {
      console.log(`Checking workshop: ${workshopLink}`);
      await page.goto(workshopLink, { waitUntil: "networkidle" });

      const workshopHeading = page.locator("role=heading[level=2]");
      await workshopHeading.waitFor({ state: "visible" });
      const headingText = await workshopHeading.textContent();
      console.log("Workshop title:", headingText);

      const button = page.locator("a.btn", {
        hasText:
          /Jetzt anmelden|Warteliste|Buchung noch nicht freigeschalten|Abmelden/i,
      });
      await button.waitFor({ state: "visible" });
      const buttonText = await button.textContent();

      if (buttonText === "Jetzt anmelden") {
        console.log("Signing up for the workshop...");
        await button.click();
        await page
          .locator("label")
          .filter({ hasText: "Ich bestätige, dass ich die" })
          .locator("div")
          .click();
        await page
          .locator("label")
          .filter({ hasText: "Ich bestätige, dass diese" })
          .locator("div")
          .click();
        await page.getByRole("link", { name: "Anmelden", exact: true }).click();
        const confirmationText = page.getByText(
          "Sie wurden erfolgreich angemeldet."
        );
        await expect(confirmationText).toBeAttached();
        console.log("Successfully signed up!");
      } else if (buttonText === "Warteliste") {
        console.log("Workshop full. Waiting list available.");
      } else if (buttonText === "Buchung noch nicht freigeschalten") {
        console.log("Workshop not yet available.");
      } else if (buttonText === "Abmelden") {
        console.log("Already signed up for workshop.");
      } else if (buttonText === "Warteliste verlassen") {
        console.log("Workshop full. Already on the waiting list.");
      } else {
        console.log("Unknown button state found:", buttonText);
      }
    }
  } catch (error) {
    console.error("Error during workshop check:", error);
  } finally {
    await browser.close();
  }
}

// Schedule the process to run every hour
setInterval(checkWorkshops, 3600000);

// API endpoint to manually trigger the check
app.get("/check-workshops", async (req, res) => {
  try {
    await checkWorkshops();
    res.send("Checked workshops!");
  } catch (error) {
    res.status(500).send("Error checking workshops");
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("The bot will check for workshops every hour.");
});

checkWorkshops();
