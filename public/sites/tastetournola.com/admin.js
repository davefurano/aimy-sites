document.addEventListener('DOMContentLoaded', () => {
    // State
    let restaurants = [];
    let editingIndex = -1;

    // Elements
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const restaurantList = document.getElementById('restaurantList');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const modalTitle = document.getElementById('modalTitle');
    const addBtn = document.getElementById('addBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const cancelEditBtn = document.getElementById('cancelEdit');

    // Init
    checkAuth();

    // Event Listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    addBtn.addEventListener('click', openAddModal);
    cancelEditBtn.addEventListener('click', closeModal);
    editForm.addEventListener('submit', handleSave);

    // Close modal on outside click
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeModal();
    });

    // --- Auth Functions ---

    async function checkAuth() {
        try {
            const res = await fetch('/api/check_auth');
            const data = await res.json();
            if (data.authenticated) {
                showDashboard();
            } else {
                showLogin();
            }
        } catch (e) {
            // If API fails (e.g. server not running), show login
            showLogin();
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                loginError.style.display = 'none';
                showDashboard();
            } else {
                loginError.style.display = 'block';
            }
        } catch (e) {
            console.error(e);
            loginError.textContent = "Connection error";
            loginError.style.display = 'block';
        }
    }

    async function handleLogout() {
        await fetch('/api/logout', { method: 'POST' });
        showLogin();
    }

    function showLogin() {
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
    }

    function showDashboard() {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        fetchRestaurants();
    }

    // --- Data Functions ---

    async function fetchRestaurants() {
        try {
            const res = await fetch('/api/restaurants');
            if (res.status === 401) {
                showLogin();
                return;
            }
            restaurants = await res.json();
            renderList();
        } catch (e) {
            console.error("Failed to fetch restaurants", e);
        }
    }

    async function saveRestaurants() {
        try {
            const res = await fetch('/api/restaurants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(restaurants)
            });

            if (res.status === 401) {
                showLogin();
                return;
            }

            if (!res.ok) {
                alert("Failed to save changes");
            } else {
                fetchRestaurants(); // Refresh
                closeModal();
            }
        } catch (e) {
            console.error("Failed to save", e);
            alert("Error saving data");
        }
    }

    function renderList() {
        restaurantList.innerHTML = '';

        // Sort by rank
        restaurants.sort((a, b) => a.rank - b.rank);

        restaurants.forEach((r, index) => {
            const item = document.createElement('div');
            item.className = 'list-item';

            item.innerHTML = `
                <div class="item-info">
                    <span class="item-rank">#${r.rank}</span>
                    <div>
                        <strong>${r.name}</strong><br>
                        <small>${r.cuisine} • ${r.neighborhood}</small>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="window.editItem(${index})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="window.deleteItem(${index})">Delete</button>
                </div>
            `;
            restaurantList.appendChild(item);
        });
    }

    // --- CRUD Operations ---

    // Expose to window for onclick handlers
    window.editItem = (index) => {
        editingIndex = index;
        const r = restaurants[index];

        modalTitle.textContent = "Edit Restaurant";
        document.getElementById('editName').value = r.name;
        document.getElementById('editRank').value = r.rank;
        document.getElementById('editRating').value = r.rating;
        document.getElementById('editCuisine').value = r.cuisine;
        document.getElementById('editNeighborhood').value = r.neighborhood;
        document.getElementById('editUrl').value = r.url || '';
        document.getElementById('editImage').value = (r.images && r.images[0]) ? r.images[0] : (r.image || '');

        editModal.classList.add('active');
    };

    window.deleteItem = async (index) => {
        if (confirm(`Are you sure you want to delete ${restaurants[index].name}?`)) {
            restaurants.splice(index, 1);
            // Re-rank items? Optional. For now just save.
            await saveRestaurants();
        }
    };

    function openAddModal() {
        editingIndex = -1;
        modalTitle.textContent = "Add New Restaurant";
        editForm.reset();
        // Suggest next rank
        const nextRank = restaurants.length > 0 ? Math.max(...restaurants.map(r => r.rank)) + 1 : 1;
        document.getElementById('editRank').value = nextRank;
        editModal.classList.add('active');
    }

    function closeModal() {
        editModal.classList.remove('active');
    }

    async function handleSave(e) {
        e.preventDefault();

        const newUrl = document.getElementById('editUrl').value;
        const newImage = document.getElementById('editImage').value;

        // Logic to preserve existing images (indices 1+) if editing
        let finalImages = [];
        if (editingIndex > -1) {
            const existing = restaurants[editingIndex];
            const oldImages = existing.images || [];

            if (newImage) {
                if (oldImages.length > 0) {
                    // Update first image, keep the rest
                    finalImages = [newImage, ...oldImages.slice(1)];
                } else {
                    // No previous images, just add this one
                    finalImages = [newImage];
                }
            } else {
                // Main image cleared. If there are others, promote the next one? 
                // Or just remove the first one.
                if (oldImages.length > 1) {
                    finalImages = oldImages.slice(1);
                }
            }
        } else {
            // New item
            finalImages = newImage ? [newImage] : [];
        }

        const newItem = {
            rank: parseInt(document.getElementById('editRank').value),
            name: document.getElementById('editName').value,
            rating: parseFloat(document.getElementById('editRating').value),
            cuisine: document.getElementById('editCuisine').value,
            neighborhood: document.getElementById('editNeighborhood').value,
            url: newUrl || null,
            image: newImage || null, // Legacy support
            images: finalImages,
            sources: ["Manual"]
        };

        if (editingIndex > -1) {
            // Update existing
            // Preserve other fields if any
            restaurants[editingIndex] = { ...restaurants[editingIndex], ...newItem };
        } else {
            // Add new
            restaurants.push(newItem);
        }

        await saveRestaurants();
    }
});
