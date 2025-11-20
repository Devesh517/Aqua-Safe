 // Auth System
    let currentUser = null;
    let allSamples = [];

    // Check if user is logged in
    function checkAuth() {
      const user = sessionStorage.getItem('currentUser');
      if (!user) {
        document.getElementById('authContainer').classList.remove('hidden');
        return false;
      }
      currentUser = JSON.parse(user);
      document.getElementById('userName').textContent = currentUser.name.split(' ')[0];
      document.getElementById('authContainer').classList.add('hidden');
      loadUserData();
      return true;
    }

    // Toggle between login and signup
    function toggleAuth() {
      const loginForm = document.getElementById('loginForm');
      const signupForm = document.getElementById('signupForm');
      const authTitle = document.getElementById('authTitle');
      const authSubtitle = document.getElementById('authSubtitle');
      
      if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        authTitle.textContent = 'Welcome Back';
        authSubtitle.textContent = 'Sign in to continue to Aqua Shield';
      } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        authTitle.textContent = 'Create Account';
        authSubtitle.textContent = 'Sign up to start monitoring water quality';
      }
      document.getElementById('authError').classList.remove('show');
    }

    // Show auth error
    function showAuthError(message) {
      const errorEl = document.getElementById('authError');
      errorEl.textContent = message;
      errorEl.classList.add('show');
      setTimeout(() => errorEl.classList.remove('show'), 5000);
    }

    // Login
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      // Get users from storage
      const users = JSON.parse(localStorage.getItem('aquaShieldUsers') || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      
      if (user) {
        currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        document.getElementById('authContainer').classList.add('hidden');
        document.getElementById('userName').textContent = user.name.split(' ')[0];
        loadUserData();
        showPage('home');
      } else {
        showAuthError('Invalid email or password');
      }
    });

    // Signup
    document.getElementById('signupForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const confirm = document.getElementById('signupConfirm').value;
      
      if (password !== confirm) {
        showAuthError('Passwords do not match');
        return;
      }
      
      if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
      }
      
      // Get existing users
      const users = JSON.parse(localStorage.getItem('aquaShieldUsers') || '[]');
      
      // Check if user exists
      if (users.find(u => u.email === email)) {
        showAuthError('An account with this email already exists');
        return;
      }
      
      // Create new user
      const newUser = {
        id: Date.now().toString(),
        name: name,
        email: email,
        password: password,
        createdAt: new Date().toISOString()
      };
      
      users.push(newUser);
      localStorage.setItem('aquaShieldUsers', JSON.stringify(users));
      
      // Auto login
      currentUser = newUser;
      sessionStorage.setItem('currentUser', JSON.stringify(newUser));
      document.getElementById('authContainer').classList.add('hidden');
      document.getElementById('userName').textContent = name.split(' ')[0];
      showPage('home');
    });

    // Logout
    function logout() {
      sessionStorage.removeItem('currentUser');
      currentUser = null;
      location.reload();
    }

    // Load user data
    function loadUserData() {
      if (!currentUser) return;
      
      const allData = JSON.parse(localStorage.getItem('aquaSamples') || '[]');
      allSamples = allData.filter(s => s.userId === currentUser.id);
    }

    // Page Navigation
    function showPage(pageId) {
      if (!checkAuth() && pageId !== 'home') return;
      
      const pages = document.querySelectorAll('.page');
      pages.forEach(page => page.classList.remove('active'));
      document.getElementById(pageId === 'map' ? 'map-page' : pageId).classList.add('active');
      
      // Update active nav link
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach(link => link.classList.remove('active'));
      if (event && event.target) {
        event.target.classList.add('active');
      }
      
      // Page-specific initializations
      if (pageId === 'map') {
        setTimeout(initMap, 100);
      } else if (pageId === 'results') {
        loadResults();
      } else if (pageId === 'history') {
        loadHistory();
      }
    }

    // Mobile Menu Toggle
    function toggleMobileMenu() {
      const menu = document.getElementById('mobileMenu');
      menu.classList.toggle('active');
    }

    // Get current location
    function getCurrentLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
            document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
            reverseGeocode(position.coords.latitude, position.coords.longitude);
          },
          error => {
            alert('Unable to get location: ' + error.message);
          }
        );
      } else {
        alert('Geolocation is not supported by your browser');
      }
    }

    // Reverse geocode to get city name
    function reverseGeocode(lat, lon) {
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then(response => response.json())
        .then(data => {
          const city = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown';
          const state = data.address.state || '';
          const country = data.address.country || '';
          
          const fullLocation = [city, state, country].filter(Boolean).join(', ');
          document.getElementById('detectedCity').textContent = fullLocation;
          document.getElementById('cityDisplay').classList.add('show');
        })
        .catch(error => {
          console.error('Geocoding error:', error);
          document.getElementById('detectedCity').textContent = 'Unable to detect city';
          document.getElementById('cityDisplay').classList.add('show');
        });
    }

    // Watch for coordinate changes
    document.getElementById('latitude').addEventListener('change', function() {
      const lon = document.getElementById('longitude').value;
      if (this.value && lon) {
        reverseGeocode(this.value, lon);
      }
    });

    document.getElementById('longitude').addEventListener('change', function() {
      const lat = document.getElementById('latitude').value;
      if (this.value && lat) {
        reverseGeocode(lat, this.value);
      }
    });

    // Form Submission
    document.getElementById('dataForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (!currentUser) {
        alert('Please login to save your analysis');
        return;
      }
      
      const formData = new FormData(this);
      const data = {};
      formData.forEach((value, key) => data[key] = value);
      
      // WHO Standard limits (mg/L)
      const standards = {
        pb: 0.01,   // Lead
        as: 0.01,   // Arsenic
        cd: 0.003,  // Cadmium
        cr: 0.05,   // Chromium
        hg: 0.006   // Mercury
      };
      
      // Weight factors for each metal (based on toxicity and health impact)
      const weights = {
        pb: 4,  // Lead - high neurotoxicity
        as: 5,  // Arsenic - highly carcinogenic
        cd: 3,  // Cadmium - kidney damage
        cr: 2,  // Chromium - lower toxicity (Cr III)
        hg: 5   // Mercury - severe neurotoxicity
      };
      
      // Calculate HMPI using weighted formula: HMPI = Σ(Qi × Wi) / ΣWi
      // Where Qi = Ci/Si (Concentration / Standard)
      const metals = ['pb', 'as', 'cd', 'cr', 'hg'];
      let numerator = 0;
      let denominator = 0;
      
      metals.forEach(metal => {
        const concentration = parseFloat(data[metal]);
        const standard = standards[metal];
        const weight = weights[metal];
        
        const Qi = concentration / standard;  // Sub-index for each metal
        numerator += Qi * weight;              // Σ(Qi × Wi)
        denominator += weight;                 // ΣWi
      });
      
      const hmpi = numerator / denominator;  // Final HMPI
      
      // Determine status based on HMPI value
      let status, statusClass;
      if (hmpi < 1) {
        status = "Safe";
        statusClass = "safe";
      } else if (hmpi < 2) {
        status = "Moderate";
        statusClass = "moderate";
      } else {
        status = "Unsafe";
        statusClass = "unsafe";
      }
      
      // Create sample record
      const sample = {
        id: Date.now().toString(),
        userId: currentUser.id,
        locationName: data.sampleLocation,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        city: document.getElementById('detectedCity').textContent,
        date: data.date,
        hmpi: hmpi.toFixed(2),
        status: status,
        statusClass: statusClass,
        metals: {
          pb: parseFloat(data.pb),
          as: parseFloat(data.as),
          cd: parseFloat(data.cd),
          cr: parseFloat(data.cr),
          hg: parseFloat(data.hg)
        },
        weights: weights,
        standards: standards,
        timestamp: new Date().toISOString()
      };
      
      // Save to storage
      const allData = JSON.parse(localStorage.getItem('aquaSamples') || '[]');
      allData.push(sample);
      localStorage.setItem('aquaSamples', JSON.stringify(allData));
      localStorage.setItem('lastSample', JSON.stringify(sample));
      
      // Update user's samples
      loadUserData();
      
      // Show success and redirect
      alert('Analysis complete! HMPI: ' + sample.hmpi + ' - Status: ' + status);
      showPage('results');
    });

    // Load History
    function loadHistory() {
      const historyContent = document.getElementById('historyContent');
      
      if (allSamples.length === 0) {
        historyContent.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-flask"></i>
            <p>No analysis history yet</p>
            <p style="font-size: 0.9rem;">Start by analyzing your first water sample</p>
          </div>
        `;
        return;
      }
      
      // Sort by date (newest first)
      const sortedSamples = [...allSamples].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      let html = `
        <table class="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Coordinates</th>
              <th>HMPI</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      sortedSamples.forEach(sample => {
        html += `
          <tr>
            <td>${new Date(sample.date).toLocaleDateString()}</td>
            <td>${sample.locationName}</td>
            <td>${sample.latitude.toFixed(4)}, ${sample.longitude.toFixed(4)}</td>
            <td><strong>${sample.hmpi}</strong></td>
            <td><span class="status-pill ${sample.statusClass}">${sample.status}</span></td>
            <td>
              <button class="btn" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;" onclick="viewSample('${sample.id}')">
                <i class="fas fa-eye"></i> View
              </button>
            </td>
          </tr>
        `;
      });
      
      html += '</tbody></table>';
      historyContent.innerHTML = html;
    }

    // View specific sample
    function viewSample(sampleId) {
      const sample = allSamples.find(s => s.id === sampleId);
      if (sample) {
        localStorage.setItem('lastSample', JSON.stringify(sample));
        showPage('results');
      }
    }

    // Load Results
    let chart = null;
    
    function loadResults() {
      const data = JSON.parse(localStorage.getItem('lastSample'));
      
      if (!data) {
        document.getElementById('result-location').textContent = 'No data available. Please analyze a sample first.';
        return;
      }
      
      // Display results
      document.getElementById('result-location').innerHTML = `<strong>${data.locationName}</strong> | ${data.city}`;
      document.getElementById('result-coords').textContent = `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
      document.getElementById('hmpi-value').textContent = data.hmpi;
      
      const statusElement = document.getElementById('safety-status');
      if (data.status === 'Safe') {
        statusElement.innerHTML = `<span class="status-badge status-safe"><i class="fas fa-check-circle"></i> SAFE for Drinking</span>`;
      } else if (data.status === 'Moderate') {
        statusElement.innerHTML = `<span class="status-badge status-moderate"><i class="fas fa-exclamation-circle"></i> MODERATE - Monitor Closely</span>`;
      } else {
        statusElement.innerHTML = `<span class="status-badge status-unsafe"><i class="fas fa-exclamation-triangle"></i> UNSAFE - Treatment Required</span>`;
      }
      
      // Initialize chart
      renderChart('bar');
    }

    // Chart Rendering
    function renderChart(type) {
      const data = JSON.parse(localStorage.getItem('lastSample'));
      if (!data || !data.metals) return;
      
      const ctx = document.getElementById('resultsChart').getContext('2d');
      
      if (chart) {
        chart.destroy();
      }
      
      const metalNames = {
        pb: 'Lead (Pb)',
        as: 'Arsenic (As)',
        cd: 'Cadmium (Cd)',
        cr: 'Chromium (Cr)',
        hg: 'Mercury (Hg)'
      };
      
      const labels = Object.keys(data.metals).map(key => metalNames[key]);
      const values = Object.values(data.metals);
      
      chart = new Chart(ctx, {
        type: type,
        data: {
          labels: labels,
          datasets: [{
            label: 'Concentration (mg/L)',
            data: values,
            backgroundColor: [
              'rgba(0, 119, 182, 0.7)',
              'rgba(0, 180, 216, 0.7)',
              'rgba(144, 224, 239, 0.7)',
              'rgba(202, 240, 248, 0.7)',
              'rgba(72, 202, 228, 0.7)'
            ],
            borderColor: [
              'rgba(0, 119, 182, 1)',
              'rgba(0, 180, 216, 1)',
              'rgba(144, 224, 239, 1)',
              'rgba(202, 240, 248, 1)',
              'rgba(72, 202, 228, 1)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: type === 'doughnut' || type === 'radar'
            },
            title: {
              display: true,
              text: 'Heavy Metal Concentrations',
              font: {
                size: 16,
                weight: 'bold'
              },
              color: '#023047'
            }
          },
          scales: type === 'doughnut' ? {} : {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Concentration (mg/L)'
              }
            }
          }
        }
      });
    }

    // Chart type change listener
    document.getElementById('chartType').addEventListener('change', function(e) {
      renderChart(e.target.value);
    });

    // Initialize Map
    let map = null;
    let markers = [];

    function initMap() {
      // Initialize map only once
      if (!map) {
        map = L.map('map').setView([20.5937, 78.9629], 5);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
      }
      
      // Clear existing markers
      markers.forEach(m => map.removeLayer(m));
      markers = [];
      
      // Add all samples to map
      if (allSamples.length > 0) {
        allSamples.forEach(sample => {
          // Determine marker color based on status
          let markerColor;
          if (sample.status === 'Safe') {
            markerColor = '#06ffa5';
          } else if (sample.status === 'Moderate') {
            markerColor = '#ff9800';
          } else {
            markerColor = '#ef476f';
          }
          
          // Create custom icon
          const customIcon = L.divIcon({
            html: `<div style="background: ${markerColor}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
            className: 'custom-marker',
            iconSize: [30, 30]
          });
          
          const marker = L.marker([sample.latitude, sample.longitude], { icon: customIcon }).addTo(map);
          
          // Create popup content
          const popupContent = `
            <div style="min-width: 200px;">
              <h4 style="margin: 0 0 10px 0; color: var(--primary-color);">${sample.locationName}</h4>
              <p style="margin: 5px 0;"><strong>City:</strong> ${sample.city}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(sample.date).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>HMPI:</strong> ${sample.hmpi}</p>
              <p style="margin: 5px 0;">
                <strong>Status:</strong> 
                <span class="status-pill ${sample.statusClass}" style="margin-left: 5px;">${sample.status}</span>
              </p>
              <button onclick="viewSample('${sample.id}')" style="margin-top: 10px; padding: 5px 15px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">
                View Details
              </button>
            </div>
          `;
          
          marker.bindPopup(popupContent);
          markers.push(marker);
        });
        
        // Fit map bounds to show all markers
        if (markers.length > 0) {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1));
        }
      }
    }
    
    // Download Results Functions
    function downloadResult(format) {
      const data = JSON.parse(localStorage.getItem('lastSample'));
      if (!data) {
        alert('No data available to download');
        return;
      }
      
      let content, filename, type;
      
      if (format === 'csv') {
        content = generateCSV(data);
        filename = `aqua-shield-${data.locationName}-${data.date}.csv`;
        type = 'text/csv';
      } else if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `aqua-shield-${data.locationName}-${data.date}.json`;
        type = 'application/json';
      }
      
      const blob = new Blob([content], { type: type });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
    
    function generateCSV(data) {
      let csv = 'Parameter,Value\n';
      csv += `Location,${data.locationName}\n`;
      csv += `City,${data.city}\n`;
      csv += `Latitude,${data.latitude}\n`;
      csv += `Longitude,${data.longitude}\n`;
      csv += `Date,${data.date}\n`;
      csv += `HMPI,${data.hmpi}\n`;
      csv += `Status,${data.status}\n`;
      csv += '\nHeavy Metals (mg/L)\n';
      csv += `Lead (Pb),${data.metals.pb}\n`;
      csv += `Arsenic (As),${data.metals.as}\n`;
      csv += `Cadmium (Cd),${data.metals.cd}\n`;
      csv += `Chromium (Cr),${data.metals.cr}\n`;
      csv += `Mercury (Hg),${data.metals.hg}\n`;
      return csv;
    }
    
    function printResult() {
      window.print();
    }
    
    // Initialize on page load
    window.addEventListener('load', function() {
      checkAuth();
      
      // Set default date to today
      document.getElementById('date').valueAsDate = new Date();
    });