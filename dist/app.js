const itemsContainer = document.querySelector('#items');
const resultCount = document.querySelector('#result-count');
const search = document.querySelector('#search');
const category = document.querySelector('#category');
let items = [];

function renderItems() {
  const query = search.value.trim().toLowerCase();
  const matches = items.filter(item => (!category.value || item.category === category.value) && `${item.name} ${item.description}`.toLowerCase().includes(query));
  itemsContainer.replaceChildren();
  for (const item of matches) {
    const card = document.createElement('article');
    card.className = 'item';
    const image = document.createElement('div');
    image.className = 'item-image';
    image.setAttribute('aria-hidden', 'true');
    image.textContent = item.picture;
    const free = document.createElement('span');
    free.className = 'free-tag';
    free.textContent = 'FREE';
    image.append(free);
    const copy = document.createElement('div');
    copy.className = 'item-copy';
    const categoryText = document.createElement('span');
    categoryText.className = 'item-category';
    categoryText.textContent = item.category;
    const title = document.createElement('h3');
    title.textContent = item.name;
    const description = document.createElement('p');
    description.className = 'item-description';
    description.textContent = item.description;
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    const condition = document.createElement('span');
    condition.textContent = item.condition;
    const location = document.createElement('span');
    location.textContent = item.location;
    meta.append(condition, location);
    copy.append(categoryText, title, description, meta);
    card.append(image, copy);
    itemsContainer.append(card);
  }
  resultCount.textContent = `${matches.length} sample ${matches.length === 1 ? 'item' : 'items'}`;
  document.querySelector('#empty-state').hidden = matches.length > 0;
}

search.addEventListener('input', renderItems);
category.addEventListener('change', renderItems);
document.querySelector('#filters').addEventListener('submit', event => event.preventDefault());
fetch('data/items.json')
  .then(response => {
    if (!response.ok) throw new Error('Unable to load sample items.');
    return response.json();
  })
  .then(data => { items = data; renderItems(); })
  .catch(() => { resultCount.textContent = 'Sample items could not be loaded. Please refresh the page.'; });
