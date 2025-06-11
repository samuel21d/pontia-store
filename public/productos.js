import { db } from "./firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const productosContainer = document.getElementById('productos-container');
const tituloPagina = document.querySelector('h1');

async function cargarProductos() {
  productosContainer.innerHTML = '';
  
  // Obtener categoría de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const categoriaId = urlParams.get('categoria');
  
  // Obtener referencia a la colección
  let productosRef;
  
  if (categoriaId) {
    // Filtrar por categoría
    productosRef = query(collection(db, 'productos'), where('categoriaId', '==', categoriaId));
    
    // Obtener nombre de la categoría para el título
    try {
      const categoriaDoc = await getDoc(doc(db, 'categorias', categoriaId));
      if (categoriaDoc.exists()) {
        const categoria = categoriaDoc.data();
        tituloPagina.innerHTML = `Productos de ${categoria.nombre}`;
      }
    } catch (error) {
      console.error('Error al obtener categoría:', error);
    }
  } else {
    // Mostrar todos los productos
    productosRef = collection(db, 'productos');
    tituloPagina.innerHTML = 'Todos nuestros productos';
  }

  const querySnapshot = await getDocs(productosRef);

  if (querySnapshot.empty) {
    productosContainer.innerHTML = '<p class="no-productos">No hay productos disponibles en esta categoría.</p>';
    return;
  }

  querySnapshot.forEach((doc) => {
    const producto = doc.data();
    const productoId = doc.id;

    const productoHTML = `
      <div class="producto" data-id="${productoId}">
        <h2>${producto.nombre}</h2>
        <p>${producto.descripcion}</p>
        <p class="precio">$${producto.precio}</p>
        <img src="${producto.imagenes[Object.keys(producto.imagenes)[0]][0]}" alt="${producto.nombre}">
      </div>
    `;

    productosContainer.innerHTML += productoHTML;
  });

  // Hacer que cada producto sea "clicable"
  document.querySelectorAll('.producto').forEach((producto) => {
    producto.addEventListener('click', () => {
      const productoId = producto.getAttribute('data-id');
      window.location.href = `detalles.html?id=${productoId}`;
    });
  });
}

// Cargar los productos al iniciar la página
cargarProductos();