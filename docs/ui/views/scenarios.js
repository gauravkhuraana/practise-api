// Scenarios Guide - Comprehensive automation practice scenarios

export function renderScenarios(outlet, ctx) {
  outlet.innerHTML = `
    <div class="scenarios-page">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <h1>🎯 Automation Practice Scenarios</h1>
          <p class="hero-subtitle">
            Master test automation with real-world scenarios. Practice API testing, UI automation, 
            and complex integration flows with our comprehensive bill payment platform.
          </p>
          <div class="hero-stats">
            <div class="stat-card">
              <span class="stat-number">10</span>
              <span class="stat-label">API Scenarios</span>
            </div>
            <div class="stat-card">
              <span class="stat-number">8</span>
              <span class="stat-label">UI Scenarios</span>
            </div>
            <div class="stat-card">
              <span class="stat-number">10</span>
              <span class="stat-label">Mixed Scenarios</span>
            </div>
          </div>
        </div>
      </section>

      <!-- How It Works -->
      <section class="how-it-works">
        <h2>🚀 How It Works</h2>
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <h3>Choose a Scenario</h3>
            <p>Pick from API-only, UI-only, or mixed scenarios based on your learning goals</p>
          </div>
          <div class="step-card">
            <div class="step-number">2</div>
            <h3>Read Requirements</h3>
            <p>Understand the acceptance criteria and expected behavior</p>
          </div>
          <div class="step-card">
            <div class="step-number">3</div>
            <h3>Write Your Tests</h3>
            <p>Implement using Playwright, Cypress, Selenium, or any framework</p>
          </div>
          <div class="step-card">
            <div class="step-number">4</div>
            <h3>Validate & Learn</h3>
            <p>Run tests against our live API and UI to verify your implementation</p>
          </div>
        </div>
      </section>

      <!-- Quick Reference -->
      <section class="quick-reference">
        <h2>📋 Quick Reference</h2>
        <div class="reference-grid">
          <div class="reference-card">
            <h4>🔗 Base URL</h4>
            <code>https://billpay-api.gauravkhurana-practice-api.workers.dev</code>
          </div>
          <div class="reference-card">
            <h4>🔑 API Key</h4>
            <code>X-API-Key: pk_practice_1234567890</code>
          </div>
          <div class="reference-card">
            <h4>👤 OAuth Credentials</h4>
            <code>Client: practice_client / practice_secret</code>
          </div>
          <div class="reference-card">
            <h4>🌐 UI URL</h4>
            <code>${window.location.origin}${window.location.pathname}</code>
          </div>
        </div>
      </section>

      <!-- API Scenarios -->
      <section class="scenarios-section api-scenarios">
        <h2>🔌 API-Only Scenarios (10)</h2>
        <p class="section-desc">Practice REST API testing with authentication, CRUD operations, and complex workflows</p>
        
        <div class="scenario-cards">
          <!-- Scenario 1: Health Check -->
          <div class="scenario-card" data-difficulty="easy">
            <div class="scenario-header">
              <span class="scenario-number">API-01</span>
              <span class="difficulty-badge easy">Easy</span>
            </div>
            <h3>Health Check & Status Verification</h3>
            <p class="scenario-desc">Verify the API is operational and returns correct status information</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Call GET /health endpoint</li>
                <li>Verify response status is 200</li>
                <li>Verify response contains "status": "healthy"</li>
                <li>Verify response time is under 500ms</li>
              </ul>
              <h4>Endpoint:</h4>
              <code>GET /health</code>
            </div>
          </div>

          <!-- Scenario 2: Pagination -->
          <div class="scenario-card" data-difficulty="easy">
            <div class="scenario-header">
              <span class="scenario-number">API-02</span>
              <span class="difficulty-badge easy">Easy</span>
            </div>
            <h3>Pagination & Limit Testing</h3>
            <p class="scenario-desc">Test pagination parameters across different endpoints</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Fetch users with limit=5, verify exactly 5 results</li>
                <li>Fetch page=2 and verify different results than page=1</li>
                <li>Verify meta.pagination contains correct page, limit, total</li>
                <li>Test boundary: limit=0, limit=100, page=999</li>
              </ul>
              <h4>Endpoint:</h4>
              <code>GET /v1/users?page=1&limit=5</code>
            </div>
          </div>

          <!-- Scenario 3: CRUD Operations -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">API-03</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Complete CRUD Operations</h3>
            <p class="scenario-desc">Create, Read, Update, Delete a user through API</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>POST /v1/users - Create new user, capture ID</li>
                <li>GET /v1/users/{id} - Verify user was created</li>
                <li>PUT /v1/users/{id} - Update user details</li>
                <li>PATCH /v1/users/{id} - Partial update</li>
                <li>DELETE /v1/users/{id} - Remove user</li>
                <li>GET /v1/users/{id} - Verify 404 after delete</li>
              </ul>
              <h4>Endpoints:</h4>
              <code>POST/GET/PUT/PATCH/DELETE /v1/users/{id}</code>
            </div>
          </div>

          <!-- Scenario 4: OAuth2 Flow -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">API-04</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>OAuth2 Authentication Flow</h3>
            <p class="scenario-desc">Implement complete OAuth2 client credentials flow</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>POST /oauth/token with client credentials</li>
                <li>Extract access_token from response</li>
                <li>Use token in Authorization: Bearer header</li>
                <li>Call GET /v1/auth/me to verify token works</li>
                <li>Verify token expiration handling</li>
              </ul>
              <h4>Credentials:</h4>
              <code>client_id: practice_client, client_secret: practice_secret</code>
            </div>
          </div>

          <!-- Scenario 5: Search & Filter -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">API-05</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Search, Filter & Sort</h3>
            <p class="scenario-desc">Test various query parameters for filtering data</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Filter billers by category (electricity, water, gas)</li>
                <li>Search billers by name partial match</li>
                <li>Sort results by different fields</li>
                <li>Combine multiple filters</li>
                <li>Verify empty results return proper structure</li>
              </ul>
              <h4>Endpoint:</h4>
              <code>GET /v1/billers?category=electricity&search=power</code>
            </div>
          </div>

          <!-- Scenario 6: E2E Payment Flow -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">API-06</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>End-to-End Payment Flow</h3>
            <p class="scenario-desc">Complete a full payment journey via API calls</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>GET /v1/billers - List available billers</li>
                <li>GET /v1/bills?status=pending - Find pending bill</li>
                <li>GET /v1/payment-methods - List payment methods</li>
                <li>POST /v1/payments - Create payment</li>
                <li>GET /v1/payments/{id} - Verify payment status</li>
                <li>GET /v1/bills/{id} - Verify bill marked as paid</li>
              </ul>
              <h4>Chain:</h4>
              <code>Billers → Bills → Payment Methods → Payment → Verify</code>
            </div>
          </div>

          <!-- Scenario 7: Error Handling -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">API-07</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Error Response Validation</h3>
            <p class="scenario-desc">Verify API returns proper error responses</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>401 Unauthorized - Missing/invalid API key</li>
                <li>404 Not Found - Non-existent resource</li>
                <li>400 Bad Request - Invalid payload</li>
                <li>422 Validation Error - Missing required fields</li>
                <li>Verify error response structure (code, message)</li>
              </ul>
              <h4>Test Cases:</h4>
              <code>No auth, bad ID, invalid JSON, missing fields</code>
            </div>
          </div>

          <!-- Scenario 8: Rate Limiting -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">API-08</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>Rate Limiting Verification</h3>
            <p class="scenario-desc">Test API rate limiting behavior</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Send multiple rapid requests (>100/min)</li>
                <li>Verify 429 Too Many Requests response</li>
                <li>Check X-RateLimit-* headers</li>
                <li>Verify Retry-After header</li>
                <li>Wait and verify rate limit resets</li>
              </ul>
              <h4>Headers to Check:</h4>
              <code>X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After</code>
            </div>
          </div>

          <!-- Scenario 9: Concurrent Requests -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">API-09</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>Concurrent Request Handling</h3>
            <p class="scenario-desc">Test API behavior under concurrent load</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Send 10 parallel GET requests</li>
                <li>Verify all return consistent data</li>
                <li>Create 5 users concurrently, verify unique IDs</li>
                <li>Test optimistic locking on updates</li>
                <li>Verify no race conditions in payment processing</li>
              </ul>
              <h4>Focus:</h4>
              <code>Promise.all(), async/await, response consistency</code>
            </div>
          </div>

          <!-- Scenario 10: Data-Driven Testing -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">API-10</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>Data-Driven API Testing</h3>
            <p class="scenario-desc">Parameterized testing with multiple data sets</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Create test data file (JSON/CSV)</li>
                <li>Test user creation with 10+ different inputs</li>
                <li>Test validation rules (email, phone, KYC)</li>
                <li>Test edge cases (special chars, unicode, max length)</li>
                <li>Generate test report with pass/fail summary</li>
              </ul>
              <h4>Data Sets:</h4>
              <code>Valid users, invalid emails, boundary values, special characters</code>
            </div>
          </div>
        </div>
      </section>

      <!-- UI Scenarios -->
      <section class="scenarios-section ui-scenarios">
        <h2>🖥️ UI-Only Scenarios (8)</h2>
        <p class="section-desc">Practice browser automation with real UI components, forms, and complex interactions</p>
        
        <div class="scenario-cards">
          <!-- UI Scenario 1 -->
          <div class="scenario-card" data-difficulty="easy">
            <div class="scenario-header">
              <span class="scenario-number">UI-01</span>
              <span class="difficulty-badge easy">Easy</span>
            </div>
            <h3>Form Validation Testing</h3>
            <p class="scenario-desc">Test form validation on the <a href="#/practice" class="scenario-link">Practice page</a></p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Navigate to <a href="#/practice" class="scenario-link">Practice page</a></li>
                <li>Submit form with empty fields, verify error messages</li>
                <li>Enter invalid email format, verify validation</li>
                <li>Fill all fields correctly, verify success</li>
                <li>Test form reset functionality</li>
              </ul>
              <h4>Locators:</h4>
              <code>[data-testid="validation-form"], [data-testid="form-submit"], [data-testid="form-errors"]</code>
            </div>
          </div>

          <!-- UI Scenario 2 -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">UI-02</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Drag and Drop Automation</h3>
            <p class="scenario-desc">Automate drag-and-drop interactions</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Locate draggable items and drop zones</li>
                <li>Drag item from source to target</li>
                <li>Verify item moved successfully</li>
                <li>Test drag outside valid zone (should revert)</li>
                <li>Verify success message after valid drop</li>
              </ul>
              <h4>Locators:</h4>
              <code>[data-testid="draggable"], [data-testid="droppable"]</code>
            </div>
          </div>

          <!-- UI Scenario 3 -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">UI-03</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>Shadow DOM Interaction</h3>
            <p class="scenario-desc">Access and interact with Shadow DOM elements</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Locate shadow host element</li>
                <li>Pierce shadow boundary to find button</li>
                <li>Click button inside shadow DOM</li>
                <li>Verify click was registered (counter increments)</li>
                <li>Extract text from shadow DOM element</li>
              </ul>
              <h4>Playwright:</h4>
              <code>page.locator('shadow-widget').locator('button')</code>
            </div>
          </div>

          <!-- UI Scenario 4 -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">UI-04</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>iFrame & Nested iFrame</h3>
            <p class="scenario-desc">Handle single and nested iFrames</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Switch to outer iframe context</li>
                <li>Interact with elements in outer iframe</li>
                <li>Switch to nested (inner) iframe</li>
                <li>Click button in nested iframe</li>
                <li>Switch back to main context and verify state</li>
              </ul>
              <h4>Playwright:</h4>
              <code>page.frameLocator('#outer').frameLocator('#inner')</code>
            </div>
          </div>

          <!-- UI Scenario 5 -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">UI-05</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Alerts, Confirms & Prompts</h3>
            <p class="scenario-desc">Handle JavaScript dialogs</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Trigger alert dialog, accept it, verify message</li>
                <li>Trigger confirm dialog, test Accept and Dismiss</li>
                <li>Trigger prompt dialog, enter text, verify result</li>
                <li>Handle unexpected alerts gracefully</li>
              </ul>
              <h4>Playwright:</h4>
              <code>page.on('dialog', dialog => dialog.accept('text'))</code>
            </div>
          </div>

          <!-- UI Scenario 6 -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">UI-06</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>Stale Element Handling</h3>
            <p class="scenario-desc">Deal with elements that become stale</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Click "Refresh Element" button to trigger DOM change</li>
                <li>Handle StaleElementReferenceException</li>
                <li>Re-locate element after DOM update</li>
                <li>Verify interaction with refreshed element</li>
                <li>Implement retry mechanism</li>
              </ul>
              <h4>Strategy:</h4>
              <code>Re-locate, retry pattern, explicit waits</code>
            </div>
          </div>

          <!-- UI Scenario 7 -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">UI-07</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Infinite Scroll Automation</h3>
            <p class="scenario-desc">Handle dynamically loading content</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Scroll to bottom of infinite scroll container</li>
                <li>Wait for new items to load</li>
                <li>Count total items after multiple scrolls</li>
                <li>Scroll until specific item is found</li>
                <li>Handle "no more items" state</li>
              </ul>
              <h4>Approach:</h4>
              <code>scrollIntoView, waitForLoadState, item counting</code>
            </div>
          </div>

          <!-- UI Scenario 8 -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">UI-08</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Keyboard Shortcuts & Context Menu</h3>
            <p class="scenario-desc">Test keyboard interactions and right-click menus</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Press keyboard shortcuts (Ctrl+S, Ctrl+N, etc.)</li>
                <li>Verify shortcut actions triggered</li>
                <li>Right-click to open context menu</li>
                <li>Select option from context menu</li>
                <li>Verify context menu action executed</li>
              </ul>
              <h4>Playwright:</h4>
              <code>page.keyboard.press('Control+s'), element.click({button: 'right'})</code>
            </div>
          </div>
        </div>
      </section>

      <!-- Mixed Scenarios -->
      <section class="scenarios-section mixed-scenarios">
        <h2>🔀 UI + API Mixed Scenarios (10)</h2>
        <p class="section-desc">Combine UI actions with API validation for comprehensive integration testing</p>
        
        <div class="scenario-cards">
          <!-- Mixed Scenario 1 -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">MIX-01</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Create User via UI, Verify via API</h3>
            <p class="scenario-desc">Test UI creates data correctly in backend</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Navigate to <a href="#/users" class="scenario-link">Users page</a></li>
                <li>Click "Create User" and fill form</li>
                <li>Submit and note the created user ID</li>
                <li>Call GET /v1/users/{id} to verify</li>
                <li>Assert all fields match what was entered</li>
              </ul>
              <h4>Locators:</h4>
              <code>[data-testid="create-user-btn"], [data-testid="email-input"], [data-testid="submit-user"]</code>
            </div>
          </div>

          <!-- Mixed Scenario 2 -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">MIX-02</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Dashboard Stats Verification</h3>
            <p class="scenario-desc">Verify dashboard displays correct API data</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Call API to get actual counts (users, bills, payments)</li>
                <li>Navigate to <a href="#/dashboard" class="scenario-link">Dashboard page</a></li>
                <li>Extract displayed numbers from UI</li>
                <li>Assert UI numbers match API data</li>
                <li>Test after adding new record - refresh shows updated count</li>
              </ul>
              <h4>Compare:</h4>
              <code>API: /v1/users?limit=1 (total) vs UI: stat-card text</code>
            </div>
          </div>

          <!-- Mixed Scenario 3 -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">MIX-03</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>User KYC Status Flow</h3>
            <p class="scenario-desc">Complete KYC through UI, verify API state changes</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>API: Create user with kyc_verified: false</li>
                <li>UI: Navigate to <a href="#/users" class="scenario-link">Users page</a></li>
                <li>UI: Click verify KYC button (opens modal)</li>
                <li>UI: Select new status and save</li>
                <li>API: GET user and verify kyc_verified: true</li>
                <li>UI: Verify badge changed from "Pending" to "Verified"</li>
              </ul>
              <h4>Locators:</h4>
              <code>[data-testid="verify-kyc-{id}"], [data-testid="kyc-new-status"], [data-testid="save-kyc-btn"]</code>
            </div>
          </div>

          <!-- Mixed Scenario 4 -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">MIX-04</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Filter & Pagination Sync</h3>
            <p class="scenario-desc">UI filters should match API query params</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>UI: Navigate to <a href="#/billers" class="scenario-link">Billers page</a>, select "Electricity" category filter</li>
                <li>Intercept network request, verify ?category=electricity</li>
                <li>API: Call same endpoint with same params</li>
                <li>Assert UI table rows match API response</li>
                <li>Test pagination - page buttons send correct page param</li>
              </ul>
              <h4>Intercept:</h4>
              <code>page.route('**/billers**', route => ...)</code>
            </div>
          </div>

          <!-- Mixed Scenario 5 -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">MIX-05</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>Payment Method CRUD Verification</h3>
            <p class="scenario-desc">Full CRUD through UI with API verification</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>UI: Navigate to <a href="#/payment-methods" class="scenario-link">Payment Methods page</a></li>
                <li>UI: Add new UPI payment method</li>
                <li>API: Verify payment method created</li>
                <li>UI: Edit the payment method (change nickname)</li>
                <li>API: Verify update persisted</li>
                <li>UI: Delete payment method</li>
                <li>API: Verify 404 on GET</li>
              </ul>
              <h4>Locators:</h4>
              <code>[data-testid="add-payment-method"], [data-testid="pm-type"], [data-testid="save-method"]</code>
            </div>
          </div>

          <!-- Mixed Scenario 6 -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">MIX-06</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Biller Search & Filter</h3>
            <p class="scenario-desc">Test search functionality end-to-end</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>API: Get list of all billers, pick a name</li>
                <li>UI: Navigate to <a href="#/billers" class="scenario-link">Billers page</a>, type partial name in search box</li>
                <li>UI: Wait for results to filter</li>
                <li>Assert matching billers are displayed</li>
                <li>Assert non-matching billers are hidden</li>
              </ul>
              <h4>Test Data:</h4>
              <code>Known biller names from API for reliable search</code>
            </div>
          </div>

          <!-- Mixed Scenario 7 -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">MIX-07</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>Auto-Pay Toggle Verification</h3>
            <p class="scenario-desc">Toggle auto-pay via UI, verify API state</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>API: Get bill with auto_pay: false</li>
                <li>UI: Navigate to <a href="#/bills" class="scenario-link">Bills page</a></li>
                <li>UI: Find bill, toggle auto-pay switch ON</li>
                <li>API: Verify bill.auto_pay is now true</li>
                <li>UI: Toggle OFF, API: Verify auto_pay: false</li>
              </ul>
              <h4>Wait Strategy:</h4>
              <code>Wait for PATCH request to complete before API check</code>
            </div>
          </div>

          <!-- Mixed Scenario 8 -->
          <div class="scenario-card" data-difficulty="medium">
            <div class="scenario-header">
              <span class="scenario-number">MIX-08</span>
              <span class="difficulty-badge medium">Medium</span>
            </div>
            <h3>Settings Page Auth Test</h3>
            <p class="scenario-desc">Update auth settings via UI, verify API config</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>Navigate to <a href="#/settings" class="scenario-link">Settings page</a></li>
                <li>Change auth method (API Key → OAuth)</li>
                <li>Save settings</li>
                <li>Make API call, verify correct auth is required</li>
                <li>Switch back, verify API key works again</li>
              </ul>
              <h4>Auth Types:</h4>
              <code>API Key, Basic Auth, Bearer Token, OAuth2</code>
            </div>
          </div>

          <!-- Mixed Scenario 9 -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">MIX-09</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>Complete Payment Journey</h3>
            <p class="scenario-desc">E2E payment from UI start to API verification</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>UI: Navigate to <a href="#/bills" class="scenario-link">Bills page</a>, find pending bill</li>
                <li>UI: Click "Pay" button to open payment modal</li>
                <li>UI: Select payment method from dropdown, confirm payment</li>
                <li>UI: Verify success message</li>
                <li>API: GET payment, verify status: "completed"</li>
                <li>API: GET bill, verify status: "paid"</li>
              </ul>
              <h4>Locators:</h4>
              <code>[data-testid="payment-modal"], [data-testid="pay-method-select"], [data-testid="confirm-payment"]</code>
            </div>
          </div>

          <!-- Mixed Scenario 10 -->
          <div class="scenario-card" data-difficulty="hard">
            <div class="scenario-header">
              <span class="scenario-number">MIX-10</span>
              <span class="difficulty-badge hard">Hard</span>
            </div>
            <h3>API Data Seeding for UI Tests</h3>
            <p class="scenario-desc">Setup test data via API, then test UI</p>
            <div class="scenario-details">
              <h4>Requirements:</h4>
              <ul>
                <li>API: Create specific user with known data</li>
                <li>API: Create bills for that user</li>
                <li>API: Create payment methods</li>
                <li>UI: Navigate and verify all seeded data displays</li>
                <li>Cleanup: API DELETE all created test data</li>
              </ul>
              <h4>Pattern:</h4>
              <code>beforeAll: API seed → test: UI verify → afterAll: API cleanup</code>
            </div>
          </div>
        </div>
      </section>

      <!-- Code Examples -->
      <section class="code-examples">
        <h2>💻 Code Examples</h2>
        <div class="code-tabs">
          <button class="code-tab active" data-lang="playwright">Playwright</button>
          <button class="code-tab" data-lang="cypress">Cypress</button>
          <button class="code-tab" data-lang="selenium">Selenium</button>
        </div>
        
        <div class="code-content" id="playwright-code">
          <pre><code>// Playwright Example - API + UI Test
import { test, expect } from '@playwright/test';

const API_URL = 'https://billpay-api.gauravkhurana-practice-api.workers.dev';
const API_KEY = 'pk_practice_1234567890';

test('Create user via UI, verify via API', async ({ page, request }) => {
  // Navigate to Users page
  await page.goto('http://localhost:5173/#/users');
  
  // Click Create User
  await page.click('[data-testid="create-user-btn"]');
  
  // Fill form
  const email = \`test-\${Date.now()}@example.com\`;
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="firstname-input"]', 'Test');
  await page.fill('[data-testid="lastname-input"]', 'User');
  await page.click('[data-testid="submit-user"]');
  
  // Wait for success and get user ID
  await page.waitForSelector('.toast');
  
  // Verify via API
  const response = await request.get(\`\${API_URL}/v1/users?email=\${email}\`, {
    headers: { 'X-API-Key': API_KEY }
  });
  
  const data = await response.json();
  expect(data.data[0].email).toBe(email);
});</code></pre>
        </div>
        
        <div class="code-content hidden" id="cypress-code">
          <pre><code>// Cypress Example - API + UI Test
const API_URL = 'https://billpay-api.gauravkhurana-practice-api.workers.dev';
const API_KEY = 'pk_practice_1234567890';

describe('User Creation Flow', () => {
  it('creates user via UI and verifies via API', () => {
    const email = \`test-\${Date.now()}@example.com\`;
    
    // UI: Navigate and create user
    cy.visit('http://localhost:5173/#/users');
    cy.get('[data-testid="create-user-btn"]').click();
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="firstname-input"]').type('Test');
    cy.get('[data-testid="lastname-input"]').type('User');
    cy.get('[data-testid="submit-user"]').click();
    
    // Wait for success
    cy.get('.toast').should('be.visible');
    
    // API: Verify user created
    cy.request({
      method: 'GET',
      url: \`\${API_URL}/v1/users?email=\${email}\`,
      headers: { 'X-API-Key': API_KEY }
    }).then((response) => {
      expect(response.body.data[0].email).to.eq(email);
    });
  });
});</code></pre>
        </div>
        
        <div class="code-content hidden" id="selenium-code">
          <pre><code># Selenium + Requests Example (Python)
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import requests
import time

API_URL = 'https://billpay-api.gauravkhurana-practice-api.workers.dev'
API_KEY = 'pk_practice_1234567890'

def test_create_user_verify_api():
    driver = webdriver.Chrome()
    email = f"test-{int(time.time())}@example.com"
    
    try:
        # UI: Navigate and create user
        driver.get('http://localhost:5173/#/users')
        
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="create-user-btn"]'))
        ).click()
        
        driver.find_element(By.CSS_SELECTOR, '[data-testid="email-input"]').send_keys(email)
        driver.find_element(By.CSS_SELECTOR, '[data-testid="firstname-input"]').send_keys('Test')
        driver.find_element(By.CSS_SELECTOR, '[data-testid="lastname-input"]').send_keys('User')
        driver.find_element(By.CSS_SELECTOR, '[data-testid="submit-user"]').click()
        
        # Wait for success
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, '.toast'))
        )
        
        # API: Verify user created
        response = requests.get(
            f'{API_URL}/v1/users?email={email}',
            headers={'X-API-Key': API_KEY}
        )
        assert response.json()['data'][0]['email'] == email
        
    finally:
        driver.quit()</code></pre>
        </div>
      </section>

      <!-- Navigation Cards -->
      <section class="nav-cards">
        <h2>🎬 Start Practicing</h2>
        <div class="nav-grid">
          <a href="#/practice" class="nav-card">
            <span class="nav-icon">🧪</span>
            <h3>UI Practice</h3>
            <p>Interactive elements for automation</p>
          </a>
          <a href="#/users" class="nav-card">
            <span class="nav-icon">👥</span>
            <h3>Users</h3>
            <p>CRUD operations with validation</p>
          </a>
          <a href="#/bills" class="nav-card">
            <span class="nav-icon">📄</span>
            <h3>Bills</h3>
            <p>Search, filter, and manage bills</p>
          </a>
          <a href="#/payments" class="nav-card">
            <span class="nav-icon">💳</span>
            <h3>Payments</h3>
            <p>Payment processing flows</p>
          </a>
          <a href="#/settings" class="nav-card">
            <span class="nav-icon">⚙️</span>
            <h3>Settings</h3>
            <p>Auth configuration testing</p>
          </a>
          <a href="openapi.yaml" target="_blank" class="nav-card">
            <span class="nav-icon">📖</span>
            <h3>API Docs</h3>
            <p>OpenAPI specification</p>
          </a>
        </div>
      </section>
    </div>
  `;

  // Initialize code tab switching
  initCodeTabs();
}

function initCodeTabs() {
  const tabs = document.querySelectorAll('.code-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Hide all code contents
      document.querySelectorAll('.code-content').forEach(c => c.classList.add('hidden'));
      
      // Show selected
      const lang = tab.dataset.lang;
      document.getElementById(`${lang}-code`).classList.remove('hidden');
    });
  });
}
