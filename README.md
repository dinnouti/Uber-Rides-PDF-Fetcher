# Uber Rides Receipt PDF Fetcher

This is a Tampermonkey userscript that allows you to fetch your Uber ride history and download ride receipts as PDFs directly from the Uber website.

## Features

- Fetches recent Uber rides from your account
- Displays ride details, including title, subtitle, and description
- Provides a direct link to download ride receipts in PDF format
- Integrates seamlessly with the Uber website UI
- Includes a close button to dismiss the results panel
- Responsive design that works on various screen sizes

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser
2. Open Tampermonkey and create a new script
3. Copy the contents of `uber-receipt-pdf.user.js` into the script editor
4. Save the script

Alternatively, you can install the script directly via the following URL:
[Download Script](https://raw.githubusercontent.com/dinnouti/Uber-Rides-PDF-Fetcher/refs/heads/main/uber-receipt-pdf.user.js)

## Usage

1. Navigate to [Uber's ride history page](https://riders.uber.com/)
2. Click the "Fetch PDF" button that appears in the top-right corner of the page
3. View your recent rides in the results panel
4. Click the 📄 icon next to a ride to download its receipt as a PDF

## Screenshots

(Screenshots coming soon)

## Development

To modify the script:

1. Clone this repository:
   ```sh
   git clone https://github.com/dinnouti/Uber-Rides-PDF-Fetcher.git
   ```
2. Make your changes to the `uber-receipt-pdf.user.js` file
3. Test your changes by loading the script in Tampermonkey
4. Submit a pull request with your improvements

## Future Enhancements

- Add pagination support for viewing more than 20 rides
- Implement filtering options by date range
- Add dark mode support
- Export ride history to CSV format

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
