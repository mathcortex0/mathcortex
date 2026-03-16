document.addEventListener('DOMContentLoaded', function() {
    loadCategoryNews();
    
    // Add sort listener
    document.getElementById('sortSelect').addEventListener('change', function() {
        loadCategoryNews(this.value);
    });
});

function loadCategoryNews(sortOrder = 'newest') {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('cat');
    
    if (!category) {
        window.location.href = 'index.html';
        return;
    }
    
    // Update category title
    document.getElementById('categoryTitle').textContent = 
        category.charAt(0).toUpperCase() + category.slice(1) + ' News';
    
    const newsList = document.getElementById('newsList');
    newsList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading articles...</p></div>';
    
    fetch(`data/${category}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(articles => {
            displayCategoryNews(articles, sortOrder);
        })
        .catch(error => {
            console.error('Error loading category news:', error);
            newsList.innerHTML = '<div class="no-results">No articles found in this category.</div>';
        });
}

function displayCategoryNews(articles, sortOrder) {
    const newsList = document.getElementById('newsList');
    
    if (!articles || articles.length === 0) {
        newsList.innerHTML = '<div class="no-results">No articles available in this category.</div>';
        return;
    }
    
    // Sort articles
    const sortedArticles = [...articles].sort((a, b) => {
        if (sortOrder === 'newest') {
            return new Date(b.date) - new Date(a.date);
        } else {
            return new Date(a.date) - new Date(b.date);
        }
    });
    
    newsList.innerHTML = sortedArticles.map(article => `
        <div class="news-list-item glass-effect">
            <a href="report.html?id=${article.id}">
                <h3 class="news-list-title">${article.title}</h3>
                <div class="news-list-meta">
                    <span>📅 ${formatDate(article.date)}</span>
                </div>
            </a>
        </div>
    `).join('');
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
