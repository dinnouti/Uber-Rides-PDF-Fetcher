// ==UserScript==
// @name         Uber Rides Receipt PDF Fetcher
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Fetch Uber ride history
// @author       You
// @match        https://riders.uber.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/dinnouti/Uber-Rides-PDF-Fetcher/refs/heads/main/uber-receipt-pdf.user.js
// @downloadURL  https://raw.githubusercontent.com/dinnouti/Uber-Rides-PDF-Fetcher/refs/heads/main/uber-receipt-pdf.user.js
// 
// ==/UserScript==

(function () {
    'use strict';

    const uber_results_limit = 20;

    // Create a button to trigger the fetch
    const button = document.createElement('button');
    button.textContent = 'Fetch Rides';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '9999';
    document.body.appendChild(button);

    // Function to fetch ride data with error handling
    async function fetchRideData() {
        try {
            const response = await fetch('https://riders.uber.com/api/rides', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Network error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();

            if (!data || !data.rides) {
                throw new Error('Unexpected response format: Missing "rides" data.');
            }

            return data.rides;
        } catch (error) {
            console.error('Error fetching ride data:', error.message);
            alert(`Failed to fetch ride data: ${error.message}`);
            return [];
        }
    }

    // Function to download receipt with error handling
    async function downloadReceipt(rideId) {
        try {
            const response = await fetch(`https://riders.uber.com/api/rides/${rideId}/receipt`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to download receipt: ${response.status} - ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `Uber_Receipt_${rideId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading receipt:', error.message);
            alert(`Failed to download receipt: ${error.message}`);
        }
    }

    // Example usage with error handling
    async function fetchAndDisplayRides() {
        const rides = await fetchRideData();
        if (rides.length === 0) {
            console.warn('No rides found or an error occurred.');
            return;
        }

        // Create a display div for the results
        const resultDiv = document.createElement('div');
        resultDiv.style.position = 'fixed';
        resultDiv.style.top = '50px';
        resultDiv.style.right = '10px';
        resultDiv.style.backgroundColor = 'white';
        resultDiv.style.padding = '10px';
        resultDiv.style.border = '1px solid black';
        resultDiv.style.maxHeight = '80vh';
        resultDiv.style.overflowY = 'auto';
        resultDiv.style.zIndex = '9999';

        // Format and display the data
        resultDiv.innerHTML = '<h3>Recent Rides:</h3><p>&nbsp;</p>' +
            rides.map(ride => `
            <div style="margin-bottom: 10px; border-bottom: 1px solid #ccc;">
                <strong>
                    ${ride.title}
                </strong>
                <a 
                    href="${ride.cardURL}/receipt?contentType=PDF" 
                    style="text-decoration:none"
                    target="_blank">&#128196;
                </a>
                <br>
                ${ride.subtitle}
                
                <br>
                ${ride.description || ''}
            </div>
        `).join('');

        document.body.appendChild(resultDiv);
    }

    // Helper function to get the auth token (example implementation)
    function getAuthToken() {
        // Replace this with the actual logic to retrieve the auth token
        return 'your-auth-token';
    }

    // Add click event listener to the button
    button.addEventListener('click', fetchAndDisplayRides);
})();