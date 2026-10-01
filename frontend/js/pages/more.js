// Exploración de casos: usa el listado paginado de la API compartida.
import {header,filters} from "../components/ui.js";
export async function explore(){return header("Encuentra un caso","Explora la comunidad","Busca animales perdidos y encontrados.")+filters()+'<div class="grid-list" data-live-cases></div><p role="status" data-list-status></p><button class="button secondary" data-load-more hidden>Ver más casos</button>';}
