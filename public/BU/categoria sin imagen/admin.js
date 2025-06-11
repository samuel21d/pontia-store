import { db } from "./firebase-config.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    cargarProductos();
    cargarCategorias();
  }
});

const formProducto = document.getElementById('form-producto');
const formCategoria = document.getElementById('form-categoria');
const listaProductos = document.getElementById('lista-productos');
const listaCategorias = document.getElementById('lista-categorias');
const agregarColorBtn = document.getElementById('agregar-color');
const cerrarSesionBtn = document.getElementById('cerrar-sesion');
const selectCategoria = document.getElementById('categoria');
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

// Función para cargar categorías en el selector
async function cargarCategoriasEnSelector() {
  selectCategoria.innerHTML = '<option value="">Seleccione una categoría</option>';
  
  const querySnapshot = await getDocs(query(collection(db, 'categorias'), orderBy('nombre')));
  querySnapshot.forEach((doc) => {
    const categoria = doc.data();
    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = categoria.nombre;
    selectCategoria.appendChild(option);
  });
}

// Función para cargar la lista de categorías
async function cargarCategorias() {
  listaCategorias.innerHTML = '';
  const querySnapshot = await getDocs(query(collection(db, 'categorias'), orderBy('nombre')));
  
  if (querySnapshot.empty) {
    listaCategorias.innerHTML = '<p>No hay categorías creadas aún.</p>';
    return;
  }

  querySnapshot.forEach((doc) => {
    const categoria = doc.data();
    const categoriaId = doc.id;

    const categoriaHTML = `
      <div class="categoria-item">
        <h3>${categoria.nombre}</h3>
        <button class="editar" onclick="editarCategoria('${categoriaId}')">Editar</button>
        <button class="eliminar" onclick="eliminarCategoria('${categoriaId}')">Eliminar</button>
      </div>
    `;
    listaCategorias.innerHTML += categoriaHTML;
  });
  
  // Cargar categorías en el selector de productos
  await cargarCategoriasEnSelector();
}

// Función para crear una nueva categoría
formCategoria.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nombre = document.getElementById('nombre-categoria').value.trim();
  
  if (!nombre) {
    alert('Por favor, ingresa un nombre para la categoría.');
    return;
  }
  
  try {
    await addDoc(collection(db, 'categorias'), {
      nombre,
      creadoEn: new Date()
    });
    alert('Categoría creada correctamente');
    formCategoria.reset();
    cargarCategorias();
  } catch (error) {
    console.error('Error al crear categoría:', error);
    alert('Hubo un error al crear la categoría');
  }
});

// Función para editar una categoría
window.editarCategoria = async (id) => {
  const nuevoNombre = prompt('Ingrese el nuevo nombre para la categoría:');
  if (nuevoNombre && nuevoNombre.trim()) {
    try {
      await updateDoc(doc(db, 'categorias', id), {
        nombre: nuevoNombre.trim()
      });
      alert('Categoría actualizada correctamente');
      cargarCategorias();
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      alert('Hubo un error al actualizar la categoría');
    }
  }
};

// Función para eliminar una categoría
window.eliminarCategoria = async (id) => {
  if (confirm('¿Está seguro de que desea eliminar esta categoría?')) {
    try {
      await deleteDoc(doc(db, 'categorias', id));
      alert('Categoría eliminada correctamente');
      cargarCategorias();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      alert('Hubo un error al eliminar la categoría');
    }
  }
};

// Función para manejar el envío del formulario de productos
async function handleSubmit(e) {
  e.preventDefault();

  // Obtener los valores del formulario
  const nombre = document.getElementById('nombre').value;
  const descripcion = document.getElementById('descripcion').value;
  const precio = document.getElementById('precio').value;
  const categoriaId = document.getElementById('categoria').value;
  const tallas = document.getElementById('tallas').value.split(',').map(talla => talla.trim());

  // Validar categoría
  if (!categoriaId) {
    alert('Por favor, seleccione una categoría.');
    return;
  }

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
        for (const archivo of archivos) {
          const url = await subirImagen(archivo);
          urls.push(url);
        }
      } else {
        const imagenesExistentes = group.querySelector('.imagenes-existente')?.querySelectorAll('img') || [];
        imagenesExistentes.forEach(img => urls.push(img.src));
      }
      imagenes[color] = urls;
      colores.push(color);
    }
  }

  // Validar campos
  if (!nombre || !descripcion || !precio || !tallas || colores.length === 0) {
    alert('Por favor, completa todos los campos.');
    return;
  }

  try {
    if (productoEditando) {
      await updateDoc(doc(db, 'productos', productoEditando), {
        nombre,
        descripcion,
        precio,
        categoriaId,
        tallas,
        colores,
        imagenes
      });
      alert('Producto actualizado correctamente');
      productoEditando = null;
      const botonSubmit = formProducto.querySelector('button[type="submit"]');
      botonSubmit.textContent = 'Agregar Producto';
    } else {
      await addDoc(collection(db, 'productos'), {
        nombre,
        descripcion,
        precio,
        categoriaId,
        tallas,
        colores,
        imagenes
      });
      alert('Producto agregado correctamente');
    }

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

formProducto.removeEventListener('submit', handleSubmit);
formProducto.addEventListener('submit', handleSubmit);

// Cargar productos
async function cargarProductos() {
  listaProductos.innerHTML = '';
  const querySnapshot = await getDocs(collection(db, 'productos'));

  querySnapshot.forEach((doc) => {
    const producto = doc.data();
    const productoId = doc.id;

    const productoHTML = `
      <div class="producto">
        <h2>${producto.nombre}</h2>
        <p>${producto.descripcion}</p>
        <p>Precio: $${producto.precio}</p>
        <p>Categoría: ${producto.categoriaId ? 'ID ' + producto.categoriaId : 'Sin categoría'}</p>
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
  if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
    try {
      await deleteDoc(doc(db, 'productos', id));
      alert('Producto eliminado correctamente');
      cargarProductos();
    } catch (error) {
      console.error('Error al eliminar producto: ', error);
    }
  }
};

// Función para editar un producto
window.editarProducto = async (id) => {
  const productoRef = doc(db, 'productos', id);
  const productoSnap = await getDoc(productoRef);

  if (productoSnap.exists()) {
    const producto = productoSnap.data();

    document.getElementById('nombre').value = producto.nombre;
    document.getElementById('descripcion').value = producto.descripcion;
    document.getElementById('precio').value = producto.precio;
    document.getElementById('tallas').value = producto.tallas.join(', ');
    document.getElementById('categoria').value = producto.categoriaId || '';

    const coloresContainer = document.getElementById('colores-container');
    coloresContainer.innerHTML = '';

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

    productoEditando = id;
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

    await updateDoc(productoRef, {
      [`imagenes.${color}`]: imagenesActualizadas
    });

    elemento.parentElement.remove();
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
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
});