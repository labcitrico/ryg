/**
 * Servicio de inspeccion
 */

const InspeccionService = {
    /**
     * Obtiene el total de registros
     * @param {number} numSin 
     * @returns {Promise<number>}
     */
    obtenerTotal(numSin) {
        let internet = Promise.resolve(1);
        if (verificarConexion()) {
            internet = new Promise((resolve, reject) => sendGetRequest('siniestro_inspecciones.php?caso=' + numSin, resolve, reject))
                .then(resultados => parseInt(resultados.registros))
        }
        let registros = sqlPromise(`SELECT COUNT(*) as total FROM Inspeccion WHERE caso_id = ?`, [numSin])
            .then(resultado => {
                if (resultado.rows.item(0) == null || resultado.rows.item(0).total == 0)
                    return 0
                return resultado.rows.item(0).total
            })
        return Promise.all([internet, registros]).then(r => {
            if (r[0] > r[1])
                return r[0];
            return r[1];
        })
    },

    /**
     * Obtiene las inspecciones del servidor por pagina
     * @param {number} numSin 
     * @param {number} page
     * @returns {Object}
     */
     obtenerInspeccionesInternet(numSin, page) {
        let elementosPorPagina = 10;
        let obtenerInspecciones = (numSin, page) => new Promise((resolve, reject) => {
            return sendGetRequest(`siniestro_inspecciones.php?caso=${numSin}&pageNum_user=${page}`, resolve, reject);
        })
        return obtenerInspecciones(numSin, 0)
            .then(r => parseInt(r.registros))
            .then(total => {
                let paginas = [];
                for (let pagina = 0, i = 0; i < total; i += elementosPorPagina) {
                    paginas.push(pagina++)
                }
                let promesas = paginas.map(pagina => obtenerInspecciones(numSin, pagina))
                return Promise.all(promesas)
            })
            .then(listaResultados => listaResultados.map(r => r.resultados))
            .then(resultados => Array.prototype.concat.apply([], resultados))
            .then(listado => ({ resultados: listado, registros: listado.length }))
            .then(resultados => {
                console.error(resultados)
                return resultados;
            })
    },

    /**
     * Encuentra el detalle de inspeccion del servidor
     * @param {number} inspeccion_id 
     * @returns {Promise<DetalleInspeccionServidor>}
     */
    obtenerDetalleInternet(inspeccion_id) {
        return new Promise((resolve, reject) => {
            sendGetRequest('inspeccion_detalle.php?id=' + inspeccion_id, resolve, reject);
        })
    },

    /**
     * Regresa el detalle de inspeccion dado su id
     * @param {number} idDetalleInspeccion 
     * @returns {Promise<DetalleInspeccion>}
     */
    obtenerDetalle(idDetalleInspeccion) {
        return sqlPromise('SELECT * FROM DetalleInspeccion WHERE idDetalleInspeccion = ?', [idDetalleInspeccion])
            .then(r => r.rows.item(0))
    },

    /**
     * Obtiene el detalle por idInspeccion llave foranea a Inspeccion.tableInspeccionID
     * @param {number} idInspeccion 
     * @returns {Promise<DetalleInspeccion>}
     */
    obtenerDetallePorIdInspeccion(idInspeccion) {
        return sqlPromise('SELECT * FROM DetalleInspeccion WHERE idInspeccion = ?', [idInspeccion])
            .then(r => r.rows.item(0) == null ? Promise.reject('No hay datos') : r.rows.item(0))
            .catch(error => Promise.reject('No hay datos'))
    },

    /**
     * Regresa el id de la inspeccion(tableInspeccionID) dado su id en el servidor
     * @param {number} inspeccion_id 
     * @returns {Promise<number>}
     */
    obtenerTableInspeccionIDPorInspeccion_id(inspeccion_id) {
        return sqlPromise('SELECT tableInspeccionID FROM Inspeccion WHERE inspeccion_id = ?', [inspeccion_id])
            .then(r => r.rows.item(0).tableInspeccionID)
    },

    /**
     * Regresa el id de la inspeccion(tableInspeccionID) dado su id en el servidor
     * @param {number} inspeccion_id 
     * @returns {Promise<Inspeccion>}
     */
    obtenerInspeccionPorInspeccion_id(inspeccion_id) {
        return sqlPromise('SELECT * FROM Inspeccion WHERE inspeccion_id = ?', [inspeccion_id])
            .then(r => r.rows.item(0).tableInspeccionID)
    },

    /**
     * Regresa la inspeccion dado su id
     * @param {number} tableInspeccionID 
     * @returns {Promise<Inspeccion>}
     */
    obtenerInspeccion(tableInspeccionID) {
        return sqlPromise('SELECT * FROM Inspeccion WHERE tableInspeccionID = ?', [tableInspeccionID])
            .then(r => r.rows.item(0))
    },

    /**
     * Regresa la informacion de un siniestro por el numero de caso
     * @param {number} idSiniestro 
     * @returns {Object}
     */
    obtenerSiniestro(idSiniestro) {
        return sqlPromise('SELECT * FROM Siniestro WHERE caso_id = ?', [idSiniestro])
            .then(r => r.rows.item(0))
    },

    /**
     * Regresa una listado de inspecciones dado la pagina y el caso
     * @param {number} numSin 
     * @param {number} page 
     * @returns {Promise<Array<Inspeccion>>}
     */
    obtenerInspeccionesBD(numSin, page) {
        return sqlPromise('SELECT * FROM Inspeccion WHERE caso_id = ? AND page = ? ORDER BY fecha ASC', [numSin, page])
            .then(rowsAsList);
    },

    /**
     * Regresa una fotografia dado su id
     * @param {number} idFoto 
     * @returns {Promise<FotoInspeccion>}
     */
    obtenerFotografia(idFoto) {
        return sqlPromise('SELECT * FROM FotoInspeccion WHERE idFoto = ?', [idFoto])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null);
    },

    /**
     * Regresa un documento dado su id
     * @param {number} idDocumento
     * @returns {Promise<DocumentoInspeccion>} 
     */
    obtenerDocumento(idDocumento) {
        return sqlPromise('SELECT * FROM Documento WHERE idDocumento = ?', [idDocumento])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null);
    },

    /**
     * Regresa un documento dado su id
     * @param {number} idPdf
     * @returns {Promise<PdfInspeccion>} 
     */
    obtenerPdfInspeccion(idPdf) {
        return sqlPromise('SELECT * FROM Pdf WHERE idPdf = ?', [idPdf])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null);
    },

    /**
     * Regresa el corre de inspeccion dado us id
     * @param {number} idMail
     * @returns {Promise<SendMailInspeccion>} 
     */
    obtenerSendMail(idMail) {
        return sqlPromise('SELECT SendMailInspeccion FROM Pdf WHERE idMail = ?', [idMail])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null);
    },

    /**
     * Regresa las iniciales del usuario
     * @returns {Promise<string>}
     */
    obtenerInicialesUsuario() {
        return sqlPromise('SELECT * FROM DatosUsuario')
            .then(r => r.rows.item(0))
            .then(dataUser => dataUser.user_iniciales)
    },

    /**
     * Si no existe regresa una promesa rechazada
     * @param {Promise} inspeccion 
     */
    existeInspeccion(inspeccion) {
        return sqlPromise('SELECT * FROM Inspeccion WHERE inspeccion_id = ?', [inspeccion.inspeccion_id])
            .then(rowsAsList).then(lista => lista.length > 0 ? Promise.resolve(inspeccion) : Promise.reject(inspeccion))
    },

    /**
     * Si no existe un detalle de inspeccion con el idInspeccion regresa una promesa rechazada
     * @param {number} idInspeccion 
     */
    existeDetalleLocal(idInspeccion) {
        return sqlPromise('SELECT * FROM DetalleInspeccion WHERE idInspeccion = ?', [idInspeccion])
            .then(rowsAsList).then(lista => lista.length > 0 ? Promise.resolve(true) : Promise.reject('No existe'))
    },

    /**
     * Existe el siniestro con el caso
     * @param {number|number} idSiniestro 
     * @returns {Promise<boolean>}
     */
    existeSiniestro(idSiniestro) {
        return sqlPromise('SELECT * FROM Siniestro WHERE caso_id = ?', [idSiniestro])
            .then(rowsAsList).then(lista => lista.length > 0);
    },

    /**
     * Vincula el detalle con la inspeccion usando el inspeccion_id
     * @param {DetalleInspeccion} detalle 
     * @param {number} inspeccion_id 
     */
    agregarIdInspeccion(detalle, inspeccion_id) {
        return InspeccionService.obtenerTableInspeccionIDPorInspeccion_id(inspeccion_id)
            .then(tableInspeccionID => {
                detalle.idInspeccion = tableInspeccionID
                return detalle;
            })
    },

    /**
     * Actualiza las inspecciones obtenidas del servidor para un siniestro dado
     * @param {Object} response 
     * @param {number} numSin 
     * @returns {Promise}
     */
    actualizarInspecciones(response, numSin) {
        inspeccionLog.debug('actualizando inspecciones con internet', response)
        var totalRegIns = window.localStorage.getItem("totalRegIns");
        if (totalRegIns == null || totalRegIns < response.registros) {
            window.localStorage.setItem("totalRegIns", response.registros);
        }
        var promesas = []
        for (let i = 0; i < response.resultados.length; i++) {
            let promesa = Promise.resolve(response.resultados[i])
                .then(InspeccionService.existeInspeccion)
                .then(inspeccion => {
                    InspeccionService.tienePeticionesPendientes(inspeccion.inspeccion_id).then(tienePendientes => {
                        if (!tienePendientes) {
                            console.log('actualizando', response.resultados[i])
                            return sqlPromise('UPDATE Inspeccion SET inspector = ?, fecha = ?, inspeccion_tipo = ?, estado = ? WHERE inspeccion_id = ?', [
                                response.resultados[i].inspector, 
                                response.resultados[i].fecha, 
                                response.resultados[i].inspeccion_tipo,
                                response.resultados[i].estado,
                                response.resultados[i].inspeccion_id
                            ]);
                        } else {
                            console.log('tiene pendientes', inspeccion.inspeccion_id)
                        }
                    })
                })
                // no existe se actualiza se inserta la inspeccion
                .catch(inspeccion => {
                    if (inspeccion.inspeccion_id != null) {
                        return sqlPromise('INSERT INTO Inspeccion (inspeccion_id, fecha, inspector, estado, caso_id, page) VALUES (?,?,?,?,?,?)',
                            [inspeccion.inspeccion_id, inspeccion.fecha, inspeccion.inspector, inspeccion.estado, numSin, 1])
                    }
                })
            promesas.push(promesa);
        }
        return Promise.all(promesas)
    },

    tienePeticionesPendientes(inspeccion_id) {
        return sqlPromise(`SELECT COUNT(*) AS conteo FROM Peticiones p
            INNER JOIN DetalleInspeccion di 
                ON p.identificador = di.idDetalleInspeccion AND di.inspeccion_id = ? 
            WHERE p.estatus != 'OK'`, [inspeccion_id]).then(r => r.rows.item(0).conteo > 0)
    },

    /**
     * Actualiza la paginacion de inspecciones de un siniestro
     * @param {number} idSiniestro 
     * @returns {Promise}
     */
    actualizarPaginacion(idSiniestro) {
        inspeccionLog.debug('actualizando paginacion');
        return sqlPromise('SELECT * FROM Inspeccion WHERE caso_id = ? ORDER BY fecha ASC', [idSiniestro])
            .then(rowsAsList)
            .then(lista => {
                var countPage = 0;
                var promesas = [];
                for (var i = 0; i < lista.length; i++) {
                    var mod = i % 10;
                    if (mod == 0) {
                        countPage++;
                    }
                    inspeccionLog.debug('pagina', countPage, lista[i].tableInspeccionID)
                    var promesa = sqlPromise('UPDATE Inspeccion SET page = ? WHERE tableInspeccionID = ?', [countPage, lista[i].tableInspeccionID])
                        .then(() => {
                            if (lista.length == (i + 1)) {
                                window.localStorage.setItem("lastPageIns", countPage);
                            }
                        });
                    promesas.push(promesa);
                }
            });
    },

    /**
     * Inserta el detalle de inspeccion del servidor
     * @param {DetalleInspeccionServidor} detalleInspeccion 
     * @param {number} inspeccion_id 
     */
    insertarDetalleInternet(detalleInspeccion, inspeccion_id) {
        var query = 'INSERT INTO DetalleInspeccion (caso_id, ' +
            'idInspeccion, ' +
            'dateInspeccion, ' +
            'inspeccion_estado, ' +
            'inspeccion_contacto, ' +
            'inspeccion_mail, ' +
            'inspeccion_declaracion, ' +
            'inspeccion_descrip, ' +
            'inspeccion_dano_estr, ' +
            'inspeccion_almacen, ' +
            'inspeccion_id, ' +
            'correspon_caso, ' +
            'inspeccion_tipo, ' +
            'inspeccion_comentario, ' + 
            'inspeccion_fecha_realizada, ' + 
            'inspeccion_inspector) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?)';
        var correspon_caso = window.localStorage.getItem('idSiniestroServidor');
        var inspeccion_tipo = 4;
        var inspeccion_caso = detalleInspeccion.inspeccion_caso;
        var inspeccion_contacto = detalleInspeccion.inspeccion_contacto;
        var inspeccion_mail = detalleInspeccion.inspeccion_mail;
        var inspeccion_declaracion = detalleInspeccion.inspeccion_declaracion;
        var inspeccion_descrip = detalleInspeccion.inspeccion_descrip;
        var inspeccion_dano_estr = detalleInspeccion.inspeccion_da??o_estr;
        var inspeccion_almacen = detalleInspeccion.inspeccion_almacen;
        var inspeccion_comentario = detalleInspeccion.inspeccion_comentario;
        var dateInspeccion = detalleInspeccion.inspeccion_fecha_crea.split(" ")[0];
        var inspeccion_estado = detalleInspeccion.inspeccion_estado;
        var inspeccion_fecha_realizada = detalleInspeccion.inspeccion_fecha_realizada;
        var idInspeccion = detalleInspeccion.idInspeccion;

        var promesa = sqlPromise(query,
            [inspeccion_caso, idInspeccion, dateInspeccion, inspeccion_estado, inspeccion_contacto, inspeccion_mail, inspeccion_declaracion, inspeccion_descrip,
                inspeccion_dano_estr, inspeccion_almacen, inspeccion_id, correspon_caso, inspeccion_tipo, inspeccion_comentario,
                inspeccion_fecha_realizada, detalleInspeccion.inspeccion_inspector
            ])
        if (detalleInspeccion.caso_detalle) {
            var caso_detalle = detalleInspeccion.caso_detalle;
            var perdidaEstimada = caso_detalle.simbolo + ' ' + numeral(caso_detalle.caso_perdida_estimada).format('0,0.00') + ' (100% Bruta)';
            sqlQuery('UPDATE Siniestro SET caso_fech_ocurren = ?, cia_seg = ?, asegurados = ?,' +
                ' ajustador = ?, causas = ?, perdidaEstimada = ?, caso_n_poliza = ?, ' +
                'caso_direccion = ?, regiones = ?, comunas = ?, caso_fech_ini_poliza = ?,' +
                ' caso_fech_fin_poliza = ?, corredores = ?, beneficiarios = ? WHERE caso_id = ?',
                [caso_detalle.caso_fech_ocurren, caso_detalle.cia_seg, caso_detalle.asegurados,
                caso_detalle.ajustador, caso_detalle.causas, perdidaEstimada, caso_detalle.caso_n_poliza,
                caso_detalle.caso_direccion, caso_detalle.regiones, caso_detalle.comunas, caso_detalle.caso_fech_ini_poliza,
                caso_detalle.caso_fech_fin_poliza, caso_detalle.corredores, caso_detalle.beneficiarios, caso_detalle.caso_id
                ]);
        }

        return promesa.then(() => idInspeccion);
    },

   /**
     * Actualiza el detalle de inspeccion con informacion del servidor
     * @param {DetalleInspeccionServidor} detalleInspeccion  
     */
    actualizarDetalleServidor(detalleInspeccion) {
        var inspeccion_tipo = 4;
        var inspeccion_contacto = detalleInspeccion.inspeccion_contacto;
        var inspeccion_mail = detalleInspeccion.inspeccion_mail;
        var inspeccion_declaracion = detalleInspeccion.inspeccion_declaracion;
        var inspeccion_descrip = detalleInspeccion.inspeccion_descrip;
        var inspeccion_dano_estr = detalleInspeccion.inspeccion_da??o_estr;
        var inspeccion_almacen = detalleInspeccion.inspeccion_almacen;
        var inspeccion_comentario = detalleInspeccion.inspeccion_comentario;
        var dateInspeccion = detalleInspeccion.inspeccion_fecha_crea.split(" ")[0];
        var inspeccion_estado = detalleInspeccion.inspeccion_estado;
        var inspeccion_fecha_realizada = detalleInspeccion.inspeccion_fecha_realizada;
        var idInspeccion = detalleInspeccion.idInspeccion;

        var promesa = sqlPromise(`UPDATE DetalleInspeccion SET 
                dateInspeccion = ?,
                inspeccion_estado = ?,
                inspeccion_contacto = ?,
                inspeccion_mail = ?,
                inspeccion_declaracion = ?,
                inspeccion_descrip = ?,
                inspeccion_dano_estr = ?,
                inspeccion_almacen = ?,
                inspeccion_tipo = ?,
                inspeccion_comentario = ?,
                inspeccion_fecha_realizada = ?,
                inspeccion_inspector = ?
            WHERE inspeccion_id = ?`, [
                dateInspeccion, inspeccion_estado, inspeccion_contacto, inspeccion_mail, inspeccion_declaracion, inspeccion_descrip,
                inspeccion_dano_estr, inspeccion_almacen, inspeccion_tipo, inspeccion_comentario,
                inspeccion_fecha_realizada, detalleInspeccion.inspeccion_ajustador, detalleInspeccion.inspeccion_id
            ])
        if (detalleInspeccion.caso_detalle) {
            var caso_detalle = detalleInspeccion.caso_detalle;
            var perdidaEstimada = caso_detalle.simbolo + ' ' + numeral(caso_detalle.caso_perdida_estimada).format('0,0.00') + ' (100% Bruta)';
            sqlQuery('UPDATE Siniestro SET caso_fech_ocurren = ?, cia_seg = ?, asegurados = ?,' +
                ' ajustador = ?, causas = ?, perdidaEstimada = ?, caso_n_poliza = ?, ' +
                'caso_direccion = ?, regiones = ?, comunas = ?, caso_fech_ini_poliza = ?,' +
                ' caso_fech_fin_poliza = ?, corredores = ?, beneficiarios = ? WHERE caso_id = ?',
                [caso_detalle.caso_fech_ocurren, caso_detalle.cia_seg, caso_detalle.asegurados,
                caso_detalle.ajustador, caso_detalle.causas, perdidaEstimada, caso_detalle.caso_n_poliza,
                caso_detalle.caso_direccion, caso_detalle.regiones, caso_detalle.comunas, caso_detalle.caso_fech_ini_poliza,
                caso_detalle.caso_fech_fin_poliza, caso_detalle.corredores, caso_detalle.beneficiarios, caso_detalle.caso_id
                ]);
        }

        return promesa.then(() => idInspeccion);
    },
}