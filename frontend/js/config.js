const repoBase = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/admin\/?$/, '').replace(/\/$/, '') || '/';
export const APP_CONFIG={brand:{name:"Buscados",tagline:"Aquí cualquier animal importa"},api:{baseUrl:repoBase === '/' ? '/api/v1' : repoBase + '/api/v1',useDemoData:true}};
export const navItems=[
  {label:"Inicio",route:"/inicio",icon:"H"},
  {label:"Explorar",route:"/explorar",icon:"E"},
  {label:"Perdidos",route:"/perdidos",icon:"!"},
  {label:"Encontrados",route:"/encontrados",icon:"V"},
  {label:"Adopciones",route:"/adopciones",icon:"A"},
  {group:"Conocer y cuidar"},
  {label:"Poco comunes",route:"/poco-comunes",icon:"◎"},
  {label:"Información y cuidados",route:"/informacion",icon:"i"},
  {label:"Nuestro trabajo",route:"/nuestro-trabajo",icon:"N"},
  {label:"Veterinarias",route:"/veterinarias",icon:"+"},
  {group:"Tu espacio",private:true},
  {label:"Solicitudes de adopción",route:"/solicitudes-adopcion",icon:"A",private:true},
  {label:"Notificaciones",route:"/notificaciones",icon:"N",private:true},
  {label:"Mensajes",route:"/mensajes",icon:"M",private:true},
  {label:"Perfil",route:"/perfil",icon:"P",private:true},
  {group:"Más servicios"},
  {label:"Donaciones",route:"/donaciones",icon:"D",soon:"En desarrollo"},
  {label:"Tienda",route:"/tienda",icon:"T",soon:"Próximamente"},
  {label:"Minijuegos",route:"/minijuegos",icon:"J",soon:"Prototipo"},
  {label:"Localización GPS",route:"/gps",icon:"G",soon:"En desarrollo"}
];
