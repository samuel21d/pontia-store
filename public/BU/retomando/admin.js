import { db } from "./firebase-config.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; // Añadir signOut
import { app } from "./firebase-config.js";

const auth = getAuth(app);

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Si no hay usuario autenticado, redirigir a la página de inicio de sesión
    window.location.href = 'login.html';
  } else {
    // Si el usuario está autenticado, cargar el panel de administración
    cargarProductos();
  }
});

const formProducto = document.getElementById('form-producto');
const listaProductos = document.getElementById('lista-productos');
const agregarColorBtn = document.getElementById('agregar-color');
const cerrarSesionBtn = document.getElementById('cerrar-sesion'); // Botón de cerrar sesión
let productoEditando = null;

// Función para subir una imagen a Cloudinary
const subirImagen = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'pontia-preset');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/dyqxzguo6/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await response.json();
  return data.secure_url;
};

// Función para añadir un nuevo grupo de color
agregarColorBtn.addEventListener('click', () => {
  const coloresContainer = document.getElementById('colores-container');
  const nuevoColorGroup = document.createElement('div');
  nuevoColorGroup.className = 'color-group';
  nuevoColorGroup.innerHTML = `
    <label>Color:</label>
    <input type="text" class="color" placeholder="Ej: Rojo" required>
    <label>Imágenes (sube archivos):</label>
    <input type="file" class="imagenes" accept="image/*" multiple required>
  `;
  coloresContainer.appendChild(nuevoColorGroup);
});

// Función para manejar el envío del formulario
async function handleSubmit(e) {
  e.preventDefault();

  // Obtener los valores del formulario
  const nombre = document.getElementById('nombre').value;
  const descripcion = document.getElementById('descripcion').value;
  const precio = document.getElementById('precio').value;
  const tallas = document.getElementById('tallas').value.split(',').map(talla => talla.trim());

  // Obtener colores e imágenes dinámicamente
  const coloresGroups = document.querySelectorAll('.color-group');
  const imagenes = {};
  const colores = [];

  for (const group of coloresGroups) {
    const color = group.querySelector('.color').value.trim();
    const archivos = group.querySelector('.imagenes').files;

    if (color) {
      const urls = [];
      if (archivos.length > 0) {
        // Subir nuevas imágenes a Cloudinary
        for (const archivo of archivos) {
          const url = await subirImagen(archivo);
          urls.push(url);
        }
      } else {
        // Mantener las imágenes existentes
        const imagenesExistentes = group.querySelector('.imagenes-existente')?.querySelectorAll('img') || [];
        imagenesExistentes.forEach(img => urls.push(img.src));
      }
      imagenes[color] = urls;
      colores.push(color);
    }
  }

  // Validar que los campos no estén vacíos
  if (!nombre || !descripcion || !precio || !tallas || colores.length === 0) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  try {
    if (productoEditando) {
      // Si se está editando un producto, actualizarlo en Firestore
      await updateDoc(doc(db, 'productos', productoEditando), {
        nombre,
        descripcion,
        precio,
        tallas,
        colores,
        imagenes
      });
      alert('Producto actualizado correctamente');
      productoEditando = null; // Limpiar la variable de edición

      // Restaurar el botón a "Agregar Producto"
      const botonSubmit = formProducto.querySelector('button[type="submit"]');
      botonSubmit.textContent = 'Agregar Producto';
    } else {
      // Si no, agregar un nuevo producto
      await addDoc(collection(db, 'productos'), {
        nombre,
        descripcion,
        precio,
        tallas,
        colores,
        imagenes
      });
      alert('Producto agregado correctamente');
    }

    // Limpiar el formulario y recargar la lista de productos
    formProducto.reset();
    document.getElementById('colores-container').innerHTML = `
      <div class="color-group">
        <label>Color:</label>
        <input type="text" class="color" placeholder="Ej: Rojo" required>
        <label>Imágenes (sube archivos):</label>
        <input type="file" class="imagenes" accept="image/*" multiple required>
      </div>
    `;
    cargarProductos();
  } catch (error) {
    console.error('Error al guardar el producto:', error);
  }
}

// Eliminar el event listener existente antes de agregar uno nuevo
formProducto.removeEventListener('submit', handleSubmit);
formProducto.addEventListener('submit', handleSubmit);

// Cargar productos
async function cargarProductos() {
  listaProductos.innerHTML = '';
  const querySnapshot = await getDocs(collection(db, 'productos'));

  querySnapshot.forEach((doc) => {
    const producto = doc.data();
    const productoId = doc.id;

    // Crear el HTML para cada producto
    const productoHTML = `
      <div class="producto">
        <h2>${producto.nombre}</h2>
        <p>${producto.descripcion}</p>
        <p>Precio: $${producto.precio}</p>
        <p>Tallas: ${producto.tallas.join(', ')}</p>
        <p>Colores: ${producto.colores.join(', ')}</p>
        <img src="${producto.imagenes[Object.keys(producto.imagenes)[0]][0]}" alt="${producto.nombre}" width="100">
        <button class="editar" onclick="editarProducto('${productoId}')">Editar</button>
        <button class="eliminar" onclick="eliminarProducto('${productoId}')">Eliminar</button>
      </div>
    `;
    listaProductos.innerHTML += productoHTML;
  });
}

// Eliminar producto
window.eliminarProducto = async (id) => {
  // Mostrar un pop-up de confirmación
  const confirmarEliminacion = confirm("¿Estás seguro de que deseas eliminar este producto?");
  
  if (confirmarEliminacion) {
    try {
      await deleteDoc(doc(db, 'productos', id));
      alert('Producto eliminado correctamente');
      cargarProductos();
    } catch (error) {
      console.error('Error al eliminar producto: ', error);
    }
  } else {
    alert('Eliminación cancelada');
  }
};

// Función para editar un producto
window.editarProducto = async (id) => {
  const productoRef = doc(db, 'productos', id);
  const productoSnap = await getDoc(productoRef);

  if (productoSnap.exists()) {
    const producto = productoSnap.data();

    // Cargar los datos del producto en el formulario
    document.getElementById('nombre').value = producto.nombre;
    document.getElementById('descripcion').value = producto.descripcion;
    document.getElementById('precio').value = producto.precio;
    document.getElementById('tallas').value = producto.tallas.join(', ');

    // Limpiar el contenedor de colores
    const coloresContainer = document.getElementById('colores-container');
    coloresContainer.innerHTML = '';

    // Cargar los colores e imágenes
    producto.colores.forEach((color, index) => {
      const nuevoColorGroup = document.createElement('div');
      nuevoColorGroup.className = 'color-group';
      nuevoColorGroup.innerHTML = `
        <label>Color:</label>
        <input type="text" class="color" value="${color}" required>
        <label>Imágenes (sube archivos):</label>
        <input type="file" class="imagenes" accept="image/*" multiple>
        <div class="imagenes-existente">
          <p>Imágenes existentes:</p>
          ${producto.imagenes[color].map(url => `
            <div class="imagen-container">
              <img src="${url}" alt="Imagen existente" width="50">
              <span class="eliminar-imagen" onclick="eliminarImagen('${color}', '${url}', this)">×</span>
            </div>
          `).join('')}
        </div>
      `;
      coloresContainer.appendChild(nuevoColorGroup);
    });

    // Guardar el ID del producto que se está editando
    productoEditando = id;

    // Cambiar el texto del botón de "Agregar Producto" a "Guardar Cambios"
    const botonSubmit = formProducto.querySelector('button[type="submit"]');
    botonSubmit.textContent = 'Guardar Cambios';
    botonSubmit.removeAttribute('disabled');
  } else {
    alert('Producto no encontrado');
  }
};

// Función para eliminar una imagen existente
window.eliminarImagen = async (color, url, elemento) => {
  if (!productoEditando) {
    alert('No se está editando ningún producto.');
    return;
  }

  const productoRef = doc(db, 'productos', productoEditando);
  const productoSnap = await getDoc(productoRef);

  if (productoSnap.exists()) {
    const producto = productoSnap.data();
    const imagenesActualizadas = producto.imagenes[color].filter(imagenUrl => imagenUrl !== url);

    // Actualizar el producto en Firestore
    await updateDoc(productoRef, {
      [`imagenes.${color}`]: imagenesActualizadas
    });

    // Eliminar la miniatura del DOM
    elemento.parentElement.remove(); // Elimina el contenedor de la imagen

    alert('Imagen eliminada correctamente');
    cargarProductos();
  } else {
    alert('Producto no encontrado');
  }
};

// Cerrar sesión
cerrarSesionBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert('Sesión cerrada correctamente');
    window.location.href = 'login.html'; // Redirigir a la página de login
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
});