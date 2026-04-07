// ==UserScript==
// @name         Uber Rides Fetcher
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Fetch Uber ride history and download receipts
// @author       You
// @match        https://riders.uber.com/*
// @grant        none
// @updateURL    https://github.com/dinnouti/Uber-Rides-PDF-Fetcher/raw/refs/heads/main/uber-receipt-pdf.user.js
// @downloadURL  https://github.com/dinnouti/Uber-Rides-PDF-Fetcher/raw/refs/heads/main/uber-receipt-pdf.user.js
// @icon         https://www.google.com/s2/favicons?domain=uber.com
// ==/UserScript==

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        resultsLimit: 30,
        logPrefix: 'UberReceipts -',
        graphqlEndpoint: 'https://riders.uber.com/graphql',
        orderTypes: ['RIDES', 'TRAVEL'],
        profileType: 'PERSONAL'
    };

    // GraphQL query for fetching ride activities
    const ACTIVITIES_QUERY = `query Activities($endTimeMs: Float, $limit: Int = 5, $nextPageToken: String, $orderTypes: [RVWebCommonActivityOrderType!] = [RIDES, TRAVEL], $profileType: RVWebCommonActivityProfileType = PERSONAL, $startTimeMs: Float) {
        activities {
            past(
                endTimeMs: $endTimeMs
                limit: $limit
                nextPageToken: $nextPageToken
                orderTypes: $orderTypes
                profileType: $profileType
                startTimeMs: $startTimeMs
            ) {
                activities {
                    cardURL
                    description
                    subtitle
                    title
                }
                nextPageToken
            }
        }
    }`;

    // PDF icon SVG (static, reused across rides)
    const PDF_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#F40F02" viewBox="0 0 16 16">
  <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
  <path d="M4.603 14.087a.8.8 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.7 7.7 0 0 1 1.482-.645 20 20 0 0 0 1.062-2.227 7.3 7.3 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a11 11 0 0 0 .98 1.686 5.8 5.8 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.86.86 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.7 5.7 0 0 1-.911-.95 11.7 11.7 0 0 0-1.997.406 11.3 11.3 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.8.8 0 0 1-.58.029m1.379-1.901q-.25.115-.459.238c-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361q.016.032.026.044l.035-.012c.137-.056.355-.235.635-.572a8 8 0 0 0 .45-.606m1.64-1.33a13 13 0 0 1 1.01-.193 12 12 0 0 1-.51-.858 21 21 0 0 1-.5 1.05zm2.446.45q.226.245.435.41c.24.19.407.253.498.256a.1.1 0 0 0 .07-.015.3.3 0 0 0 .094-.125.44.44 0 0 0 .059-.2.1.1 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a4 4 0 0 0-.612-.053zM8.078 7.8a7 7 0 0 0 .2-.828q.046-.282.038-.465a.6.6 0 0 0-.032-.198.5.5 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822q.036.167.09.346z"/>
</svg>`;

    // UI state
    let resultDiv = null;
    let isLoading = false;

    /**
     * Inject styles into the page (replaces inline styles)
     */
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .uber-fetch-btn {
                position: fixed;
                top: 17px;
                right: 10px;
                z-index: 9999;
                padding: 8px 16px;
                background-color: #D32F2F;
                color: white;
                border: none;
                border-radius: 500px;
                cursor: pointer;
                font-family: 'UberMove', 'UberMoveText', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                transition: background-color 0.2s ease, box-shadow 0.2s ease;
            }
            .uber-fetch-btn:hover {
                background-color: #B71C1C;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            }
            .uber-fetch-btn:disabled {
                background-color: #E57373;
                cursor: not-allowed;
                box-shadow: none;
            }
            .uber-fetch-btn svg {
                flex-shrink: 0;
            }
            .uber-results-container {
                position: fixed;
                top: 50px;
                right: 10px;
                background-color: white;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-height: 80vh;
                width: 350px;
                overflow-y: auto;
                z-index: 9999;
            }
            .uber-close-btn {
                position: absolute;
                top: 5px;
                right: 5px;
                background-color: #e0e0e0;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .uber-close-btn:hover { background-color: #ccc; }
            .uber-ride-item {
                margin-bottom: 5px;
                padding-bottom: 5px;
                border-bottom: 1px solid #eee;
            }
            .uber-ride-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .uber-ride-info { font-size: 0.9em; }
            .uber-ride-subtitle {
                color: #666;
                font-size: 0.9em;
                margin-top: 1px;
            }
            .uber-pdf-link {
                text-decoration: none;
                display: flex;
                align-items: center;
                flex-shrink: 0;
            }
            .uber-rides-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            .uber-rides-header h3 { margin: 0; }
            .uber-error {
                color: #d32f2f;
                padding: 15px;
                text-align: center;
            }
            .uber-loading {
                text-align: center;
                padding: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Escape HTML to prevent XSS from untrusted data
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str ?? '';
        return div.innerHTML;
    }

    /**
     * Initialize the script
     */
    function init() {
        console.log(`${CONFIG.logPrefix} Script loaded`);
        injectStyles();
        createFetchButton();
    }

    /** Reference to the fetch button for enable/disable */
    let fetchButton = null;

    /**
     * Create the fetch button UI element
     */
    function createFetchButton() {
        fetchButton = document.createElement('button');
        fetchButton.className = 'uber-fetch-btn';
        fetchButton.title = 'Fetch recent ride receipts as PDF';
        fetchButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
</svg>Fetch PDF`;
        fetchButton.addEventListener('click', fetchRides);
        document.body.appendChild(fetchButton);
    }

    /**
     * Create or clear the results container
     */
    function createResultsContainer() {
        if (resultDiv) {
            resultDiv.remove();
        }

        resultDiv = document.createElement('div');
        resultDiv.className = 'uber-results-container';

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.className = 'uber-close-btn';
        closeButton.title = 'Close';
        closeButton.addEventListener('click', () => {
            resultDiv.remove();
            resultDiv = null;
        });

        resultDiv.appendChild(closeButton);
        return resultDiv;
    }

    /**
     * Format a single ride for display (XSS-safe)
     */
    function formatRide(ride) {
        const title = escapeHtml(ride.title);
        const subtitle = escapeHtml(ride.subtitle);
        const description = escapeHtml(ride.description);
        const cardURL = encodeURI(ride.cardURL || '');

        return `
            <div class="uber-ride-item">
                <div class="uber-ride-row">
                    <div class="uber-ride-info">
                        ${title}
                        <div class="uber-ride-subtitle">${subtitle} - ${description}</div>
                    </div>
                    <a href="${cardURL}/receipt?contentType=PDF"
                       class="uber-pdf-link"
                       title="Download PDF Receipt"
                       style="background: #ECEFF1; padding: 2px"
                       target="_blank">${PDF_ICON_SVG}</a>
                </div>
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
            <div class="uber-rides-header">
                <h3>Recent Rides</h3>
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
        const token = document.querySelector('meta[name="csrf-token"]')?.content;
        if (!token) {
            console.warn(`${CONFIG.logPrefix} CSRF token not found, request may fail`);
        }
        return token || 'x';
    }

    /**
     * Main fetch function to get ride data
     */
    async function fetchRides() {
        if (isLoading) return;
        isLoading = true;
        if (fetchButton) fetchButton.disabled = true;

        const loadingContainer = createResultsContainer();
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'uber-loading';
        loadingDiv.textContent = 'Loading rides...';
        loadingContainer.appendChild(loadingDiv);
        document.body.appendChild(loadingContainer);

        console.log(`${CONFIG.logPrefix} Fetching rides...`);

        try {
            const response = await fetch(CONFIG.graphqlEndpoint, {
                credentials: 'include',
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'content-type': 'application/json',
                    'x-csrf-token': getCsrfToken(),
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin'
                },
                body: JSON.stringify({
                    operationName: 'Activities',
                    variables: {
                        includePast: true,
                        limit: CONFIG.resultsLimit,
                        orderTypes: CONFIG.orderTypes,
                        profileType: CONFIG.profileType
                    },
                    query: ACTIVITIES_QUERY
                }),
                method: 'POST',
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`${CONFIG.logPrefix} Data fetched:`, data);

            const rides = data.data?.activities?.past?.activities;
            if (!rides) {
                throw new Error('No ride data found in response');
            }

            console.log(`${CONFIG.logPrefix} Rides:`, rides);
            displayRides(rides);
        } catch (error) {
            console.error(`${CONFIG.logPrefix} Fetch error:`, error);
            const errorContainer = createResultsContainer();
            const errorDiv = document.createElement('div');
            errorDiv.className = 'uber-error';
            errorDiv.innerHTML = `<h3>Error</h3><p>${escapeHtml(error.message)}</p>`;
            errorContainer.appendChild(errorDiv);
            document.body.appendChild(errorContainer);
        } finally {
            isLoading = false;
            if (fetchButton) fetchButton.disabled = false;
        }
    }

    // Initialize the script
    init();
})();
