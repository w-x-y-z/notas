
const storeConfigs = [
  {
    name: 'nota',
    keyPath: 'id',
    autoIncrement: true,
    indices: [
      { name: 'titulo', keyPath: 'titulo', unique: false },
      { name: 'contenido', keyPath: 'contenido', unique: false },
      { name: 'fecha_creacion', keyPath: 'fecha_creacion', unique: false },
      { name: 'fecha_edicion', keyPath: 'fecha_edicion', unique: false }
      //{ name: 'numeroCelular', keyPath: 'numeroCelular', unique: true }
    ]
  }
];
let db;

async function inicializarDB() {
  db = await DB('dbNota');
  storeConfigs.forEach(async tabla=>{
    const existe= await db.checkIfStoreExists(tabla.name);
    if (!existe) {
      await db.objectStoreCreate(tabla);
    }
  })
}

inicializarDB(); // Llamada para inicializar la base de datos


const NOTA = {
  data: null,

  async getNota(id) {
    const resp = await db.getRecord("nota", id);
    this.data = resp.data
    return this.data;
  },
  async crearNota(data) {
    let texto = data.contenido;

      // Eliminar todos los saltos de línea, ya sean \n o \r\n
      let textoLimpio = texto.replace(/[\r\n]+/g, " ").trim();
      if(textoLimpio.length>0){
        const res = await db.addRecord("nota", data);
        if (res.status=='success') {  
          this.data=res.data;
        }
      }
  },
  async updateNota() {
    const datanota = await db.updateRecord("nota", this.data);
    return this.data;
  },
  async ListNotas(){
    return await db.getAllRecords("nota");
  },
  async eliminar(){
    return await db.deleteRecord('nota',this.data.id);
  }
};

