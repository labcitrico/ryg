/** @type {Logger} */
var refLog = getLogger('ref');

/**
 * Funcion que guarda todos los datos del siniestro
 */
function initRefSin(idSin){
	var idSiniestro = $('#buscarInput').val();
	if(idSin != null && idSin != undefined){
		buscarReferencia(idSin);
	}else if($.trim(idSiniestro) != ''){
		buscarReferencia(idSiniestro);
	}else{
		showError("Debe ingresar un numero de búsqueda o referencia");
	}
}

/**
 * Funcion que busca el siniestro por medio de su referencia
 * @param {*} numSin 
 */
/**
 * Funcion que busca el siniestro por medio de su referencia
 * @param {*} numSin 
 */
function buscarReferencia(numSin) {
	refLog.debug('consultando ref ' + numSin);
	if (verificarConexion() == true) {
		refLog.debug(`buscando referencia con interner ${numSin}`);
		//Validar si el siniestro ya existe
		sendGetRequest('siniestro_full.php?caso=' + numSin, function (siniestro) {
			showNotice("Consultando información del siniestro, espere un momento...");
			fn.load('carga.html');
			if (siniestro) {
				var caso_n_siniestro = siniestro.caso_n_siniestro;
				caso_n_siniestro = caso_n_siniestro != null && caso_n_siniestro != undefined ?
					caso_n_siniestro : siniestro.caso_id;
				setDataSiniestro(siniestro.caso_id, caso_n_siniestro, siniestro.estado_real);
				guardarSiniestro(siniestro);
			} else {
				refLog.debug(`no se encuentra en el sistema ${numSin}`);
				showNotice('N° Registro R&G o N° de Siniestro " ' + numSin + ' " no se encuentra en el sistema');
			}
		}, function (error) {
			if (error.status == 404) {
				refLog.debug(`no se encuentra en el sistema ${numSin}`);
				showNotice('N° Registro R&G o N° de Siniestro " ' + numSin + ' " no se encuentra en el sistema');
			}
		});
	} else {
		refLog.debug(`buscando referencia sin internet ${numSin}`);
		showNotice("Consultando información del siniestro, espere un momento...");
		sqlQuery("SELECT * FROM Siniestro WHERE caso_id = ?", [numSin], function (noExisteSin) {
			if (noExisteSin == true) {
				sqlQuery('SELECT * FROM Siniestro WHERE caso_n_siniestro = ?', [numSin], function (noExisteNumSin) {
					if (noExisteNumSin == true) {
						sqlQuery('SELECT * FROM DatosUsuario', null, function (dataUser) {
							if (dataUser != true) {
								if (isNaN(parseInt(numSin))) {
									showError('El numero de siniestro debe ser un numero')
									return;
								}
								sqlQuery(`INSERT INTO Siniestro (caso_id, caso_n_siniestro, estado, 
									estado_real, ajustador, caso_fech_ocurren, 
									causas, perdidaEstimada, caso_n_poliza) VALUES (?,?,?,?,?,?,?,?,?)`, [
									numSin, '', '',
									'', dataUser[0].user_nombre, '',
									'', 'N/A', ''
								], function (last_id) {
									if (last_id) {
										refLog.debug('cargando datos sin conexion')
										fn.load('ref.html');
										window.localStorage.setItem("siniestroLoaded", false);
										setDataSiniestro(numSin, numSin, 'Sin Conexión');
									} else {
										refLog.error('error al ingresar un siniestro sin conexion')
										showError('Ocurrió un error al ingresar un siniestro sin conexión');
									}
								}, true);
							} else {
								refLog.debug('no se encontraron los datos del ajustador');
								showNotice("No se encontraron los datos del ajustador");
							}
						});
					} else {
						fn.load('ref.html');
						var caso_id = noExisteNumSin[0].caso_id;
						var caso_n_siniestro = noExisteNumSin[0].caso_n_siniestro;
						var estado = noExisteNumSin[0].estado_real;
						setDataSiniestro(caso_id, caso_n_siniestro, estado);
					}
				});
			} else {
				fn.load('ref.html');
				var caso_id = noExisteSin[0].caso_id;
				var caso_n_siniestro = noExisteSin[0].caso_n_siniestro;
				var estado = noExisteSin[0].estado_real;
				estado = estado ? estado : "Sin Conexión";
				setDataSiniestro(caso_id, caso_n_siniestro, estado);
			}
		});
	}
}

/**
 * Función para setear los titulos e información del siniestro actual
 * @param {* Id_del_siniestro} caso_id 
 * @param {* Numero_de_siniestro} n_siniestro 
 * @param {* estado_del_siniestro} estadoSin 
 */
function setDataSiniestro(caso_id, n_siniestro, estadoSin) {
	//Id del siniestro
	if (caso_id != null && caso_id != undefined) {
		var titleApp = '<ons-icon icon="md-edit"></ons-icon>Ref. R&G N° ' + caso_id;
		$('#titleApp').html(titleApp);
		window.localStorage.setItem("titleApp", titleApp);
		window.localStorage.setItem("idSiniestroServidor", caso_id);
	}
	//Numero del siniestro
	if (n_siniestro != null && n_siniestro != undefined) {
		var numeroSiniestro = 'Siniestro N° ' + n_siniestro;
		$('#numeroSiniestro').html(numeroSiniestro);
		window.localStorage.setItem("numeroSiniestro", numeroSiniestro);
	}
	//Estado del siniestro
	if (estadoSin != null && estadoSin != undefined) {
		var estatusSiniestro = 'Sit. Actual: ' + estadoSin;
		$('#estatusSiniestro').html(estatusSiniestro);
		window.localStorage.setItem("estatusSiniestro", estatusSiniestro);
	}
}

/**
 * Función que guarda toda la 
 * información de un siniestro
 * @param {*} data 
 */
function guardarSiniestro(data) {
	refLog.debug('guardando siniestro', data);
	if (data != null) {
		refLog.debug('guardando siniestro', data);
		//Datos del siniestro
		sqlPromise('SELECT COUNT(*) AS conteo FROM Siniestro WHERE caso_id = ?', [data.caso_id]).then(row => {
			if (row.rows.item(0).conteo != 0) {
				return Promise.reject('Ya existe')
			}
		}).then(() => {
			if (data.caso_perdida_bruta > 100) {
				data.caso_perdida_bruta = 100;
			}
			var perdidaEstimada = getPerdidaEstimada(data);
			//perdidaEstimada = JSON.stringify(perdidaEstimada);
			return sqlPromise(`INSERT INTO Siniestro (caso_id, caso_n_siniestro, caso_n_poliza, 
				estado, regiones, caso_direccion,
				corredores, caso_fech_ini_poliza, caso_fech_fin_poliza,
				beneficiarios, comunas, perdidaEstimada,
				estado_real, caso_fech_ocurren, cia_seg, 
				asegurados, ajustador, causas, 
				perdidaEstimada) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
				data.caso_id, data.caso_n_siniestro, data.caso_n_poliza,
				data.estado_real, data.regiones, data.caso_direccion,
				data.corredores, data.caso_fech_ini_poliza, data.caso_fech_fin_poliza,
				data.beneficiarios, data.comunas, perdidaEstimada,
				data.estatus_real != null ? data.estatus_real.valor : null, data.caso_fech_ocurren, data.cia_seg, 
				data.asegurados, data.ajustador, data.causas, 
				perdidaEstimada
			])
		}).then(result => {
			contentLoaded = contentLoaded + 25;
			let last_id = result.insertId;
			console.error('INSERT ID', last_id);
			if (last_id) {
				window.localStorage.setItem('idSiniestroLocal', last_id);
			}
			//Bitácora del siniestro
			if (data.bitacora != null && data.bitacora != undefined && data.bitacora.length != 0) {
				data.bitacora.forEach(function (bitacora, i) {
					sqlQuery("SELECT * FROM Bitacora WHERE id = ?", [bitacora.id], function (results) {
						var params = fn.JsonToArray(bitacora);
						if (results == true) {
							params.push(data.caso_id);
							params.push(last_id ? last_id : null);
							sqlQuery('INSERT INTO Bitacora (id, fecha_orden, fecha, gestion, tiempo, comentario, usuario, subtarea, bitacora_caso, fk_idSiniestro) VALUES (?,?,?,?,?,?,?,?,?,?)',
								params, null);
						}
						if (data.bitacora.length == (i + 1)) {
							contentLoaded = contentLoaded + 25;
						}
					});
				});
			} else {
				contentLoaded = contentLoaded + 25;
			}
		}).catch(error => {
			if (error == 'Ya existe') {
				sqlPromise(`UPDATE Siniestro SET caso_n_siniestro = ?, caso_fech_ocurren = ?, cia_seg = ?, 
						asegurados = ?, ajustador = ?, causas = ?,
						corredores = ?, caso_n_poliza = ?, comunas = ?,
						caso_fech_ini_poliza = ?, caso_fech_fin_poliza = ?, estado = ?,
						estado_real = ?, caso_direccion = ?, regiones = ?,
						beneficiarios = ?
					WHERE caso_id = ?`, [
						data.caso_n_siniestro, data.caso_fech_ocurren, data.cia_seg, 
						data.asegurados, data.ajustador, data.causas,
						data.corredores, data.caso_n_poliza, data.comunas,
						data.caso_fech_ini_poliza, data.caso_fech_fin_poliza, data.estado,
						data.estatus_real != null ? data.estatus_real.valor : null, data.caso_direccion, data.regiones,
						data.beneficiarios,
						data.caso_id
				]);
				contentLoaded = contentLoaded + 50;
			}
		});

		//Gastos del siniestro
		if (data.gastos != null && data.gastos != undefined && data.gastos.length != 0) {
			var pageCount = 0;
			var query = 'INSERT INTO Gasto (gastos_repor_id, '
				+ 'gastos_repor_caso, '
				+ 'gastos_repor_consecu, '
				+ 'gastos_repor_user, '
				+ 'gastos_repor_ajustador, '
				+ 'gastos_repor_moneda, '
				+ 'gastos_repor_anticipo, '
				+ 'gastos_repor_nombre, '
				+ 'gastos_repor_f_ini, '
				+ 'gastos_repor_f_fin, '
				+ 'gastos_repor_mail, '
				+ 'gastos_repor_coment, '
				+ 'gastos_repor_fecha_envi, '
				+ 'gastos_repor_fecha, '
				+ 'ajustador, '
				+ 'correspon_caso, '
				+ 'page) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

			data.gastos.forEach(function (gasto, i) {
				sqlQuery("SELECT * FROM Gasto WHERE gastos_repor_id = ?", [gasto.gastos_repor_id], function (results) {
					var numRegistro = i;
					var mod = numRegistro % 20;
					if (mod == 0) {
						pageCount++;
					}
					var params = fn.JsonToArray(gasto);
					params.push(data.caso_id);
					params.push(pageCount);
					if (results == true) {
						sqlQuery(query, params, null);
					}
					if (data.gastos.length == (i + 1)) {
						window.localStorage.setItem("lastPageGasto", pageCount);
						sqlQuery('SELECT * FROM Gasto WHERE gastos_repor_caso = ? AND gastos_repor_id IS NULL', [data.caso_id], function (gastosLocales) {
							if (gastosLocales != true) {
								gastosLocales.forEach(function (gastoLocal, countGastLocal) {
									var numRegistro = data.gastos.length + (countGastLocal + 1);
									var mod = numRegistro % 20;
									if (mod == 0) {
										pageCount++;
									}
									var consecu = data.gastos.length + (countGastLocal + 1);
									sqlQuery('UPDATE Gasto SET page = ?, gastos_repor_consecu = ? WHERE idGasto = ?', [pageCount, consecu, gastoLocal.idGasto]);
									if (gastosLocales.length == (countGastLocal + 1)) {
										window.localStorage.setItem("totalRegGastos", numRegistro);
										contentLoaded = contentLoaded + 25;
									}
								});
							} else {
								contentLoaded = contentLoaded + 25;
							}
						});
					}
				});
			});
		} else {
			contentLoaded = contentLoaded + 25;
		}

		//Inspección del siniestro
		if (data.inspeccion != null && data.inspeccion != undefined && data.inspeccion.length != 0) {
			var pageCountIns = 0;
			data.inspeccion.forEach(function (inspeccion, i) {
				sqlQuery("SELECT * FROM Inspeccion WHERE inspeccion_id = ?", [inspeccion.inspeccion_id], function (results) {
					var numRegistro = i;
					var mod = numRegistro % 20;
					if (mod == 0) {
						pageCountIns++;
					}
					var params = fn.JsonToArray(inspeccion);
					params.push(data.caso_id);
					params.push(pageCountIns);
					if (results == true) {
						sqlQuery('INSERT INTO Inspeccion (inspector, inspeccion_id, fecha, estado, inspeccion_tipo, caso_id, page) VALUES (?,?,?,?,?,?,?)',
							params, null);
					}
					if (data.inspeccion.length == (i + 1)) {
						contentLoaded = contentLoaded + 25;
						window.localStorage.removeItem("lastPageIns");
						window.localStorage.setItem("lastPageIns", pageCountIns);
						window.localStorage.setItem("totalRegIns", data.inspeccion.length);
					}
				});
			});
		} else {
			contentLoaded = contentLoaded + 25;
		}

		// Descargar fotos de inspeccion
		descargarFotografias();
	}
}

function descargarFotografias() {
	var numSin = window.localStorage.getItem("idSiniestroServidor");
	if (verificarConexion() == true) {
		Directorios.obtenerDirectorioEspinosaPhotos(numSin).then(directorio => {
			sendGetRequest('fotos.php?caso=' + numSin, function (lstFotos) {
				if (lstFotos) {
					if (lstFotos.length != 0) {
						savePhotoFile(directorio, lstFotos, 0);
					}
				}
			});
		});
	}
}

/**
 * Almacena las fotografías de
 * la inspección del siniestro actual
 * @param {*} photosDir
 * @param {*} lstFotos
 * @param {*} index
 */
function savePhotoFile(photosDir, lstFotos, index) {
	var foto = lstFotos[index];
	// Se calcula el porcentaje de fotos cargadas
	var porcentaje = 100 / lstFotos.length;
	contentLoadedFotografias = contentLoadedFotografias + porcentaje;
	var numSin = window.localStorage.getItem("idSiniestroServidor");
	if (foto != null) {
		sqlQuery('SELECT * FROM FotoInspeccion WHERE fotos_id = ?', [foto.fotos_id], function (noExiste) {
			if (noExiste == true) { //Si no existe la foto, se guarda
				var fileName = 'IMG_' + foto.fotos_id + '.jpg';
				photosDir.getFile(fileName, {
					create: true
				}, function (fileEntry) {
					//Normaliza el formato de fecha
					var fecha_ingreso = foto.fotos_fecha.split(" ")[0];
					fecha_ingreso = moment(fecha_ingreso, "YYYY-MM-DD").format("DD/MM/YYYY");
					if (fecha_ingreso === "Invalid date") {
						fecha_ingreso = moment(fecha_ingreso, "YYYY-DD-MM").format("DD/MM/YYYY");
					}
					// Descargar foto y guardar en archivo

					downloadPhoto(fileEntry, foto.fotos_id, function (imagen) { // {fullpath: string, base64: string}
						if (foto != null && imagen != null) {
							sqlQuery('INSERT INTO FotoInspeccion (fotos_id, fotos_observaciones, fecha_ingreso, tipo_foto_nombre, up_documento, base64, edita_dato) VALUES (?,?,?,?,?,?,?)',
								[foto.fotos_id, foto.fotos_observaciones, fecha_ingreso, foto.tipo_foto_nombre, imagen.up_documento, imagen.base64, numSin],
								function (results) {
									if (lstFotos.length > index) {
										index++;
										savePhotoFile(photosDir, lstFotos, index);
									}
								}, true);
						} else {
							// Si la fotografia no existe por parte del servidor, se busca la siguiente
							if (lstFotos.length > index) {
								index++;
								savePhotoFile(photosDir, lstFotos, index);
							}
						}
					});
				});
			} else { // Si ya existe la foto, se busca la siguiente
				if (lstFotos.length > index) {
					index++;
					savePhotoFile(photosDir, lstFotos, index);
				}
			}
		});
	}
}