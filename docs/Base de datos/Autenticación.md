**Autenticación con correo y contraseña · T-009**  
Configuración de Supabase Auth para el registro con correo (HU-01, CU-01). La configuración local está  
   
 en [supabase/config.toml y las plantillas en  
   
 ](../../supabase/config.toml "../../supabase/config.toml")[supabase/templates/. El proyecto remoto se configura igual desde el panel  
   
 de Supabase (ver «Proyecto remoto»).](../../supabase/templates "../../supabase/templates")  
**Proveedor de correo**  
| | | |  
|-|-|-|  
| **Ajuste** | **Valor** | **Por qué** |   
| Registro con correo | Activo | HU-01 |   
| Confirmar correo antes de entrar | Desactivado | HU-01: al registrarse, el usuario entra directo al feed |   
| Confirmar cambio de correo en ambos correos | Activo | Evita que alguien con la sesión abierta se quede con la cuenta |   
| Pedir la contraseña actual para cambiarla | Activo | Mismo motivo |   
| Inicio de sesión anónimo | Desactivado | La app no lo usa |   
| Tiempo mínimo entre correos | 1 minuto | Evita reenvíos repetidos |   
   
**Política de contraseña**  
- Mínimo **8 caracteres**.  
- Debe tener **minúscula, mayúscula y número**.  
La app valida lo mismo antes de enviar el formulario para mostrar el error sin esperar al servidor. Si  
   
 la contraseña no cumple, Supabase responde weak_password y no crea la cuenta.  
**Perfil al registrarse**  
El trigger al_crear_usuario (migración 20261014190100_perfiles.sql, T-007) crea la fila de  
   
 perfiles cuando se inserta un usuario en auth.users:  
- nombre: toma nombre de los metadatos del registro; si no llega, usa full_name o name (Google y  
   
 Apple), y si tampoco, la parte del correo antes de la @. Máximo 120 caracteres.  
- correo: el de la cuenta. El trigger al_cambiar_correo_de_usuario lo mantiene sincronizado.  
- rol siempre empieza en usuario; los metadatos no pueden cambiarlo. El rol de administrador solo  
   
 se asigna desde el SQL Editor.  
**Cómo debe llamar la app al registro**  
const { data, error } = await supabase.auth.signUp({  
   email,  
   password,  
   options: { data: { nombre } },  
 });  
   
| | |  
|-|-|  
| **Respuesta de Supabase** | **Qué muestra la app (HU-01)** |   
| Sin error y con data.session | Entra al feed |   
| error.code === 'user_already_exists' | Aviso de correo registrado con opciones de iniciar sesión o recuperar contraseña |   
| error.code === 'weak_password' | Error de contraseña, no se crea la cuenta |   
   
La coincidencia entre contraseña y confirmación se valida solo en la app.  
**Plantillas de correo**  
| | | |  
|-|-|-|  
| **Plantilla** | **Archivo** | **Cuándo se envía** |   
| Confirmación | confirmacion.html | Solo si se activa la confirmación de correo |   
| Recuperación | recuperacion.html | Recuperar contraseña (HU-03) |   
| Enlace mágico | enlace_magico.html | Inicio de sesión con enlace (no se usa por ahora) |   
| Invitación | invitacion.html | Invitar desde el panel |   
| Cambio de correo | cambio_correo.html | Cambiar el correo desde el perfil |   
   
Todas están en español, con los colores de la marca, y traen el enlace y el código de 6 dígitos para que  
   
 la app pueda verificar con código.  
   
 Todas están en español, con los colores de la marca, y traen el enlace y el código de 6 dígitos para que  
la app pueda verificar con código.  
   
   
 El diseño sigue el de los comprobantes de T-004 (logo, Lora en títulos, Source Sans 3 en el texto y pie  
crema). El logo se carga desde el bucket público `marca` del proyecto remoto  
(`marca/logo-escuela.png`). El bucket se creó desde el panel; su versionado queda para T-018.  
**Proyecto remoto**  
Los proyectos gratuitos nuevos que usan el correo de Supabase no pueden editar las plantillas: envían  
   
 las de por defecto (en inglés). Para usar las de supabase/templates/ en el remoto hay que configurar  
   
 un SMTP propio. La contraseña del SMTP va en una variable de entorno con env(...), nunca en el  
   
 repositorio. El correo por defecto de Supabase además envía muy pocos correos por hora.  
Ajustes del panel (Authentication):  
1. **Sign In / Providers → Email**: activo, *Confirm email* desactivado,  *Secure email change* y  
 *Secure password change* activos.  
2. **Sign In / Providers → Password**: longitud mínima 8 y requisito *Lowercase, uppercase letters and*  
 *  
 digits*.  
3. **URL Configuration**: agregar sagradoscorazones://** en *Redirect URLs*.  
4. **Emails → Templates**: pegar asunto y HTML de cada plantilla (requiere SMTP propio).  
**Pruebas**  
[supabase/tests/database/registro_perfil.test.sql  
   
 verifica que el registro crea el perfil con el nombre correcto, ignora un rol enviado en los metadatos,  
   
 sincroniza el cambio de correo y borra el perfil al borrar la cuenta.](../../supabase/tests/database/registro_perfil.test.sql "../../supabase/tests/database/registro_perfil.test.sql")  
npx supabase db reset  
 npx supabase test db  
   
Las plantillas se revisan en local en Mailpit (http://127.0.0.1:54324) al pedir una recuperación de  
   
 contraseña desde la app o desde Studio.  
