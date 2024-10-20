//funciones de obtener la estructura del tag
function get(item){
  return document.querySelector(item);
}
function getAll(items){
  return document.querySelectorAll(items);
}
function getFormatoFechaHora(date=null) {
  
  let fecha;
  const opciones = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  if (date) {
    fecha = new Date(date);
  }else{
    fecha = new Date();
  }
  return fecha.toLocaleDateString("es-ES", opciones);
  
}
//función de recortar el contenido de texto para mostrar
function recortarTexto(texto) {

  if (texto.length > 300) {
    const longitudMaxima = Math.floor(texto.length * 0.30); // Aplica el 40% si supera los 400 caracteres
    if (longitudMaxima > 300) {
      return texto.slice(0, 300) + '...'; // Recorta el texto y añade '...'  
    }else{
      return texto.slice(0, longitudMaxima) + '...'; // Recorta el texto y añade '...'
    }
  }
  return texto;
}

function ajustarViewport(elemento, margin) {
  const viewportHeight = window.innerHeight;  // Altura del viewport (pantalla)
  const elementoHeight = elemento.scrollHeight; // Altura total del contenido del elemento

  // Si la altura del contenido es mayor que la altura del viewport
  if (elementoHeight > viewportHeight) {
      elemento.style.marginBottom = `${margin}rem`;
  }
}

//CARGARO DE TEMPLATE
// Función generico template y clonarlo
function getTemplate(idTemplate) {
  const template = get(idTemplate);
  return document.importNode(template.content, true);
}


// MODULO PARA CARGAR
//cargar boton de eliminar
function getHtmlBotonEliminarNota() {
  const viewContent = get('#viewContent');
  //viewContent.innerHTML = ""; // Limpiar el contenido existente
  viewContent.appendChild(getTemplate("#tmtEliminar"));
  btnEliminar.addEventListener('click', async()=>{
    await NOTA.eliminar();
    listarNotas();
  })
}

//Cargar el formulario de html par la nota
function getHtmlFormularioNota() {
  const viewContent = get('#viewContent');
  viewContent.innerHTML = ""; // Limpiar el contenido existente
  viewContent.appendChild(getTemplate("#tmtListaCard"));
}

//Listar el listado de notas
function getHtmlListarNotas() {

}

//Funcion de escuchar los eventos de formulario para guaradar la nota
function addEnventNota() {
  // Escuchador de eventos en el formulario en el DOM
  const eventsToListen = ["change", "input"];
  const idCardTemplate = get("#idCardTemplate");
  
  eventsToListen.forEach((eventType) => {
    idCardTemplate.addEventListener(eventType, async (event) => {

      // Obtener el contenido y eliminar saltos de línea y espacios en blanco
      const contenido = get("#idContenido").innerText.replace(/[\r\n]+/g, " ").trim();
      const titulo = get("#idTitulo").textContent;
  
      // Validar que el contenido no esté vacío
      if (contenido.length==0) {
        //console.warn("E l contenido no puede estar vacío.");
        return; // Salir de la función si el contenido está vacío
      }
      if (NOTA.data == null) {
        NOTA.data = {};
        NOTA.data.titulo = titulo;
        NOTA.data.contenido = get("#idContenido").innerText;
        NOTA.data.fecha_creacion = `${new Date()}`;
        NOTA.data.fecha_edicion = null;
         await NOTA.crearNota(NOTA.data);
      } else {
        NOTA.data.titulo = titulo;
        NOTA.data.contenido = get('#idContenido').innerText;
        NOTA.data.fecha_edicion = `${new Date()}`;
        await NOTA.updateNota();
      }
      get("#idHora").innerText = getFormatoFechaHora();
      get("#idHora").style = 'color: var(--bcolor-success)';
    });
  });

  //Prevenir el salto de lines para el titulo
  get("#idTitulo").addEventListener("keydown", (event) =>{
    if (event.key === "Enter") {
      event.preventDefault();
    }
  });
  //
}


let longitud = [];

//listado de notas
async function listarNotas() {
  const viewContent = get("#viewContent");
  const contentNota = document.createDocumentFragment(); // Fragmento para evitar múltiples accesos al DOM

  viewContent.innerHTML = ""; // Limpiar el contenido existente
  viewContent.appendChild(getTemplate("#tmtLista"));

  // Crear y agregar las cards de notas en el fragmento
  let notas = await NOTA.ListNotas();

  notas.data.forEach((d) => {
    const notaTemplate = getTemplate("#tmtCardNota");
    notaTemplate.querySelector("h5").textContent = `${d.titulo} [${d.id}]`;
    notaTemplate.querySelector(".box--main span").textContent = recortarTexto(d.contenido);
    notaTemplate.querySelector("[data-id]").setAttribute("data-id", d.id);
    longitud.push(d.contenido.length);
    contentNota.appendChild(notaTemplate); // Agregar la nota al fragmento
  });

  // Agregar todas las notas al DOM de una sola vez
  get("#idContentNota").appendChild(contentNota);

  // Seleccionar todos los spans dentro de .box--main
  const cardClick = document.querySelectorAll(".nota__item .box");

  // Recorrer cada elemento y añadir el evento 'dblclick'
  cardClick.forEach((span) => {
    span.addEventListener("click", async (event) => {
      const idNota = Number(span.querySelector('[data-id]').getAttribute('data-id')); // Convertir a número
      try {
        const nota = await db.getRecord("nota", idNota); // Usar await dentro de un callback async
        getNotaId(idNota); // Llamar a la función para cargar la nota
      } catch (error) {
        console.error(`Error obteniendo la nota con ID: ${idNota}`, error);
      }
    });
  });

  ajustarViewport(get('#viewContent'),5)
}
// Función para obtener la nota por ID y mostrarla en una tarjeta
async function getNotaId(id) {
  // Obtener la nota usando el ID
  const nota = await NOTA.getNota(id);

  // Verificar si la nota existe
  if (!nota) {
    console.error(`No se encontró la nota con ID: ${id}`);
    return;
  }

  // Renderizar la vista de la tarjeta
  getHtmlFormularioNota();

  // Llenar el contenido del HTML renderizado con la información de la nota
  llenarContenidoNota(nota);
  addEnventNota();
  getHtmlBotonEliminarNota();

}

// Función para llenar el contenido de la tarjeta con los detalles de la nota
function llenarContenidoNota(nota) {
  // Elementos donde se mostrará la nota
  const idTitulo = get("#idTitulo");
  const idContenido = get("#idContenido");
  const idHora = get("#idHora");

  if (!idTitulo || !idContenido || !idHora) {
    console.error("No se encuentran los elementos necesarios en el DOM");
    return;
  }

  // Llenar el contenido de la tarjeta
  idTitulo.textContent = nota.titulo;
  idContenido.innerText = nota.contenido;
  idHora.innerText = `Creado: ${getFormatoFechaHora(nota.fecha_creacion)}`;

  // Mostrar fecha de edición si existe
  if (nota.fecha_edicion) {
    const idFechaEdicion = get("#idHora");
    idFechaEdicion.innerText = `Última edición: ${getFormatoFechaHora(nota.fecha_edicion)}`;
  }
}



// Eventos generales
document.addEventListener("DOMContentLoaded", init);
document.getElementById("idMenuNuevo").addEventListener("click", (event) => {
  NOTA.data=null
  getHtmlFormularioNota();
  addEnventNota();
});
document.getElementById("idMenuListar").addEventListener("click", (event) => {
  listarNotas();
});
/*
document.getElementById("idMenuCategoria").addEventListener("click", (event) => {
  getCategoria();
  //getHtmlBotonEliminarNota();
});
document.getElementById("idMenuCard").addEventListener("click", (event) => {
  
});
*/

function init() {
  getHtmlFormularioNota();
  addEnventNota();
  NOTA.data=null
}

function llenardata() {
  const cajas = document.querySelectorAll(".nav--menu__content p");

  // Itera sobre cada caja y cambia su color de fondo
  cajas.forEach(async (data, i) => {
    const json = {};
    json.titulo = `Titulo ${i + 1}`;
    json.contenido = data.textContent;
    json.fecha_creacion = Date();
    json.fecha_edicion = null;
    json.etiqueta = [1,5,6,3];
    await db.addRecord("nota", json);
  });
}

// Obtener todos los elementos de las pestañas
const menu = document.querySelectorAll(".nav--menu__item");
//const contents = document.querySelectorAll('.tab--content');
menu.forEach((item) => {
  item.addEventListener("click", () => {
    // Quitar la clase activa de todas las pestañas
    menu.forEach((item) => item.classList.remove("nav--menu__item--active"));
    // Añadir la clase activa a la pestaña seleccionada
    item.classList.add("nav--menu__item--active");

    /*// Esconder todo el contenido de las pestañas
        contents.forEach(content => content.classList.remove('tab--content__active'));
        // Mostrar el contenido correspondiente a la pestaña seleccionada
        document.getElementById(tab.dataset.tab).classList.add('tab--content__active');*/
  });
});

// Cargar listado de notas
function getCategoria() {
  const viewContent = document.getElementById("viewContent");
  viewContent.innerHTML = ""; // Limpiar el contenido existente
  viewContent.appendChild(getTemplate("tmtCategoria"));
}