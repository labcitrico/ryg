/**
 * Peticion definition
 * @typedef {Object} Peticion
 * @property {number} idPeticion
 * @property {string} url
 * @property {string} metodo
 * @property {string} entidad
 * @property {string} identificadorEntidad
 * @property {number} identificador
 * @property {string} estatus
 * @property {string} request
 * @property {string} response 
 * @property {string} caso
 * @property {string|undefined} descripcion
 */
var enviando = false;
var peticionesLog = getLogger('peticiones');

/**
 * Dao para peticiones
 * @class
 */
const PeticionesDao = {
    subirBD(event) {
        return new Promise((resolve, reject) => {
            reader.onload = () => {
                resolve(new Blob([reader.result], {type: event.target.files[0].type}))
            }
            reader.onerror = reject;
            reader.readAsArrayBuffer(event.target.files[0]);
        }).then(blob => {
            return Directorios.obtenerDirectorio(cordova.file.applicationStorageDirectory + 'databases').then(dir => {
                return Directorios.guardarArchivo(dir.nativeURL, 'kronos.db', blob);
            });
        })
    },

    descargarBD() {
        let archivo = cordova.file.applicationStorageDirectory + 'databases/kronos.db';
        Promise.all([
            Directorios.obtenerArchivo(archivo),
            Directorios.obtenerDirectorio('BD')
        ]).then(resultado => {
            return Directorios.copiarArchivo(resultado[0], resultado[1], 'kronos.db');
        }).then(file => {
            showSuccess('Se descargo la base de datos en Android/com.bitfarm.kronos/BD/kronos.db');
        }).catch(console.error);
    },
    
    /**
     * idInspeccion es la llave foranea de inspeccion.tableInspeccionID
     * @param {*} idInspeccion 
     * @returns {Promise<string>}
     */
   agregarInspeccion_id: (inspeccion)  => sqlPromise('SELECT inspeccion_id FROM Inspeccion WHERE tableInspeccionID = ?', [inspeccion.idInspeccion])
    .then(r => {
        inspeccion.inspeccion_id = r.rows.item(0).inspeccion_id;
        return inspeccion;
    }),

    /**
     * Agrega gastos_repor_id del gasto al detalle gasto
     * @param {DetalleGasto} detalleGasto
     * @returns {Promise<DetalleGasto>}
     */
    agregarGastoReportId: (detalleGasto) => sqlPromise("select gastos_repor_id from gasto where idGasto = ?",[detalleGasto.fk_idGasto])
        .then(r => r.rows.item(0).gastos_repor_id)
        .then(gastos_repor_id => {
            detalleGasto.gastos_repor_id = gastos_repor_id;
            if (detalleGasto.gastos_repor_id == null || gastos_repor_id == '') 
                return Promise.reject('gasto_repor_id');
            return detalleGasto;
        }),
    
    /**
     * Regresa si hay peticiones sin sincronizar
     * @returns {Promise<boolean>}
     */
    hayPeticionesPendientes() {
        return sqlPromise(`SELECT COUNT(*) as conteo FROM Peticiones WHERE estatus != 'OK'`)
            .then(r => r.rows.item(0).conteo > 0)
    },

    /**
     * Regresa si hay peticiones sin sincronizar
     * @returns {Promise<Array<Peticion>>}
     */
    obtenerPeticionesPendientes() {
        return sqlPromise("SELECT * FROM Peticiones WHERE estatus = 'PEND' ORDER BY rowid ASC")
            .then(resultado => rowsAsList(resultado));
    },

    obtenerPdfPorCaso(caso) {
        return sqlPromise(`SELECT * FROM Peticiones p INNER JOIN Pdf pdf 
                ON p.identificador = pdf.idPdf AND p.entidad = 'Pdf' WHERE pdf.documentos_caso = ?`, [caso])
    },

    obtenerDetalleInspeccionPorCaso(caso) {
        return sqlPromise(`SELECT * FROM Peticiones p INNER JOIN DetalleInspeccion di 
                ON p.identificador = di.idDetalleInspeccion AND p.entidad = 'DetalleInspeccion' WHERE di.inspeccion_caso = ?`, [caso])
    },

    validarEstatus(sqlResult) {
        for (var i = 0; i < sqlResult.rows.length; i++) {
            if (sqlResult.rows.item(i).estatus != 'OK')
                return Promise.resolve(false)
        }
        return Promise.resolve(true)
    },

    sePuedeSincronizarCorreoGasto(idGasto) {
        peticionesLog.debug('correo id gasto ', idGasto);   
        var noTieneDocumentosPendientes = sqlPromise(`SELECT COUNT(peticion.estatus) as conteo FROM Peticiones peticion 
                INNER JOIN DocumentoGasto documento ON peticion.entidad = 'DocumentoGasto' AND peticion.identificador = documento.idDocumentoGasto 
                INNER JOIN DetalleGasto detalle ON detalle.fk_idGasto = ? AND documento.fk_idDetalleGasto = detalle.idDetalleGasto 
                WHERE peticion.estatus != 'OK'`, [idGasto])
            .then(resultado => resultado.rows.item(0).conteo == 0);
        var noTieneDetallesPendientes = sqlPromise(`SELECT COUNT(peticion.estatus) as conteo FROM Peticiones peticion 
                INNER JOIN DetalleGasto detalle ON peticion.entidad = 'DetalleGasto' AND peticion.identificador = detalle.idDetalleGasto
                AND detalle.fk_idGasto = ? WHERE peticion.estatus != 'OK'`, [idGasto])
            .then(resultado => resultado.rows.item(0).conteo == 0);
        return Promise.all([noTieneDocumentosPendientes, noTieneDetallesPendientes]).then(resultados => resultados[0] && resultados[1])  
    },
    
    /**
     * Regresa si se puede sincroniza el documento de gasto
     * @param {string} idDetalleGasto
     * @returns {Promise<boolean>}
     */
    sePuedeSincronizarDocumentoGasto(idDetalleGasto) {
         return sqlPromise(`SELECT COUNT(estatus) as conteo FROM Peticiones peticion 
                INNER JOIN DetalleGasto detalle ON peticion.entidad = 'DetalleGasto' AND peticion.identificador = detalle.idDetalleGasto 
                AND detalle.idDetalleGasto = ? WHERE peticion.estatus !='OK'`, [idDetalleGasto])
            .then(resultado => resultado.rows.item(0).conteo == 0);
    },

    /**
     * Regresa si se puede sincroniza el detalle de gasto por su idGasto
     * @param {string} idGasto
     * @returns {Promise<boolean>}
     */
    sePuedeSincronizarDetalleGasto(idGasto) {
        return sqlPromise(`SELECT COUNT(estatus) as conteo FROM Peticiones WHERE entidad = 'Gasto' AND identificador=? AND estatus != 'OK'`, [idGasto])
            .then(resultado => resultado.rows.item(0).conteo == 0);
    },

    /**
     * Regresa si se puede sincronizar un correo de inspeccion
     * @param {string} idGasto
     * @returns {Promise<boolean>}
     */
    sePuedeSincronizarCorreoInspeccion(caso) {
        var noTienesPdfPendientes = sqlPromise(`SELECT COUNT(p.estatus) as conteo FROM Peticiones p INNER JOIN Pdf pdf ON p.identificador = pdf.idPdf 
                AND p.entidad = 'Pdf' WHERE pdf.documentos_caso = ? AND p.estatus != 'OK'`, [caso])
            .then(resultado => resultado.rows.item(0).conteo == 0);
        return noTienesPdfPendientes
    },

    /**
     * Obtener una lista de casos con peticiones pendientes
     * @returns {Promise<Array<string>}
     */
    obtenerCasosConPeticionesPendientes() {
        return sqlPromise('SELECT DISTINCT caso FROM Peticiones')
            .then(rowsAsList) // lista con estructura [caso: null, caso: 11, ..]
            .then(lista => lista.map(l => l.caso)) // obtener una lista con solemente el numero
    },

    /**
     * Obtener una lista de peticiones por caso
     * @param {number} caso
     * @returns {Promise<Array<string>>}
     */
    obtenerPeticionesPorCaso(caso) {
        if (caso == 0 || caso == null) {
            return sqlPromise('SELECT * FROM Peticiones WHERE caso IS NULL ORDER BY idPeticion DESC')
                .then(rowsAsList)
        }
        return sqlPromise('SELECT * FROM Peticiones WHERE caso = ? ORDER BY idPeticion DESC', [caso])
            .then(rowsAsList)
    },

    /**
     * Obtener una lista de peticiones pendientes por caso
     * @param {number} caso
     * @returns {Promise<Array<string>>}
     */
    obtenerPeticionesPendientesPorCaso(caso) {
        if (caso == 0 || caso == null) {
            return sqlPromise(`SELECT * FROM Peticiones 
                    WHERE caso IS NULL AND estatus != 'OK'
                    ORDER BY idPeticion DESC`)
                .then(rowsAsList)
        }
        return sqlPromise(`SELECT * FROM Peticiones 
                WHERE caso = ? AND estatus != 'OK'
                ORDER BY idPeticion DESC`, [caso])
            .then(rowsAsList)
    },

    /**
     * Obtiene una peticion por su llave primaria
     * @param {number} idPeticion 
     * @returns {Promise<Peticion>}
     */
    obtenerPeticion(idPeticion) {
        return sqlPromise(`SELECT * FROM Peticiones WHERE idPeticion = ?`, [idPeticion])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null)
    }
}