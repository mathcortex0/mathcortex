let currentArticle = null;

document.addEventListener('DOMContentLoaded', function() {
    loadArticle();
});

function loadArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (!articleId) {
        window.location.href = 'index.html';
        return;
    }
    
    const articleContainer = document.getElementById('articleContainer');
    articleContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading article...</p></div>';
    
    fetch(`articles/${articleId}.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(article => {
            currentArticle = article;
            displayArticle(article);
            loadRelatedArticles(article.category, articleId);
        })
        .catch(error => {
            console.error('Error loading article:', error);
            articleContainer.innerHTML = '<div class="no-results">Article not found.</div>';
        });
}

function displayArticle(article) {
    document.getElementById('articleCategory').textContent = article.category;
    document.getElementById('articleTitle').textContent = article.title;
    document.getElementById('articleDate').textContent = formatDate(article.date);
    document.getElementById('articleContent').innerHTML = formatContent(article.content);
    
    // Update page title
    document.title = `${article.title} - Alamin Network`;
}

function formatContent(content) {
    // Convert plain text to paragraphs
    return content.split('\n\n').map(paragraph => 
        `<p>${paragraph}</p>`
    ).join('');
}

function loadRelatedArticles(category, currentId) {
    const relatedDiv = document.getElementById('relatedArticles');
    
    fetch(`data/${category.toLowerCase()}.json`)
        .then(response => response.json())
        .then(articles => {
            // Filter out current article and get 3 random ones
            const related = articles
                .filter(article => article.id.toString() !== currentId)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
            
            if (related.length === 0) {
                relatedDiv.innerHTML = '<p class="no-results">No related articles found.</p>';
                return;
            }
            
            relatedDiv.innerHTML = related.map(article => `
                <div class="related-item glass-effect">
                    <a href="report.html?id=${article.id}">
                        <h4 class="related-title">${article.title}</h4>
                        <div class="related-date">${formatDate(article.date)}</div>
                    </a>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading related articles:', error);
            relatedDiv.innerHTML = '';
        });
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function downloadAsPNG() {
    if (!currentArticle) return;
    
    const element = document.getElementById('articleContainer');
    
    html2canvas(element, {
        scale: 2,
        backgroundColor: '#0a192f'
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `alamin-${currentArticle.id}-summary.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}
