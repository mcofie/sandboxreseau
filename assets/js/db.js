/**
 * Sandbox Réseau - Centralized Data Store Loader
 * This script fetches data from the /content/ folder and populates the DB object.
 **/

const DB = {
    registry: [],
    editions: [],
    gallery: [],
    newsletters: [],
    
    // Status tracking
    isLoaded: false,
    
    /**
     * Initializes the database by fetching JSON files.
     * Returns a promise that resolves when all data is loaded.
     */
    init: async function() {
        try {
            const [registry, editions, gallery, newsletters] = await Promise.all([
                fetch('content/registry.json').then(res => res.json()),
                fetch('content/editions.json').then(res => res.json()),
                fetch('content/gallery.json').then(res => res.json()),
                fetch('content/newsletters.json').then(res => res.json())
            ]);

            this.registry = registry;
            this.editions = editions;
            this.gallery = gallery;
            this.newsletters = newsletters;
            this.isLoaded = true;
            
            console.log('DB initialized effectively from JSON content.');
            return this;
        } catch (err) {
            console.error('Failed to initialize DB:', err);
            // Fallback to empty context or handle gracefully
            return this;
        }
    }
};

// Export if used in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DB;
}
