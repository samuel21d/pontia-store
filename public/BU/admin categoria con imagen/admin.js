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
const imagenCategoriaInput = document.getElementById('imagen-categoria');
let productoEditando = null;

// Función para subir una imagen a Cloudinary
const subirImagen = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'pontia-preset');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dyqxzguo6/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error al subir imagen:', error);
    return null;
  }
};

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
        <img src="${categoria.imagen}" alt="${categoria.nombre}" width="100">
        <h3>${categoria.nombre}</h3>
        <button class="editar" onclick="editarCategoria('${categoriaId}')">Editar</button>
        <button class="eliminar" onclick="eliminarCategoria('${categoriaId}')">Eliminar</button>
      </div>
    `;
    listaCategorias.innerHTML += categoriaHTML;
  });
  
  await cargarCategoriasEnSelector();
}

formCategoria.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nombre = document.getElementById('nombre-categoria').value.trim();
  const imagenFile = imagenCategoriaInput.files[0];
  
  if (!nombre || !imagenFile) {
    alert('Por favor, completa todos los campos.');
    return;
  }
  
  try {
    // Subir imagen
    const imagenUrl = await subirImagen(imagenFile);
    if (!imagenUrl) {
      throw new Error('Error al subir la imagen');
    }
    
    await addDoc(collection(db, 'categorias'), {
      nombre,
      imagen: imagenUrl,
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

window.editarCategoria = async (id) => {
  const nuevoNombre = prompt('Ingrese el nuevo nombre para la categoría:');
  const nuevaImagen = confirm('¿Desea cambiar la imagen?');
  
  let nuevaImagenUrl = null;
  
  if (nuevaImagen) {
    // Simulamos un input de archivo para cambiar la imagen
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        nuevaImagenUrl = await subirImagen(file);
      }
      actualizarCategoria(id, nuevoNombre, nuevaImagenUrl);
    };
    input.click();
  } else {
    await actualizarCategoria(id, nuevoNombre, null);
  }
};

async function actualizarCategoria(id, nuevoNombre, nuevaImagenUrl) {
  if (!nuevoNombre || !nuevoNombre.trim()) {
    return;
  }
  
  try {
    const updateData = {
      nombre: nuevoNombre.trim()
    };
    
    if (nuevaImagenUrl) {
      updateData.imagen = nuevaImagenUrl;
    }
    
    await updateDoc(doc(db, 'categorias', id), updateData);
    alert('Categoría actualizada correctamente');
    cargarCategorias();
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    alert('Hubo un error al actualizar la categoría');
  }
}

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

async function handleSubmit(e) {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value;
  const descripcion = document.getElementById('descripcion').value;
  const precio = document.getElementById('precio').value;
  const categoriaId = document.getElementById('categoria').value;
  const tallas = document.getElementById('tallas').value.split(',').map(talla => talla.trim());

  if (!categoriaId) {
    alert('Por favor, seleccione una categoría.');
    return;
  }

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

cerrarSesionBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert('Sesión cerrada correctamente');
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
});