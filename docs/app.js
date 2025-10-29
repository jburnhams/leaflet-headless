/**
 * Client-side application for rendering Leaflet examples
 */

import { examples } from './examples.js';

/**
 * Initialize and render all examples
 */
function initializeExamples() {
  const container = document.getElementById('examples-container');

  examples.forEach((example) => {
    // Create example wrapper
    const exampleDiv = document.createElement('div');
    exampleDiv.className = 'example';
    exampleDiv.id = `example-${example.id}`;

    // Create header
    const header = document.createElement('div');
    header.className = 'example-header';
    header.innerHTML = `
      <h3>${example.title}</h3>
      <p>${example.description}</p>
    `;

    // Create content container
    const content = document.createElement('div');
    content.className = 'example-content';

    // Client-side (live map)
    const clientSide = document.createElement('div');
    clientSide.className = 'example-side client-side';
    clientSide.innerHTML = `
      <h4>Client-Side (Interactive)</h4>
      <div class="map-container" id="map-${example.id}">
        <div class="loading">Loading map...</div>
      </div>
    `;

    // Server-side (PNG image)
    const serverSide = document.createElement('div');
    serverSide.className = 'example-side server-side';
    serverSide.innerHTML = `
      <h4>Server-Side (Generated PNG)</h4>
      <img
        src="images/${example.id}.png"
        alt="${example.title} - Server-side generated"
        class="server-image"
        loading="lazy"
        onerror="this.alt='Image not yet generated. Run the build script to generate images.'; this.style.objectFit='contain'; this.style.padding='20px';"
      />
    `;

    // Assemble the example
    content.appendChild(clientSide);
    content.appendChild(serverSide);
    exampleDiv.appendChild(header);
    exampleDiv.appendChild(content);
    container.appendChild(exampleDiv);

    // Initialize the client-side map
    initializeMap(example);
  });
}

/**
 * Initialize a single map example
 */
function initializeMap(example) {
  // Wait a bit for the DOM to be ready
  setTimeout(() => {
    const mapElement = document.getElementById(`map-${example.id}`);
    if (!mapElement) {
      console.error(`Map element not found for ${example.id}`);
      return;
    }

    // Remove loading message
    const loading = mapElement.querySelector('.loading');
    if (loading) {
      loading.remove();
    }

    try {
      // Create the map
      const map = L.map(`map-${example.id}`, {
        // Disable some features for consistency
        zoomControl: true,
        attributionControl: true,
      });

      // Set custom size if specified
      if (example.width && example.height) {
        mapElement.style.height = `${example.height}px`;
      }

      // Run the example setup
      example.setup(L, map);

      // Add a small delay to ensure tiles load
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    } catch (error) {
      console.error(`Error initializing map ${example.id}:`, error);
      mapElement.innerHTML = `<div class="loading" style="color: red;">Error loading map</div>`;
    }
  }, 100);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExamples);
} else {
  initializeExamples();
}
