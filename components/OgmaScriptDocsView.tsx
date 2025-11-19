
import React from 'react';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto text-sm">
        <code className="whitespace-pre">{children}</code>
    </pre>
);

const Param: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
    <li><strong>{name}</strong> &rarr; {children}</li>
);

export const OgmaScriptDocsView: React.FC = () => {
    return (
        <div className="animate-fade-in bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md max-h-[80vh] overflow-y-auto">
            <article className="prose dark:prose-invert max-w-none">
                <h1>Documentación de OGMA Script</h1>
                
                <h2>Mensajes Salientes</h2>
                
                <h3>Enviar un mensaje de texto</h3>
                <p>Envía un mensaje de texto utilizando el valor de un recurso configurado.</p>
                <CodeBlock>{`await session.action.textMessage({ messageText: session.text('nombreRecurso') });`}</CodeBlock>
                <ul>
                    <Param name="session.text('nombreRecurso')">Obtiene el valor del recurso <code>nombreRecurso</code> para enviarlo como texto.</Param>
                </ul>

                <h3>Enviar una imagen</h3>
                <p>Envía una imagen usando la URL de un recurso configurado.</p>
                <CodeBlock>{`await session.action.imageMessage({ imageUrl: session.text('nombreRecursoUrl') });`}</CodeBlock>
                <ul>
                    <Param name="session.text('nombreRecursoUrl')">Obtiene la URL de la imagen desde el recurso <code>nombreRecursoUrl</code>.</Param>
                </ul>
                
                <h3>Enviar un documento</h3>
                <p>Envía un documento (archivo) con nombre, tipo MIME y URL configurados.</p>
                <CodeBlock>{`await session.action.fileMessage({ file: { name: '', mimeType: '', url: session.text('nombreRecursoUrl') } });`}</CodeBlock>
                 <ul>
                    <Param name="name">Nombre del archivo.</Param>
                    <Param name="mimeType">Tipo MIME del archivo (por ejemplo, <code>application/pdf</code>).</Param>
                    <Param name="url">URL del archivo, obtenida desde el recurso <code>nombreRecursoUrl</code>.</Param>
                </ul>

                <h3>Enviar un video</h3>
                <p>Envía un video con la opción de mostrar una vista previa, si es necesario.</p>
                <CodeBlock>{`await session.action.textMessage({ messageText: session.text('nombreRecursoUrl'), options: { previewFirstUrl: true } });`}</CodeBlock>
                 <ul>
                    <Param name="previewFirstUrl: true">Habilita la vista previa del video.</Param>
                </ul>

                <h3>Enviar un sticker</h3>
                <p>Envía un sticker utilizando la URL proporcionada.</p>
                <CodeBlock>{`await session.action.stickerMessage({ stickerUrl: '' });`}</CodeBlock>
                <ul>
                    <Param name="stickerUrl">URL del sticker a enviar.</Param>
                </ul>

                <h3>Crear un menú interactivo</h3>
                <p>Envía un mensaje con un menú de opciones que el usuario puede seleccionar, donde cada opción llevará al usuario a un estado específico.</p>
                <CodeBlock>{`await session.action.buttonMessage({
    interactive: null,
    text: \`\${session.text('bienvenida', undefined, true)}\`,
    quick_replies: [
        { "title": \`\${session.text('opt_solicitar_aumento_credito', undefined, true)}\`, "type": \`postback\`, "payload": { "state": "estadoUno", "value": "payload_1" } },
        { "title": \`\${session.text('opt_solicitar_prestamo', undefined, true)}\`, "type": \`postback\`, "payload": { "state": "estadoDos" } },
        { "title": \`\${session.text('opt_insertar_reclamo', undefined, true)}\`, "type": \`postback\`, "payload": { "state": "estadoTres" } },
        { "title": \`\${session.text('opt_traer_sesiones_pepito', undefined, true)}\`, "type": \`postback\`, "payload": { "state": "estadoCuatro" } },
        { "title": \`Salir\`, "type": \`postback\`, "payload": { "state": 'endSession' } }
    ]
});`}</CodeBlock>
                <ul>
                    <Param name="interactive">Define el tipo de menú a mostrar. Normalmente se mantiene como <code>null</code>, pero para WhatsApp se pueden usar opciones como <code>LIST</code> (menú desplegable, máx. 10 opciones) o <code>REPLY_BUTTON</code> (botones de acción, máx. 3 opciones).</Param>
                    <Param name="text">Es el titulo del menú que se muestra al usuario.</Param>
                    <Param name="quick_replies">Define un conjunto de botones interactivos donde cada uno tiene <code>title</code> (texto del botón), <code>type</code> (siempre <code>postback</code>), <code>state</code> (estado de destino) y <code>value</code> (payload opcional).</Param>
                </ul>

                <h3>Enviar un mensaje y dirigir al panel</h3>
                <p>Permite mostrar un mensaje al usuario y derivar a panel en la plataforma.</p>
                <CodeBlock>{`await session.action.textMessage({ messageText: \`\${session.text('msg_Panel')}\`, ability: 'default' });`}</CodeBlock>
                <ul>
                    <Param name="ability: 'default'">Define a qué habilidad deriva la conversación.</Param>
                </ul>
                
                <h3>Cerrar sesión del usuario</h3>
                <p>Finaliza la sesión actual del usuario.</p>
                <CodeBlock>{`await session.action.traceEndSession({});`}</CodeBlock>
                
                <hr />
                
                <h2>Mensajes Entrantes</h2>
                
                <h3>Mensajes de texto</h3>
                <CodeBlock>{`let mensajeTexto = session.incoming.message;`}</CodeBlock>
                <ul>
                    <Param name="session.incoming.message">Contiene el texto del mensaje recibido.</Param>
                </ul>

                <h3>Mensajes con archivos adjuntos</h3>
                <p>Accede a documentos, audios, imágenes, etc.</p>
                <CodeBlock>{`let adjunto = session.incoming.attachments[0].processFile.data;`}</CodeBlock>
                 <ul>
                    <Param name="session.incoming.attachments">Array que almacena los archivos adjuntos.</Param>
                    <Param name="attachments[0]">Accede al primer archivo adjunto.</Param>
                    <Param name="processFile.data">Contiene el base64 del archivo.</Param>
                </ul>

                <hr />

                <h2>Funciones Generales y de Sesión</h2>
                
                <h3>Obtener el valor de un recurso</h3>
                <CodeBlock>{`let recurso = session.text('nombreRecurso');`}</CodeBlock>

                <h3>Marcar un paso</h3>
                <CodeBlock>{`await session.action.step({ step: 'Nombre del paso' });`}</CodeBlock>

                <h3>Pausar la ejecución (Sleep)</h3>
                <CodeBlock>{`await session.utils.sleep(3000); // 3 segundos`}</CodeBlock>

                <h3>Obtener valor entrante (Payload)</h3>
                <p>Obtiene datos enviados desde otro estado.</p>
                <CodeBlock>{`let valor = session.incoming.payload;`}</CodeBlock>

                <h3>Datos de Sesión (Data)</h3>
                <p>Almacena variables accesibles en cualquier estado (máx. 1024 bytes).</p>
                <CodeBlock>{`// Crear o asignar
session.data.Nombre_Variable = "Dato";
// Limpiar
session.data.Nombre_Variable = '';`}</CodeBlock>

                <h3>Datos de Sesión Grandes (BigData)</h3>
                 <p>Almacena datos de sesión mayores a 1024 bytes.</p>
                <CodeBlock>{`// Guardar
await session.bigData.set('Nombre_Variable', respuesta);
// Obtener
let data = await session.bigData.get('Nombre_Variable');`}</CodeBlock>

                <h3>Datos de Contacto</h3>
                <p>Almacena datos asociados al perfil del contacto.</p>
                <CodeBlock>{`// Guardar
await session.updateContact({ "nombre": valor });
// Obtener
let nombre = session.contact.nombre;`}</CodeBlock>

                <h3>Consultar un DataSource</h3>
                <p>Permite consultar información de un archivo Excel cargado en la plataforma.</p>
                <CodeBlock>{`let datos = await session.action.getData("dataSourceName", { "0": "Recurso" });`}</CodeBlock>
                <ul>
                    <Param name="dataSourceName">Nombre del DataSource.</Param>
                    <Param name='{ "0": "Recurso" }'>Criterio de búsqueda (buscar "Recurso" en la columna 0).</Param>
                </ul>

                <hr />

                <h2>Funciones de Control y Flujo</h2>
                
                <h3>Evaluar horario de atención</h3>
                <CodeBlock>{`if (!session.utils.inTime(session.config.horarioAtencion)) {
    // Fuera de horario
}`}</CodeBlock>
                
                <h3>Evaluar contador de ejecuciones en un estado</h3>
                <CodeBlock>{`if (session.state.count == 1) {
    // Primera ejecución
}`}</CodeBlock>

                <h3>Evaluar mensaje entrante</h3>
                <CodeBlock>{`if (session.incoming.message == 'mensaje entrante') { ... }`}</CodeBlock>
                
                <h3>Evaluar payload entrante</h3>
                <CodeBlock>{`if (session.incoming.payload == 'valor entrante') { ... }`}</CodeBlock>

                <h3>Evaluar expresiones regulares (Regex)</h3>
                <CodeBlock>{`if (!session.utils.rxValidation({
    pattern: \`expresion_regular\`,
    flags: \`i\`,
    value: session.incoming.message
})) {
    // No es válido
}`}</CodeBlock>
                
                <h3>Ejecutar un estado</h3>
                <p>Ejecuta un estado específico sin interrumpir el flujo actual.</p>
                <CodeBlock>{`let valor = await session.execute('nombreEstado');`}</CodeBlock>

                <h3>Redireccionar a otro estado</h3>
                <p>Interrumpe la ejecución actual y redirige al estado especificado.</p>
                <CodeBlock>{`return session.goto('nombre_de_la_redireccion');`}</CodeBlock>

                <hr />

                <h2>Funciones Externas</h2>
                
                <h3>Método request (HTTP)</h3>
                <p>Realiza una solicitud HTTP a un servidor.</p>
                <CodeBlock>{`let jsonBody = { "nombre": prompt };
let { body } = await session.utils.request({
    uri: 'URL_DEL_ENDPOINT',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(jsonBody)
});
let formatJson = JSON.parse(body);`}</CodeBlock>
                
                <h3>Envío de correo electrónico</h3>
                <p>Permite enviar correos de manera automatizada.</p>
                <CodeBlock>{`await session.utils.request({
    uri: '<https://azure.heynowbots.com:8016/sendMail>',
    method: 'POST',
    json: {
        msg: bodyMail,
        subject: asunto,
        email: destinatario
    }
});`}</CodeBlock>

            </article>
        </div>
    );
};
