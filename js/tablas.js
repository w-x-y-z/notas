let DATA = new Promise((resolve, reject) => {
  fetch('https://fakestoreapi.com/products')
    .then(response => response.json())
    .then(data => resolve(data))
    .catch(error => reject(error));
});

const _tbl={
  idTable: 'idTbl0',
  classAddTable:null,
  classAddHeader:null,
  classAddBody:null,
  classAddFooter:null,
  colsNames:[],
  captionText:null,
  captionHtml:null,
  bodyHtml:null,
  footerHtml:null,
  numPages:null,
  data:[],
  getData(){
    let _d
    DATA.then(e=>{
      this.data=e
    })
  },
  getHtmlHeader(){

    // Crear el encabezado de la tabla
    //const headerRow = document.getElementById(this.idTable);
    let html='<thead><tr>'
    if(this.data.length>0){
      this.colsNames=Object.keys(this.data[0])
    }
    this.colsNames.forEach((col,i)=>{
      html+=`<th>${col}</th>`
    })
    html+='</tr></thead>'
    return html;
    //headerRow.insertAdjacentHTML('afterbegin',html);
  },
  getHtmlBody(){
    let html='<tbody>'
    this.data.forEach((data)=>{
      html+='<tr>';
      Object.values(data).forEach((value)=>{
        html+=`<td>${value}</td>`
      })
      html+='</tr>'
    })
    html+='</tbody>'
    return html;
  },
  tableDefault(idTable,data){
    this.idTable=idTable;
    this.data=data;
    const headerRow = document.getElementById(this.idTable);
    headerRow.innerHTML=`${this.getHtmlHeader()}${this.getHtmlBody()}`
    //headerRow.insertAdjacentHTML('afterbegin',this.getHtmlHeader());
    //headerRow.insertAdjacentHTML('beforeend',this.getHtmlBody());
  },
} 
let d;
DATA.then(e=>{d=e})
_tbl.tableDefault('idTbl0',d)
console.log(d)


//const data= fetch('./24hr.json')
//ocultar columnas
const hiddenColumn = (idTabla, numeroColumn, idSelectOption) => {
  let rowsth = idTabla.querySelectorAll(`th:nth-child(${numeroColumn})`);
  let rowstd = idTabla.querySelectorAll(`td:nth-child(${numeroColumn})`);
  let estado = idSelectOption.getAttribute("visible");
  if (estado == 0) {
    rowsth.forEach((element) => {
      element.classList.remove("tbl--cell__hidden");
    });
    rowstd.forEach((element) => {
      element.classList.remove("tbl--cell__hidden");
    });
    idSelectOption.classList.remove("select--option__item");
    idSelectOption.setAttribute("visible", "1");
  } else {
    rowsth.forEach((element) => {
      element.classList.add("tbl--cell__hidden");
    });
    rowstd.forEach((element) => {
      element.classList.add("tbl--cell__hidden");
    });
    idSelectOption.classList.add("select--option__item");
    idSelectOption.setAttribute("visible", "0");
  }
};
//Rellenar el select con los nombres de las columnas
let rellenarSelect = () => {
  let colHeader = idTbl1.querySelectorAll("th");
  let html = "";
  colHeader.forEach((h, i) => {
    html += `<option value="${i + 1}">${h.textContent}</option>`;
  });
  idCountCol.innerHTML = html;
};
//Buscar datos en la tabla
let searchTable = (idTable, idInputSearch) => {
  const tbody = idTable.getElementsByTagName("tbody")[0];
  const rows = tbody.getElementsByTagName("tr");
  const filter = idInputSearch.value.toLowerCase();
  for (let i = 0; i < rows.length; i++) {
    let row = rows[i];
    let cells = row.getElementsByTagName("td");
    let match = false;
    for (let j = 0; j < cells.length; j++) {
      if (cells[j].innerText.toLowerCase().includes(filter)) {
        match = true;
        break;
      }
    }
    if (match) {
      row.classList.remove("tbl--cell__hidden");
    } else {
      row.classList.add("tbl--cell__hidden");
    }
  }
};

//Escuchador de eventos generales en el dom
const eventsToListen = [
  "click",
  "change",
  "input",
  "keydown",
  "DOMContentLoaded",
];
eventsToListen.forEach((eventType) => {
  document.addEventListener(eventType, (event) => {
    //event.preventDefault();
    const elemnto = event.target;
    const tipoEvento = event.type;
    if (tipoEvento == "DOMContentLoaded") {
      rellenarSelect();
    }
    if (tipoEvento == "change") {
      console.log(elemnto)
      if (elemnto.id == "idCountCol") {
        console.log(elemnto)
        let valueCol = elemnto.value * 1;
        hiddenColumn(idTbl1, valueCol, elemnto.selectedOptions[0]);
      }
      
    }
    if (tipoEvento == "input") {
      if (elemnto.id == "idSearch") {
        searchTable(idTbl1,idSearch)
      }
    }
  });
});

let ordenamientoTable=(classTable)=>{
const getCellValue = (tableRow, columnIndex) => tableRow.children[columnIndex].innerText || tableRow.children[columnIndex].textContent;
const comparer = (idx, asc) => (r1, r2) => ((el1, el2) =>
    el1 !== '' && el2 !== '' && !isNaN(el1) && !isNaN(el2) ? el1 - el2 : el1.toString().localeCompare(el2)
)(getCellValue(asc ? r1 : r2, idx), getCellValue(asc ? r2 : r1, idx));

document.querySelectorAll(`.${classTable} th`).forEach(th => th.addEventListener('click', (() => {
    const table = th.closest('table');
    Array.from(table.querySelectorAll('tbody tr:nth-child(n+1)'))
        .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
        .forEach((tr) => { table.querySelector('tbody').appendChild(tr) });
})));
}


function paginateTable(tableId, recordsPerPage) {
  // Obtener la tabla y sus filas
  const table = document.getElementById(tableId);
  const rows = table.querySelectorAll('tbody tr');

  // Calcular el número de páginas
  const numRows = rows.length;
  const numPages = Math.ceil(numRows / recordsPerPage);

  // Crear la paginación
  const pagination = document.createElement('div');
  pagination.className = 'pagination';

  for (let i = 1; i <= numPages; i++) {
    const pageLink = document.createElement('a');
    pageLink.href = `#${tableId}-page-${i}`;
    pageLink.textContent = i;
    pageLink.addEventListener('click', () => {
      showPage(i);
    });
    pagination.appendChild(pageLink);
  }

  // Agregar la paginación a la tabla
  table.parentNode.appendChild(pagination);

  // Función para mostrar una página específica
  function showPage(page) {
    const startRow = (page - 1) * recordsPerPage;
    const endRow = startRow + recordsPerPage;

    rows.forEach((row, index) => {
      if (index >= startRow && index < endRow) {
        //row.style.display = '';
        row.classList.remove("tbl--cell__hidden");
      } else {
        //row.style.display = 'none';
        row.classList.add("tbl--cell__hidden");
      }
    });
  }
  // Mostrar la primera página por defecto
  showPage(1);
}