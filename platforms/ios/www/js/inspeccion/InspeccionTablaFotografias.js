/**
 * Genera la tabla de fotografias
 * @class
 */
var InspeccionTablaFotografias = {
    /**
     * Carga el formulario de fotografias, si la inspeccion tiene minimo 6 fotografias
     * entonces solo pide una fotografia, si no pide que suba 6 fotografias
     */
    abrirFormularioFotos() {
        validateNuevasFotografias(); 
        let idSiniestro = window.localStorage.getItem("idSiniestroServidor");
        fn.load('fotografias.html');
        this.obtenerFotosNecesarias(idSiniestro)
            .then(numero => this.obtenerCatalogoFotos().then(catalogo => ({numero, catalogo})))
            .then(datos => {
                console.error('datos', datos)
                $('#tableFotografias').html(this.generarTabla(datos.numero, datos.catalogo));
                validateNuevasFotografias();
                loadActionSheet('fotoOptions.html');
                var inputs = document.querySelectorAll('input[data-fotografia]');
                for(var i = 0; i < inputs.length; i++){
                    inputs[i].addEventListener("focus", function(){
                        this.blur();
                    }); 
                }
            })
            .catch(error => {
                fotoLog.error('error al crear formulario fotografias', error)
                showNotice("ha ocurrido un error inesperado, intentelo mas tarde");
            });
    },

    /**
     * Agrega fotografias al formulario
     */
    agregarFotografias() {
        closeModal();
        let fotosAgregadas = parseInt(document.getElementById('numberFotos').value);
        this.obtenerCatalogoFotos().then(catalogo => {
            $('#tableFotografias table').append(this.generarTr(fotosAgregadas, catalogo));
            validateNuevasFotografias();
        });
    },

    /**
     * Determina las fotos minimas necesarias
     * @param {number} siniestro
     * @returns {Promise<number>}
     */
    obtenerFotosNecesarias(siniestro) {
        return sqlPromise('SELECT COUNT(*) as conteo FROM FotoInspeccion WHERE edita_dato = ? ORDER BY fotos_id ASC;', [siniestro])
            .then(r => r.rows.item(0).conteo >= 6 ? 1 : 6);
    },

    /** 
     * Regresa los tipos de fotografias
     * @returns {Promise<Object>}
     */
    obtenerCatalogoFotos: () => sqlPromise('SELECT * FROM CatalogoTipoFoto')
        .then(rowsAsList),

    /**
     * Genera la tabla de fotografias
     * @param {number} numeroFotos 
     * @param {Array<Object>} catalogos 
     */
    generarTabla(numeroFotos, catalogos) {
        return `<table id="tableFotografias" class="table table-striped shadow-sm">
            ${this.generarTr(numeroFotos, catalogos)}
        </tbody>`;
    },
    
    /**
     * Genera un tr para la tabla
     * @param {number} numeroFotos 
     * @param {Array<Object>} catalogos 
     */
    generarTr(numeroFotos, catalogos) {
        let html = '';
        for (let i = 0; i < numeroFotos; i++) {
            html += `
            <tbody data-seccion-foto>
                <tr>
                    <td>Tipo</td>
                    <td>${this.generarSelect(i, catalogos)}</td>
                </tr>
                <tr>
                    <td>Fotografia</td>
                    <td>${this.generarInput(i)}</td>
                </tr>
                <tr>
                    <td>Comentario</td>
                    <td>
                        <input type="hidden" id="nombre_foto-${i}" name="nombre_foto-${i}"> 
                        <textarea name="comentarioDoc" class="form-control" rows="5" data-comentario="" name="text"></textarea>
                    </td>
                </tr>
            </tbody>\n`;
        }
        return html;
    },

    /**
     * Genera select
     */
    generarSelect: (foto, catalogos) => `
        <ons-select onchange="updateNombreFoto(${foto});" data-tipo required>
            ${catalogos.map(c => `<option value="${c.tipo_foto_id}">${c.tipo_foto_nombre}</option>`)}
        </ons-select>`,

    /**
     * Genera input 
     * @param {number} foto
     */
    generarInput: (foto) => `
        <ons-button data-boton-foto="${foto}" onclick="InspeccionFotografia.mostrarOpciones(event)" 
            style="background-color: white;color:#FE8416;" class="button--material">Cargar Fotografia</ons-button>
        <input accept="image/*" data-foto="${foto}" name="foto-${foto}" 
            style="width:0;padding:0;margin:0;border:0;pointer-events: none;position:absolute" 
            tabIndex="-1" required/>
        <input type="hidden" data-base64="${foto}"/>
        <input type="file" accept="image/*" data-archivo-asociado="${foto}" tabIndex="-1" 
            style="width:0;padding:0;margin:0;border:0;pointer-events: none;position:absolute;display:none" />`,
};
