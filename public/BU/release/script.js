import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Elemento contenedor de productos
const productosContainer = document.getElementById('productos-container');

// Función para cargar los productos desde Firestore
async function cargarProductos() {
  productosContainer.innerHTML = ''; // Limpiar el contenedor
  const querySnapshot = await getDocs(collection(db, 'productos'));

  querySnapshot.forEach((doc) => {
    const producto = doc.data();
    const productoId = doc.id; // Obtener el ID del producto

    // Crear el HTML para cada producto
    const productoHTML = `
      <div class="producto" data-id="${productoId}">
        <h2>${producto.nombre}</h2>
        <p>${producto.descripcion}</p>
        <p>Precio: $${producto.precio}</p>
        <img src="${producto.imagenes[Object.keys(producto.imagenes)[0]][0]}" alt="${producto.nombre}" width="100">
      </div>
    `;

    // Añadir el producto al contenedor
    productosContainer.innerHTML += productoHTML;
  });

  // Hacer que cada producto sea "clicable"
  document.querySelectorAll('.producto').forEach((producto) => {
    producto.addEventListener('click', () => {
      const productoId = producto.getAttribute('data-id');
      window.location.href = `detalles.html?id=${productoId}`; // Redirigir a detalles.html con el ID del producto
    });
  });
}

// Cargar los productos al iniciar la página
cargarProductos();