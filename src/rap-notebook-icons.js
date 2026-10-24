import {pcElement as el} from './virtual-pc-dom.js?rev=61';
const paths={new:'M14 3H5v18h14v-9M14 3v6h6L14 3ZM16 16h7m-3.5-3.5v7',open:'M3 8V4h7l3 3h8v3M2 10h21l-4 11H2Z',pencil:'m4 16 12-12 4 4L8 20l-5 1 1-5Zm10-10 4 4M5 15l4 4',wave:'M2 12h4l2-7 3 15 3-18 3 14 2-4h3',chevron:'m5 9 7 7 7-7',bars:'M4 20v-5h2v5Zm7 0V9h2v11Zm7 0V3h2v17Z',check:'m4 12 5 5L21 5'};
export function notebookIcon(d,id,color='#e7ece5'){
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="'+(paths[id]??paths.pencil)+'" fill="none" stroke="'+color+'" stroke-width="1.7" stroke-linejoin="miter" stroke-linecap="square"/></svg>';
 return el(d,'img',{className:'rn-glyph',attributes:{src:'data:image/svg+xml,'+encodeURIComponent(svg),alt:'','aria-hidden':'true',width:'24',height:'24'}});
}
