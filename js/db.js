//https://es.javascript.info/indexeddb
const DB = async function(nameDB) {
  let indexDB= window.indexedDB;
  let dbName= null;
  let db= null;
  let version= 0;
  let request= null;
  let objBDM= {};
  let msg={};
  let log=[];

  //parametros de log limpiar
  const maxDataLog=20;
  const minDataLog=10;

  
  //validar el parametro
  if(nameDB === null || nameDB === undefined || nameDB === "" || !/^[a-zA-Z0-9]+$/.test(nameDB) || /\d+\.\d+/.test(nameDB)){
    throw new Error("El nombre de la BD es inválido");
  }else{
    dbName=nameDB;
    const listDB= await indexDB.databases();
    const getBD = listDB.find(db=> db.name === nameDB);
    if (!getBD){
      version=1
      const req=indexDB.open(nameDB,version);
      req.onsuccess=(e)=>{
        const _db=e.target.result;
        objBDM={name:_db.name,version:_db.version}
        _db.close();
      }
      req.onerror=(e)=>{
        const _db=e.target.result;
        _db.close();
      }
    }else{
      version = getBD.version;
      objBDM = getBD;
    }
  }
  function setSms(status, message, data = null) {
    const error = new Error();
    const stackLine = error.stack.split("\n")[2].trim(); // Obtener la línea de la traza
      msg.status=status
      msg.message=message
      msg.data=data
      msg.stackLine=stackLine

      if (log.length > maxDataLog) {
        const x= log.length - minDataLog; 
        log.splice(0, x);
        //console.log(`Se han eliminado los primeros ${x} registros del LOG[${log.length}]`);
      }
      log.push({estado:status,mensaje:message,data: data,stackLine: stackLine});
  }
  function isArray(data) {
    return Array.isArray(data) && data.length > 0 && data.every(item => typeof item === 'object' && item !== null);  
  }
  function isOpenBD(tableName) {
    try {
      // Intentamos abrir una transacción para verificar si está abierta
      const transaction = db.transaction(tableName, "readonly");
      setSms('isOpenBD',`La conexión esta activa`,transaction)
      return true; // Si la transacción se crea, la base de datos está abierta
    } catch (error) {
      // Si falla, probablemente la base de datos está cerrada
      setSms('isOpenBD',`La base de datos está cerrada o no se puede acceder`,`${error}`)
      return false;
    }
  }
  function printVariables() {
    console.log('-----------------------------');
    console.log('|       Valores de las Variables       |');
    console.log('-----------------------------');
    
    console.log('dbName:', dbName);
    console.log('db:', db);
    console.log('version:', version);
    console.log('request:', request);
    console.log('objBDM:', objBDM);
    console.log('msg:', msg);
    //console.log('runAdmin:',runAdmin);
    console.log('LOG',log);
    console.log('-----------------------------');
  }
  async function getDbName(name) {
    return new Promise(async (resolve, reject) => {
      try {
        const listDB = await indexDB.databases();
        const getBD = listDB.find(db=> db.name === name);
        if (!getBD){
          setSms(`error`,`No se encontro la BD [${name}]`,getBD);
          resolve(msg)
        }else{
          setSms(`success`,`Si existe la BD [${getBD.name}]`,getBD)
          resolve(msg)
        } 
      } catch (error) {
        reject(error);
      }
  });
  }
  function checkIfStoreExists(storeName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName,version);
      request.onsuccess = (event) => {
        const db = event.target.result;
        // Comprobar si el almacén de objetos existe
        const exists = db.objectStoreNames.contains(storeName);
        resolve(exists);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  
  function openBD() {
    return new Promise(async (resolve, reject) => {
      try {
        //obtener la BD para validar la versión
        const mjs = await getDbName(dbName); 
        if (mjs.status === "error") {
          reject(mjs)
        }else{
          let vers = mjs.data.version;
          objBDM=mjs.data;
          if(vers===version){
            //es para ejecutar una transaccion preparar
            request = indexDB.open(dbName,version);
            request.onupgradeneeded = (event) => {
              db = event.target.result;
              setSms('openBD',`Create BD: ${dbName}`)
            };
            request.onerror = (event) => {
                setSms('openBD',`Error en la transaccion`,`${event.target.error}`);
                db.close();
            };
            request.onsuccess = (event) => {
              db = event.target.result;
              setSms('openBD',`Base de datos abierta para las transacciones`,db);

              db.addEventListener("versionchange", (event) => {
                setSms('openBD',`Se tiene otra versión de BD en la transaccion, se cerro las conexiones`,event);
                db.close();
              });
              resolve(true);
            };
            request.onblocked = (event) => {
              setSms('openBD',`Se encontro bloqueos en la BD de transacciones, se cerro las conexiones`,event);
              db.close();
            };
          }else{
            //Si la versión son diferente incremetar en uno mas la versión
            version = vers+1;
            objBDM.version=version;
            setSms('version',`Se tiene una nueva versión de BD[${dbName}]`,objBDM);
            resolve(true);
          }
        }  
      } catch (error) {
        reject(error)
      }
    })
  }
  function deleteDatabase() {
    return new Promise((resolve, reject) => {
      request = indexDB.deleteDatabase(dbName);
      request.onsuccess = () => {
        setSms('success',`Base de datos '${dbName}' eliminada con éxito`)
        resolve(msg);
      };
      request.onerror = (event) => {
        setSms('error',`Error al eliminar la base de datos '${dbName}': ${event.target.error}`)
        reject(msg);
      };
    });
  }
  
  function createObjectStore(storeConfig) {
    return new Promise(async (resolve, reject) => {
      try {
        request = indexedDB.open(dbName, version);
        request.onupgradeneeded = (event) => {
          db = event.target.result;
          if (!db.objectStoreNames.contains(storeConfig.name)) {
              const objectStore = db.createObjectStore(storeConfig.name, {
                keyPath: storeConfig.keyPath,
                autoIncrement: storeConfig.autoIncrement,
              });

              storeConfig.indices.forEach((index) => {
                objectStore.createIndex(index.name, index.keyPath, {
                  unique: index.unique,
                });
              });
              setSms('success',`Tabla '${storeConfig.name}' creada`, storeConfig);
            } else {
              setSms('warning',`La tabla '${storeConfig.name}' ya existe`, null);
            }
        };

        request.onsuccess = (event) => {
          db = event.target.result;
          db.close();
          resolve(msg);
        };

        request.onerror = (event) => {
          setSms('error', `Error creando la tabla: ${event.target.error}`, event.target);
          reject(msg);
        };
        
        request.onblocked = (event) => {
          setSms('warning', `Bloqueado creando la tabla`, event.target);
          if (db) {
              db.close(); // Cerrar cualquier conexión abierta
          }
          reject(msg);
        };

      } catch (error) {
        setSms('error', `Error: ${error}`, error);
        reject(error);
      }
    });
  }

  function createArrayObjectStore(storeConfigs) {
    return new Promise(async (resolve, reject) => {
      try {
        let msjArray = [];
        const request = indexedDB.open(objBDM.name, objBDM.version);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Usamos map para iterar sobre storeConfigs y devolver un nuevo arreglo
          msjArray = storeConfigs.map((storeConfig) => {
            if (!db.objectStoreNames.contains(storeConfig.name)) {
              // Crear la tabla
              const objectStore = db.createObjectStore(storeConfig.name, {
                keyPath: storeConfig.keyPath,
                autoIncrement: storeConfig.autoIncrement,
              });

              // Crear índices para la tabla
              storeConfig.indices.forEach((index) => {
                objectStore.createIndex(index.name, index.keyPath, {
                  unique: index.unique,
                });
              });

              // Devolver mensaje de éxito
              const successMsg = {status:'success', data:storeConfig, message: `Tabla '${storeConfig.name}' creada`};
              setSms('success', `Tabla '${storeConfig.name}' creada`, storeConfig);
              return successMsg;
            } else {
              // Devolver mensaje si la tabla ya existe
              const warningMsg = {status:'warning', data:storeConfig, message: `La tabla '${storeConfig.name}' ya existe`};
              setSms('warning', `La tabla '${storeConfig.name}' ya existe`, null);
              return warningMsg;
            }
          });
        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          db.close(); 
          db.addEventListener("versionchange", () => {
            console.log(`%cActualizada versión BD: ${db.name}(${objBDM.version}), cerrando BD`, "color:yellow");
            db.close();
          });
          resolve(msjArray);
        };

        request.onerror = (event) => {
          const errorMsg = `Error creando la tabla: ${event.target.error}`;
          setSms('error', errorMsg, event.target);
          msjArray.push(errorMsg);
          reject(msjArray);
        };

        request.onblocked = (event) => {
          const blockMsg = `Bloqueado creando las tablas`;
          setSms('warning', blockMsg, event.target);
          msjArray.push(blockMsg);
          reject(msjArray);
        };
      } catch (error) {
        const errorMsg = `Error: ${error.message}`;
        setSms('error', errorMsg, error);
        reject([msg]);
      }
    });
  }

  function getObjectStoreStructure(storeName) {
    return new Promise((resolve, reject) => {
      try {
        // Verificar si el object store existe
        if (!db.objectStoreNames.contains(storeName)) {
          setSms(false,`La tabla '${storeName}' no existe`);
          return resolve(msg); // Devolver null si no existe
        }

        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);

        // Obtener la estructura de la tabla
        const structure = {
          name: objectStore.name,
          keyPath: objectStore.keyPath,
          autoIncrement: objectStore.autoIncrement,
          indices: [],
        };

        // Obtener información de los índices
        for (let i = 0; i < objectStore.indexNames.length; i++) {
          const indexName = objectStore.indexNames[i];
          const index = objectStore.index(indexName);

          structure.indices.push({
            name: index.name,
            keyPath: index.keyPath,
            unique: index.unique,
          });
        }
        setSms(true,`Estructura de la tabla '${storeName}'`, structure);
        resolve(msg);
      } catch (error) {
        setSms('error',`Error en try catch:`, `${error}`);
        reject(msg);
      }
    });
  }
  function renameObjectStore(oldName, newName) {
    return new Promise(async (resolve, reject) => {
      try {

        // Verificar si la tabla antigua existe
        const objectStoreNames = db.objectStoreNames;
        let objectStructure = {};
        if (!objectStoreNames.contains(oldName)) {
          setSms(false, `La tabla ${oldName} no existe`);
          return resolve(msg);
        } else {
          // Obtener la estructura de la tabla antigua
          const estructura = await getObjectStoreStructure(oldName);
          objectStructure = estructura.data;
          objectStructure.name = newName;
        }

        version += 1;
        await openBD();
        // Abrir la base de datos
        const request = indexedDB.open(dbName, version);
        
        // Evento onupgradeneeded para crear la nueva tabla y copiar los datos
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          const transaction = event.target.transaction;

          // Crear la nueva tabla con la estructura de la antigua
          const newObjectStore = db.createObjectStore(newName, {
            keyPath: objectStructure.keyPath,
            autoIncrement: objectStructure.autoIncrement,
          });

          // Crear índices en la nueva tabla
          objectStructure.indices.forEach((index) => {
            newObjectStore.createIndex(index.name, index.keyPath, {
              unique: index.unique,
            });
          });

          // Copiar los datos de la tabla antigua a la nueva
          const oldObjectStore = transaction.objectStore(oldName);
          oldObjectStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              newObjectStore.add(cursor.value);
              cursor.continue();
            }
          };
          // Al completar la transacción, eliminar la tabla antigua
          transaction.oncomplete = async () => {
            version += 1;
            await openBD();
            await deleteObjectStore(oldName);
            setSms(true, `La tabla ${oldName} ha sido renombrada a ${newName}`, objectStructure);
          };

          transaction.onerror = (event) => {
            setSms('error', `Error al renombrar la tabla: ${event.target.error}`);
            console.log(event.target.error);
            reject(msg);
          };
        };

        // Evento onsuccess al abrir la base de datos
        request.onsuccess = (event) => {
          const db = event.target.result;
          db.close();
          resolve(msg);
        };

        // Evento onerror si hay un error al abrir la base de datos
        request.onerror = (event) => {
          const db = event.target.result;
          db.close;
          setSms('error', `Error al abrir la base de datos: ${dbName}`, `${event.target.error}`);
          reject(msg);
        };

        // Evento onblocked si el proceso es bloqueado por otra conexión
        request.onblocked = (event) => {
          setSms('error', `Se encontro bloqueo en la base de datos: ${dbName}`, `${event.target.result}`);
          console.log(event.target.result);
          if (db) {
            db.close(); // Cerrar cualquier conexión abierta
          }
          reject(msg);
        };

      } catch (error) {
        setSms('error', `Error: ${error}`, error);
        reject(msg);
      }
    });
  }
  function deleteObjectStore(storeName) {
    return new Promise(async (resolve, reject) => {
      try {
        // Obtener la versión actual de la base de datos y aumentarla
        // Abrir la base de datos
        const request = indexedDB.open(dbName, version);

        // Evento onupgradeneeded para modificar la estructura de la base de datos
        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Verificar si el objectStore existe
          if (db.objectStoreNames.contains(storeName)) {
            db.deleteObjectStore(storeName);
            setSms(true,`Object store '${storeName}' deleted successfully`)
            //resolve(msg);
          } else {
            setSms(false,`Object store '${storeName}' does not exist`)
            //resolve(msg);
          }
        };

        // Manejo de éxito al abrir la base de datos
        request.onsuccess = (event) => {
          const db = event.target.result;
          db.close(); // Cerrar la base de datos una vez completada la operación
          resolve(msg)
        };

        // Manejo de errores al abrir la base de datos
        request.onerror = (event) => {
          setSms('error',`Error deleting object store: ${event.target.error}`)
          reject(msg);
        };

        request.onblocked = (event) => {
          setSms('error',`Error: Database is blocked`,event)
          reject(msg);
        };
      } catch (error) {
        setSms('error',`Error deleting object store: ${error}`)
        reject(msg);
      }
    });
  }
  function createIndex(storeName, indexName, keyPath, unique) {
    return new Promise(async (resolve, reject) => {
      try {
        // Abrir la base de datos
        request = indexedDB.open(nameDB, version);

        request.onupgradeneeded = (event) => {
          db = event.target.result;
          const objectStoreNames = db.objectStoreNames;

          if (objectStoreNames.contains(storeName)) {
            const objectStore = event.target.transaction.objectStore(storeName);
            objectStore.createIndex(indexName, keyPath, { unique: unique });
            setSms(true, `Se agrego la columna '${indexName}' en la tabla '${storeName}'`);
          } else {
            setSms(false, `La tabla '${storeName}' no existe`);
          }
        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          db.close(); // Cerrar la base de datos después de usarla
          resolve(msg);
        };

        request.onerror = (event) => {
          setSms('error', `Error al crear la columna: ${event.target.error}`);
          reject(msg);
        };

        request.onblocked = (event) => {
          setSms('error', `La operación en la base de datos está bloqueada`);
          reject(msg);
        };

      } catch (error) {
        setSms('error', `Error al crear la columna: ${error}`);
        reject(msg);
      }
    });
  }
  function deleteIndex(storeName, indexName) {
    return new Promise(async (resolve, reject) => {
      try {
        // Abrir la base de datos
        request = indexDB.open(nameDB,version);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          const objectStoreNames = db.objectStoreNames;

          if (objectStoreNames.contains(storeName)) {
            const transaction = event.target.transaction;
            const objectStore = transaction.objectStore(storeName);
            
            // Verificar si el índice existe antes de intentar eliminarlo
            if (objectStore.indexNames.contains(indexName)) {
              objectStore.deleteIndex(indexName);
              setSms(true, `Columna '${indexName}' eliminado en la tabla '${storeName}'`);
            } else {
              setSms(false, `La columna '${indexName}' no existe en la tabla '${storeName}'`);
            }
          } else {
            setSms(false, `La tabla '${storeName}' no existe`);
          }
        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          db.close(); // Cerrar la base de datos después de usarla
          resolve(msg)
        };

        request.onerror = (event) => {
          setSms('error', `Error al eliminar la columna: ${event.target.error}`);
          reject(msg); // Pasar mensaje a reject
        };

        request.onblocked = (event) => {
          setSms('error', `La operación en la base de datos está bloqueada.`);
          reject(msg); // Pasar mensaje a reject
        };

      } catch (error) {
        setSms('error', `Error al eliminar la columna: ${error}`);
        reject(msg); // Pasar mensaje a reject
      }
    });
  }
  //Transacciones de data
  function addRecord(storeName, record) {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const esArray = isArray(record);
        let numIndex = 1;
        if (esArray) {
          let errorOcurred = false; // Flag para errores

          for (const [index, registro] of record.entries()) {
            const addRequest = objectStore.add(registro);
            numIndex = index + 1;
            // Convertir el manejador de éxito/error en promesas
            await new Promise((resolveInner, rejectInner) => {
              addRequest.onsuccess = ()=> {
                resolveInner(); // Continuar con el siguiente registro
              };
              addRequest.onerror = (event)=> {
                setSms('error',`Error al agregar en el registro ${numIndex}: ${event.target.error}`,registro)
                errorOcurred = true;
                rejectInner(); // Rechazar y detener el ciclo
              };
            });

            if (errorOcurred) {
              setSms('error',`Transacción abortada debido a un error en los registros ${numIndex}`,registro)
              transaction.abort(); // Abortar la transacción si hay un error
              return reject();
            }
          }
        } else {
          // Si solo hay un objeto, agregarlo directamente
          const addRequest = objectStore.add(record);
          addRequest.onsuccess = (event) => {
            record.id=event.target.result;
            setSms('success',`Registro agregado correctamente en la tabla '${storeName}'`,record)
          };
          addRequest.onerror = (event) => {
            setSms('error',`Error al agregar el registro: ${event.target.error}`,record)
            reject(msg);
          };
        }

        // Manejar éxito de toda la transacción
        transaction.oncomplete = function() {
          //console.log("Todos los registros han sido agregados correctamente",record.length);
          if (esArray) {
            setSms('success',`Todos los registros han sido agregados correctamente: ${numIndex}`)
          }
          db.close(); // Cerrar la base de datos al finalizar
          resolve(msg); // Resolver la promesa
        };

        // Manejar errores en la transacción
        transaction.onerror = function(event) {
          if (esArray) {
            setSms('error',`Error en la transacción al agregar los registros: ${numIndex}`,`${event.target.error}`)
          }
          reject(msg); // Rechazar la promesa en caso de error en la transacción
        };
      } catch (error) {
        setSms('error',`Error: ${error}`);
        reject(msg); // Rechazar la promesa en caso de error general
      }
    });
  }
  function getRecord(storeName, key) {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.get(key);
  
        request.onsuccess = (event) => {
          if (event.target.result) {
            setSms(true,`Registro recuperado con éxito`,event.target.result)
            resolve(msg);
          } else {
            setSms(false,`No se encontró registro con la clave: ${key}`,{})
            resolve(msg);
          }
        };
  
        request.onerror = (event) => {
          setSms('error',`Error al recuperar el registro: ${event.target.error}`,{});
          reject(msg);
        };
      } catch (error) {
        setSms('error',`Error: ${error}`);
        reject(error);
      }
    });
  }
  function searchRecords(storeName, columnName, searchTerm) {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);
        const results = [];  // Array para almacenar los resultados
  
        // Usar openCursor para iterar sobre todos los registros
        const request = objectStore.openCursor();
  
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const valueToSearch = cursor.value[columnName];
            if (valueToSearch && valueToSearch.toString().toLowerCase().includes(searchTerm.toLowerCase())) {
              results.push(cursor.value); // Agregar a los resultados si hay coincidencia
            }
            cursor.continue(); // Continúa al siguiente registro
          } else {
            // Cuando no hay más registros, resolver la promesa con los resultados
            if (results.length > 0) {
              setSms(true,`Registros encontrados: ${results.length}`,results)
              resolve(msg);
            } else {
              setSms(false,`No se encontraron registros que coincidan con "${searchTerm}" en la columna "${columnName}"`,[])
              resolve(msg);
            }
          }
        };
        request.onerror = (event) => {
          setSms('error',`Error al recuperar los registros: ${event.target.error}`)
          reject(msg);
        };
      } catch (error) {
        setSms('error',`Error: ${error}`)
        reject(msg);
      }
    });
  }
  function getAllRecords(storeName) {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.getAll();
  
        request.onsuccess = (event) => {
          const records = event.target.result;
          setSms(true,`Todos los registros recuperados de ${storeName}`,records);
          resolve(msg);
        };
        request.onerror = (event) => {
          setSms('error',`Error al recuperar los registros: ${event.target.error}`)
          reject(msg);
        };
      } catch (error) {
        setSms('error',`Error: ${error}`)
        reject(msg);
      }
    });
  }
  function updateRecord(storeName, record) {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.put(record);
  
        request.onsuccess = (event) => {
          setSms(true,`Registro actualizado correctamente`,record);
          resolve(msg);
        };
  
        request.onerror = (event) => {
          setSms('error',`Error al actualizar el registro: ${event.target.error}`,record);
          reject(msg);
        };
      } catch (error) {
        setSms('error',`Error: ${error}`);
        reject(msg);
      }
    });
  }
  function deleteRecord(storeName, key) {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(key);
  
        request.onsuccess = (event) => {
          setSms(true,`Registro eliminado correctamente con clave: ${key}`)
          resolve(msg);
        };
  
        request.onerror = (event) => {
          setSms('error',`Error al eliminar el registro: ${event.target.error}`)
          reject(msg);
        };
      } catch (error) {
        setSms('error',`Error: ${error}`)
        reject(msg);
      }
    });
  }
  function deleteAllRecords(storeName) {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear(); // Eliminar todos los registros con el método clear()
  
        request.onsuccess = (event) => {
          setSms(true, `Todos los registros de ${storeName} eliminados correctamente`);
          resolve(msg);
        };
  
        request.onerror = (event) => {
          setSms('error', `Error al eliminar los registros de ${storeName}: ${event.target.error}`);
          reject(msg);
        };
      } catch (error) {
        setSms('error', `Error: ${error}`);
        reject(msg);
      }
    });
  }
  
  function getPaginatedRecordsByKey(storeName, lastKey, pageSize) {
    return new Promise(async (resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], "readonly");
            const objectStore = transaction.objectStore(storeName);
            const results = [];
            let recordCount = 0;
            // Abrir cursor desde el startKey si es cero toma desde el inicio 
            const cursor = lastKey == 0 ? objectStore.openCursor() : objectStore.openCursor(IDBKeyRange.lowerBound(lastKey, true));

            cursor.onsuccess = (event) => {
                const currentCursor = event.target.result;

                if (currentCursor && recordCount < pageSize) {
                    results.push(currentCursor.value);
                    recordCount++;
                    currentCursor.continue();
                } else {
                    if (results.length > 0) {
                        const lastFetchedKey = results[results.length - 1].id; // Obtener el último ID de la página
                        setSms(true, `Página con registros desde ID ${lastKey} recuperada`, { records: results, lastKey: lastFetchedKey });
                    } else {
                        setSms(true, `No hay registros`,{});
                    }
                    //resolve({ records: results, lastKey: results.length > 0 ? results[results.length - 1].id : null });
                    resolve(msg);
                }
            };

            cursor.onerror = (event) => {
                setSms('error', `Error al recuperar los registros: ${event.target.error}`);
                reject(msg);
            };
        } catch (error) {
            setSms('error', `Error: ${error}`);
            reject(error);
        }
    });
  }

//funciones publicas
  return {
    printVariables: ()=>{
      printVariables();
    },
    objectStoreCreate: async (storeConfigs)=>{
      const isarray=Array.isArray(storeConfigs) && storeConfigs.length > 0 && storeConfigs.every(item => typeof item === 'object' && item !== null);
      version+=1;
      await openBD();
      if (isarray) {
        return await createArrayObjectStore(storeConfigs)
      } else {
        return await createObjectStore(storeConfigs)
      }
    },
    objectStoreGetStructure: async(storeName)=>{
      await openBD();
      return await getObjectStoreStructure(storeName)
    },
    objectStoreRename: async (oldName,newDBName)=>{
      await openBD();
      return await renameObjectStore(oldName,newDBName);
    },
    objectStoreDelete: async(storeName)=>{
      version+=1;
      await openBD();
      return await deleteObjectStore(storeName);
    },
    objectStoreCreateIndex: async(storeName, indexName, keyPath, unique = false)=>{
      version+=1;
      await openBD();
      return await createIndex(storeName,indexName,keyPath,unique)
    },
    objectStoreDeleteIndex: async(storeName,indexName)=>{
      version+=1;
      await openBD();
      return await deleteIndex(storeName,indexName)
    },
    addRecord: async(storeName, record)=>{
      await openBD();
      return await addRecord(storeName, record);
    },
    getRecord: async(storeName, key)=>{
      await openBD();
      return await getRecord(storeName, key);
    },
    searchRecords: async(storeName, columnName, searchTerm)=>{
      await openBD();
      return await searchRecords(storeName, columnName, searchTerm);
    },
    getAllRecords: async(storeName)=>{
      await openBD();
      return await getAllRecords(storeName);
    },
    updateRecord: async(storeName, record)=>{
     await openBD();
     return await updateRecord(storeName, record);
    },
    deleteRecord: async(storeName, key)=>{
      await openBD();
      return await deleteRecord(storeName, key);
    },
    deleteAllRecords: async(storeName)=>{
      await openBD();
      return await deleteAllRecords(storeName);
    },
    getPaginatedRecordsByKey:async (storeName, lastKey, pageSize = 20)=>{
      await openBD();
      return await getPaginatedRecordsByKey(storeName, lastKey , pageSize);
    },
    checkIfStoreExists: async(storeName)=>{
     return await checkIfStoreExists(storeName);
    },
    validar:()=>{
      return isOpenBD('estudiantes');
    }
  }
}