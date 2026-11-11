# Virtual Try-On sales enablement

## Para quien es este documento

Este documento es para ventas, partnerships, founders y customer success cuando tengan que explicar Virtual Try-On a marcas retail, moda, deporte, agencias de activacion, operadores de tiendas y equipos de innovacion.

Su funcion es ayudar a vender y cualificar bien. Traduce el producto a problemas de negocio, mensajes reutilizables, preguntas de discovery, demo story y limites claros para no prometer mas de lo que existe.

## Resumen ejecutivo

Virtual Try-On es una experiencia white-label de prueba visual para retail. La persona captura una foto, se genera una imagen de estudio con Gemini y prueba prendas de un catalogo de marca desde un rail visual.

El producto esta pensado para activaciones en tienda, MUPI, pop-ups, ferias, showrooms y demos de marca. Cada despliegue se prepara como un client pack con logo, textos, tema visual, modo de pantalla y armario. La promesa comercial no es "te decimos la talla perfecta". La promesa real es convertir una pantalla fisica o digital en una experiencia de prueba visual, medible y adaptable a cada marca.

Ademas de experiencia interactiva, Virtual Try-On puede empaquetarse como soporte de monetizacion: activaciones patrocinadas, retail media en tienda, co-marketing marca-retailer o paquetes por evento, pop-up y MUPI. Esa capa no debe venderse como ad server completo. Debe venderse como un formato interactivo con contexto de campana, placement y medicion conectable, que puede integrarse con campanas, patrocinadores o inventario comercial del retailer.

Capacidades disponibles:

- Flujo completo de captura, generacion de modelo y estudio de try-on.
- Plantilla white-label con client packs por marca.
- Modos `mupi` y `desktop`.
- Catalogo por categorias: tops, bottoms, sets y hats.
- Composicion por capas para construir looks con varias prendas.
- Gemini server-side, con claves fuera del navegador.
- Auth y rate limiting para endpoints de generacion en produccion.
- Integracion opcional con `kiosk-beacon` para eventos de funnel y heartbeat de kiosk.
- Contexto de campana/placement para medicion cuando `kiosk-beacon` esta activo.
- Verificacion de client packs y checklist operativo para demos y despliegues.

Limites comerciales que conviene decir pronto:

- No posicionarlo como guia de tallas ni fit predictor.
- No posicionarlo como CRM o ecommerce completo salvo que exista integracion adicional.
- No venderlo como plataforma SaaS multi-tenant con panel de administracion.
- No venderlo como ad server, SSP, CMS de retail media o plataforma de booking de inventario.
- El resultado depende de calidad de imagen, permisos de camara, conectividad, claves Gemini y latencia del modelo.
- Las integraciones de pagos, CRM, lead capture, creative loader, programmatic o reporting avanzado deben tratarse como fase posterior si el cliente las necesita.

## Narrativa del producto

La tienda fisica tiene un problema concreto. Muchas marcas invierten en pantallas, corners, pop-ups y eventos, pero la interaccion sigue siendo pasiva: video bonito, foto de campana, QR a ecommerce y poco mas. El cliente mira, tal vez escanea, y se va.

Virtual Try-On cambia esa pantalla a una experiencia personal. La persona no ve solo una prenda en una modelo generica. Se ve a si misma en un look de la marca, dentro de una interfaz preparada para tienda.

El punto no es sustituir al probador fisico. El punto es abrir una conversacion antes: "mira como te queda este estilo", "prueba este set", "ensena esta opcion al staff", "guarda el look para seguir despues". Para activaciones, es una forma clara de pasar de awareness a interaccion medible.

La capa de ads aparece cuando esa interaccion se conecta a un objetivo comercial de media. La pantalla ya no solo reproduce un anuncio: invita a probar una coleccion, comparar looks, seleccionar producto y generar eventos de funnel. Para una marca, eso puede justificar un patrocinio o una activacion de campana. Para un retailer o media owner, puede convertirse en inventario experiencial medible, especialmente si se empaqueta por tienda, evento, categoria, coleccion o placement.

La otra tension es operativa. Muchas demos de try-on se convierten en proyectos a medida dificiles de repetir: una app por marca, assets mezclados, cambios manuales antes de cada evento y poca trazabilidad. Virtual Try-On resuelve esa parte con client packs. Una nueva marca entra por configuracion, assets y contenido, no por rehacer el producto.

## Posicionamiento

Virtual Try-On es una experiencia white-label de prueba visual para retail y kiosk, que permite a una marca lanzar una activacion con camara, armario propio y medicion de funnel sin construir una app nueva por cliente.

Para decirlo en una reunion:

"Montamos una experiencia de prueba visual para tienda o evento. El usuario se captura, la experiencia genera una imagen de estudio y puede probar prendas del catalogo de la marca. Para el cliente se adapta con logo, textos, colores, armario y modo de pantalla. Para operaciones se despliega como un pack controlado, con Gemini en servidor y eventos medibles si activamos beacon. Si el cliente tiene capa de media, la misma experiencia puede empaquetarse como activacion patrocinada o retail media interactivo."

## ICP y buyer personas

### ICP principal

Empresas B2B o B2B2C con experiencia fisica de retail y presupuesto para activacion de marca.

Encaja especialmente con:

- Marcas de moda, lifestyle, sportswear, streetwear y accesorios.
- Retailers con flagship stores, corners, pop-ups o eventos.
- Agencias que producen activaciones para marcas.
- Operadores de centros comerciales, DOOH o MUPI con necesidad de experiencias interactivas.
- Retailers o media owners que quieren probar formatos de retail media mas interactivos que una pantalla pasiva.
- Equipos de innovacion retail que quieren pilotos rapidos antes de aprobar una plataforma grande.

Senales de buen fit:

- Tienen catalogo visual de prendas y assets de marca disponibles.
- Buscan una demo presencial o kiosk, no solo una landing.
- Necesitan adaptar la experiencia por cliente, ciudad, campana o temporada.
- Les importa medir uso, errores, sesiones y estado del kiosk.
- Tienen inventario fisico o digital que podria venderse como activacion, patrocinio o paquete de campana.
- Aceptan que el try-on es preview visual, no recomendacion de talla.

Mal fit probable:

- Quieren ecommerce completo, checkout y CRM desde la primera version.
- Necesitan prediccion precisa de talla o ajuste corporal.
- Esperan un panel multi-tenant para cambiar marcas en runtime.
- No pueden proveer imagenes de prendas ni permisos claros de uso.

### Buyer personas

Director de retail o retail innovation. Quiere que la tienda haga algo mas que exhibir producto. Le importa que el flujo sea entendible, que no rompa la operacion y que el staff pueda acompanarlo.

Brand manager o marketing lead. Busca una activacion que se sienta de marca, no una demo generica de IA. Le importan logo, tono, colores, catalogo, campana y momento compartible.

Trade marketing o events lead. Necesita instalar, probar y repetir la experiencia en varias ubicaciones. Le importan el checklist, el modo MUPI, la estabilidad y el tiempo de preparacion por cliente.

CTO, digital lead o IT. Evalua privacidad, claves, hosting, permisos de camara, seguridad de API, limites de Gemini y coste operativo. Quiere saber que las claves de IA no van al navegador y que existe una ruta de rollback.

Agencia o integrador. Quiere una base replicable para producir experiencias para diferentes marcas. Le importa cambiar assets, copy y catalogo sin convertir cada campana en un proyecto nuevo.

Retail media, partnerships o media owner. Quiere convertir espacio fisico, MUPI o pantallas de tienda en inventario vendible. Le importan patrocinadores, placements, calendario de campana, proof of play, comparacion por ubicacion y una historia clara para marcas que pagan por activacion.

## Problemas, beneficios y objetivos del cliente

### Problemas

- Las pantallas en tienda comunican, pero no siempre generan interaccion real.
- El inventario retail media en tienda suele quedarse en impresiones estimadas o reproduccion pasiva.
- Las activaciones con IA suelen depender de demos ad hoc dificiles de repetir.
- Cada cliente pide cambios de marca, copy, catalogo y layout justo antes del evento.
- El equipo tecnico no quiere exponer claves de IA en frontend.
- Operaciones necesita saber si el kiosk esta vivo y si la gente completa el flujo.
- El staff necesita una experiencia simple, no una herramienta que requiera explicar diez pasos.

### Beneficios

- Lanzar una experiencia de try-on visual con marca propia sin rehacer la app.
- Probar looks y categorias en un flujo corto, apto para tienda o evento.
- Preparar nuevos pilotos por client pack.
- Medir eventos clave del funnel cuando beacon esta activo.
- Mantener control sobre claves, auth y rate limit en produccion.
- Dar a ventas una demo tangible para abrir conversaciones sobre retail media, activacion, patrocinio y experiencia de tienda.
- Empaquetar una experiencia por campana, sponsor, categoria, coleccion, evento o placement.

### Objetivos del cliente

Cuando una marca lanza una campana en tienda, quiere que el publico interactue con producto de forma personal para que la activacion no sea solo una pantalla pasiva.

Cuando un retailer o media owner vende inventario en tienda, quiere formatos con mas evidencia de engagement que un loop de video para justificar paquetes premium o co-marketing.

Cuando un retailer prueba IA en tienda, quiere un piloto acotado y medible para aprender sin comprometerse a una plataforma grande desde el dia uno.

Cuando una agencia prepara demos para varias marcas, quiere cambiar logo, textos, colores y prendas sin crear versiones imposibles de mantener.

Cuando IT aprueba una experiencia con IA generativa, quiere que las claves vivan en servidor, que el endpoint tenga controles y que exista un checklist claro para produccion.

## Mapa de valor del cliente

### Cliente

Objetivos del cliente:

- Crear experiencias de marca en tienda o evento.
- Mostrar producto de forma mas personal.
- Adaptar una activacion a cada cliente o campana.
- Medir si la experiencia se usa y donde se cae.
- Desplegar sin abrir riesgos innecesarios de seguridad.

Dolores:

- Demos bonitas pero fragiles.
- Personalizacion lenta.
- Falta de datos de interaccion.
- Dependencia tecnica para cada cambio pequeno.
- Riesgo de prometer fit o talla sin evidencia.

Ganancias esperadas:

- Demo visible y facil de entender.
- Experiencia personal, no solo contenido.
- Pack de marca reutilizable.
- Conversacion comercial mas concreta.
- Base tecnica ordenada para pilotos.

### Producto

Productos y servicios:

- Experiencia web con flujo captura -> generacion -> estudio.
- Servidor para proxy Gemini.
- Client packs con logo, textos, catalogo, tema y modo de pantalla.
- Modo MUPI y desktop.
- Integracion opcional con `kiosk-beacon`.
- Contexto de campana, kiosk y project para agrupar medicion cuando beacon esta activo.

Aliviadores de dolor:

- Nueva marca por configuracion y assets.
- Gemini server-side.
- Auth y rate limit en endpoints de produccion.
- Verificacion de client packs antes de demo o entrega.
- Eventos de funnel para sesiones, CTA, generacion, seleccion de producto, try-on y errores.

Creadores de ganancia:

- Experiencia de prueba visual con catalogo de marca.
- Rail de prendas por categoria.
- Look stack con visibilidad por capa.
- Branding adaptable al contexto de campana.
- Ruta para replicar pilotos retail sin rehacer el producto.
- Base comercial para vender activaciones patrocinadas, retail media o medicion como paquete adicional.

## Pilares de valor

### 1. Experiencia personal en tienda

El usuario no mira una pieza aislada. Se captura y ve una version de estudio con prendas de la marca. Esto cambia la conversacion en tienda: de "mira el producto" a "mira este look en ti".

### 2. White-label preparado para repetir

Logo, textos, colores, display mode y armario viven en client packs. El flujo principal se mantiene estable. Esto permite preparar marcas nuevas con menos riesgo operativo.

### 3. Pensado para MUPI y demos

Virtual Try-On contempla modo `mupi`, reinicio por inactividad y una landing con attract loop. No parte de una UI pensada solo para laptop.

### 4. IA generativa con control tecnico

Gemini corre detras de un servidor. Las claves no van al navegador. En produccion hay gate de API y rate limiting para proteger el endpoint.

### 5. Medicion conectable

Con `kiosk-beacon`, Virtual Try-On puede enviar eventos de funnel y heartbeat del kiosk. Esto ayuda a distinguir "la pantalla esta encendida" de "la gente esta usando la experiencia".

### 6. Capa de ads y monetizacion

Virtual Try-On puede presentarse como formato de activacion, no solo como demo de IA. Un sponsor puede financiar la experiencia, un retailer puede venderla dentro de su paquete de retail media y un media owner puede ofrecerla como placement interactivo en MUPI o pop-up. Lo importante es separar el formato y la medicion, que ya tienen base, de capacidades de ad serving, booking, lead capture o revenue share, que requieren integracion o empaquetado comercial.

## Casos de uso

### Pop-up de lanzamiento de coleccion

La marca instala una pantalla con el pack de campana. El visitante captura su foto, prueba tops o sets y el staff usa el resultado como inicio de conversacion. Buen caso para moda, streetwear y deporte.

### Flagship o corner retail

La experiencia vive en una pantalla de tienda. El modo MUPI reinicia la sesion tras inactividad y el rail muestra el catalogo curado para esa ubicacion.

### Feria, evento o showroom B2B

La demo ensena a partners o compradores como una marca puede activar producto con IA sin montar un ecommerce completo. El valor esta en la historia, en la rapidez del pack y en que se puede repetir con otra marca.

### Agencia con varios clientes

La agencia reutiliza la misma base comercial y operativa. El equipo puede vender un formato repetible: brief, assets, armado de pack, smoke y evento.

### Piloto de analytics en kiosk

Con beacon activo, el cliente mide sesiones, taps, generacion completada, seleccion de producto, try-on completado, errores e idle. No es attribution avanzada, pero da una primera capa de evidencia operativa.

### Activacion patrocinada

Una marca o sponsor paga por una experiencia de try-on asociada a una coleccion, categoria o lanzamiento. El pack incluye branding, catalogo curado, modo de pantalla y medicion basica de interacciones si beacon esta activo.

### Retail media en tienda o MUPI

El retailer o media owner vende la experiencia como inventario premium: no solo "reproducciones", sino sesiones, taps, productos vistos y try-ons completados. Buen caso para centros comerciales, flagships, corners de marca, eventos deportivos o pop-ups con trafico cualificado.

## Capa de ads y modelos de negocio

### Lo que ya puede sostener el producto

- Experiencia white-label por marca o campana mediante client packs.
- Modo MUPI/desktop para tienda, pop-up, feria o pantalla de demostracion.
- Catalogo curado por categoria, coleccion o sponsor.
- Contexto de medicion por `project`, `kiosk` y `campaign` cuando `kiosk-beacon` esta activo.
- Eventos de funnel y heartbeat para reporting operativo: impresion, inicio de sesion, CTA, generacion, seleccion de producto, try-on completado, error e idle.
- Comparacion basica por placement o campana si se define bien la taxonomia de project/kiosk/campaign antes del despliegue.

### Lo que requiere integracion o paquete comercial

- Rotacion de creatividades, sponsored moments o anuncios durante loading mediante `creative-loader`.
- Booking de inventario, pacing, frecuencia, aprobacion creativa o integracion con GAM, Broadsign u otro ad server.
- Lead capture consentido, cupones, CRM, email/SMS o handoff a ecommerce.
- Modelos de revenue share con retailers o media owners.
- Dashboard avanzado de retail media, atribucion, footfall, ventas o comparacion estadistica.
- Paquetes legales y de privacidad para capturar datos personales o reutilizar imagenes.

### Modelos de negocio posibles

- Activacion patrocinada: una marca financia el try-on de una coleccion o lanzamiento dentro de tienda, evento o MUPI.
- Retail media in-store: el retailer vende Virtual Try-On como formato premium dentro de su red de pantallas o corners.
- Co-marketing marca-retailer: ambos comparten coste y comunicacion para impulsar una categoria, temporada o lanzamiento.
- Campanas por categoria o coleccion: el inventario se empaqueta por sneakers, outerwear, caps, team kits, temporada o capsule collection.
- Lead capture consentido: fase 2 para guardar look, enviar cupon o continuar en ecommerce, siempre con consentimiento y politica clara.
- Insights agregados: reporte de interacciones por producto, categoria, campana, ubicacion o franja, sin prometer identificacion individual.
- Upsell de medicion con `kiosk-beacon`: proof of play enriquecido, heartbeat, eventos de funnel, performance creativa y comparacion por placement.
- Paquetes por evento, pop-up o MUPI: fee por setup, client pack, operacion, soporte y medicion del despliegue.
- Revenue share con media owners o retailers: viable si existe acuerdo comercial, definicion de inventario, reporting aceptado y reglas de liquidacion.

### Como hablarlo en ventas

"Virtual Try-On puede ser experiencia de marca y soporte de media al mismo tiempo. La diferencia es el packaging: definimos sponsor, campana, placement, catalogo, CTA y medicion. Hoy podemos activar la experiencia y medir funnel con beacon. Si el cliente necesita ad serving, lead capture o revenue share, lo tratamos como integracion o fase comercial separada."

## Mensajes comerciales

### Mensaje principal

"Convierte una pantalla de tienda en una experiencia de prueba visual con IA, adaptada a la marca y lista para medirse."

### Para retail innovation

"No hace falta empezar con una plataforma enorme. Podemos lanzar un piloto acotado: camara, modelo de estudio, catalogo curado y medicion basica del funnel."

### Para marketing y marca

"La experiencia se viste con vuestra identidad: logo, textos, colores, campana y prendas. El usuario no ve una demo generica de IA, ve un momento de marca."

### Para retail media o partnerships

"No vendemos solo una pantalla encendida. Podemos empaquetar una experiencia interactiva por sponsor, coleccion o placement, y medir desde impresion hasta producto visto o try-on completado cuando beacon esta activo."

### Para operaciones

"Cada cliente se empaqueta como un pack. Hay checklist de build, smoke, secrets, auth y rollback. El modo kiosk contempla inactividad y despliegue con servidor Node."

### Para CTO o IT

"Gemini queda en servidor. El navegador llama a un endpoint de generacion protegido en produccion. Las claves de IA no se exponen en variables publicas del frontend."

### Frases reutilizables

- "Es una prueba visual, no una promesa de talla."
- "La marca cambia por pack, no por proyecto nuevo."
- "Primero demostramos interaccion y aprendizaje; despues decidimos integraciones."
- "El kiosk puede estar vivo y aun asi no generar interacciones. Beacon ayuda a separar esas dos cosas."
- "La capa de ads no empieza por programmatic. Empieza por un formato patrocinable, medible y facil de explicar."
- "Retail media aqui significa activacion interactiva con reporting, no promesa automatica de ventas atribuidas."
- "El primer entregable no es un panel complejo. Es una experiencia que la gente entiende en tienda."

## Sales enablement pack

### Que vender primero

Vender el piloto de experiencia, no la plataforma completa.

Oferta inicial sugerida:

- Workshop de caso de uso y assets.
- Client pack de marca.
- Catalogo inicial de prendas.
- Deploy staging.
- Smoke en desktop y MUPI.
- Demo asistida.
- Medicion basica si se activa beacon.
- Brief de campana: sponsor, placement, catalogo, CTA y criterios de reporting.

### Que no vender todavia como cerrado

- Recomendacion de talla.
- Checkout o pagos.
- CRM o lead capture.
- Runtime multi-client con panel admin.
- Ad serving, creative rotation o sponsored moments dentro del loading.
- Booking de inventario, billing o revenue share.
- Analitica avanzada de retail media.

Estos temas pueden entrar como fase 2 si el piloto prueba valor y existe una integracion adicional.

### Pruebas o razones para creer

- La experiencia ya cubre captura, generacion, estudio y seleccion de prendas.
- Hay un pack de referencia con logo, tema, textos, armario y medicion opcional.
- El proceso de cliente nuevo separa marca y catalogo del flujo principal.
- Produccion mantiene Gemini en servidor.
- Hay checklist para personalizacion, deploy, operaciones y smoke de demo.

## Objeciones y respuestas

### "Esto no nos dice la talla real."

Correcto. No deberiamos venderlo como fit predictor. Es una experiencia visual para descubrir estilos, activar producto y medir interaccion. Si el caso necesita talla, hay que tratarlo como otro modulo con datos y validacion propios.

### "Ya tenemos ecommerce y probador."

Mejor. Virtual Try-On no intenta reemplazar ecommerce. Puede vivir antes de la compra, en tienda o evento, donde el objetivo es interaccion, descubrimiento y conversacion con staff.

### "Nos preocupa privacidad."

La experiencia debe comunicar que la foto se usa para la sesion. Gemini se llama desde servidor, no desde el navegador. Antes de piloto hay que revisar politica de privacidad, retencion real, logs, hosting y textos legales del cliente.

### "Cada marca pide cambios distintos."

Ese es justo el motivo de los client packs. Logo, textos, tema, display y prendas se configuran por cliente. Si el cambio altera el flujo de producto, entonces ya no es personalizacion de marca y debe tratarse como scope nuevo.

### "Y si Gemini falla o tarda?"

El producto contempla errores visibles, retry y timeouts. Comercialmente hay que posicionarlo como piloto controlado y hacer smoke con clave real, red real y hardware real. Para evento publico, revisar cuota, backup key, conectividad y rate limit.

### "Queremos CRM, cupones o checkout."

No posicionarlo como CRM, cupones o ecommerce completo salvo que exista integracion adicional. La respuesta correcta es plantearlo como fase 2: primero validar uso del try-on, despues conectar captura de leads, CRM o checkout.

### "Podemos vender esto como retail media?"

Si, como formato de activacion interactiva o inventario patrocinable. No conviene venderlo como plataforma retail media completa. Lo soportado hoy es la experiencia, el branding por pack y la medicion de funnel con beacon. Ad serving, aprobacion creativa, booking, billing, lead capture y atribucion requieren integracion o paquete comercial.

### "Que recibe un sponsor ademas de presencia de marca?"

Recibe una experiencia donde el usuario interactua con producto, no solo ve un anuncio. Con beacon activo, se puede reportar actividad agregada: impresiones, sesiones, taps, productos vistos, try-ons completados, errores e idle. Si pide leads, ventas atribuidas o audiencias identificadas, hay que definir consentimiento, integraciones y limites legales.

### "Esto se puede hacer con una demo generica de IA."

Una demo generica puede servir una vez. El problema aparece al repetir con otra marca, otra campana y otra tienda. Virtual Try-On aporta flujo, branding, armario, modo kiosk, servidor, despliegue y medicion opcional.

## Preguntas discovery

### Contexto comercial

- Que coleccion, campana o producto quereis activar?
- Donde vivira la experiencia: tienda, pop-up, feria, showroom, MUPI, web demo?
- Quien acompana la experiencia: staff, promotor, usuario solo?
- Que debe pasar despues del try-on: conversacion, QR, registro, compra, foto, reporte?

### Monetizacion y ads

- Hay sponsor, marca asociada, retailer o media owner involucrado?
- El objetivo es experiencia de marca, venta de inventario, co-marketing o prueba de retail media?
- Que placements entran: tienda, escaparate, MUPI, centro comercial, evento, pop-up?
- La campana se mide por sesiones, interacciones, productos vistos, leads, ventas asistidas o solo proof of play?
- Necesitais comparacion por ubicacion, categoria, coleccion, sponsor o franja horaria?
- Hay requisitos de GAM, Broadsign, CMS interno, aprobacion creativa o reporting del media owner?
- Lead capture, cupones o CRM son imprescindibles desde el piloto o pueden quedar para fase 2?

### Catalogo y marca

- Que prendas o categorias entran en el primer piloto?
- Teneis imagenes de producto limpias y permiso para usarlas?
- Que tono debe tener la experiencia: premium, deportivo, urbano, tecnico, playful?
- Hay restricciones de logo, legal copy o privacidad?

### Operacion

- Que hardware y navegador se usara?
- Hay camara disponible y permiso de uso en el entorno?
- La red permite llamadas a backend y Gemini?
- Necesitais modo MUPI con reinicio por inactividad?
- Quien hara el smoke antes de abrir al publico?

### Seguridad y datos

- Donde debe desplegarse el servidor?
- Quien gestiona las claves Gemini?
- Necesitais auth por kiosk o token compartido?
- Que eventos quereis medir?
- Hay reglas internas sobre imagenes de usuarios, logs o retencion?

### Exito del piloto

- Que seria una buena senal tras el primer evento?
- Cuantas sesiones esperais por dia o por ubicacion?
- Que feedback necesita el equipo de tienda?
- Que decision se tomara despues del piloto?

## Demo story

### Antes de abrir la demo

Contexto para el cliente:

"Esta demo muestra una experiencia retail, no un ecommerce. Vamos a verla como si estuviera en una tienda o evento. La marca y el catalogo pueden cambiar por pack."

### Paso 1. Landing de marca

Mostrar logo, textos, attract loop y CTA. Explicar que la primera pantalla se adapta al tono de campana.

Mensaje:

"La primera pantalla esta pensada para atraer y explicar en una frase que pasara. No pedimos registro ni metemos friccion antes de la camara."

### Paso 2. Captura

Pulsar "Start try-on", abrir camara y capturar.

Mensaje:

"El usuario se captura una vez. A partir de aqui la experiencia genera una imagen base de estudio para que el rail de prendas tenga un punto de partida consistente."

### Paso 3. Generacion

Mostrar pantalla de espera y hablar de latencia real.

Mensaje:

"Aqui no hay que prometer instantaneidad. Para evento, se valida con clave real, red real, hardware real y cuota real."

### Paso 4. Estudio

Entrar al estudio, mostrar canvas, logo compacto, rail y categorias.

Mensaje:

"La persona ya esta en una experiencia de marca. Puede probar tops, bottoms, sets o hats. El staff puede guiar, recomendar o usarlo como conversacion."

### Paso 5. Probar prendas

Seleccionar una prenda, ensenar loading, resultado y look stack.

Mensaje:

"Cada seleccion compone el look. El stack permite ver que prendas estan activas y ocultarlas. Esto abre un uso simple: construir un look completo con catalogo curado."

### Paso 6. Cierre comercial

Cerrar con la logica de pack.

Mensaje:

"Para otra marca no copiamos la experiencia desde cero. Creamos un client pack: logo, textos, tema, armario y parametros de display. Si hace falta medicion de kiosk, activamos beacon y definimos proyecto, kiosk y campana."

### Paso 7. Capa de ads y reporting

Mostrar como la misma demo se empaqueta para sponsor, retail media o media owner.

Mensaje:

"Si esto es una activacion patrocinada, definimos sponsor, placement, catalogo, CTA y campaign. Con beacon activo podemos reportar proof of play enriquecido: no solo si la pantalla estuvo viva, sino si hubo sesiones, taps, productos vistos y try-ons completados. Si quereis lead capture, ad serving o revenue share, lo separamos como integracion o paquete comercial."

## Battlecard ligera

### Contra pantalla pasiva o video loop

Ventaja de Virtual Try-On: la persona interactua con producto y puede generar eventos medibles. La pantalla deja de ser solo contenido.

Riesgo: necesita camara, permisos, backend y control de latencia. Si el cliente solo quiere ambientacion visual, un video loop puede ser suficiente.

### Contra red de retail media tradicional

Ventaja de Virtual Try-On: ofrece un formato experiencial que puede venderse por sponsor, categoria, coleccion o placement, con eventos de funnel si beacon esta activo.

Riesgo: no reemplaza un ad server ni una plataforma de booking/reporting. Si el cliente necesita GAM, Broadsign, pacing, aprobacion creativa o liquidacion de revenue share, hay que integrarlo.

### Contra probador fisico

Ventaja de Virtual Try-On: reduce friccion para descubrir estilos y probar mas opciones visuales antes de entrar al probador real.

Riesgo: no debe venderse como sustituto de ajuste, talla o tacto de prenda.

### Contra app custom por marca

Ventaja de Virtual Try-On: client packs y estructura replicable. Menos proyectos a medida, menos deuda, mas velocidad para pilotos.

Riesgo: si cada cliente pide flujos completamente distintos, hay que decidir si sigue siendo template o un producto nuevo.

### Contra SaaS enterprise de probador virtual

Ventaja de Virtual Try-On: es mas ligero para activaciones, demos y pilotos controlados. Sirve para aprender rapido con una experiencia propia.

Riesgo: no trae de serie panel admin, integraciones ecommerce profundas, gestion multi-tenant o analitica avanzada.

### Contra demo generica de IA

Ventaja de Virtual Try-On: tiene flujo, branding, armario, modo kiosk, servidor, despliegue y medicion opcional. No es solo un prompt.

Riesgo: requiere preparacion de assets y smoke. No conviene improvisarlo el mismo dia del evento.

## Apendice tecnico simple

### Arquitectura en una frase

Frontend web para la experiencia, servidor Node/Express para servir la app y proxyear Gemini, configuracion por client packs y adapters opcionales de integracion.

### Flujo de usuario

1. Landing de marca.
2. Permiso de camara.
3. Captura de foto.
4. Generacion de imagen base con Gemini.
5. Studio con canvas y rail de prendas.
6. Seleccion de prendas y composicion de look.
7. Reinicio manual o por inactividad en MUPI.

### Configuracion por cliente

Un client pack define:

- Logo.
- Textos.
- Catalogo de prendas.
- Tema visual.
- Modo de pantalla.
- Features habilitadas.

El build empaqueta un cliente concreto. Un cliente desconocido debe fallar de forma visible para evitar que una demo salga con assets de otra marca.

### IA y seguridad

Gemini genera imagenes de try-on desde servidor. Las claves `GOOGLE_API_KEY` o `GEMINI_API_KEY` viven en runtime server. En produccion, los endpoints de generacion pueden exigir `API_KEY` o `KIOSK_TOKENS`, y el cliente envia un token de kiosk para acceder a la API.

Esto no sustituye una revision de seguridad del cliente, pero evita el error basico de exponer la clave Gemini en frontend.

### Datos y medicion

Con beacon activo, Virtual Try-On puede emitir eventos como `impression`, `session_start`, `tap_start`, `generation_done`, `generation_blocked`, `try_on_start`, `product_view`, `try_on_complete`, `error` e `idle`.

El heartbeat lo maneja `beacon.js`. Esto permite saber si un kiosk esta online aunque no haya interacciones.

Para reporting comercial, conviene acordar antes del despliegue una taxonomia simple: `project` para el programa o cliente, `kiosk` para el placement/dispositivo y `campaign` para la activacion o sponsor. Con esa base, `kiosk-beacon` puede ayudar a comparar campanas, ubicaciones y performance creativa de forma agregada. No sustituye atribucion de ventas, DMP, CRM ni analitica avanzada de retail media.

### Dependencias operativas

- Node 18+.
- Navegador compatible con camara, recomendado Chrome o Safari en el equipo de demo.
- Servidor Node para generacion; static-only hosting no basta si se necesita try-on real.
- Clave Gemini valida.
- Assets de marca y prendas.
- Smoke real antes de evento.

## Riesgos e hipotesis pendientes

### Riesgos comerciales

- Si ventas promete talla, fit exacto o conversion de ecommerce, el producto queda mal posicionado.
- Si el cliente no trae assets de calidad, el resultado visual baja.
- Si se vende como plataforma completa, apareceran gaps de admin, CRM, checkout y analitica.
- Si se vende como ad server o red retail media completa, apareceran gaps de booking, rotacion creativa, billing, aprobacion y atribucion.

### Riesgos tecnicos

- Latencia y cuota de Gemini pueden afectar experiencia en evento.
- Camara y permisos dependen del navegador, hardware y contexto de seguridad.
- Video loop debe tratarse como capacidad a validar antes de incluirlo en una propuesta.
- Beacon requiere configuracion correcta de URL, project, kiosk y campaign.
- Integraciones con GAM, Broadsign, CRM, cupones o lead capture no estan cerradas en el core actual.

### Hipotesis a validar con clientes

- Que categorias de prenda generan mas interaccion en tienda.
- Si el staff prefiere guiar la experiencia o dejarla self-service.
- Que copy reduce abandono antes de camara.
- Que tolerancia real tiene el usuario a 30-60 segundos de generacion.
- Si el resultado visual impulsa conversacion, prueba fisica o compra asistida.
- Que nivel de medicion necesita el cliente para aprobar una segunda fase.
- Que modelo de monetizacion tiene mas traccion: fee por activacion, patrocinio, co-marketing, media package, upsell de medicion o revenue share.
- Que reporting minimo aceptaria un retailer o media owner para vender el formato sin prometer ROI no probado.

## Orientacion para el equipo comercial

La mejor venta de Virtual Try-On es honesta y concreta: una experiencia retail de try-on visual, adaptable por marca y preparada para pilotos en tienda o evento. Hay suficiente producto para ensenar algo real. Tambien hay limites claros.

El angulo recomendado es "piloto medible de experiencia" antes que "plataforma de fitting". Esa diferencia protege la confianza con el cliente y abre mejor la puerta a fases posteriores: CRM, ecommerce, retail media, creative loader, lead capture o analitica mas avanzada.
