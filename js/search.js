let allArticles = [];

document.addEventListener('DOMContentLoaded', function() {
    loadAllArticles();
    
    // Add enter key listener for search input
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});

function loadAllArticles() {
    // First load index for latest articles
    fetch('data/index.json')
        .then(response => response.json())
        .then(articles => {
            allArticles = articles;
        })
        .catch(error => {
            console.error('Error loading articles:', error);
        });
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }
    
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Searching...</p></div>';
    
    // Filter articles based on search term and category
    const results = allArticles.filter(article => {
        const matchesSearch = article.title.toLowerCase().includes(searchTerm) ||
                             (article.summary && article.summary.toLowerCase().includes(searchTerm)) ||
                             (article.content && article.content.toLowerCase().includes(searchTerm));
        
        const matchesCategory = categoryFilter === 'all' || 
                               article.category.toLowerCase() === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    displaySearchResults(results, searchTerm);
}

function displaySearchResults(results, searchTerm) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <p>No results found for "${searchTerm}"</p>
            </div>
        `;
        return;
    }
    
    resultsDiv.innerHTML = `
        <h3>Found ${results.length} result${results.length > 1 ? 's' : ''} for "${searchTerm}"</h3>
        ${results.map(article => `
            <div class="search-result-item glass-effect">
                <a href="report.html?id=${article.id}">
                    <h4 class="result-title">${article.title}</h4>
                    <div class="result-meta">
                        <span>📅 ${formatDate(article.date)}</span>
                        <span>🏷️ ${article.category}</span>
                    </div>
                    <p class="result-excerpt">${article.summary || article.content ? (article.content || article.summary).substring(0, 200) + '...' : ''}</p>
                </a>
            </div>
        `).join('')}
    `;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
