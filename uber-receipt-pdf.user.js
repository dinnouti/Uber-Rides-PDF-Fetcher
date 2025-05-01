// ==UserScript==
// @name         Uber Rides Fetcher
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Fetch Uber ride history
// @author       You
// @match        https://riders.uber.com/*
// @grant        none
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

    // Main fetch function
    function fetchRides() {
        fetch("https://riders.uber.com/graphql", {
            "credentials": "include",
            "headers": {
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "content-type": "application/json",
                "x-csrf-token": document.querySelector('meta[name="csrf-token"]')?.content || "x",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin"
            },
            "body": JSON.stringify({
                operationName: 'Activities',
                variables: {
                    includePast: true,
                    includeUpcoming: true,
                    limit: uber_results_limit,
                    orderTypes: ['RIDES', 'TRAVEL'],
                    profileType: 'PERSONAL'
                },
                query: `query Activities($cityID: Int, $endTimeMs: Float, $includePast: Boolean = true, $includeUpcoming: Boolean = true, $limit: Int = 5, $nextPageToken: String, $orderTypes: [RVWebCommonActivityOrderType!] = [RIDES, TRAVEL], $profileType: RVWebCommonActivityProfileType = PERSONAL, $startTimeMs: Float) {
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
                }`
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
                console.log('UberReceipts - Data fetched:', data);
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
                if (data.data?.activities?.past?.activities) {
                    const rides = data.data.activities.past.activities;
                    console.log('UberReceipts - Rides:', rides);
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
            })
            .catch(error => {
                console.error('UberReceipts - Fetch error:', error);
                alert('Error fetching rides: ' + error.message);
            });
    }

    // Add click event listener to the button
    button.addEventListener('click', fetchRides);
})();