/**
 * ARCHIVO: config.js
 * RESPONSABILIDAD: centraliza identidad, modo de datos y definición declarativa de la navegación.
 * Cambiar useDemoData no conecta un backend; solo documenta qué proveedor usa esta versión.
 */
export const APP_CONFIG={brand:{name:"Los Más Buscados",tagline:"Aquí cualquier animal importa"},api:{baseUrl:"/api/v1",useDemoData:true}};
export const navItems=[
  {label:"Inicio",route:"/inicio",icon:"H"},{label:"Explorar",route:"/explorar",icon:"E"},{label:"Perdidos",route:"/perdidos",icon:"!"},{label:"Encontrados",route:"/encontrados",icon:"V"},{label:"Adopciones",route:"/adopciones",icon:"A"},{label:"Fundaciones",route:"/fundaciones",icon:"F"},
  {group:"Conocer y cuidar"},{label:"Poco comunes",route:"/poco-comunes",icon:"◎"},{label:"Información y cuidados",route:"/informacion",icon:"i"},{label:"Nuestro trabajo",route:"/nuestro-trabajo",icon:"N"},{label:"Veterinarias",route:"/veterinarias",icon:"+"},
  {group:"Tu espacio",private:true},{label:"Notificaciones",route:"/notificaciones",icon:"N",private:true},{label:"Mensajes",route:"/mensajes",icon:"M",soon:"Próximamente",private:true},{label:"Perfil",route:"/perfil",icon:"P",private:true},
  {group:"Más servicios"},{label:"Donaciones",route:"/donaciones",icon:"D",soon:"En desarrollo"},{label:"Tienda",route:"/tienda",icon:"T",soon:"Próximamente"},{label:"Minijuegos",route:"/minijuegos",icon:"J",soon:"Próximamente"},{label:"Localización GPS",route:"/gps",icon:"G",soon:"En desarrollo"}
];
