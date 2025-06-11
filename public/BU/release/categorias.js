import { db } from "./firebase-config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const categoriasContainer = document.getElementById('categorias-container');

async function cargarCategorias() {
  try {
    const querySnapshot = await getDocs(query(collection(db, 'categorias'), orderBy('nombre')));
    
    if (querySnapshot.empty) {
      categoriasContainer.innerHTML = '<p class="no-categorias">No hay categorías disponibles.</p>';
      return;
    }

    querySnapshot.forEach((doc) => {
      const categoria = doc.data();
      const categoriaId = doc.id;

      const categoriaHTML = `
        <div class="categoria" data-id="${categoriaId}">
          <img src="${categoria.imagen}" alt="${categoria.nombre}" class="categoria-imagen">
          <div class="categoria-info">
            <h2>${categoria.nombre}</h2>
          </div>
        </div>
      `;

      categoriasContainer.innerHTML += categoriaHTML;
    });

    // Hacer cada categoría clickeable
    document.querySelectorAll('.categoria').forEach(categoria => {
      categoria.addEventListener('click', () => {
        const categoriaId = categoria.getAttribute('data-id');
        window.location.href = `productos.html?categoria=${categoriaId}`;
      });
    });
    
  } catch (error) {
    console.error('Error al cargar categorías:', error);
    categoriasContainer.innerHTML = '<p class="error">Error al cargar las categorías. Inténtalo de nuevo más tarde.</p>';
  }
}

// Cargar categorías al iniciar la página
cargarCategorias();