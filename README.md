# Uber Rides Receipt PDF Fetcher

This is a Tampermonkey userscript that allows you to fetch your Uber ride history and download ride receipts as PDFs directly from the Uber website.

## Features

- Fetches recent Uber rides from your account.
- Displays ride details, including title, subtitle, and description.
- Provides a direct link to download ride receipts in PDF format.

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Open Tampermonkey and create a new script.
3. Copy the contents of `uber-receipt-pdf.user.js` into the script editor.
4. Save the script.

Alternatively, you can install the script directly via the following URL:
[Download Script](https://raw.githubusercontent.com/dinnouti/Uber-Rides-PDF-Fetcher/refs/heads/main/uber-receipt-pdf.user.js)

## Usage

1. Navigate to [Uber's ride history page](https://riders.uber.com/).
2. Click the "Fetch Rides" button that appears in the top-right corner of the page.
3. View your recent rides in the pop-up window.
4. Click the 📄 icon next to a ride to download its receipt as a PDF.

## Development

To modify the script:

1. Clone this repository:
   ```sh
   git clone https://github.com/dinnouti/Uber-Rides-PDF-Fetcher.git