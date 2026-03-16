// Load homepage content
document.addEventListener('DOMContentLoaded', function() {
    loadHomepageNews();
    loadTrendingNews();
});

function loadHomepageNews() {
    const newsGrid = document.getElementById('newsGrid');
    
    // Show loading state
    newsGrid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading latest news...</p></div>';
    
    fetch('data/index.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(articles => {
            displayHomepageNews(articles);
        })
        .catch(error => {
            console.error('Error loading news:', error);
            newsGrid.innerHTML = '<div class="no-results">Failed to load news. Please try again later.</div>';
        });
}

function displayHomepageNews(articles) {
    const newsGrid = document.getElementById('newsGrid');
    
    if (!articles || articles.length === 0) {
        newsGrid.innerHTML = '<div class="no-results">No articles available.</div>';
        return;
    }
    
    newsGrid.innerHTML = articles.map(article => `
        <div class="news-card glass-effect" onclick="window.location.href='report.html?id=${article.id}'">
            <div class="news-card-content">
                <span class="news-category">${article.category}</span>
                <h3 class="news-title">${article.title}</h3>
                <p class="news-summary">${article.summary || article.content ? article.content.substring(0, 150) + '...' : ''}</p>
                <div class="news-date">
                    <span>📅 ${formatDate(article.date)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function loadTrendingNews() {
    const trendingDiv = document.getElementById('trendingNews');
    
    fetch('data/index.json')
        .then(response => response.json())
        .then(articles => {
            // Get 5 most recent articles for trending
            const trending = articles.slice(0, 5);
            
            trendingDiv.innerHTML = trending.map(article => `
                <span class="trending-item">
                    <a href="report.html?id=${article.id}">${article.title}</a>
                </span>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading trending news:', error);
        });
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
