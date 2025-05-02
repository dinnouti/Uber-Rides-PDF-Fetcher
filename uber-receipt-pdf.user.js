// ==UserScript==
// @name         Uber Rides Fetcher
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Fetch Uber ride history and download receipts
// @author       You
// @match        https://riders.uber.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/dinnouti/Uber-Rides-PDF-Fetcher/refs/heads/main/uber-receipt-pdf.user.js
// @downloadURL  https://raw.githubusercontent.com/dinnouti/Uber-Rides-PDF-Fetcher/refs/heads/main/uber-receipt-pdf.user.js
// @icon         https://www.google.com/s2/favicons?domain=uber.com
// ==/UserScript==

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        resultsLimit: 20,
        logPrefix: 'UberReceipts -'
    };

    // GraphQL query for fetching ride activities
    const ACTIVITIES_QUERY = `query Activities($cityID: Int, $endTimeMs: Float, $includePast: Boolean = true, $includeUpcoming: Boolean = true, $limit: Int = 5, $nextPageToken: String, $orderTypes: [RVWebCommonActivityOrderType!] = [RIDES, TRAVEL], $profileType: RVWebCommonActivityProfileType = PERSONAL, $startTimeMs: Float) {
        activities(cityID: $cityID) {
            cityID
            past(
                endTimeMs: $endTimeMs
                limit: $limit
                nextPageToken: $nextPageToken
                orderTypes: $orderTypes
                profileType: $profileType
                startTimeMs: $startTimeMs
            ) @include(if: $includePast) {
                activities {
                    ...RVWebCommonActivityFragment
                    __typename
                }
                nextPageToken
                __typename
            }
            upcoming @include(if: $includeUpcoming) {
                activities {
                    ...RVWebCommonActivityFragment
                    __typename
                }
                __typename
            }
            __typename
        }
    }

    fragment RVWebCommonActivityFragment on RVWebCommonActivity {
        buttons {
            isDefault
            startEnhancerIcon
            text
            url
            __typename
        }
        cardURL
        description
        imageURL {
            light
            dark
            __typename
        }
        subtitle
        title
        uuid
        __typename
    }`;

    // UI Elements
    let resultDiv = null;

    /**
     * Initialize the script
     */
    function init() {
        console.log(`${CONFIG.logPrefix} Script loaded`);
        createFetchButton();
    }

    /**
     * Create the fetch button UI element
     */
    function createFetchButton() {
        const button = document.createElement('button');
        button.textContent = 'Fetch PDF';
        button.style.position = 'fixed';
        button.style.top = '17px';
        button.style.right = '10px';
        button.style.zIndex = '9999';
        button.style.padding = '4px 6px';
        button.style.backgroundColor = '#276EF1';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#1A56C2';
        });
        
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#276EF1';
        });
        
        button.addEventListener('click', fetchRides);
        document.body.appendChild(button);
    }

    /**
     * Create or clear the results container
     */
    function createResultsContainer() {
        // Remove existing results container if it exists
        if (resultDiv) {
            resultDiv.remove();
        }
        
        resultDiv = document.createElement('div');
        resultDiv.style.position = 'fixed';
        resultDiv.style.top = '50px';
        resultDiv.style.right = '10px';
        resultDiv.style.backgroundColor = 'white';
        resultDiv.style.padding = '15px';
        resultDiv.style.border = '1px solid #ddd';
        resultDiv.style.borderRadius = '8px';
        resultDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        resultDiv.style.maxHeight = '80vh';
        resultDiv.style.width = '350px';
        resultDiv.style.overflowY = 'auto';
        resultDiv.style.zIndex = '9999';
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.backgroundColor = '#f0f0f0';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = '#666';
        closeButton.style.width = '30px';
        closeButton.style.height = '30px';
        closeButton.style.borderRadius = '50%';
        closeButton.style.display = 'flex';
        closeButton.style.alignItems = 'center';
        closeButton.style.justifyContent = 'center';
        closeButton.title = 'Close';
        
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.backgroundColor = '#f0f0f0';
        });
        
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.backgroundColor = '#f0f0f0';
        });
        
        closeButton.addEventListener('click', () => {
            resultDiv.remove();
            resultDiv = null;
        });
        
        resultDiv.appendChild(closeButton);
        
        return resultDiv;
    }

    /**
     * Format a single ride for display
     */
    function formatRide(ride) {
        return `
            <div style="margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9em;">
                        ${ride.title}
                    </span>
                    
                    <a 
                        href="${ride.cardURL}/receipt?contentType=PDF" 
                        style="text-decoration: none; background-color:rgb(250, 205, 123); padding: 3px 8px; border-radius: 4px;"
                        title="Download PDF Receipt"
                        target="_blank">&#128196;
                    </a>
                </div>
                <div style="color: #666; font-size: 0.9em; margin-top: 1px">${ride.subtitle} -  ${ride.description} </div>
            </div>
        `;
    }

    /**
     * Display the fetched rides
     */
    function displayRides(rides) {
        const container = createResultsContainer();
        
        if (!rides || rides.length === 0) {
            container.innerHTML += '<h3>No rides found</h3>';
            document.body.appendChild(container);
            return;
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0;">Recent Rides</h3>
            </div>
            ${rides.map(formatRide).join('')}
        `;
        
        container.appendChild(contentDiv);
        document.body.appendChild(container);
    }

    /**
     * Get CSRF token from the page
     */
    function getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || "x";
    }

    /**
     * Main fetch function to get ride data
     */
    function fetchRides() {
        // Show loading indicator
        const loadingContainer = createResultsContainer();
        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = '<div style="text-align: center; padding: 20px;">Loading rides...</div>';
        loadingContainer.appendChild(loadingDiv);
        document.body.appendChild(loadingContainer);

        console.log(`${CONFIG.logPrefix} Fetching rides...`);
        
        fetch("https://riders.uber.com/graphql", {
            "credentials": "include",
            "headers": {
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "content-type": "application/json",
                "x-csrf-token": getCsrfToken(),
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin"
            },
            "body": JSON.stringify({
                operationName: 'Activities',
                variables: {
                    includePast: true,
                    includeUpcoming: true,
                    limit: CONFIG.resultsLimit,
                    orderTypes: ['RIDES', 'TRAVEL'],
                    profileType: 'PERSONAL'
                },
                query: ACTIVITIES_QUERY
            }),
            "method": "POST",
            "mode": "cors"
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`${CONFIG.logPrefix} Data fetched:`, data);
            
            if (data.data?.activities?.past?.activities) {
                const rides = data.data.activities.past.activities;
                console.log(`${CONFIG.logPrefix} Rides:`, rides);
                displayRides(rides);
            } else {
                throw new Error('No ride data found in response');
            }
        })
        .catch(error => {
            console.error(`${CONFIG.logPrefix} Fetch error:`, error);
            const errorContainer = createResultsContainer();
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="color: #d32f2f; padding: 15px; text-align: center;">
                    <h3>Error</h3>
                    <p>${error.message}</p>
                </div>
            `;
            errorContainer.appendChild(errorDiv);
            document.body.appendChild(errorContainer);
        });
    }

    // Initialize the script
    init();
})();
