let browserSession=sessionStorage.getItem('mt-sim-browser-session');if(!browserSession){browserSession=crypto.randomUUID();sessionStorage.setItem('mt-sim-browser-session',browserSession);}
let backend=location.hostname==='127.0.0.1'?location.origin:'',ticket='',localAuthor=false;
export const connection={get connected(){return !!ticket;},get localAuthor(){return localAuthor;},get backend(){return backend;}};
export async function connect(url=backend,access_token=''){
 const parsed=new URL(url);if(!(parsed.protocol==='https:'||parsed.origin===location.origin&&parsed.hostname==='127.0.0.1'))throw Error('CONNECTION_HTTPS_REQUIRED');backend=parsed.origin;
 const stored=sessionStorage.getItem('mt-sim-ticket-'+backend);if(stored){ticket=stored;try{const b=await api('state');localAuthor=b.local_author;return;}catch{ticket='';}}
 const r=await fetch(backend+'/api/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({browser_session:browserSession,access_token})});const b=await r.json();if(!r.ok)throw Error(b.error);ticket=b.session_token;localAuthor=b.local;sessionStorage.setItem('mt-sim-ticket-'+backend,ticket);
}
export async function api(name,data){if(!ticket)throw Error('BACKEND_DISCONNECTED');let r;try{r=await fetch(backend+'/api/'+name,{method:data===undefined?'GET':'POST',headers:{Authorization:'Bearer '+ticket,'X-Browser-Session':browserSession,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});}catch{throw Error('BACKEND_DISCONNECTED');}const b=await r.json();if(!r.ok)throw Error(b.error);return b;}
export function disconnect(){ticket='';}
