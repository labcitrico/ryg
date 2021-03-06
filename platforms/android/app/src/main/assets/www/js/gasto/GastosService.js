/**
 * Servicio para gastos
 * @class
 */
const GastosService = {
    descargaFileTransfer: null, // FileTransfer usado para descargar,
    DETALLES_POR_PAGINA: 10, // numero de detalles de gasto que devuelve el servicio por pagina

    /**
     * Retorna un listado de detalles de gasto asociados a un gastosReporId
     * @param {number} gastosReporId
     * @returns {Promise<Array<DetalleGasto>>}
     */
    obtenerDetallesDeGastoServidor(gastosReporId) {
        function obtenerPagina(pagina) {
            return new Promise((resolve, reject) => {
                sendGetRequest(`gastos_reporte.php?id=${gastosReporId}&pageNum_user=${pagina}`, resolve, reject)
            })
        }
        let paginas = [];
        return obtenerPagina(0).then(response => {
            paginas.push(response.repGasto.resultados) // guardar la primera pagina
            let registros = parseInt(response.repGasto.registros); // cantidad de registros totales
            let pagina = 1;
            // si hay mas registros en las otras paginas, envia un request y obtiene los resultados
            for (let i = this.DETALLES_POR_PAGINA; i < registros; i += this.DETALLES_POR_PAGINA)
                paginas.push(obtenerPagina(pagina++).then(response => response.repGasto.resultados));
            return Promise.all(paginas)
        }).then(resultadosPorPagina => {
            return Array.prototype.concat.apply([], resultadosPorPagina)
        });
    }, 

    /**
     * Actualiza los detalles de gasto con la informacion del servidor
     * @param {number} gastosReporId
     * @param {number} idGasto 
     */
    actualizarDetallesDeGasto(gastosReporId, idGasto) {
        /** 
         * Funcion para actualizar el detalle de gasto con los datos obtenidos del servidor
         * @param {DetalleGasto} nuevo 
         * @param {DetalleGasto} actual 
         * */
        let actualizar = (nuevo, actual) => {
            nuevo.idDetalleGasto = actual.idDetalleGasto
            this.detalleGastoTienePeticionesPendiente(actual.idDetalleGasto).then(tienePeticionesPendiente => {
                if (tienePeticionesPendiente) // no se actualiza si todavia tiene peticiones pendiente
                    return;
                return GastosService.actualizarDetalleGasto(nuevo);
            })
        }
        // obtener los detalles locales y del servidor
        return Promise.all([
            this.obtenerDetallesDeGastoServidor(gastosReporId), // 0 servidor
            this.obtenerDetallesDeGasto(idGasto) // 1 local
        ]).then(resultado => {
            console.log('resultado', resultado);
            // filtrar los detalles de gasto eliminados
            let pendientesDeEliminar = resultado[1].filter(local => {
                let estaSincronizado = local.gastos_id != null;
                let noEstaEnServidor = !resultado[0].find(servidor => local.gastos_id == servidor.gastos_id);
                // si esta sincronizado gastos_id y no esta en el servidor
                return estaSincronizado && noEstaEnServidor
                    
            })
            let promesasEliminar = pendientesDeEliminar.map(detalleGasto => {
                return this.eliminarDetalleGasto(detalleGasto.idDetalleGasto);
            });
            let promesasAgregar = resultado[0].map(detalleNuevo => {
                return this.obtenerDetalleGastoPorGastosId(detalleNuevo.gastos_id).then(detalleActual => {
                    detalleNuevo.fk_idGasto = idGasto; // asignar el idGasto con el detalle de gasto del servidor
                    if (detalleActual != null) { // existe, hay que actualizarlo
                        return actualizar(detalleNuevo, detalleActual); 
                    } else { // no existe se inserta en la bd
                        return GastosService.guardarDetalleGasto(detalleNuevo) // no exite insertar
                    }
                })
            });
            return Promise.all(promesasAgregar.concat(promesasEliminar)).catch(error => {
                showError('Error inesperado al obtener listado')
                gastoLog.error('Error al obtener listado de detalle gastos', error)
            })
        })
        .finally(() => hideLoading())
    },

    estaPendienteDeEliminar(idDetalleGasto) {
        return sqlPromise(`SELECT * FROM Peticiones WHERE entidad = 'EliminarDetalleGasto' 
                AND identificador = ? AND estatus != 'OK'`, [idDetalleGasto])
            .then(r => r.rows.length > 0 ? true : false)
    },

    eliminarDetalleGasto(idDetalleGasto) {
        return sqlPromise(`DELETE FROM Peticiones WHERE entidad = 'DocumentoGasto' AND identificador IN (
            SELECT idDocumentoGasto FROM DocumentoGasto WHERE fk_idDetalleGasto=?)`, 
            [idDetalleGasto])
            .then(() => sqlPromise(`DELETE FROM DocumentoGasto WHERE fk_idDetalleGasto=?`, [idDetalleGasto]))
            .then(() => sqlPromise(`DELETE FROM Peticiones WHERE entidad = 'DetalleGasto' AND identificador=?`, [idDetalleGasto]))
            .then(() => sqlPromise('DELETE FROM DetalleGasto WHERE idDetalleGasto=?', [idDetalleGasto]))
    },

    tieneDocumentosPendientes(idDetalleGasto) {
        return sqlPromise(`SELECT * FROM Peticiones p INNER JOIN DocumentoGasto dg ON 
            p.estatus != 'OK' AND
            p.entidad = 'DocumentoGasto' AND 
            dg.idDocumentoGasto = p.identificador AND
            dg.fk_idDetalleGasto = ?`, [idDetalleGasto]).then(r => {
                return r.rows.length > 0;
            })
    },

    /**
     * El gasto tiene peticiones pendientes?
     * @param {number} idGasto 
     * @returns {Promise<boolean>}
     */
    gastoTienePeticionesPendiente(idGasto) {
        return sqlPromise(`SELECT COUNT(*) as conteo FROM Peticiones 
            WHERE entidad = 'Gasto' AND identificador = ? AND estatus != 'OK'`, [idGasto])
        .then(r => r.rows.item(0).conteo > 0)
    },

    /**
     * El detalle de gasto tiene peticiones pendiente?
     * @param {number} gastosId
     * @returns {Promise<boolean>}
     */
    detalleGastoTienePeticionesPendiente(gastosId) {
        return sqlPromise(`SELECT COUNT(*) as conteo FROM Peticiones p 
            INNER JOIN DetalleGasto d ON p.entidad = 'DetalleGasto' AND d.idDetalleGasto = p.identificador
            WHERE d.gastos_id = ? AND p.estatus != 'OK'`, [gastosId])
        .then(conteo => conteo > 0)
    },

    /**
     * Obtiene un detalle de gasto por su gastos_id
     * @param {number} gastosId
     * @returns {Promise<DetalleGasto|null>}
     */
    obtenerDetalleGastoPorGastosId(gastosId) {
        return sqlPromise(`SELECT * FROM DetalleGasto WHERE gastos_id = ?`, [gastosId])
            .then(resultado => resultado.rows.length > 0 ? resultado.rows.item(0) : null)
    },

    /**
     * Dado una ruta con el formato ../documents/* descarga y regresa la direccion del archivo.
     * Si ya se ha descargado no lo vuelve a descargar
     * @param {string} comprobante 
     */
    descargarDocumenetoServidor(comprobante) {
        comprobante = comprobante.replace('../documentos/', SERVIDOR_DOCUMENTOS)
        let nombre = comprobante.substr(comprobante.lastIndexOf('/') + 1);
        let encontrarArchivo = Directorios.obtenerDirectorioGastoTemporal().then(directorio => {
            return Promise.all([
                directorio.nativeURL + nombre,
                Directorios.existeArchivo(directorio.nativeURL + nombre)
            ]) 
        });
        return encontrarArchivo.then(resultado => {
            let fileURL = resultado[0];
            let existe = resultado[1];
            if (!existe) {
                let headers = {
                    headers: {
                        "Authorization": "Bearer " + window.localStorage.getItem("tokenLogin")
                    }
                }
                GastosService.descargaFileTransfer = new FileTransfer();
                let descarga = new Promise((resolve, reject) => GastosService.descargaFileTransfer
                    .download(comprobante, fileURL, resolve, reject, null, headers));
                createAlertDialog('dialogoDescargarDocumentoGasto', 'dialogoDescargarDocumentoGasto.html');                    
                return descarga.then(fileEntry => {
                    return fileEntry.nativeURL;
                }).finally(() => {
                    hideAlertDialog('dialogoDescargarDocumentoGasto')
                })
            } else {
                return Promise.resolve(fileURL);
            }
        })
    },

    /**
     * Regresa el siguiente consecutivo del gasto dado el numero del siniestro
     * @param {number} gastos_repor_caso 
     * @returns {Promise<number>}
     */
    obtenerSiguienteConsecutivo(gastos_repor_caso) {
        if (gastos_repor_caso == null) {
            gastos_repor_caso = 0; // no tiene siniestro
            var totalRegistros = window.localStorage.getItem("totalRegGastos");
            if (totalRegistros != null && totalRegistros != "") {
                return Promise.resolve(parseInt(totalRegistros) + 1);
            }
        }
        return sqlPromise(`SELECT MAX(gastos_repor_consecu) as consecutivo FROM Gasto WHERE gastos_repor_caso = ?`, [gastos_repor_caso])
            .then(resultado => {
                if (resultado.rows.item(0) == null || resultado.rows.item(0) == 0)
                    return 1
                return resultado.rows.item(0).consecutivo + 1
            })
    },

    /**
     * Funcion para obtener imagen de camara o galeria usada en Android
     * @param {*} fuente
     * @returns {Promise}
     */
    cargarImagenConPlugin(fuente) {
        // por defecto galeria
        let srcType = Camera.PictureSourceType.SAVEDPHOTOALBUM;
        if (fuente === 'CAMARA') {
            srcType = Camera.PictureSourceType.CAMERA
        }
        return new Promise((resolve, reject) => {
            navigator.camera.getPicture(resolve, reject, {
                quality: 90,
                destinationType: Camera.DestinationType.FILE_URI,
                sourceType: srcType,
                encodingType: Camera.EncodingType.JPEG,
                mediaType: Camera.MediaType.PICTURE,
                allowEdit: false,
                correctOrientation: false
            })
        }).then(fotoUri => {
            //let fileName = fotoUri.substr(fotoUri.lastIndexOf('/') + 1)
            let newFileName = getUUID() + '.jpg'
            console.error(newFileName, 'newName')
            return GastosService.guardarDocumentoGasto(fotoUri, newFileName)
        })
        .then(fileEntry => {
            console.error('fileEntry', fileEntry)
            return fileEntry;
        })
    },

    /**
     * Opcion para cargar una imagen desde el input 
     * @param {HTMLInputElement} input
     * @returns {Promise}
     */
    cargarImagenDesdeInput(input) {
        let extension = input.value.split('.').pop().toLowerCase();
        let extensionValida = (extension == 'jpg' || extension == 'png' || extension == 'jpeg');
        if (!extensionValida) {
            showError('La imagen debe ser jpg, jpeg o png');
            return;
        }
        let filename = getUUID() + '.' + extension;
        let reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = () => {
                resolve(new Blob([reader.result], {type: input.files[0].type}))
            }
            reader.onerror = reject;
            reader.readAsArrayBuffer(input.files[0]);
        }).then(blob => {
            return Directorios.obtenerDirectorioEspinosaDocs().then(dir => {
                return Directorios.guardarArchivo(dir.nativeURL, filename, blob)
            });
        })
    },

    /**
     * Funcion para guardar un documento de gasto
     * @param {string} fileURL direccion completa del archivo
     * @param {string} newName nuevo nombre para el archivo
     * @returns {Promise}
     */
    guardarDocumentoGasto(fileURL, newName) {
        return Promise.all([
            Directorios.obtenerDirectorioGasto(), // 0
            Directorios.obtenerBlobArchivo(fileURL) // 1
        ]).then(data => {
            return Directorios.guardarArchivo(data[0].nativeURL, newName, data[1])
        })
    },

    /**
     * Funcion para guardar un documento de gasto directamente desde un input
     * @param {HTMLInputElement} input 
     */
    guardarDocumentoGastoDesdeInput(input) {
        let extension = input.value.split('.').pop().toLowerCase();
        let newFileName = getUUID() + '.' + extension;
        let blob = new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onload = function () {
                resolve(new Blob([reader.result], {
                    type: 'text/xml'
                }))
                resolve(blob)
            };
            reader.onerror = reject
            reader.readAsArrayBuffer(input.files[0]);
        });
        let parametros = [Directorios.obtenerDirectorioGasto(), blob];
        return Promise.all(parametros)
            .then(p => Directorios.guardarArchivo(p[0].nativeURL, newFileName, p[1]))
            .then(URI => {
                gastoLog.error('xml', URI)
                return URI;
            })
    },

    /** 
     * Obtiene un listado de gastos por pagina
     * @param {number} numeroSiniestro
     * @param {number} pagina
     * @returns {Promise<Array<Gasto>>}
     */
    obtenerGastosPorPagina(numeroSiniestro, pagina) {
        if (numeroSiniestro == null || numeroSiniestro === 0) { // sin siniestro(general)
            return sqlPromise('SELECT * FROM Gasto WHERE gastos_repor_caso = ? AND page = ? ORDER BY gastos_repor_consecu DESC LIMIT 10', [0, pagina])
                .then(rowsAsList);
        } else { // con siniestro
            return sqlPromise('SELECT * FROM Gasto WHERE gastos_repor_caso = ? AND page = ? ORDER BY gastos_repor_consecu DESC LIMIT 20', [numeroSiniestro, pagina])
                .then(rowsAsList);
        }
    },

    /**
     * Obtiene los detalles de gasto dado su idGasto
     * @param {number|string} idGasto
     * @returns {Promise<DetalleGasto[]>}
     */
    obtenerDetallesDeGasto(idGasto) {
        return sqlPromise('SELECT * FROM DetalleGasto WHERE fk_idGasto = ?', [idGasto])
            .then(rowsAsList)
    },

    /**
     * Obtiene la cantidad de gastos para un siniestro dado
     * @param {number} numeroSiniestro 
     * @returns {Promise<number>}
     */
    obtenerGastosConteo(numeroSiniestro) {
        return sqlPromise('SELECT COUNT(*) as total FROM Gasto WHERE gastos_repor_caso = ?', [numeroSiniestro == null ? 0 : numeroSiniestro])
            .then(r => r.rows.item(0).total);
    },

    /**
     * Obtiene un listado de todos los gastos por siniestro del servidor
     * @param {number} idSiniestro
     * @returns {Promise} 
     */
    obtenerListaGastoServidor(idSiniestro) {
        if (idSiniestro != null && idSiniestro != 0) {
            return new Promise((resolve, reject) => sendGetRequest('siniestro_full.php?caso=' + idSiniestro, resolve, reject))
                .then(response => ({resultados: response.gastos, registros: response.gastos.length}))
                .then(listado => {
                    console.error(listado);
                    return listado;
                })
        }
        
        let gastosSinSiniestro = (indicePagina) => new Promise((resolve, reject) => 
            sendGetRequest('ajustador_gastos.php?pageNum_user=' + indicePagina, resolve, reject))
        return gastosSinSiniestro(0)
            .then(r => parseInt(r.registros)) // obteniendo el total de la primera pagina
            .then(total => { 
                let elementosPorPagina = 10;
                let paginas = [];
                for (let pagina = 0 , i = 0; i < total; i += elementosPorPagina) {
                    paginas.push(pagina++)
                }
                // busca los registros de todas las pagina
                let promesas = paginas.map(pagina => gastosSinSiniestro(pagina))
                return Promise.all(promesas)
            })
            .then(listaResultados => listaResultados.map(r => r.resultados))
            .then(resultados => Array.prototype.concat.apply([], resultados)) // junta los resultados
            .then(listado => ({resultados: listado,  registros: listado.length}))
    },

    /** 
     * Regresa un gasto por su idGasto 
     * @param {number} idGasto
     * @returns {Promise<Gasto|null>}
     */
    obtenerGasto(idGasto) {
        return sqlPromise('SELECT * FROM Gasto WHERE idGasto = ?', [idGasto])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null)
    },

    /**
     * Obtiene documento de gasto
     * @param {number|string} idDetalleGasto 
     * @returns {Promise<DetalleGasto|null>}
     */
    obtenerDetalleGasto(idDetalleGasto) {
        return sqlPromise('SELECT * FROM DetalleGasto WHERE idDetalleGasto = ?', [idDetalleGasto])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null)
    },

    /**
     * Obtiene los detalles de un correo dado su id
     * @param {number} idMail 
     * @returns {Promise<SendMailGasto|null>}
     */
    obtenerSendMailGasto(idMail) {
        return sqlPromise('SELECT * FROM SendMailGasto WHERE idMail = ?', [idMail])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null)
    },

    /**
     * Obtiene el detalle de gasto en la bd
     * @param {number} idDocumentoGasto
     * @returns {Promise<DocumentoGasto|null>}
     */
    obtenerDocumentoGasto(idDocumentoGasto) {
        return sqlPromise('SELECT * FROM DocumentoGasto WHERE idDocumentoGasto = ?', [idDocumentoGasto])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null)
    },

    /**
     * Busca un gasto por su gasto_repor_id, regresa null si no lo encuentra
     * @param {number} gastos_repor_id
     * @returns {Promise<Gasto|null>}
     */
    obtenerGastoPorGastosReporId(gastos_repor_id) {
        return sqlPromise('SELECT * FROM Gasto WHERE gastos_repor_id = ?', [gastos_repor_id])
            .then(r => r.rows.length > 0 ? r.rows.item(0) : null)
    },

    /**
     * Funcion para insertar un nuevo gasto
     * @param {Gasto} g
     * @returns {Promise<SQLResultSet>}
     */
    insertarGasto(g) {
        return sqlPromise(`INSERT INTO Gasto (gastos_repor_id, gastos_repor_caso, gastos_repor_consecu,  
            gastos_repor_user, gastos_repor_ajustador, gastos_repor_moneda,
            gastos_repor_anticipo, gastos_repor_nombre, gastos_repor_f_ini, 
            gastos_repor_f_fin, gastos_repor_mail, gastos_repor_coment, 
            gastos_repor_fecha_envi, gastos_repor_fecha, ajustador, 
            correspon_caso, page) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
                g.gastos_repor_id, g.gastos_repor_caso, g.gastos_repor_consecu, 
                g.gastos_repor_user, g.gastos_repor_ajustador, g.gastos_repor_moneda,
                g.gastos_repor_anticipo, g.gastos_repor_nombre, g.gastos_repor_f_ini,
                g.gastos_repor_f_fin, g.gastos_repor_mail, g.gastos_repor_coment,
                g.gastos_repor_fecha_envi, g.gastos_repor_fecha, g.ajustador,
                g.correspon_caso, g.page
            ])
    },

    /**
     * Actualiza un gasto
     * @param {Gasto} g
     * @returns {Promise<SQLResultSet>}
     */
    actualizarGasto(g) {
        return sqlPromise(`UPDATE Gasto SET gastos_repor_id = ?, gastos_repor_caso = ?, gastos_repor_consecu = ?, 
            gastos_repor_user = ?, gastos_repor_ajustador = ?, gastos_repor_moneda = ?, 
            gastos_repor_nombre = ?, gastos_repor_f_ini = ?, gastos_repor_f_fin = ?, 
            gastos_repor_mail = ?, gastos_repor_coment = ?, gastos_repor_fecha_envi = ?, 
            gastos_repor_fecha = ?, ajustador = ?, correspon_caso = ?,
            gastos_repor_anticipo = ?
            WHERE idGasto = ?`, [
                g.gastos_repor_id, g.gastos_repor_caso, g.gastos_repor_consecu,
                g.gastos_repor_user, g.gastos_repor_ajustador, g.gastos_repor_moneda,
                g.gastos_repor_nombre, g.gastos_repor_f_ini, g.gastos_repor_f_fin,
                g.gastos_repor_mail, g.gastos_repor_coment, g.gastos_repor_fecha_envi,
                g.gastos_repor_fecha, g.ajustador, g.correspon_caso,
                g.gastos_repor_anticipo,
                g.idGasto
        ]);
    },

    /**
     * Inserta un detalle de gasto
     * @param {DetalleGasto} d 
     * @returns {Promise<SQLResultSet>}
     */
    guardarDetalleGasto(d) {
        return sqlPromise(`INSERT INTO DetalleGasto (idDetalleGasto, gastos_id, gastos_caso, gastos_ajustador, 
            gastos_visada, gastos_id_reporte, gastos_valor, gastos_cargar, 
            gastos_moneda, gastos_fecha_real, gastos_emisor, gastos_descripcion, 
            gastos_concepto, gastos_razon_social, gastos_viaje_ini, gastos_viaje_fin, 
            gastos_amex, gastos_nulo, gastos_archivo, gastos_archivo_xml, 
            gastos_archivo_3, gastos_fecha, ajustador, fk_idGasto,
            gastos_repor_id, gastos_movil_caso, anio, mes, 
            dia, up_documento_2) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
            null, d.gastos_id, d.gastos_caso, d.gastos_ajustador,
            d.gastos_visada, d.gastos_id_reporte, d.gastos_valor, d.gastos_cargar,
            d.gastos_moneda, d.gastos_fecha_real, d.gastos_emisor, d.gastos_descripcion,
            d.gastos_concepto, d.gastos_razon_social, d.gastos_viaje_ini, d.gastos_viaje_fin,
            d.gastos_amex, d.gastos_nulo, d.gastos_archivo, d.gastos_archivo_xml,
            d.gastos_archivo_3, d.gastos_fecha, d.ajustador, d.fk_idGasto,
            d.gastos_repor_id, d.gastos_movil_caso, d.anio, d.mes,
            d.dia, d.up_documento_2
        ])
    },

    /** 
     * Actualiza el detalle de gasto
     * @param {DetalleGasto} d
     * @returns {Promise<SQLResultSet>}
     */
    actualizarDetalleGasto(d) {
        return sqlPromise(`UPDATE DetalleGasto SET gastos_caso = ?, gastos_visada = ?, gastos_id_reporte = ?,
            gastos_valor = ?, gastos_cargar = ?, gastos_moneda = ?, gastos_fecha_real = ?, 
            gastos_emisor = ?, gastos_descripcion = ?, gastos_concepto = ?, gastos_razon_social = ?, 
            gastos_viaje_ini = ?, gastos_viaje_fin = ?, gastos_amex = ?, gastos_nulo = ?, 
            gastos_archivo = ?, gastos_archivo_xml = ?, gastos_archivo_3 = ?, gastos_fecha = ?, 
            ajustador = ?, gastos_repor_id = ?, gastos_movil_caso = ?, 
            anio = ?, mes = ?, dia = ?, up_documento_2 = ?, 
            gastos_user = ?, gastos_ajustador = ?
            WHERE idDetalleGasto = ?`, [
            d.gastos_caso, d.gastos_visada, d.gastos_id_reporte,
            d.gastos_valor, d.gastos_cargar, d.gastos_moneda, d.gastos_fecha_real,
            d.gastos_emisor, d.gastos_descripcion, d.gastos_concepto, d.gastos_razon_social,
            d.gastos_viaje_ini, d.gastos_viaje_fin, d.gastos_amex, d.gastos_nulo,
            d.gastos_archivo, d.gastos_archivo_xml, d.gastos_archivo_3, d.gastos_fecha,
            d.ajustador, d.gastos_repor_id, d.gastos_movil_caso,
            d.anio, d.mes, d.dia, d.up_documento_2, 
            d.gastos_user, d.gastos_ajustador,
            d.idDetalleGasto
        ])
    },

    /** 
     * Actualiza el detalle de gasto pero no sus documentos asociados
     * @param {DetalleGasto} d
     * @returns {Promise<SQLResultSet>}
     */
    actualizarDetalleGastoSinDocumentos(d) {
        return sqlPromise(`UPDATE DetalleGasto SET gastos_caso = ?, gastos_visada = ?, gastos_id_reporte = ?,
            gastos_valor = ?, gastos_cargar = ?, gastos_moneda = ?, gastos_fecha_real = ?, 
            gastos_emisor = ?, gastos_descripcion = ?, gastos_concepto = ?, gastos_razon_social = ?, 
            gastos_viaje_ini = ?, gastos_viaje_fin = ?, gastos_amex = ?, gastos_nulo = ?, 
            gastos_fecha = ?, ajustador = ?, gastos_repor_id = ?, gastos_movil_caso = ?, 
            anio = ?, mes = ?, dia = ?,
            gastos_ajustador = ?
            WHERE idDetalleGasto = ?`, [
            d.gastos_caso, d.gastos_visada, d.gastos_id_reporte,
            d.gastos_valor, d.gastos_cargar, d.gastos_moneda, d.gastos_fecha_real,
            d.gastos_emisor, d.gastos_descripcion, d.gastos_concepto, d.gastos_razon_social,
            d.gastos_viaje_ini, d.gastos_viaje_fin, d.gastos_amex, d.gastos_nulo,
            d.gastos_fecha, d.ajustador, d.gastos_repor_id, d.gastos_movil_caso,
            d.anio, d.mes, d.dia, 
            d.gastos_ajustador,
            d.idDetalleGasto
        ])
    },

    /**
     * Actualiza la foto de un detalle de gasto 
     * @param {number} idGasto 
     * @param {number} idDetalleGasto 
     * @param {string} fotoUri 
     * @returns {Promise<SQLResultSet>}
     */
    actualizarFoto(idGasto, idDetalleGasto, fotoUri) {
        return sqlPromise('UPDATE DetalleGasto SET gastos_archivo = ?, up_documento_2 = ? WHERE idDetalleGasto = ?',
            [fotoUri, fotoUri, idDetalleGasto])
            .then(() => sqlPromise('INSERT INTO DocumentoGasto (gasto_id, filetype, mimeType, up_documento, fk_idDetalleGasto) VALUES (?,?,?,?,?)',
                [idGasto, 'png', 'image/jpg', fotoUri, idDetalleGasto]))
    },

    /**
     * Actualiza el xml(comprobante 2) de un detalle de gasto 
     * @param {number} idGasto 
     * @param {number} idDetalleGasto 
     * @param {string} xmlUri 
     * @returns {Promise<SQLResultSet>}
     */
    actualizarXML(idGasto, idDetalleGasto, xmlUri) {
        return sqlPromise('UPDATE DetalleGasto SET gastos_archivo_xml = ? WHERE idDetalleGasto = ?',
            [xmlUri, idDetalleGasto])
            .then(() => sqlPromise('INSERT INTO DocumentoGasto (gasto_id, filetype, up_documento, mimeType, fk_idDetalleGasto) VALUES (?,?,?,?,?)',
                [idGasto, 'xml', xmlUri, 'text/xml', idDetalleGasto]))
    },

    /**
     * Actualiza el pdf de un detalle de gasto 
     * @param {number} idGasto 
     * @param {number} idDetalleGasto 
     * @param {string} pdfUri 
     * @returns {Promise<SQLResultSet>}
     */
    actualizarPDF(idGasto, idDetalleGasto, pdfUri) {
        return sqlPromise('UPDATE DetalleGasto SET gastos_archivo_3 = ? WHERE idDetalleGasto = ?',
            [pdfUri, idDetalleGasto])
            .then(() => sqlPromise('INSERT INTO DocumentoGasto (gasto_id, filetype, up_documento, mimeType, fk_idDetalleGasto) VALUES (?,?,?,?,?)',
                [idGasto, 'pdf', pdfUri, 'application/pdf', idDetalleGasto]))
    },
}