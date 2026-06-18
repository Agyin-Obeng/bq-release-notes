// Global Application State
let appState = {
    updates: [],
    selectedIds: new Set(),
    activeFilter: 'all',
    searchQuery: '',
    isFetching: false,
    lastUpdated: null
};

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const searchInput = document.getElementById('search-input');
const updatesContainer = document.getElementById('updates-container');
const lastSyncTimeEl = document.getElementById('last-sync-time');
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');

const loadingView = document.getElementById('loading-view');
const errorView = document.getElementById('error-view');
const emptyView = document.getElementById('empty-view');
const feedView = document.getElementById('feed-view');
const retryBtn = document.getElementById('retry-btn');
const errorMessageEl = document.getElementById('error-message');

// Composer Elements
const composerPanel = document.getElementById('composer-panel');
const closeComposerBtn = document.getElementById('close-composer-btn');
const composerTextarea = document.getElementById('composer-textarea');
const charCounter = document.getElementById('char-counter');
const progressCircle = document.getElementById('progress-circle');
const selectionCountEl = document.getElementById('selection-count');
const clearBtn = document.getElementById('clear-btn');
const tweetBtn = document.getElementById('tweet-btn');

// Progress ring calculations
const circleRadius = 14;
const circleCircumference = 2 * Math.PI * circleRadius;
if (progressCircle) {
    progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    progressCircle.style.strokeDashoffset = circleCircumference;
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup DOM Event Listeners
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search implementation with basic debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            appState.searchQuery = e.target.value.toLowerCase().trim();
            renderTimeline();
        }, 150);
    });

    // Category Filter Pills
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            // Remove active state from all
            filterPills.forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-selected', 'false');
            });
            
            // Add to target
            const target = e.currentTarget;
            target.classList.add('active');
            target.setAttribute('aria-selected', 'true');
            
            appState.activeFilter = target.getAttribute('data-filter');
            renderTimeline();
        });
    });

    // Composer interactions
    closeComposerBtn.addEventListener('click', hideComposer);
    composerTextarea.addEventListener('input', handleComposerInput);
    clearBtn.addEventListener('click', clearComposerSelection);
    tweetBtn.addEventListener('click', handleTweetPosting);
}

// Fetch Release Notes from API
async function fetchReleaseNotes(force = false) {
    if (appState.isFetching) return;
    
    setLoadingState(true);
    
    try {
        const url = `/api/release-notes${force ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'fallback') {
            appState.updates = data.updates || [];
            appState.lastUpdated = new Date(data.last_updated * 1000);
            
            updateMetadata(data.message);
            renderTimeline();
            setErrorState(false);
        } else {
            throw new Error(data.message || 'Unknown server error fetching release notes.');
        }
    } catch (err) {
        console.error('Error fetching release notes:', err);
        errorMessageEl.textContent = err.message || 'We could not retrieve the feed data.';
        setErrorState(true);
    } finally {
        setLoadingState(false);
    }
}

// UI State Toggles
function setLoadingState(loading) {
    appState.isFetching = loading;
    if (loading) {
        refreshBtn.disabled = true;
        refreshIcon.classList.add('spinning');
        loadingView.classList.remove('hidden');
        errorView.classList.add('hidden');
        emptyView.classList.add('hidden');
        feedView.classList.add('hidden');
    } else {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('spinning');
        loadingView.classList.add('hidden');
    }
}

function setErrorState(isError) {
    if (isError) {
        errorView.classList.remove('hidden');
        feedView.classList.add('hidden');
        emptyView.classList.add('hidden');
    } else {
        errorView.classList.add('hidden');
        feedView.classList.remove('hidden');
    }
}

// Update stats and sync timestamps
function updateMetadata(msg = '') {
    // Stats count
    statTotal.textContent = appState.updates.length;
    
    const featureCount = appState.updates.filter(u => u.type.toLowerCase().includes('feature')).length;
    statFeatures.textContent = featureCount;
    
    // Status sync message
    if (appState.lastUpdated) {
        const timeStr = appState.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = appState.lastUpdated.toLocaleDateString();
        lastSyncTimeEl.textContent = msg ? `${msg} (Synced: ${timeStr})` : `Synced at ${dateStr} ${timeStr}`;
    }
}

// Render release notes based on search & active filter
function renderTimeline() {
    updatesContainer.innerHTML = '';
    
    // Filter logic
    let filteredUpdates = appState.updates.filter(item => {
        // Category check
        if (appState.activeFilter !== 'all') {
            const itemType = item.type.toLowerCase();
            if (appState.activeFilter === 'feature' && !itemType.includes('feature')) return false;
            if (appState.activeFilter === 'announcement' && !itemType.includes('announcement')) return false;
            if (appState.activeFilter === 'issue' && !itemType.includes('issue')) return false;
            if (appState.activeFilter === 'deprecation' && !itemType.includes('deprecation')) return false;
        }
        
        // Search query check
        if (appState.searchQuery) {
            const textMatch = item.text_content.toLowerCase().includes(appState.searchQuery);
            const typeMatch = item.type.toLowerCase().includes(appState.searchQuery);
            const dateMatch = item.date.toLowerCase().includes(appState.searchQuery);
            return textMatch || typeMatch || dateMatch;
        }
        
        return true;
    });

    if (filteredUpdates.length === 0) {
        emptyView.classList.remove('hidden');
        feedView.classList.add('hidden');
        return;
    }

    emptyView.classList.add('hidden');
    feedView.classList.remove('hidden');

    // Grouping by Date
    const groups = {};
    filteredUpdates.forEach(update => {
        if (!groups[update.date]) {
            groups[update.date] = [];
        }
        groups[update.date].push(update);
    });

    // Render nodes
    Object.keys(groups).forEach(date => {
        const groupEl = document.createElement('div');
        groupEl.className = 'timeline-group';
        
        groupEl.innerHTML = `
            <div class="timeline-date-marker" aria-hidden="true"></div>
            <h3 class="timeline-date-header">${date}</h3>
            <div class="timeline-group-items"></div>
        `;
        
        const itemsContainer = groupEl.querySelector('.timeline-group-items');
        
        groups[date].forEach(item => {
            const isSelected = appState.selectedIds.has(item.id);
            const typeClass = item.type.toLowerCase().replace(' ', '-');
            const cardEl = document.createElement('article');
            cardEl.className = `update-card card-${typeClass} ${isSelected ? 'selected' : ''}`;
            cardEl.setAttribute('data-id', item.id);
            
            // Build proper category badge styling class
            let badgeClass = 'badge-default';
            if (typeClass.includes('feature')) badgeClass = 'badge-feature';
            else if (typeClass.includes('announcement')) badgeClass = 'badge-announcement';
            else if (typeClass.includes('issue')) badgeClass = 'badge-issue';
            else if (typeClass.includes('deprecation')) badgeClass = 'badge-deprecation';
            
            cardEl.innerHTML = `
                <div class="card-top">
                    <div class="badge-wrapper">
                        <span class="category-badge ${badgeClass}">${item.type}</span>
                    </div>
                    <div class="card-actions-top">
                        <label class="checkbox-container" title="Select to Tweet">
                            <input type="checkbox" ${isSelected ? 'checked' : ''} data-id="${item.id}">
                            <span class="checkmark"></span>
                        </label>
                    </div>
                </div>
                <div class="card-content">
                    ${item.content}
                </div>
                <div class="card-footer">
                    <button class="card-tweet-btn" data-id="${item.id}" title="Draft Tweet about this update">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="card-link" title="Open official release notes page">
                        <svg class="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        <span>Details</span>
                    </a>
                </div>
            `;
            
            // Card selection logic via clicking card body (but avoid clicks on links/inputs)
            cardEl.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('.checkbox-container') || e.target.closest('.card-tweet-btn')) {
                    return;
                }
                toggleItemSelection(item.id);
            });
            
            // Checkbox logic
            const checkbox = cardEl.querySelector('.checkbox-container input');
            checkbox.addEventListener('change', () => {
                toggleItemSelection(item.id);
            });
            
            // Card specific Quick Tweet action button
            const cardTweetBtn = cardEl.querySelector('.card-tweet-btn');
            cardTweetBtn.addEventListener('click', () => {
                // Clear others, select this one only, compile, and open composer
                appState.selectedIds.clear();
                appState.selectedIds.add(item.id);
                syncCardSelectionsInUI();
                autoCompileTweetText();
                showComposer();
            });
            
            itemsContainer.appendChild(cardEl);
        });
        
        updatesContainer.appendChild(groupEl);
    });
}

// Selection Handlers
function toggleItemSelection(id) {
    if (appState.selectedIds.has(id)) {
        appState.selectedIds.delete(id);
    } else {
        appState.selectedIds.add(id);
    }
    
    syncCardSelectionsInUI();
    autoCompileTweetText();
    
    if (appState.selectedIds.size > 0) {
        showComposer();
    } else {
        hideComposer();
    }
}

// Synchronize selected cards borders and checkboxes
function syncCardSelectionsInUI() {
    document.querySelectorAll('.update-card').forEach(card => {
        const id = card.getAttribute('data-id');
        const checkbox = card.querySelector('.checkbox-container input');
        
        if (appState.selectedIds.has(id)) {
            card.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        } else {
            card.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        }
    });
}

// Slide control functions for composer drawer
function showComposer() {
    composerPanel.classList.remove('hidden');
    document.body.classList.add('composer-open');
}

function hideComposer() {
    composerPanel.classList.add('hidden');
    document.body.classList.remove('composer-open');
}

// Automatically compiles selected updates into a cohesive draft Tweet
function autoCompileTweetText() {
    const selectedUpdates = appState.updates.filter(u => appState.selectedIds.has(u.id));
    selectionCountEl.textContent = `${selectedUpdates.length} item${selectedUpdates.length !== 1 ? 's' : ''} selected`;
    
    if (selectedUpdates.length === 0) {
        composerTextarea.value = '';
        updateProgressRing(0);
        return;
    }
    
    let tweetText = "";
    
    if (selectedUpdates.length === 1) {
        const item = selectedUpdates[0];
        let emoji = "💡";
        const typeLower = item.type.toLowerCase();
        
        if (typeLower.includes('feature')) emoji = "💡";
        else if (typeLower.includes('announcement')) emoji = "📢";
        else if (typeLower.includes('issue')) emoji = "⚠️";
        else if (typeLower.includes('deprecation')) emoji = "🛑";
        
        const header = `${emoji} #BigQuery Update: [${item.type}] (${item.date})\n\n`;
        const footer = `\n\nLink: ${item.link}`;
        
        // Character calculations
        const maxTextLen = 280 - header.length - footer.length;
        let bodyText = item.text_content;
        
        if (bodyText.length > maxTextLen) {
            bodyText = bodyText.substring(0, maxTextLen - 3) + "...";
        }
        
        tweetText = `${header}${bodyText}${footer}`;
    } else {
        // Sort selected items chronologically descending
        selectedUpdates.sort((a, b) => new Date(b.updated) - new Date(a.updated));
        
        const header = `📢 Latest #BigQuery Updates Compiled:\n\n`;
        const footer = `\n\nFull release logs & links at source.`;
        const itemLines = [];
        
        selectedUpdates.forEach((item) => {
            let emoji = "•";
            const typeLower = item.type.toLowerCase();
            if (typeLower.includes('feature')) emoji = "💡";
            else if (typeLower.includes('announcement')) emoji = "📢";
            else if (typeLower.includes('issue')) emoji = "⚠️";
            else if (typeLower.includes('deprecation')) emoji = "🛑";
            
            let summary = item.text_content;
            if (summary.length > 55) {
                summary = summary.substring(0, 52) + "...";
            }
            itemLines.push(`${emoji} [${item.type}] (${item.date}): ${summary}`);
        });
        
        let itemsText = itemLines.join('\n');
        
        // Truncate list if total characters exceeds limit
        const totalLen = header.length + itemsText.length + footer.length;
        if (totalLen > 280) {
            const allowedLen = 280 - header.length - footer.length;
            let currentText = "";
            for (let i = 0; i < itemLines.length; i++) {
                const testText = currentText + (i > 0 ? '\n' : '') + itemLines[i];
                if (testText.length > allowedLen - 15) {
                    currentText += '\n... and more updates!';
                    break;
                }
                currentText = testText;
            }
            itemsText = currentText;
        }
        
        tweetText = `${header}${itemsText}${footer}`;
    }
    
    composerTextarea.value = tweetText;
    updateProgressRing(tweetText.length);
}

// User-edited Tweet input listener
function handleComposerInput(e) {
    const textLength = e.target.value.length;
    updateProgressRing(textLength);
}

// Clear selections and reset fields
function clearComposerSelection() {
    appState.selectedIds.clear();
    syncCardSelectionsInUI();
    autoCompileTweetText();
    hideComposer();
}

// Update circular character indicator ring and labels
function updateProgressRing(length) {
    const limit = 280;
    const remaining = limit - length;
    charCounter.textContent = remaining;
    
    // Circular calculations
    const offset = circleCircumference - (Math.min(length, limit) / limit) * circleCircumference;
    progressCircle.style.strokeDashoffset = offset;
    
    // Alert statuses
    if (remaining < 0) {
        progressCircle.style.stroke = '#ef4444'; // Red
        charCounter.className = 'counter-text error';
        tweetBtn.disabled = true;
    } else if (remaining < 20) {
        progressCircle.style.stroke = '#f59e0b'; // Orange
        charCounter.className = 'counter-text warning';
        tweetBtn.disabled = false;
    } else {
        progressCircle.style.stroke = '#1da1f2'; // Blue
        charCounter.className = 'counter-text';
        tweetBtn.disabled = false;
    }
    
    if (length === 0) {
        tweetBtn.disabled = true;
    }
}

// Dispatch compiled/edited tweet to Twitter/X web intent
function handleTweetPosting() {
    const tweetText = composerTextarea.value.trim();
    if (!tweetText) return;
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
}
