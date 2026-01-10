export function renderPractice(outlet, { toast }) {
  outlet.innerHTML = `
    <h1 class="card__title">Practice Components</h1>
    <p class="muted">Comprehensive UI patterns for Selenium/Playwright/Cypress automation practice.</p>

    <!-- ===== FORM VALIDATION ===== -->
    <section class="practice-section">
      <h2 class="section-title">Form Validation</h2>
      
      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Registration Form</h3>
        <p class="muted" style="margin-bottom:12px;">Practice form validation testing - submit with invalid data to see error messages.</p>
        
        <form id="validationForm" data-testid="validation-form" novalidate>
          <div id="formErrors" data-testid="form-errors" class="form-errors" style="display:none;"></div>
          
          <label class="field">
            <span class="field__label">Email *</span>
            <input class="input" id="formEmail" data-testid="form-email" type="email" placeholder="your@email.com" />
            <span class="field-error" id="emailError" data-testid="email-error"></span>
          </label>
          
          <label class="field">
            <span class="field__label">Password * (min 6 characters)</span>
            <input class="input" id="formPassword" data-testid="form-password" type="password" placeholder="Enter password" />
            <span class="field-error" id="passwordError" data-testid="password-error"></span>
          </label>
          
          <label class="field">
            <span class="field__label">Confirm Password *</span>
            <input class="input" id="formConfirmPassword" data-testid="form-confirm-password" type="password" placeholder="Confirm password" />
            <span class="field-error" id="confirmPasswordError" data-testid="confirm-password-error"></span>
          </label>
          
          <label class="field">
            <span class="field__label">Phone (optional, 10 digits)</span>
            <input class="input" id="formPhone" data-testid="form-phone" type="tel" placeholder="9876543210" maxlength="10" />
            <span class="field-error" id="phoneError" data-testid="phone-error"></span>
          </label>
          
          <label class="checkbox-label" style="margin:12px 0;">
            <input type="checkbox" id="formTerms" data-testid="form-terms" />
            <span>I agree to Terms & Conditions *</span>
          </label>
          <span class="field-error" id="termsError" data-testid="terms-error"></span>
          
          <div class="row" style="gap:8px; margin-top:16px;">
            <button type="submit" class="btn" id="formSubmit" data-testid="form-submit">Register</button>
            <button type="reset" class="btn btn--secondary" id="formReset" data-testid="form-reset">Reset Form</button>
          </div>
          
          <div id="formSuccess" data-testid="form-success" class="form-success" style="display:none;">
            ✅ Registration successful! Form data validated.
          </div>
        </form>
      </div>
    </section>

    <!-- ===== BASIC ELEMENTS ===== -->
    <section class="practice-section">
      <h2 class="section-title">Basic Elements</h2>
      
      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Text Inputs</h3>
        <div class="row" style="gap:12px; flex-wrap:wrap;">
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">First Name</span>
            <input class="input" id="firstName" data-testid="first-name" placeholder="Enter first name" />
          </label>
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Email</span>
            <input class="input" id="email" type="email" data-testid="email" placeholder="your@email.com" />
          </label>
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Password</span>
            <input class="input" id="password" type="password" data-testid="password" placeholder="Enter password" />
          </label>
        </div>
        <label class="field">
          <span class="field__label">Bio (Multi-line)</span>
          <textarea class="input" id="bio" data-testid="bio" rows="3" placeholder="Tell us about yourself..."></textarea>
        </label>
        <div class="muted" id="passwordStrength">Password strength: —</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Dropdowns</h3>
        <div class="row" style="gap:12px; flex-wrap:wrap;">
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Country</span>
            <select class="input" id="country" data-testid="country">
              <option value="">Select a country</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="in">India</option>
              <option value="ca">Canada</option>
              <option value="au">Australia</option>
            </select>
          </label>
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Framework (Multi-select)</span>
            <select class="input" id="frameworks" data-testid="frameworks" multiple style="height:80px;">
              <option value="selenium">Selenium</option>
              <option value="playwright">Playwright</option>
              <option value="cypress">Cypress</option>
              <option value="testcafe">TestCafe</option>
            </select>
          </label>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Radio Buttons & Checkboxes</h3>
        <div class="row" style="gap:24px; flex-wrap:wrap;">
          <fieldset style="border:none; padding:0; margin:0;">
            <legend class="field__label" style="margin-bottom:8px;">Gender</legend>
            <label class="radio-label"><input type="radio" name="gender" value="male" data-testid="gender-male" /> Male</label>
            <label class="radio-label"><input type="radio" name="gender" value="female" data-testid="gender-female" /> Female</label>
            <label class="radio-label"><input type="radio" name="gender" value="other" data-testid="gender-other" /> Other</label>
          </fieldset>
          <fieldset style="border:none; padding:0; margin:0;">
            <legend class="field__label" style="margin-bottom:8px;">Preferences</legend>
            <label class="checkbox-label"><input type="checkbox" id="newsletter" data-testid="newsletter" /> Subscribe to newsletter</label>
            <label class="checkbox-label"><input type="checkbox" id="terms" data-testid="terms" /> I agree to Terms</label>
            <label class="checkbox-label"><input type="checkbox" id="notifications" data-testid="notifications" /> Enable notifications</label>
          </fieldset>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Buttons (Various States)</h3>
        <div class="row" style="gap:8px; flex-wrap:wrap;">
          <button class="btn" id="btnPrimary" data-testid="btn-primary">Primary</button>
          <button class="btn btn--secondary" id="btnSecondary" data-testid="btn-secondary">Secondary</button>
          <button class="btn btn--danger" id="btnDanger" data-testid="btn-danger">Danger</button>
          <button class="btn" id="btnDisabled" disabled data-testid="btn-disabled">Disabled</button>
          <button class="btn btn--secondary" id="btnToggleDisable" data-testid="btn-toggle-disable">Toggle Disable</button>
          <button class="btn" id="btnLoading" data-testid="btn-loading">Click to Load</button>
        </div>
        <div class="muted" id="btnOutput" style="margin-top:8px;">Button output: —</div>
      </div>
    </section>

    <!-- ===== INTERMEDIATE ELEMENTS ===== -->
    <section class="practice-section">
      <h2 class="section-title">Intermediate Elements</h2>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Sliders & Range</h3>
        <div class="row" style="gap:24px; flex-wrap:wrap;">
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Volume: <span id="volumeVal">50</span>%</span>
            <input type="range" id="volume" min="0" max="100" value="50" data-testid="volume-slider" style="width:100%;" />
          </label>
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Price Range: $<span id="priceVal">500</span></span>
            <input type="range" id="price" min="0" max="1000" value="500" data-testid="price-slider" style="width:100%;" />
          </label>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Date & Time Pickers</h3>
        <div class="row" style="gap:12px; flex-wrap:wrap;">
          <label class="field" style="flex:1; min-width:150px;">
            <span class="field__label">Date</span>
            <input class="input" type="date" id="dateInput" data-testid="date-input" />
          </label>
          <label class="field" style="flex:1; min-width:150px;">
            <span class="field__label">Time</span>
            <input class="input" type="time" id="timeInput" data-testid="time-input" />
          </label>
          <label class="field" style="flex:1; min-width:180px;">
            <span class="field__label">DateTime</span>
            <input class="input" type="datetime-local" id="datetimeInput" data-testid="datetime-input" />
          </label>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">File Upload</h3>
        <div class="row" style="gap:12px; flex-wrap:wrap;">
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Single File</span>
            <input class="input" type="file" id="singleFile" data-testid="single-file" />
          </label>
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Multiple Files</span>
            <input class="input" type="file" id="multiFile" data-testid="multi-file" multiple />
          </label>
        </div>
        <div class="muted" id="fileOutput">Selected files: —</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Auto-Complete / Suggestions</h3>
        <label class="field">
          <span class="field__label">Search Framework</span>
          <input class="input" id="autocomplete" data-testid="autocomplete" placeholder="Type to search..." list="frameworkList" />
          <datalist id="frameworkList">
            <option value="Selenium WebDriver">
            <option value="Playwright">
            <option value="Cypress">
            <option value="TestCafe">
            <option value="Puppeteer">
            <option value="WebdriverIO">
          </datalist>
        </label>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Progress Bars</h3>
        <div class="field">
          <span class="field__label">Static Progress: 75%</span>
          <progress value="75" max="100" style="width:100%; height:20px;"></progress>
        </div>
        <div class="field">
          <span class="field__label">Dynamic Progress: <span id="dynProgressVal">0</span>%</span>
          <progress id="dynProgress" value="0" max="100" style="width:100%; height:20px;"></progress>
        </div>
        <button class="btn btn--secondary" id="startProgress" data-testid="start-progress">Start Progress</button>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Hover Effects</h3>
        <div class="row" style="gap:12px;">
          <div class="hover-box" id="hoverBox1" data-testid="hover-box-1">Hover me 1</div>
          <div class="hover-box" id="hoverBox2" data-testid="hover-box-2">Hover me 2</div>
          <div class="hover-box" id="hoverBox3" data-testid="hover-box-3">Hover me 3</div>
        </div>
        <div class="muted" id="hoverOutput" style="margin-top:8px;">Hovered: —</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Drag & Drop</h3>
        <div class="row" style="gap:16px;">
          <div class="drag-container" id="dragSource" data-testid="drag-source">
            <div class="drag-item" draggable="true" data-item="1">Item 1</div>
            <div class="drag-item" draggable="true" data-item="2">Item 2</div>
            <div class="drag-item" draggable="true" data-item="3">Item 3</div>
          </div>
          <div class="drag-container drop-zone" id="dropTarget" data-testid="drop-target">
            <span class="muted">Drop items here</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== ADVANCED ELEMENTS ===== -->
    <section class="practice-section">
      <h2 class="section-title">Advanced Elements</h2>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Alert / Confirm / Prompt</h3>
        <div class="row" style="gap:8px; flex-wrap:wrap;">
          <button class="btn btn--secondary" id="showAlert" data-testid="show-alert">Show Alert</button>
          <button class="btn btn--secondary" id="showConfirm" data-testid="show-confirm">Show Confirm</button>
          <button class="btn btn--secondary" id="showPrompt" data-testid="show-prompt">Show Prompt</button>
        </div>
        <div class="muted" id="dialogResult" style="margin-top:8px;">Dialog result: —</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">New Window / Tab</h3>
        <div class="row" style="gap:8px; flex-wrap:wrap;">
          <button class="btn btn--secondary" id="openWindow" data-testid="open-window">Open New Window</button>
          <button class="btn btn--secondary" id="openTab" data-testid="open-tab">Open New Tab</button>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Shadow DOM</h3>
        <div id="shadowHost" class="input" style="padding:12px;"></div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">iFrame</h3>
        <iframe title="Card input iframe" id="cardIframe" style="width:100%; height:160px; border:1px solid var(--border); border-radius:12px;"></iframe>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Nested iFrame</h3>
        <iframe title="Nested iframe outer" id="nestedIframe" style="width:100%; height:180px; border:1px solid var(--border); border-radius:12px;"></iframe>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Dynamic ID Element</h3>
        <div class="row" style="gap:12px; align-items:center;">
          <input class="input" id="dynamicIdInput" data-testid="dynamic-id-input" placeholder="This ID changes on refresh" style="flex:1;" />
          <button class="btn btn--secondary" id="regenerateId" data-testid="regenerate-id">Regenerate ID</button>
        </div>
        <div class="muted" id="currentDynamicId">Current ID: —</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Infinite Scroll</h3>
        <div id="infiniteList" class="input" style="padding:12px; height:200px; overflow:auto;"></div>
        <div class="muted" id="scrollCount">Loaded items: 0</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Keyboard Shortcuts</h3>
        <p class="muted">Press <strong>Ctrl+K</strong> to toggle tooltip, <strong>Ctrl+S</strong> to fake save.</p>
        <div id="kbdTooltip" class="input" style="padding:12px; display:none; background:var(--success-light); border-color:var(--success);">Tooltip visible (Ctrl+K)</div>
        <div class="muted" id="kbdOutput">Keyboard output: —</div>
      </div>

      <div class="card" style="margin-top:16px; position:relative;">
        <h3 class="card__title" style="font-size:15px;">Context Menu (Right-Click)</h3>
        <div id="contextTarget" class="input" style="padding:12px;">Right-click inside this box</div>
        <div id="contextMenu" style="display:none; position:absolute; background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:8px; min-width:180px; z-index:100;">
          <button class="btn btn--secondary" type="button" id="ctxCopy" style="width:100%; justify-content:flex-start;">📋 Copy text</button>
          <button class="btn btn--secondary" type="button" id="ctxEdit" style="width:100%; justify-content:flex-start; margin-top:4px;">✏️ Edit</button>
          <button class="btn btn--danger" type="button" id="ctxDelete" style="width:100%; justify-content:flex-start; margin-top:4px;">🗑️ Delete</button>
        </div>
      </div>
    </section>

    <!-- ===== EDGE CASES / BUGGY ===== -->
    <section class="practice-section">
      <h2 class="section-title">Edge Cases & Buggy Elements</h2>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Delayed Loading</h3>
        <button class="btn btn--secondary" id="loadDelayed" data-testid="load-delayed">Load Element (3s delay)</button>
        <div id="delayedContent" style="margin-top:12px;"></div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Stale Element</h3>
        <div id="staleContainer">
          <input class="input" id="staleInput" data-testid="stale-input" placeholder="Type and submit" style="max-width:300px;" />
        </div>
        <button class="btn btn--secondary" id="causeStale" data-testid="cause-stale" style="margin-top:8px;">Submit (Causes DOM Detach)</button>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Race Condition</h3>
        <button class="btn" id="raceButton" data-testid="race-button">Click me!</button>
        <div class="muted" style="margin-top:8px;">Button text changes rapidly — use proper waits!</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Hidden Elements</h3>
        <div class="row" style="gap:12px; flex-wrap:wrap;">
          <div>
            <div class="field__label">display:none</div>
            <div id="hiddenDisplay" style="display:none;" data-testid="hidden-display">Hidden by display:none</div>
            <div class="muted">Element above is hidden</div>
          </div>
          <div>
            <div class="field__label">visibility:hidden</div>
            <div id="hiddenVisibility" style="visibility:hidden;" data-testid="hidden-visibility">Hidden by visibility</div>
            <div class="muted">Element above is invisible</div>
          </div>
          <div>
            <div class="field__label">opacity:0</div>
            <div id="hiddenOpacity" style="opacity:0;" data-testid="hidden-opacity">Hidden by opacity:0</div>
            <div class="muted">Element above is transparent</div>
          </div>
        </div>
        <button class="btn btn--secondary" id="toggleHidden" style="margin-top:12px;">Toggle Hidden Elements</button>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Overlapping Element</h3>
        <div style="position:relative; height:60px;">
          <button class="btn" id="overlappedBtn" data-testid="overlapped-btn" style="position:absolute; z-index:1;">Try to click me</button>
          <div id="overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.3); z-index:10; display:none; border-radius:8px;"></div>
        </div>
        <button class="btn btn--secondary" id="toggleOverlay" style="margin-top:12px;">Toggle Overlay</button>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Double-Click Required</h3>
        <button class="btn btn--secondary" id="doubleClickBtn" data-testid="double-click-btn">Double-click me (Count: 0)</button>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Duplicate IDs (Anti-Pattern)</h3>
        <div class="row" style="gap:12px;">
          <input class="input" id="duplicateId" data-testid="duplicate-1" placeholder="First with duplicate ID" />
          <input class="input" id="duplicateId" data-testid="duplicate-2" placeholder="Second with duplicate ID" />
        </div>
        <div class="muted" style="margin-top:8px;">⚠️ Use data-testid instead of ID for these elements</div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Element Outside Viewport</h3>
        <div style="overflow:hidden; height:100px; border:1px solid var(--border); border-radius:8px; padding:12px;">
          <div style="height:200px;">
            <p>Scroll down to find the button...</p>
            <div style="height:120px;"></div>
            <button class="btn" id="offscreenBtn" data-testid="offscreen-btn">Hidden Button at Bottom</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">Whitespace Text</h3>
        <p id="whitespaceText" data-testid="whitespace-text">   This   text   has   extra   whitespace   </p>
        <div class="muted">Use trim() and normalize whitespace when comparing</div>
      </div>
    </section>

    <!-- ===== API PRACTICE - FILE UPLOAD & XML ===== -->
    <section class="practice-section">
      <h2 class="section-title">API Practice (File Upload, XML, Cookies)</h2>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">📁 File Upload (multipart/form-data)</h3>
        <p class="muted" style="margin-bottom:12px;">Practice file uploads with the <code>/v1/files/upload</code> endpoint.</p>
        
        <div class="row" style="gap:16px; flex-wrap:wrap; align-items:flex-start;">
          <div style="flex:1; min-width:280px;">
            <label class="field">
              <span class="field__label">Single File</span>
              <input type="file" id="singleFileInput" data-testid="single-file-input" class="input" style="padding:8px;" />
            </label>
            <label class="field" style="margin-top:8px;">
              <span class="field__label">Description (optional)</span>
              <input type="text" id="fileDescription" data-testid="file-description" class="input" placeholder="Enter file description" />
            </label>
            <button class="btn" id="uploadSingleBtn" data-testid="upload-single-btn" style="margin-top:8px; width:100%;">📤 Upload Single File</button>
          </div>
          
          <div style="flex:1; min-width:280px;">
            <label class="field">
              <span class="field__label">Multiple Files</span>
              <input type="file" id="multiFileInput" data-testid="multi-file-input" class="input" style="padding:8px;" multiple />
            </label>
            <button class="btn btn--secondary" id="uploadMultiBtn" data-testid="upload-multi-btn" style="margin-top:8px; width:100%;">📤 Upload Multiple Files</button>
          </div>
        </div>

        <div id="uploadProgress" style="margin-top:12px; display:none;">
          <div style="background:var(--border); border-radius:4px; height:8px; overflow:hidden;">
            <div id="progressBar" style="background:var(--primary); height:100%; width:0%; transition:width 0.3s;"></div>
          </div>
          <div class="muted" id="progressText" style="margin-top:4px;">Uploading...</div>
        </div>

        <div id="uploadResult" style="margin-top:12px;"></div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">📋 Uploaded Files List</h3>
        <button class="btn btn--secondary" id="refreshFilesBtn" data-testid="refresh-files-btn">🔄 Refresh File List</button>
        <div id="filesList" style="margin-top:12px;"></div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">📄 XML Response Format</h3>
        <p class="muted" style="margin-bottom:12px;">Test XML responses by setting <code>Accept: application/xml</code> header.</p>
        
        <div class="row" style="gap:12px; flex-wrap:wrap;">
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Test Endpoint</span>
            <select class="input" id="xmlEndpoint" data-testid="xml-endpoint">
              <option value="/v1/health">/v1/health</option>
              <option value="/v1/billers">/v1/billers</option>
              <option value="/v1/users">/v1/users</option>
              <option value="/v1/files">/v1/files</option>
            </select>
          </label>
          <label class="field" style="flex:1; min-width:200px;">
            <span class="field__label">Response Format</span>
            <select class="input" id="xmlFormat" data-testid="xml-format">
              <option value="json">JSON (application/json)</option>
              <option value="xml">XML (application/xml)</option>
            </select>
          </label>
        </div>
        <button class="btn" id="testXmlBtn" data-testid="test-xml-btn" style="margin-top:12px;">🧪 Test Request</button>
        <div id="xmlResult" style="margin-top:12px;"></div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card__title" style="font-size:15px;">🍪 Cookie Authentication</h3>
        <p class="muted" style="margin-bottom:12px;">Test cookie-based authentication with <code>X-Session-Id</code> header.</p>
        
        <label class="field">
          <span class="field__label">Session Cookie Value</span>
          <input type="text" id="cookieSessionInput" data-testid="cookie-session-input" class="input" placeholder="demo-session-abc123" value="demo-session-abc123" />
        </label>
        <div class="row" style="gap:8px; margin-top:8px;">
          <button class="btn" id="testCookieBtn" data-testid="test-cookie-btn">🔐 Test Cookie Auth</button>
          <button class="btn btn--secondary" id="testNoCookieBtn" data-testid="test-no-cookie-btn">❌ Test Without Cookie</button>
        </div>
        <div id="cookieResult" style="margin-top:12px;"></div>
      </div>
    </section>

    <style>
      .practice-section { margin-top: var(--space-4); }
      .section-title { font-size: 18px; font-weight: 700; color: var(--primary); border-bottom: 2px solid var(--primary-light); padding-bottom: 8px; margin-bottom: 0; }
      .radio-label, .checkbox-label { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; cursor: pointer; }
      .hover-box { padding: 16px 24px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
      .hover-box:hover { background: var(--primary-light); border-color: var(--primary); transform: translateY(-2px); }
      .drag-container { min-height: 120px; padding: 12px; border: 2px dashed var(--border); border-radius: 8px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
      .drag-item { padding: 10px 14px; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; cursor: grab; }
      .drag-item:active { cursor: grabbing; }
      .drop-zone.drag-over { border-color: var(--primary); background: var(--primary-light); }
      .file-item { display: flex; align-items: center; gap: 12px; padding: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 8px; }
      .file-item__name { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .file-item__size { color: var(--muted); font-size: 12px; }
      .response-box { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; max-height: 300px; overflow: auto; white-space: pre-wrap; word-break: break-all; }
      .response-box--success { border-color: var(--success); background: rgba(16, 185, 129, 0.05); }
      .response-box--error { border-color: var(--danger); background: rgba(239, 68, 68, 0.05); }
      .form-errors { background: var(--danger-light); color: var(--danger); padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid var(--danger); }
      .form-errors ul { margin: 0; padding-left: 20px; }
      .form-success { background: var(--success-light); color: var(--success); padding: 12px; border-radius: 8px; margin-top: 16px; border: 1px solid var(--success); font-weight: 600; }
      .field-error { color: var(--danger); font-size: 12px; margin-top: 4px; display: block; }
      .input.input--error { border-color: var(--danger); }
    </style>
  `;

  // ===== FORM VALIDATION LOGIC =====
  const validationForm = outlet.querySelector('#validationForm');
  const formErrors = outlet.querySelector('#formErrors');
  const formSuccess = outlet.querySelector('#formSuccess');
  const formEmail = outlet.querySelector('#formEmail');
  const formPassword = outlet.querySelector('#formPassword');
  const formConfirmPassword = outlet.querySelector('#formConfirmPassword');
  const formPhone = outlet.querySelector('#formPhone');
  const formTerms = outlet.querySelector('#formTerms');

  function clearErrors() {
    formErrors.style.display = 'none';
    formErrors.innerHTML = '';
    formSuccess.style.display = 'none';
    for (const el of outlet.querySelectorAll('.field-error')) {
      el.textContent = '';
    }
    for (const el of outlet.querySelectorAll('.input--error')) {
      el.classList.remove('input--error');
    }
  }

  function showFieldError(inputId, errorId, message) {
    const input = outlet.querySelector(`#${inputId}`);
    const error = outlet.querySelector(`#${errorId}`);
    if (input) input.classList.add('input--error');
    if (error) error.textContent = message;
  }

  validationForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const errors = [];
    const email = formEmail?.value.trim() || '';
    const password = formPassword?.value || '';
    const confirmPassword = formConfirmPassword?.value || '';
    const phone = formPhone?.value.trim() || '';
    const termsAccepted = formTerms?.checked || false;

    // Email validation
    if (!email) {
      errors.push('Email is required');
      showFieldError('formEmail', 'emailError', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
      showFieldError('formEmail', 'emailError', 'Please enter a valid email address');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
      showFieldError('formPassword', 'passwordError', 'Password is required');
    } else if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
      showFieldError('formPassword', 'passwordError', 'Password must be at least 6 characters');
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.push('Please confirm your password');
      showFieldError('formConfirmPassword', 'confirmPasswordError', 'Please confirm your password');
    } else if (password !== confirmPassword) {
      errors.push('Passwords do not match');
      showFieldError('formConfirmPassword', 'confirmPasswordError', 'Passwords do not match');
    }

    // Phone validation (optional but if provided, must be valid)
    if (phone && !/^\d{10}$/.test(phone)) {
      errors.push('Phone must be 10 digits');
      showFieldError('formPhone', 'phoneError', 'Phone must be exactly 10 digits');
    }

    // Terms validation
    if (!termsAccepted) {
      errors.push('You must accept Terms & Conditions');
      showFieldError('formTerms', 'termsError', 'You must accept Terms & Conditions');
    }

    if (errors.length > 0) {
      formErrors.innerHTML = `<strong>Please fix the following errors:</strong><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>`;
      formErrors.style.display = 'block';
      toast?.('Validation Failed', `${errors.length} error(s) found`);
    } else {
      formSuccess.style.display = 'block';
      toast?.('Success', 'Form validated successfully!');
    }
  });

  validationForm?.addEventListener('reset', () => {
    clearErrors();
    toast?.('Form Reset', 'All fields cleared');
  });

  // ===== BASIC ELEMENTS LOGIC =====
  
  // Password strength
  const passwordInput = outlet.querySelector('#password');
  const passwordStrength = outlet.querySelector('#passwordStrength');
  passwordInput?.addEventListener('input', () => {
    const len = passwordInput.value.length;
    if (len === 0) passwordStrength.textContent = 'Password strength: —';
    else if (len < 4) passwordStrength.innerHTML = 'Password strength: <span style="color:var(--danger);">🔴 Weak</span>';
    else if (len < 8) passwordStrength.innerHTML = 'Password strength: <span style="color:var(--warning);">🟡 Medium</span>';
    else passwordStrength.innerHTML = 'Password strength: <span style="color:var(--success);">🟢 Strong</span>';
  });

  // Buttons
  const btnOutput = outlet.querySelector('#btnOutput');
  const btnDisabled = outlet.querySelector('#btnDisabled');
  const btnLoading = outlet.querySelector('#btnLoading');

  for (const btn of ['btnPrimary', 'btnSecondary', 'btnDanger']) {
    outlet.querySelector(`#${btn}`)?.addEventListener('click', () => {
      btnOutput.textContent = `Button output: ${btn} clicked at ${new Date().toLocaleTimeString()}`;
      toast?.(`${btn}`, 'Button clicked');
    });
  }

  outlet.querySelector('#btnToggleDisable')?.addEventListener('click', () => {
    btnDisabled.disabled = !btnDisabled.disabled;
    btnOutput.textContent = `Button output: Disabled button is now ${btnDisabled.disabled ? 'disabled' : 'enabled'}`;
  });

  btnLoading?.addEventListener('click', () => {
    btnLoading.disabled = true;
    btnLoading.textContent = 'Loading...';
    setTimeout(() => {
      btnLoading.disabled = false;
      btnLoading.textContent = 'Click to Load';
      btnOutput.textContent = 'Button output: Loading complete!';
      toast?.('Loading', 'Operation complete');
    }, 2000);
  });

  // ===== INTERMEDIATE ELEMENTS LOGIC =====

  // Sliders
  const volumeSlider = outlet.querySelector('#volume');
  const volumeVal = outlet.querySelector('#volumeVal');
  volumeSlider?.addEventListener('input', () => { volumeVal.textContent = volumeSlider.value; });

  const priceSlider = outlet.querySelector('#price');
  const priceVal = outlet.querySelector('#priceVal');
  priceSlider?.addEventListener('input', () => { priceVal.textContent = priceSlider.value; });

  // File upload
  const fileOutput = outlet.querySelector('#fileOutput');
  for (const id of ['singleFile', 'multiFile']) {
    outlet.querySelector(`#${id}`)?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []).map(f => f.name).join(', ');
      fileOutput.textContent = `Selected files: ${files || '—'}`;
    });
  }

  // Progress bar
  const dynProgress = outlet.querySelector('#dynProgress');
  const dynProgressVal = outlet.querySelector('#dynProgressVal');
  outlet.querySelector('#startProgress')?.addEventListener('click', () => {
    let val = 0;
    dynProgress.value = 0;
    const interval = setInterval(() => {
      val += Math.random() * 15;
      if (val >= 100) {
        val = 100;
        clearInterval(interval);
        toast?.('Progress', 'Complete!');
      }
      dynProgress.value = val;
      dynProgressVal.textContent = Math.round(val);
    }, 300);
  });

  // Hover effects
  const hoverOutput = outlet.querySelector('#hoverOutput');
  for (let i = 1; i <= 3; i++) {
    const box = outlet.querySelector(`#hoverBox${i}`);
    box?.addEventListener('mouseenter', () => { hoverOutput.textContent = `Hovered: Box ${i}`; });
    box?.addEventListener('mouseleave', () => { hoverOutput.textContent = 'Hovered: —'; });
  }

  // Drag & drop
  const dragSource = outlet.querySelector('#dragSource');
  const dropTarget = outlet.querySelector('#dropTarget');
  let draggedItem = null;

  dragSource?.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('drag-item')) {
      draggedItem = e.target;
      e.target.style.opacity = '0.5';
    }
  });

  dragSource?.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('drag-item')) {
      e.target.style.opacity = '1';
    }
  });

  dropTarget?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropTarget.classList.add('drag-over');
  });

  dropTarget?.addEventListener('dragleave', () => {
    dropTarget.classList.remove('drag-over');
  });

  dropTarget?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropTarget.classList.remove('drag-over');
    if (draggedItem) {
      // Remove placeholder text
      const placeholder = dropTarget.querySelector('.muted');
      if (placeholder) placeholder.remove();
      dropTarget.appendChild(draggedItem);
      toast?.('Drag & Drop', `Dropped ${draggedItem.textContent}`);
      draggedItem = null;
    }
  });

  // ===== ADVANCED ELEMENTS LOGIC =====

  // Alert/Confirm/Prompt
  const dialogResult = outlet.querySelector('#dialogResult');
  outlet.querySelector('#showAlert')?.addEventListener('click', () => {
    alert('This is an alert message!');
    dialogResult.textContent = 'Dialog result: Alert dismissed';
  });

  outlet.querySelector('#showConfirm')?.addEventListener('click', () => {
    const result = confirm('Do you want to proceed?');
    dialogResult.textContent = `Dialog result: Confirm ${result ? 'accepted' : 'cancelled'}`;
  });

  outlet.querySelector('#showPrompt')?.addEventListener('click', () => {
    const result = prompt('Enter your name:', 'Test User');
    dialogResult.textContent = `Dialog result: Prompt value = "${result}"`;
  });

  // New window/tab
  outlet.querySelector('#openWindow')?.addEventListener('click', () => {
    window.open('https://example.com', '_blank', 'width=600,height=400');
  });

  outlet.querySelector('#openTab')?.addEventListener('click', () => {
    window.open('https://example.com', '_blank');
  });

  // Shadow DOM
  const host = outlet.querySelector('#shadowHost');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .wrap { font-family: system-ui; }
      .label { color: #64748b; font-size: 12px; }
      input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #e2e8f0; margin-top: 6px; }
      button { margin-top: 8px; padding: 10px 12px; border-radius: 10px; border: 1px solid #e2e8f0; background: #2563eb; color: white; font-weight: 600; cursor: pointer; }
    </style>
    <div class="wrap">
      <div class="label">Inside shadow root</div>
      <input id="shadowInput" value="shadow-value" data-testid="shadow-input" />
      <button id="shadowBtn" type="button" data-testid="shadow-btn">Shadow Button</button>
      <div id="shadowOut" class="label" style="margin-top:8px;"></div>
    </div>
  `;
  shadow.getElementById('shadowBtn').addEventListener('click', () => {
    const v = shadow.getElementById('shadowInput').value;
    shadow.getElementById('shadowOut').textContent = `Clicked. Value=${v}`;
    toast?.('Shadow click', 'Shadow button clicked');
  });

  // iFrame
  const iframe = outlet.querySelector('#cardIframe');
  iframe.srcdoc = `
    <!doctype html>
    <html><head><meta charset="utf-8" />
      <style>
        body { font-family: system-ui; margin: 12px; }
        label { display:block; color:#475569; font-size:12px; margin-bottom:6px; }
        input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #e2e8f0; box-sizing: border-box; }
      </style>
    </head>
    <body>
      <label for="card">Card number (iframe)</label>
      <input id="card" data-testid="iframe-card" value="4111 1111 1111 1111" />
      <label for="name" style="margin-top:10px;">Name</label>
      <input id="name" data-testid="iframe-name" value="Demo User" />
    </body></html>
  `;

  // Nested iFrame
  const nestedIframe = outlet.querySelector('#nestedIframe');
  nestedIframe.srcdoc = `
    <!doctype html>
    <html><head><meta charset="utf-8" />
      <style>
        body { font-family: system-ui; margin: 12px; background: #f8fafc; }
        .container { padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <p>Outer iframe content</p>
        <iframe title="Nested iframe inner" style="width:100%; height:80px; border:1px dashed #e2e8f0; border-radius:6px;"
          srcdoc="<!doctype html><html><body style='font-family:system-ui;margin:12px;'><p data-testid='nested-content'>Nested iframe content</p><input data-testid='nested-input' value='nested value' style='padding:8px; width:90%; border:1px solid #e2e8f0; border-radius:6px;'/></body></html>">
        </iframe>
      </div>
    </body></html>
  `;

  // Dynamic ID
  const dynamicInput = outlet.querySelector('#dynamicIdInput');
  const currentDynamicId = outlet.querySelector('#currentDynamicId');
  function regenerateDynamicId() {
    const newId = `input-${Math.random().toString(36).slice(2, 10)}`;
    dynamicInput.id = newId;
    currentDynamicId.textContent = `Current ID: ${newId}`;
  }
  regenerateDynamicId();
  outlet.querySelector('#regenerateId')?.addEventListener('click', regenerateDynamicId);

  // Infinite scroll
  const infinite = outlet.querySelector('#infiniteList');
  const scrollCount = outlet.querySelector('#scrollCount');
  let count = 0;
  function appendItems(n) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      count += 1;
      const item = document.createElement('div');
      item.textContent = `Item #${count}`;
      item.setAttribute('data-testid', `scroll-item-${count}`);
      item.style.padding = '8px 0';
      item.style.borderBottom = '1px solid var(--border)';
      frag.appendChild(item);
    }
    infinite.appendChild(frag);
    scrollCount.textContent = `Loaded items: ${count}`;
  }
  appendItems(20);
  infinite.addEventListener('scroll', () => {
    const nearBottom = infinite.scrollTop + infinite.clientHeight >= infinite.scrollHeight - 10;
    if (nearBottom) appendItems(10);
  });

  // Keyboard shortcuts
  const tooltip = outlet.querySelector('#kbdTooltip');
  const kbdOutput = outlet.querySelector('#kbdOutput');
  function onKeyDown(e) {
    if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      tooltip.style.display = tooltip.style.display === 'none' ? 'block' : 'none';
      kbdOutput.textContent = `Keyboard output: Ctrl+K pressed at ${new Date().toLocaleTimeString()}`;
    }
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      kbdOutput.textContent = `Keyboard output: Ctrl+S pressed (fake save) at ${new Date().toLocaleTimeString()}`;
      toast?.('Keyboard', 'Fake save triggered');
    }
  }
  window.addEventListener('keydown', onKeyDown);

  // Context menu
  const target = outlet.querySelector('#contextTarget');
  const menu = outlet.querySelector('#contextMenu');

  function hideMenu() {
    menu.style.display = 'none';
  }

  target.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = target.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.left = `${Math.max(0, e.clientX - rect.left)}px`;
    menu.style.top = `${Math.max(0, e.clientY - rect.top)}px`;
  });

  outlet.querySelector('#ctxCopy')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(target.textContent || '');
      toast?.('Copied', 'Copied context text');
    } catch {
      toast?.('Copy failed', 'Clipboard not available');
    }
    hideMenu();
  });

  outlet.querySelector('#ctxEdit')?.addEventListener('click', () => {
    const newText = prompt('Edit text:', target.textContent);
    if (newText !== null) target.textContent = newText;
    hideMenu();
  });

  outlet.querySelector('#ctxDelete')?.addEventListener('click', () => {
    if (confirm('Delete this content?')) {
      target.textContent = '';
      toast?.('Deleted', 'Content deleted');
    }
    hideMenu();
  });

  window.addEventListener('click', hideMenu);
  window.addEventListener('blur', hideMenu);

  // ===== EDGE CASES / BUGGY LOGIC =====

  // Delayed loading
  const delayedContent = outlet.querySelector('#delayedContent');
  outlet.querySelector('#loadDelayed')?.addEventListener('click', () => {
    delayedContent.innerHTML = '<span class="muted">Loading...</span>';
    setTimeout(() => {
      delayedContent.innerHTML = '<div class="input" style="padding:12px; background:var(--success-light); border-color:var(--success);" data-testid="delayed-element">✅ Element loaded after 3 seconds!</div>';
      toast?.('Delayed', 'Element appeared');
    }, 3000);
  });

  // Stale element
  const staleContainer = outlet.querySelector('#staleContainer');
  outlet.querySelector('#causeStale')?.addEventListener('click', () => {
    const oldValue = staleContainer.querySelector('#staleInput')?.value || '';
    staleContainer.innerHTML = '<div class="muted">Processing...</div>';
    setTimeout(() => {
      staleContainer.innerHTML = `
        <input class="input" id="staleInput" data-testid="stale-input" placeholder="New element created" value="${oldValue}" style="max-width:300px;" />
        <div class="muted" style="margin-top:6px;">DOM was detached and recreated. Value preserved: "${oldValue}"</div>
      `;
      toast?.('Stale', 'Element recreated');
    }, 1000);
  });

  // Race condition button
  const raceButton = outlet.querySelector('#raceButton');
  const raceTexts = ['Click me!', 'No, click NOW!', 'Wait...', 'Ready!', 'GO!', 'Almost...'];
  let raceInterval;
  raceButton?.addEventListener('mouseenter', () => {
    raceInterval = setInterval(() => {
      raceButton.textContent = raceTexts[Math.floor(Math.random() * raceTexts.length)];
    }, 200);
  });
  raceButton?.addEventListener('mouseleave', () => {
    clearInterval(raceInterval);
    raceButton.textContent = 'Click me!';
  });
  raceButton?.addEventListener('click', () => {
    clearInterval(raceInterval);
    raceButton.textContent = '✅ Clicked!';
    toast?.('Race', 'Button clicked successfully');
  });

  // Toggle hidden elements
  outlet.querySelector('#toggleHidden')?.addEventListener('click', () => {
    const d = outlet.querySelector('#hiddenDisplay');
    const v = outlet.querySelector('#hiddenVisibility');
    const o = outlet.querySelector('#hiddenOpacity');
    d.style.display = d.style.display === 'none' ? 'block' : 'none';
    v.style.visibility = v.style.visibility === 'hidden' ? 'visible' : 'hidden';
    o.style.opacity = o.style.opacity === '0' ? '1' : '0';
  });

  // Overlay
  const overlay = outlet.querySelector('#overlay');
  outlet.querySelector('#toggleOverlay')?.addEventListener('click', () => {
    overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
  });

  outlet.querySelector('#overlappedBtn')?.addEventListener('click', () => {
    toast?.('Overlapped', 'Button clicked (no overlay)');
  });

  // Double click
  let doubleClickCount = 0;
  const doubleClickBtn = outlet.querySelector('#doubleClickBtn');
  doubleClickBtn?.addEventListener('dblclick', () => {
    doubleClickCount++;
    doubleClickBtn.textContent = `Double-click me (Count: ${doubleClickCount})`;
    toast?.('Double-click', `Count: ${doubleClickCount}`);
  });

  // ===== API PRACTICE LOGIC =====
  
  // Get settings for API URL
  const getSettings = () => JSON.parse(localStorage.getItem('practiceApiSettings') || '{}');
  const apiBase = getSettings().apiUrl || 'https://billpay-api.gauravkhurana-practice-api.workers.dev';

  // Helper to get auth headers
  function getAuthHeaders(overrideAuth = null) {
    const settings = getSettings();
    const headers = {};
    
    if (overrideAuth === 'cookie') {
      const sessionId = outlet.querySelector('#cookieSessionInput')?.value || 'demo-session-abc123';
      headers['X-Session-Id'] = sessionId;
      return headers;
    }
    
    if (overrideAuth === 'none') {
      return headers;
    }

    // Use stored auth
    const auth = settings.auth || {};
    if (auth.type === 'api_key' && auth.apiKey?.key) {
      headers[auth.apiKey.headerName || 'X-API-Key'] = auth.apiKey.key;
    } else if (auth.type === 'bearer' && auth.bearer?.token) {
      headers['Authorization'] = `Bearer ${auth.bearer.token}`;
    } else if (auth.type === 'basic' && auth.basic?.username) {
      headers['Authorization'] = `Basic ${btoa(auth.basic.username + ':' + (auth.basic.password || ''))}`;
    } else if (auth.type === 'cookie' && auth.cookie?.sessionId) {
      headers['X-Session-Id'] = auth.cookie.sessionId;
    } else {
      // Default to demo API key
      headers['X-API-Key'] = 'demo-api-key-123';
    }
    return headers;
  }

  // File Upload Logic
  const uploadResult = outlet.querySelector('#uploadResult');
  const uploadProgress = outlet.querySelector('#uploadProgress');
  const progressBar = outlet.querySelector('#progressBar');
  const progressText = outlet.querySelector('#progressText');
  const filesList = outlet.querySelector('#filesList');

  function showProgress(percent, text) {
    uploadProgress.style.display = 'block';
    progressBar.style.width = `${percent}%`;
    progressText.textContent = text;
  }

  function hideProgress() {
    uploadProgress.style.display = 'none';
    progressBar.style.width = '0%';
  }

  function showResult(element, success, content) {
    const isJson = typeof content === 'object';
    const text = isJson ? JSON.stringify(content, null, 2) : content;
    element.innerHTML = `<div class="response-box ${success ? 'response-box--success' : 'response-box--error'}">${escapeHtml(text)}</div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Single file upload
  outlet.querySelector('#uploadSingleBtn')?.addEventListener('click', async () => {
    const fileInput = outlet.querySelector('#singleFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
      showResult(uploadResult, false, 'Please select a file first');
      toast?.('Error', 'No file selected');
      return;
    }

    try {
      showProgress(0, 'Preparing upload...');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const description = outlet.querySelector('#fileDescription').value;
      if (description) {
        formData.append('description', description);
      }

      showProgress(30, 'Uploading...');
      
      const response = await fetch(`${apiBase}/v1/files/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      showProgress(80, 'Processing response...');
      
      const data = await response.json();
      
      showProgress(100, 'Complete!');
      setTimeout(hideProgress, 1000);

      showResult(uploadResult, response.ok, data);
      toast?.(response.ok ? 'Success' : 'Error', response.ok ? 'File uploaded!' : 'Upload failed');
      
      if (response.ok) {
        fileInput.value = '';
        outlet.querySelector('#fileDescription').value = '';
      }
    } catch (err) {
      hideProgress();
      showResult(uploadResult, false, { error: err.message });
      toast?.('Error', err.message);
    }
  });

  // Multiple files upload
  outlet.querySelector('#uploadMultiBtn')?.addEventListener('click', async () => {
    const fileInput = outlet.querySelector('#multiFileInput');
    const files = fileInput.files;
    
    if (!files.length) {
      showResult(uploadResult, false, 'Please select files first');
      toast?.('Error', 'No files selected');
      return;
    }

    try {
      showProgress(0, 'Preparing upload...');
      
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      showProgress(30, `Uploading ${files.length} files...`);
      
      const response = await fetch(`${apiBase}/v1/files/upload-multiple`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      showProgress(80, 'Processing response...');
      
      const data = await response.json();
      
      showProgress(100, 'Complete!');
      setTimeout(hideProgress, 1000);

      showResult(uploadResult, response.ok, data);
      toast?.(response.ok ? 'Success' : 'Error', response.ok ? `${files.length} files uploaded!` : 'Upload failed');
      
      if (response.ok) {
        fileInput.value = '';
      }
    } catch (err) {
      hideProgress();
      showResult(uploadResult, false, { error: err.message });
      toast?.('Error', err.message);
    }
  });

  // Refresh files list
  async function loadFilesList() {
    filesList.innerHTML = '<div class="muted">Loading...</div>';
    
    try {
      const response = await fetch(`${apiBase}/v1/files`, {
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (response.ok && data.data && data.data.length > 0) {
        filesList.innerHTML = data.data.map(file => `
          <div class="file-item" data-file-id="${file.id}">
            <span class="file-item__name">📄 ${escapeHtml(file.name)}</span>
            <span class="file-item__size">${formatFileSize(file.size)}</span>
            <button class="btn btn--secondary" style="padding:4px 8px; font-size:12px;" onclick="this.closest('.file-item').querySelector('.delete-btn').click()">🗑️</button>
            <button class="delete-btn" style="display:none;" data-id="${file.id}"></button>
          </div>
        `).join('');

        // Attach delete handlers
        filesList.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const fileId = btn.dataset.id;
            try {
              const res = await fetch(`${apiBase}/v1/files/${fileId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
              });
              if (res.ok) {
                toast?.('Deleted', 'File removed');
                loadFilesList();
              }
            } catch (e) {
              toast?.('Error', e.message);
            }
          });
        });
      } else if (response.ok) {
        filesList.innerHTML = '<div class="muted">No files uploaded yet</div>';
      } else {
        filesList.innerHTML = `<div class="response-box response-box--error">${escapeHtml(JSON.stringify(data, null, 2))}</div>`;
      }
    } catch (err) {
      filesList.innerHTML = `<div class="response-box response-box--error">${escapeHtml(err.message)}</div>`;
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  outlet.querySelector('#refreshFilesBtn')?.addEventListener('click', loadFilesList);

  // XML Response Testing
  const xmlResult = outlet.querySelector('#xmlResult');

  outlet.querySelector('#testXmlBtn')?.addEventListener('click', async () => {
    const endpoint = outlet.querySelector('#xmlEndpoint').value;
    const format = outlet.querySelector('#xmlFormat').value;
    
    try {
      xmlResult.innerHTML = '<div class="muted">Loading...</div>';
      
      const headers = { ...getAuthHeaders() };
      headers['Accept'] = format === 'xml' ? 'application/xml' : 'application/json';
      
      const response = await fetch(`${apiBase}${endpoint}`, { headers });
      const contentType = response.headers.get('Content-Type') || '';
      const text = await response.text();
      
      showResult(xmlResult, response.ok, text);
      toast?.('Response', `Content-Type: ${contentType}`);
    } catch (err) {
      showResult(xmlResult, false, err.message);
      toast?.('Error', err.message);
    }
  });

  // Cookie Auth Testing
  const cookieResult = outlet.querySelector('#cookieResult');

  outlet.querySelector('#testCookieBtn')?.addEventListener('click', async () => {
    try {
      cookieResult.innerHTML = '<div class="muted">Testing cookie authentication...</div>';
      
      const response = await fetch(`${apiBase}/v1/health`, {
        headers: getAuthHeaders('cookie')
      });
      
      const data = await response.json();
      showResult(cookieResult, response.ok, data);
      toast?.(response.ok ? 'Success' : 'Error', response.ok ? 'Cookie auth works!' : 'Auth failed');
    } catch (err) {
      showResult(cookieResult, false, err.message);
      toast?.('Error', err.message);
    }
  });

  outlet.querySelector('#testNoCookieBtn')?.addEventListener('click', async () => {
    try {
      cookieResult.innerHTML = '<div class="muted">Testing without authentication...</div>';
      
      const response = await fetch(`${apiBase}/v1/health`, {
        headers: getAuthHeaders('none')
      });
      
      const data = await response.json();
      showResult(cookieResult, response.ok, data);
      toast?.(response.ok ? 'Success' : 'Unauthorized', response.ok ? 'Request succeeded' : 'Auth required (expected)');
    } catch (err) {
      showResult(cookieResult, false, err.message);
      toast?.('Error', err.message);
    }
  });

  // Cleanup when route changes
  const observer = new MutationObserver(() => {
    if (!document.body.contains(outlet)) {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', hideMenu);
      window.removeEventListener('blur', hideMenu);
      clearInterval(raceInterval);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
