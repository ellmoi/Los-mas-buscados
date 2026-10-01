const paths={
 paw:'<ellipse cx="7" cy="7" rx="2.2" ry="3" transform="rotate(-25 7 7)"/><ellipse cx="17" cy="7" rx="2.2" ry="3" transform="rotate(25 17 7)"/><ellipse cx="3.5" cy="12" rx="1.8" ry="2.5" transform="rotate(-30 3.5 12)"/><ellipse cx="20.5" cy="12" rx="1.8" ry="2.5" transform="rotate(30 20.5 12)"/><path d="M7 16c2-6 8-6 10 0 3 6-3 5-5 4-2 1-8 2-5-4Z"/>',
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 heart:'<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 3 11 8 15 5-4 13-10 8-15Z"/>',
 message:'<path d="M21 11a9 9 0 0 1-9 9 11 11 0 0 1-4-1l-5 2 1-5a9 9 0 1 1 17-5Z"/><path d="M8 10h8M8 14h5"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 share:'<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 bell:'<path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8m4 12h4"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>'
};
export const icon=(name,size=22)=>`<svg class="ui-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.paw}</svg>`;
export const routeIcon=route=>icon(({'/inicio':'home','/explorar':'search','/perdidos':'pin','/encontrados':'heart','/mensajes':'message','/notificaciones':'bell','/perfil':'user','/configuracion':'user','/login':'user','/adopciones':'heart'})[route]||'paw');
