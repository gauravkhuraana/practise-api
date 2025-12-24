export function renderPlaceholder(outlet, { title, hint }) {
  outlet.innerHTML = `
    <h1 class="card__title"></h1>
    <p class="muted"></p>
  `;
  outlet.querySelector('h1').textContent = title;
  outlet.querySelector('p').textContent = hint;
}
